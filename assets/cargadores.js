(function () {
  // Catálogo público de Kelatos. No modifica existencias ni procesa pagos.
  var ENDPOINT = "https://makeup-reef-raymond-holes.trycloudflare.com/publico/piezas-cargador";
  var contenedor = document.getElementById("cargadores-lista");
  if (!contenedor) return;
  function escapeHtml(valor) { return String(valor == null ? "" : valor).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
  function normalizar(valor) { return String(valor == null ? "" : valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleUpperCase("es-ES").trim(); }
  function esPortatil(p) {
    if (!p || normalizar(p.categoria) !== "CARGADOR") return false;
    var destino = normalizar(p.clasificacion_dispositivo || p.tipo_dispositivo);
    if (destino) return destino === "PORTATIL" || destino === "PORTATILES";
    // Exclusión temporal mientras el backend no proporcione clasificación explícita.
    return !/\bDYSON\b/.test(normalizar([p.nombre,p.descripcion].join(" ")));
  }
  function marcaDe(p) {
    var marca = String(p.marca || "").trim(); if (marca) return marca;
    var nombre = normalizar(p.nombre);
    var conocidas = ["HP","ACER","ASUS","DELL","LENOVO","MSI","SAMSUNG","TOSHIBA","MICROSOFT","SURFACE","APPLE","LG","HUAWEI","GIGABYTE","RAZER","MEDION"];
    return conocidas.find(function (m) { return new RegExp("\\b"+m+"\\b").test(nombre); }) || "Otras marcas";
  }
  function euros(precio) {
    if (precio == null || precio === "" || !Number.isFinite(Number(precio)) || Number(precio) < 0) return "Consultar precio";
    return Number(precio).toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2}) + " € IVA inc.";
  }
  function imagenDe(p) {
    if (!p.imagen_url) return '<div class="cargador-imagen-placeholder" aria-hidden="true">DC</div>';
    try {
      var url = new URL(String(p.imagen_url),window.location.href); if (url.protocol !== "https:") throw new Error("URL no segura");
      return '<img class="cargador-imagen" src="'+escapeHtml(url.href)+'" alt="'+escapeHtml(p.nombre)+'" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="cargador-imagen-placeholder" hidden aria-hidden="true">DC</span>';
    } catch(e) { return '<div class="cargador-imagen-placeholder" aria-hidden="true">DC</div>'; }
  }
  function tarjeta(p,indice) {
    var descripcion = p.descripcion ? '<p class="cargador-desc">'+escapeHtml(p.descripcion)+'</p>' : "";
    var precio = Number(p.precio);
    var precioValido = p.precio != null && p.precio !== "" && Number.isFinite(precio) && precio >= 0;
    // Índice temporal solo para demostrar el flujo; NO sirve para identificar ventas.
    var boton = precioValido ? '<button type="button" class="cargador-demo-btn" data-agregar-carrito-demo data-clave="demo-'+indice+'" data-precio="'+precio+'">Añadir a la demostración</button>' : '';
    return '<article class="cargador-card">'+imagenDe(p)+'<div class="cargador-body"><div class="cargador-categoria">'+escapeHtml(marcaDe(p))+'</div><h4 class="cargador-nombre">'+escapeHtml(p.nombre||"Cargador")+'</h4>'+descripcion+'<div class="cargador-precio">'+euros(p.precio)+'</div>'+boton+'</div></article>';
  }
  function mostrar(piezas) {
    var filtros = document.getElementById("cargadores-filtros");
    var busqueda = document.getElementById("cargadores-busqueda");
    var marcas = Array.from(new Set(piezas.map(marcaDe))).sort(function(a,b){return a.localeCompare(b,"es");});
    var activa = "Todas";
    if (filtros) {
      filtros.innerHTML = "";
      ["Todas"].concat(marcas).forEach(function(marca){
        var boton = document.createElement("button"); boton.type="button";boton.className="cargadores-filtro";boton.textContent=marca;
        boton.setAttribute("aria-pressed",marca===activa?"true":"false");
        boton.addEventListener("click",function(){activa=marca;actualizar();});filtros.appendChild(boton);
      });
    }
    function actualizar() {
      var termino=normalizar(busqueda?busqueda.value:"");
      if(filtros)Array.from(filtros.children).forEach(function(b){b.setAttribute("aria-pressed",b.textContent===activa?"true":"false");});
      var visibles=piezas.map(function(p,indice){return {p:p,indice:indice};}).filter(function(item){
        return (activa==="Todas"||marcaDe(item.p)===activa)&&normalizar([item.p.nombre,item.p.descripcion,marcaDe(item.p)].join(" ")).includes(termino);
      });
      contenedor.innerHTML=visibles.length?visibles.map(function(item){return tarjeta(item.p,item.indice);}).join(""):'<p class="cargadores-vacio">No hay cargadores que coincidan con tu búsqueda.</p>';
    }
    if(busqueda)busqueda.addEventListener("input",actualizar);
    actualizar();
  }
  fetch(ENDPOINT,{cache:"no-store"})
    .then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json();})
    .then(function(datos){
      if(!datos||datos.ok!==true||!Array.isArray(datos.piezas))throw new Error("Respuesta de inventario inválida");
      var piezas=datos.piezas.filter(esPortatil);
      if(!piezas.length){contenedor.innerHTML='<p class="cargadores-vacio">Ahora mismo no tenemos cargadores de portátil disponibles. Escríbenos para consultar existencias.</p>';return;}
      mostrar(piezas);
    })
    .catch(function(){contenedor.innerHTML='<p class="cargadores-vacio">No hemos podido consultar el inventario ahora mismo. Contacta con nosotros para confirmar la disponibilidad.</p>';});
})();
