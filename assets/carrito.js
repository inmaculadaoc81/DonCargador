(function(){
  const cfg=window.DONCARGADOR_COMPRA;
  const CLAVE='doncargador_carrito_v1';
  const lista=document.getElementById('lineas-carrito');
  const subtotal=document.getElementById('subtotal');
  const formulario=document.getElementById('formulario-compra');
  const boton=document.getElementById('boton-pagar');
  const estado=document.getElementById('estado-compra');
  let catalogo=new Map();let carrito=[];let disponible=false;
  function dinero(n){return Number(n).toLocaleString('es-ES',{style:'currency',currency:'EUR'});}
  function escapar(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function cargar(){try{const x=JSON.parse(localStorage.getItem(CLAVE)||'[]');return Array.isArray(x)?x.filter(y=>y&&typeof y.referencia==='string'&&Number.isInteger(y.cantidad)&&y.cantidad>0&&y.cantidad<=20).slice(0,20):[];}catch{return [];}}
  function guardar(){try{localStorage.setItem(CLAVE,JSON.stringify(carrito));}catch{estado.textContent='No se puede guardar el carrito en este navegador.';}}
  function pintar(){
    const validas=carrito.filter(x=>catalogo.has(x.referencia));
    disponible=carrito.length>0&&validas.length===carrito.length;
    if(!carrito.length){lista.textContent='Tu carrito está vacío. Vuelve al catálogo para elegir un cargador.';subtotal.textContent='';}
    else{
      lista.innerHTML=carrito.map(l=>{
        const p=catalogo.get(l.referencia);
        return '<div class="linea"><div><strong>'+escapar(p?.nombre||'Producto no disponible')+'</strong><small>Referencia: '+escapar(l.referencia)+'</small></div>'+
          '<label>Cantidad <input type="number" min="1" max="20" step="1" value="'+l.cantidad+'" data-cantidad="'+escapar(l.referencia)+'" aria-label="Cantidad de '+escapar(p?.nombre||'producto')+'"></label>'+
          '<button type="button" data-quitar="'+escapar(l.referencia)+'">Quitar</button><span class="precio">'+(p?dinero(Number(p.precio)*l.cantidad):'Sin existencias')+'</span></div>';
      }).join('');
      subtotal.textContent='Subtotal de productos: '+dinero(validas.reduce((n,l)=>n+Number(catalogo.get(l.referencia).precio)*l.cantidad,0));
    }
    boton.disabled=!cfg.pagosHabilitados||!disponible;
    boton.textContent=cfg.pagosHabilitados?'Continuar al pago':'Pago online en preparación';
    if (!disponible&&carrito.length) estado.textContent='Hay productos agotados o no disponibles. Elimínalos del carrito.';
    else if(!cfg.pagosHabilitados) estado.textContent='La tienda aún no acepta pagos online. Puedes preparar tu carrito.';
    else estado.textContent='';
  }
  lista.addEventListener('change',e=>{
    const input=e.target.closest('input[data-cantidad]');if(!input)return;
    const l=carrito.find(x=>x.referencia===input.dataset.cantidad);if(!l)return;
    const n=Number(input.value);
    if(!Number.isSafeInteger(n)||n<1||n>20){input.value=String(l.cantidad);return;}
    l.cantidad=n;guardar();pintar();
  });
  lista.addEventListener('click',e=>{
    const b=e.target.closest('button[data-quitar]');if(!b)return;
    carrito=carrito.filter(x=>x.referencia!==b.dataset.quitar);guardar();pintar();
  });
  async function iniciar(){
    carrito=cargar();
    try{
      const r=await fetch(cfg.apiOrigen+'/publico/piezas-cargador',{cache:'no-store'});
      if(!r.ok)throw new Error('Sin inventario');
      const d=await r.json();if(!d.ok||!Array.isArray(d.piezas))throw new Error('Inventario inválido');
      catalogo=new Map(d.piezas.filter(p=>p.categoria==='CARGADOR'&&typeof p.referencia==='string'&&Number(p.precio)>0&&
        !/dyson/i.test(String(p.nombre||'')+' '+String(p.descripcion||''))).map(p=>[p.referencia,p]));
      pintar();
    }catch{lista.textContent='No se pudo comprobar el inventario. Inténtalo más tarde.';boton.disabled=true;}
  }
  formulario.addEventListener('submit',async e=>{
    e.preventDefault();if(!cfg.pagosHabilitados||!disponible||boton.disabled)return;
    boton.disabled=true;estado.textContent='Confirmando disponibilidad y precio…';
    const datos=new FormData(formulario);
    const comprador=Object.fromEntries(['nombre','email','telefono','direccion','codigoPostal','ciudad','provincia','pais'].map(k=>[k,String(datos.get(k)||'').trim()]));
    try{
      const r=await fetch(cfg.apiOrigen+'/publico/doncargador/pedidos',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({requestId:crypto.randomUUID(),comprador,
          lineas:carrito.map(x=>({referencia:x.referencia,cantidad:x.cantidad}))})});
      const d=await r.json();if(!r.ok||!d.ok||!d.formulario)throw new Error(d.error||'No se pudo iniciar el pago');
      const f=d.formulario;
      const u=new URL(f.action);
      if(u.protocol!=='https:'||!['sis.redsys.es','sis-t.redsys.es'].includes(u.hostname)||u.pathname!=='/sis/realizarPago'||
        f.method!=='POST'||!f.campos||typeof d.pedidoId!=='string')throw new Error('Respuesta de pasarela no válida');
      const p=JSON.parse(atob(f.campos.Ds_MerchantParameters));
      const centimos=Number(p.DS_MERCHANT_AMOUNT);
      if(!Number.isSafeInteger(centimos)||centimos<=0)throw new Error('Importe no válido');
      const productos=carrito.reduce((n,l)=>n+Math.round(Number(catalogo.get(l.referencia).precio)*100)*l.cantidad,0);
      const envio=centimos-productos;
      // El usuario ve el importe REAL firmado en el servidor, no el del carrito.
      if(!confirm('Productos: '+dinero(productos/100)+'\nEnvío y ajustes: '+dinero(envio/100)+
        '\nTOTAL A PAGAR: '+dinero(centimos/100)+'\n\n¿Confirmas que quieres ir a Redsys para pagar?')){
        estado.textContent='Pago no iniciado. Tu carrito sigue guardado.';return;
      }
      sessionStorage.setItem('doncargador_ultimo_pedido',d.pedidoId);
      const post=document.createElement('form');post.method='POST';post.action=f.action;post.style.display='none';
      for(const nombre of ['Ds_SignatureVersion','Ds_MerchantParameters','Ds_Signature']){
        if(typeof f.campos[nombre]!=='string')throw new Error('Faltan campos firmados');
        const input=document.createElement('input');input.type='hidden';input.name=nombre;input.value=f.campos[nombre];post.appendChild(input);
      }
      document.body.appendChild(post);post.submit();
    }catch(error){estado.textContent=error.message||'No se pudo preparar el pago';}
    finally{boton.disabled=!disponible||!cfg.pagosHabilitados;}
  });
  iniciar();
})();
