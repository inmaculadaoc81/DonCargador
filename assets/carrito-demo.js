(function () {
  "use strict";
  // El carrito es exclusivamente visual. Sin ID único ni stock confirmado NO se permite
  // incrementar cantidades ni tramitar pedidos. No se escribe en el inventario.
  var carrito = [];
  var lista = document.getElementById("carrito-demo-lista");
  var total = document.getElementById("carrito-demo-total");
  var contador = document.getElementById("carrito-demo-contador");
  var aviso = document.getElementById("carrito-demo-aviso");
  var formato = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
  if (!lista || !total || !contador) return;

  function escapar(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function pintar() {
    lista.replaceChildren();
    var importe = 0;
    carrito.forEach(function (p) {
      importe += p.precio;
      var fila = document.createElement("li");
      fila.className = "carrito-demo-item";
      var nombre = document.createElement("span");
      nombre.textContent = p.nombre + " · " + formato.format(p.precio) + " (IVA incl.)";
      var eliminar = document.createElement("button");
      eliminar.type = "button";
      eliminar.className = "carrito-demo-eliminar";
      eliminar.textContent = "Eliminar";
      eliminar.setAttribute("aria-label", "Eliminar " + p.nombre + " del carrito");
      eliminar.addEventListener("click", function () {
        carrito = carrito.filter(function (item) { return item.clave !== p.clave; });
        pintar();
      });
      fila.append(nombre, eliminar);
      lista.append(fila);
    });
    if (!carrito.length) {
      var vacio = document.createElement("li");
      vacio.textContent = "Tu carrito de demostración está vacío.";
      lista.append(vacio);
    }
    contador.textContent = String(carrito.length);
    total.textContent = formato.format(importe);
    if (aviso) aviso.textContent = "Vista de prueba: no se puede confirmar el stock ni comprar. Cada producto se muestra una sola vez hasta que Kelatos facilite su referencia y existencias verificables.";
    try { sessionStorage.setItem("doncargador_carrito_demo", JSON.stringify(carrito)); } catch (e) {}
  }

  try {
    var anterior = JSON.parse(sessionStorage.getItem("doncargador_carrito_demo") || "[]");
    // Los datos del navegador no son un pedido ni una fuente fiable de precios o stock.
    if (Array.isArray(anterior)) carrito = anterior.filter(function (p) {
      return p && typeof p.clave === "string" && typeof p.nombre === "string" &&
        typeof p.precio === "number" && Number.isFinite(p.precio) && p.precio >= 0;
    }).slice(0, 50).map(function (p) { return { clave: p.clave, nombre: p.nombre, precio: p.precio }; });
    carrito = carrito.filter(function (p, i) { return carrito.findIndex(function (x) { return x.clave === p.clave; }) === i; });
  } catch (e) {}

  document.addEventListener("click", function (evento) {
    var agregar = evento.target.closest("[data-agregar-carrito-demo]");
    if (!agregar) return;
    var tarjeta = agregar.closest(".cargador-card");
    var nombre = tarjeta && tarjeta.querySelector(".cargador-nombre");
    var precio = Number(agregar.dataset.precio);
    var clave = agregar.dataset.clave;
    if (!nombre || !clave || !Number.isFinite(precio) || precio < 0) return;
    if (!carrito.some(function (p) { return p.clave === clave; })) {
      carrito.push({ clave: clave, nombre: nombre.textContent, precio: precio });
    }
    pintar();
    // El catálogo permanece visible; el carrito se consulta en su propia página.
    agregar.textContent = "Añadido a la demostración";
    agregar.disabled = true;
  });
  pintar();
})();
