(function () {
  "use strict";
  // Demostración local: no envía pedidos, reserva existencias ni cobra dinero.
  var carrito = [];
  var boton = document.getElementById("abrir-carrito-demo");
  var panel = document.getElementById("carrito-demo-panel");
  var lista = document.getElementById("carrito-demo-lista");
  var total = document.getElementById("carrito-demo-total");
  var contador = document.getElementById("carrito-demo-contador");
  if (!boton || !panel || !lista || !total || !contador) return;
  var formato = new Intl.NumberFormat("es-ES", {style:"currency",currency:"EUR"});
  function pintar() {
    lista.replaceChildren();
    var importe = 0;
    var cantidad = 0;
    carrito.forEach(function (p, i) {
      importe += p.precio * p.cantidad;
      cantidad += p.cantidad;
      var fila = document.createElement("li");
      fila.className = "carrito-demo-item";
      var nombre = document.createElement("span");
      nombre.textContent = p.nombre + " · " + formato.format(p.precio) + " (IVA incl.)";
      var controles = document.createElement("span");
      controles.className = "carrito-demo-controles";
      var menos = document.createElement("button");
      menos.type = "button";
      menos.textContent = "−";
      menos.setAttribute("aria-label", "Quitar una unidad de " + p.nombre);
      menos.addEventListener("click", function () { p.cantidad--; if (p.cantidad === 0) carrito.splice(i, 1); pintar(); });
      var unidades = document.createElement("span");
      unidades.textContent = String(p.cantidad);
      var mas = document.createElement("button");
      mas.type = "button";
      mas.textContent = "+";
      mas.setAttribute("aria-label", "Añadir una unidad de " + p.nombre);
      mas.addEventListener("click", function () { p.cantidad++; pintar(); });
      controles.append(menos, unidades, mas);
      fila.append(nombre, controles);
      lista.append(fila);
    });
    if (!carrito.length) {
      var vacio = document.createElement("li");
      vacio.textContent = "Tu carrito de demostración está vacío.";
      lista.append(vacio);
    }
    contador.textContent = String(cantidad);
    total.textContent = formato.format(importe);
  }
  boton.addEventListener("click", function () {
    panel.hidden = !panel.hidden;
    boton.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) panel.focus();
  });
  document.addEventListener("click", function (evento) {
    var agregar = evento.target.closest("[data-agregar-carrito-demo]");
    if (!agregar) return;
    var tarjeta = agregar.closest(".cargador-card");
    if (!tarjeta) return;
    var nombre = tarjeta.querySelector(".cargador-nombre");
    var precio = Number(agregar.dataset.precio);
    if (!nombre || !Number.isFinite(precio) || precio < 0) return;
    // El endpoint actual carece de identificadores únicos: la clave provisional
    // únicamente sirve para agrupar productos en este carrito de demostración.
    var clave = agregar.dataset.clave;
    var existente = carrito.find(function (p) { return p.clave === clave; });
    if (existente) existente.cantidad++;
    else carrito.push({clave:clave,nombre:nombre.textContent,precio:precio,cantidad:1});
    pintar();
    panel.hidden = false;
    boton.setAttribute("aria-expanded", "true");
  });
  pintar();
})();
