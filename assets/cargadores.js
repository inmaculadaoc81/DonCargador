(function () {
  // Catálogo público: los enlaces Getnet se asignan por referencia exacta, nunca por coincidencia de nombres.
  const config = window.DONCARGADOR_COMPRA || {apiOrigen:'https://db.affirmatechnology.com/kelatos-api',pagosHabilitados:false};
  const ENDPOINT = config.apiOrigen + '/publico/piezas-cargador';
  const ENLACES_GETNET = Object.freeze({
    '666':'NDk4OzEw','22':'NDk4OzEx','23':'NDk4OzEy','24':'NDk4OzEz',
    '4578':'NDk4OzE0','456':'NDk4OzE1','9':'NDk4OzE2','10':'NDk4OzE3',
    '7':'NDk4OzE4','8':'NDk4OzE5','19':'NDk4OzIw','20':'NDk4OzIx',
    '21':'NDk4OzIy','12':'NDk4OzIz','15':'NDk4OzI0','13':'NDk4OzI1',
    '14':'NDk4OzI2','16':'NDk4OzI3','17':'NDk4OzI4','18':'NDk4OzI5',
    '4':'NDk4OzMw','5':'NDk4OzMx','77':'NDk4OzMy','3':'NDk4OzMz',
    '2':'NDk4OzM0','1':'NDk4OzM1','11':'NDk4OzM2','555':'NDk4OzM3','6':'NDk4OzM4'
  });
  const contenedor = document.getElementById('cargadores-lista');
  if (!contenedor) return;
  const esInicio = !document.getElementById('cargadores-busqueda');
  function escapeHtml(valor) {
    return String(valor == null ? '' : valor).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function normalizar(valor) {
    return String(valor == null ? '' : valor).normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'').toLocaleUpperCase('es-ES').trim();
  }
  function esPortatil(pieza) {
    if (!pieza || normalizar(pieza.categoria) !== 'CARGADOR') return false;
    const destino = normalizar(pieza.clasificacion_dispositivo || pieza.tipo_dispositivo);
    if (destino) return destino === 'PORTATIL' || destino === 'PORTATILES';
    return !/\bDYSON\b/.test(normalizar([pieza.nombre,pieza.descripcion].join(' ')));
  }
  function marcaDe(pieza) {
    const marca = String(pieza.marca || '').trim();
    if (marca) return marca;
    const nombre = normalizar(pieza.nombre);
    const conocidas = ['HP','ACER','ASUS','DELL','LENOVO','MSI','SAMSUNG','TOSHIBA','MICROSOFT','SURFACE','APPLE','LG','HUAWEI','GIGABYTE','RAZER','MEDION'];
    return conocidas.find(item=>new RegExp('\\b'+item+'\\b').test(nombre)) || 'Otras marcas';
  }
  function euros(precio) {
    if (precio == null || precio === '' || !Number.isFinite(Number(precio)) || Number(precio) <= 0) return 'Consultar precio';
    return Number(precio).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' € IVA inc.';
  }
  function unidades(pieza) {
    const n=Number(pieza.stock_disponible);
    return pieza.stock_disponible !== null && pieza.stock_disponible !== undefined && Number.isSafeInteger(n) && n >= 0 ? n : null;
  }
  function imagenDe(pieza) {
    const imagenes = {
      ACER:'cargador-acer.webp', ASUS:'cargador-asus.webp', DELL:'cargador-dell.webp',
      HP:'cargador-hp.webp', LENOVO:'cargador-lenovo.webp',
      MICROSOFT:'cargador-surface.webp', SURFACE:'cargador-surface.webp'
    };
    const imagenMarca = imagenes[normalizar(marcaDe(pieza))];
    const ruta = pieza.imagen_url || (imagenMarca ? '/assets/images/'+imagenMarca : '');
    if (!ruta) return '<div class="cargador-imagen-placeholder" aria-hidden="true">DC</div>';
    try {
      const url = new URL(String(ruta),window.location.href);
      if (url.protocol !== 'https:') throw new Error('URL no segura');
      return '<img class="cargador-imagen" src="'+escapeHtml(url.href)+'" alt="'+escapeHtml(pieza.nombre)+'" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="cargador-imagen-placeholder" hidden aria-hidden="true">DC</span>';
    } catch { return '<div class="cargador-imagen-placeholder" aria-hidden="true">DC</div>'; }
  }
  function obtenerCarrito() {
    try {
      const datos=JSON.parse(localStorage.getItem('doncargador_carrito_v1')||'[]');
      return Array.isArray(datos) ? datos.filter(x=>x && typeof x.referencia==='string' && Number.isSafeInteger(x.cantidad) && x.cantidad>0 && x.cantidad<=20).slice(0,20) : [];
    } catch { return []; }
  }
  function actualizarContador() {
    const total=obtenerCarrito().reduce((n,x)=>n+x.cantidad,0);
    const etiqueta=document.getElementById('carrito-contador');
    if (etiqueta) etiqueta.textContent=String(total);
    const contadorInicio=document.getElementById('carrito-contador-inicio');
    if (contadorInicio) contadorInicio.textContent=String(total);
  }
  function prepararInicio() {
    if (!esInicio) return;
    const seccion=document.getElementById('stock-disponible-ahora') || contenedor.parentElement;
    if (!seccion || document.getElementById('carrito-enlace-inicio')) return;
    const estilo=document.createElement('style');
    estilo.textContent='#stock-disponible-ahora .cargador-body{display:flex;flex-direction:column;flex:1}#stock-disponible-ahora .cargador-card{display:flex;flex-direction:column}#stock-disponible-ahora .cargador-precio{margin-top:auto}#stock-disponible-ahora .cargador-stock{margin:8px 0;color:#286c32;font-weight:700}#stock-disponible-ahora .cargador-anadir{display:block;text-align:center;text-decoration:none;background:#123552;color:white;padding:12px 16px;border-radius:25px;font-weight:800;margin-top:9px}#stock-disponible-ahora .cargador-no-disponible{display:block;margin-top:8px}#carrito-enlace-inicio{display:inline-flex;align-items:center;gap:6px;background:#123552;color:#fff;padding:12px 20px;border-radius:999px;font-weight:800;text-decoration:none;margin-top:14px}#aviso-carrito-inicio{margin:13px 0;color:#123552;font-size:14px}';
    document.head.appendChild(estilo);
    const enlace=document.createElement('a');enlace.id='carrito-enlace-inicio';enlace.href='/carrito.html';
    enlace.innerHTML='Ver carrito (<span id="carrito-contador-inicio">0</span>) →';
    seccion.insertBefore(enlace,contenedor);
    const aviso=document.createElement('p');aviso.id='aviso-carrito-inicio';
    aviso.textContent='Selecciona un cargador para consultar su ficha en Getnet. Comprueba la compatibilidad antes de comprar.';
    seccion.insertBefore(aviso,contenedor);
  }
  function tarjeta(pieza) {
    const descripcion=pieza.descripcion ? '<p class="cargador-desc">'+escapeHtml(pieza.descripcion)+'</p>' : '';
    const stock=unidades(pieza);
    const referencia=String(pieza.referencia == null ? '' : pieza.referencia).trim();
    const codigo=Object.prototype.hasOwnProperty.call(ENLACES_GETNET,referencia) ? ENLACES_GETNET[referencia] : null;
    const disponible=Boolean(codigo) && Number(pieza.precio)>0 && stock !== null && stock>0;
    const stockTexto=stock === null ? 'Stock pendiente de confirmar' : 'Stock: '+stock+' '+(stock===1?'unidad':'unidades');
    const boton=disponible ? '<a class="cargador-anadir" href="https://sis.redsys.es/tiendaWeb/item/'+codigo+'" target="_blank" rel="noopener noreferrer" aria-label="Ver en Getnet: '+escapeHtml(pieza.nombre||'Cargador')+'">Ver producto</a>' : '<span class="cargador-no-disponible">Consultar disponibilidad</span>';
    return '<article class="cargador-card">'+imagenDe(pieza)+
      '<div class="cargador-body"><div class="cargador-categoria">'+escapeHtml(marcaDe(pieza))+'</div>'+
      '<h4 class="cargador-nombre">'+escapeHtml(pieza.nombre||'Cargador')+'</h4>'+descripcion+
      '<div class="cargador-precio">'+euros(pieza.precio)+'</div><p class="cargador-stock">'+stockTexto+'</p>'+boton+'</div></article>';
  }
  function mostrar(piezas) {
    const filtros=document.getElementById('cargadores-filtros');
    const busqueda=document.getElementById('cargadores-busqueda');
    const marcas=Array.from(new Set(piezas.map(marcaDe))).sort((a,b)=>a.localeCompare(b,'es'));
    let activa='Todas';
    if (filtros) {
      filtros.innerHTML='';
      ['Todas'].concat(marcas).forEach(marca=>{
        const boton=document.createElement('button');boton.type='button';boton.className='cargadores-filtro';
        boton.textContent=marca;boton.setAttribute('aria-pressed',String(marca===activa));
        boton.addEventListener('click',()=>{activa=marca;actualizar();});filtros.appendChild(boton);
      });
    }
    function actualizar() {
      const termino=normalizar(busqueda?busqueda.value:'');
      if (filtros) Array.from(filtros.children).forEach(b=>b.setAttribute('aria-pressed',String(b.textContent===activa)));
      const visibles=piezas.filter(p=>(activa==='Todas'||marcaDe(p)===activa)&&normalizar([p.nombre,p.descripcion,marcaDe(p)].join(' ')).includes(termino));
      contenedor.innerHTML=visibles.length?visibles.map(tarjeta).join(''):'<p class="cargadores-vacio">No hay cargadores que coincidan con tu búsqueda.</p>';
    }
    if (busqueda) busqueda.addEventListener('input',actualizar);
    actualizar();
  }
  prepararInicio();
  actualizarContador();
  fetch(ENDPOINT,{cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(d=>{
      if(!d||d.ok!==true||!Array.isArray(d.piezas))throw new Error('Inventario inválido');
      const piezas=d.piezas.filter(esPortatil);
      if (!piezas.length) {contenedor.innerHTML='<p class="cargadores-vacio">Ahora mismo no tenemos cargadores de portátil disponibles.</p>';return;}
      mostrar(piezas);
    })
    .catch(()=>{contenedor.innerHTML='<p class="cargadores-vacio">No hemos podido consultar el inventario. Contacta con nosotros para confirmar la disponibilidad.</p>';});
})();
