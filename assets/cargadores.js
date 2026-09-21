(function () {
  "use strict";
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
  function stockDe(p) {
    var s = Number(p.stock);
    return p.stock != null && p.stock !== "" && Number.isSafeInteger(s) && s >= 0 ? s : null;
  }
  function referenciaDe(p) { return p.referencia == null ? "" : String(p.referencia).trim(); }
  function imagenDe(p) {
    if (!p.imagen_url) return '<div class="cargador-imagen-placeholder" aria-hidden="true">DC</div>';
    try {
      var url = new URL(String(p.imagen_url),window.location.href); if (url.protocol !== "https:") throw new Error("URL no segura");
      return '<img class="cargador-imagen" src="'+escapeHtml(url.href)+'" alt="'+escapeHtml(p.nombre)+'" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="cargador-imagen-placeholder" hidden aria-hidden="true">DC</span>';
    } catch(e) { return '<div class="cargador-imagen-placeholder" aria-hidden="true">DC</div>'; }
  }
  function tarjeta(p) {
    var descripcion = p.descripcion ? '<p class="cargador-desc">'+escapeHtml(p.descripcion)+'</p>' : "";
    var precio = Number(p.precio);
    var precioValido = p.precio != null && p.precio !== "" && Number.isFinite(precio) && precio >= 0;
    var stock = stockDe(p), referencia = referenciaDe(p);
    var stockTexto = stock === null ? "Stock no disponible" : "Disponibles: "+stock+" "+(stock === 1 ? "unidad" : "unidades");
    var disponible = precioValido && stock !== null && stock > 0 && referencia !== "";
    var boton = '<button type="button" class="cargador-demo-btn" data-agregar-carrito-demo data-clave="'+escapeHtml(referencia)+'" data-precio="'+(precioValido?precio:'')+'" data-stock="'+(stock===null?'':stock)+'"'+(disponible?'':' disabled')+'>'+(disponible?'Añadir al carrito de prueba':'No disponible para añadir')+'</button>';
    return '<article class="cargador-card">'+imagenDe(p)+'<div class="cargador-body"><div class="cargador-categoria">'+escapeHtml(marcaDe(p))+'</div><h4 class="cargador-nombre">'+escapeHtml(p.nombre||"Cargador")+'</h4>'+descripcion+'<div class="cargador-precio">'+euros(p.precio)+'</div><p class="cargador-stock" aria-label="Existencias disponibles">'+escapeHtml(stockTexto)+'</p><p class="cargador-stock-aviso" role="status" hidden></p>'+boton+'</div></article>';
  }
  function mostrar(piezas) {
    var filtros = document.getElementById("cargadores-filtros");
    var busqueda = document.getElementById("cargadores-busqueda");
    var marcas = Array.from(new Set(piezas.map(marcaDe))).sort(function(a,b){return a.localeCompare(b,"es");});
    var activa = "Todas";
    if (filtros) {
      filtros.innerHTML = "";
      ["Todas"].concat(marcas).forEach(function(marca){
        var boton = document.createElement("button");
        boton.type="button";boton.className="cargadores-filtro";boton.textContent=marca;
        boton.setAttribute("aria-pressed",marca===activa?"true":"false");
        boton.addEventListener("click",function(){activa=marca;actualizar();});filtros.appendChild(boton);
      });
    }
    function actualizar() {
      var termino=normalizar(busqueda?busqueda.value:"");
      if(filtros)Array.from(filtros.children).forEach(function(b){b.setAttribute("aria-pressed",b.textContent===activa?"true":"false");});
      var visibles=piezas.filter(function(p){
        return (activa==="Todas"||marcaDe(p)===activa)&&normalizar([p.nombre,p.descripcion,marcaDe(p)].join(" ")).includes(termino);
      });
      contenedor.innerHTML=visibles.length?visibles.map(tarjeta).join(""):'<p class="cargadores-vacio">No hay cargadores que coincidan con tu búsqueda.</p>';
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
