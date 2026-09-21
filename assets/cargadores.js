(function () {
  // Catálogo público de cargadores de Kelatos. No modifica existencias ni procesa pagos.
  // Hasta que el backend publique una clasificación de destino, se excluyen explícitamente
  // los cargadores Dyson. Una clasificación afirmativa para portátiles prevalecerá cuando exista.
  var ENDPOINT = "https://makeup-reef-raymond-holes.trycloudflare.com/publico/piezas-cargador";
  var contenedor = document.getElementById("cargadores-lista");
  if (!contenedor) return;

  function escapeHtml(valor) {
    return String(valor == null ? "" : valor)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function normalizar(valor) {
    return String(valor == null ? "" : valor)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLocaleUpperCase("es-ES").trim();
  }

  function esPortatil(pieza) {
    if (!pieza || normalizar(pieza.categoria) !== "CARGADOR") return false;
    // Campo futuro del backend: clasificacion_dispositivo = "PORTATIL".
    // No se presupone que ya exista: mientras tanto se aplica una exclusión temporal.
    var destino = normalizar(pieza.clasificacion_dispositivo || pieza.tipo_dispositivo);
    if (destino) return destino === "PORTATIL" || destino === "PORTATILES";
    return !/\bDYSON\b/.test(normalizar([pieza.nombre, pieza.descripcion].join(" ")));
  }

  function marcaDe(pieza) {
    var marca = String(pieza.marca || "").trim();
    if (marca) return marca;
    var nombre = normalizar(pieza.nombre);
    // Se reconocen marcas del catálogo actual; las desconocidas permanecen visibles
    // en «Otras marcas» hasta que el backend proporcione el campo marca.
    var conocidas = ["HP", "ACER", "ASUS", "DELL", "LENOVO", "MSI", "SAMSUNG", "TOSHIBA", "MICROSOFT", "SURFACE", "APPLE", "LG", "HUAWEI", "GIGABYTE", "RAZER", "MEDION"];
    return conocidas.find(function (item) { return new RegExp("\\b" + item + "\\b").test(nombre); }) || "Otras marcas";
  }

  function euros(precio) {
    if (precio == null || precio === "" || !Number.isFinite(Number(precio)) || Number(precio) < 0) return "Consultar precio";
    return Number(precio).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " € IVA inc.";
  }

  function imagenDe(pieza) {
    if (!pieza.imagen_url) return '<div class="cargador-imagen-placeholder" aria-hidden="true">DC</div>';
    try {
      var url = new URL(String(pieza.imagen_url), window.location.href);
      if (url.protocol !== "https:") throw new Error("URL no segura");
      return '<img class="cargador-imagen" src="' + escapeHtml(url.href) + '" alt="' + escapeHtml(pieza.nombre) + '" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="cargador-imagen-placeholder" hidden aria-hidden="true">DC</span>';
    } catch (e) {
      return '<div class="cargador-imagen-placeholder" aria-hidden="true">DC</div>';
    }
  }

  function tarjeta(pieza) {
    var descripcion = pieza.descripcion ? '<p class="cargador-desc">' + escapeHtml(pieza.descripcion) + '</p>' : "";
    return '<article class="cargador-card">' + imagenDe(pieza) +
      '<div class="cargador-body"><div class="cargador-categoria">' + escapeHtml(marcaDe(pieza)) + '</div>' +
      '<h4 class="cargador-nombre">' + escapeHtml(pieza.nombre || "Cargador") + '</h4>' +
      descripcion + '<div class="cargador-precio">' + euros(pieza.precio) + '</div></div></article>';
  }

  function mostrar(piezas) {
    var filtros = document.getElementById("cargadores-filtros");
    var busqueda = document.getElementById("cargadores-busqueda");
    var marcas = Array.from(new Set(piezas.map(marcaDe))).sort(function (a, b) { return a.localeCompare(b, "es"); });
    var activa = "Todas";
    if (filtros) {
      filtros.innerHTML = '';
      ["Todas"].concat(marcas).forEach(function (marca) {
        var boton = document.createElement("button");
        boton.type = "button";
        boton.className = "cargadores-filtro";
        boton.textContent = marca;
        boton.setAttribute("aria-pressed", marca === activa ? "true" : "false");
        boton.addEventListener("click", function () { activa = marca; actualizar(); });
        filtros.appendChild(boton);
      });
    }
    function actualizar() {
      var termino = normalizar(busqueda ? busqueda.value : "");
      if (filtros) Array.from(filtros.children).forEach(function (boton) { boton.setAttribute("aria-pressed", boton.textContent === activa ? "true" : "false"); });
      var visibles = piezas.filter(function (pieza) {
        return (activa === "Todas" || marcaDe(pieza) === activa) &&
          normalizar([pieza.nombre, pieza.descripcion, marcaDe(pieza)].join(" ")).includes(termino);
      });
      contenedor.innerHTML = visibles.length ? visibles.map(tarjeta).join("") : '<p class="cargadores-vacio">No hay cargadores que coincidan con tu búsqueda.</p>';
    }
    if (busqueda) busqueda.addEventListener("input", actualizar);
    actualizar();
  }

  fetch(ENDPOINT, { cache: "no-store" })
    .then(function (respuesta) { if (!respuesta.ok) throw new Error("HTTP " + respuesta.status); return respuesta.json(); })
    .then(function (datos) {
      if (!datos || datos.ok !== true || !Array.isArray(datos.piezas)) throw new Error("Respuesta de inventario inválida");
      var piezas = datos.piezas.filter(esPortatil);
      if (!piezas.length) {
        contenedor.innerHTML = '<p class="cargadores-vacio">Ahora mismo no tenemos cargadores de portátil disponibles. Escríbenos para consultar existencias.</p>';
        return;
      }
      mostrar(piezas);
    })
    .catch(function () {
      contenedor.innerHTML = '<p class="cargadores-vacio">No hemos podido consultar el inventario ahora mismo. Contacta con nosotros para confirmar la disponibilidad.</p>';
    });
})();
