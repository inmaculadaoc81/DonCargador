(function(){
  // La URL OK/KO NO acredita el cobro; solo la notificación autenticada puede hacerlo.
  const nodo=document.getElementById('mensaje-pago');
  if(!nodo)return;
  try{history.replaceState(null,'',location.pathname);}catch{}
  const id=sessionStorage.getItem('doncargador_ultimo_pedido');
  if(!id||!/^[0-9a-f-]{36}$/i.test(id)){
    nodo.textContent='No podemos identificar el pedido en este navegador. Si has pagado, contacta con Kelatos para verificarlo.';
    return;
  }
  let intentos=0;
  async function comprobar(){
    try{
      const r=await fetch(window.DONCARGADOR_COMPRA.apiOrigen+'/publico/doncargador/pedidos/'+encodeURIComponent(id)+'/estado',{cache:'no-store'});
      if(!r.ok)throw new Error('Consulta no disponible');
      const d=await r.json();
      if(d.estado==='pagado'){
        nodo.textContent='Pago confirmado. Hemos registrado tu pedido. Kelatos preparará el envío.';
        try{localStorage.removeItem('doncargador_carrito_v1');}catch{}
        return;
      }
      if(d.estado==='revision_stock'){
        nodo.textContent='Hemos recibido tu pago, pero hay un problema de existencias. Kelatos revisará el pedido y gestionará la devolución si corresponde.';
        return;
      }
      if(d.estado==='cancelado'){nodo.textContent='El pedido está cancelado. Si ves un cargo bancario, contacta con Kelatos.';return;}
      nodo.textContent='Estamos esperando la confirmación bancaria. No repitas el pago mientras se verifica.';
    }catch{nodo.textContent='No podemos consultar el pago en este momento. No repitas el pago; contacta con Kelatos si necesitas comprobarlo.';}
    if(++intentos<8)setTimeout(comprobar,3000);
  }
  comprobar();
})();
