(function () {
  // Lee el stock real de cargadores directamente del dashboard de Kelatos
  // (kelatos-rep-back) — solo piezas de la categoría CARGADOR, activas y
  // con stock disponible. Nunca se expone coste interno ni stock exacto.
  var ENDPOINT = "https://makeup-reef-raymond-holes.trycloudflare.com/publico/piezas-cargador";

  var contenedor = document.getElementById("cargadores-lista");
  if (!contenedor) return;

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function euros(n) {
    var v = Number(n);
    if (isNaN(v)) return "Consultar precio";
    return v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " € IVA inc.";
  }

  function tarjeta(p) {
    var desc = p.descripcion ? '<p class="cargador-desc">' + escapeHtml(p.descripcion) + "</p>" : "";
    return (
      '<article class="cargador-card"><div class="cargador-body">' +
      '<div class="cargador-categoria">' + escapeHtml(p.categoria || "Cargador") + "</div>" +
      '<h4 class="cargador-nombre">' + escapeHtml(p.nombre) + "</h4>" +
      desc +
      '<div class="cargador-precio">' + euros(p.precio) + "</div>" +
      "</div></article>"
    );
  }

  fetch(ENDPOINT, { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      var piezas = data && data.ok && Array.isArray(data.piezas) ? data.piezas : [];
      if (!piezas.length) {
        contenedor.innerHTML = '<p class="cargadores-vacio">Ahora mismo estamos reponiendo stock. Escríbenos y te confirmamos disponibilidad al momento.</p>';
        return;
      }
      contenedor.innerHTML = piezas.map(tarjeta).join("");
    })
    .catch(function () {
      var bloque = document.getElementById("stock-disponible-ahora");
      if (bloque) bloque.style.display = "none";
    });
})();
