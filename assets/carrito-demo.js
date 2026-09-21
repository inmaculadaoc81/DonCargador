(function () {
  "use strict";
  // Demostración: no hay pedidos, reservas ni pagos. El stock del navegador no autoriza compras.
  var CLAVE = "doncargador_carrito_demo";
  var carrito = [];
  var lista = document.getElementById("carrito-demo-lista");
  var total = document.getElementById("carrito-demo-total");
  var contador = document.getElementById("carrito-demo-contador");
  var aviso = document.getElementById("carrito-demo-aviso");
  var formato = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
  if (!lista || !total || !contador) return;

  function guardar() { try { sessionStorage.setItem(CLAVE, JSON.stringify(carrito)); } catch(e) {} }
  function pintar() {
    lista.replaceChildren();
    var importe = 0, unidades = 0;
    carrito.forEach(function (p) {
      importe += p.precio * p.cantidad;
      unidades += p.cantidad;
      var fila = document.createElement("li");
      fila.className = "carrito-demo-item";
      var nombre = document.createElement("span");
      nombre.textContent = p.nombre + " · " + p.cantidad + " × " + formato.format(p.precio) + " (IVA incl.)";
      var eliminar = document.createElement("button");
      eliminar.type = "button";
      eliminar.className = "carrito-demo-eliminar";
      eliminar.textContent = "Eliminar";
      eliminar.addEventListener("click", function () {
        carrito = carrito.filter(function (item) { return item.referencia !== p.referencia; });
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
    contador.textContent = String(unidades);
    total.textContent = formato.format(importe);
    if (aviso) aviso.textContent = "Vista de prueba: los pagos y las reservas no están habilitados. Comprueba las existencias en la página del carrito.";
    guardar();
  }

  try {
    var anterior = JSON.parse(sessionStorage.getItem(CLAVE) || "[]");
    if (Array.isArray(anterior)) carrito = anterior.filter(function (p) {
      return p && typeof p.referencia === "string" && p.referencia.trim() &&
        Number.isSafeInteger(p.cantidad) && p.cantidad > 0 && p.cantidad <= 999 &&
        typeof p.nombre === "string" && Number.isFinite(p.precio) && p.precio >= 0;
    }).slice(0,50).map(function (p) {
      return {referencia:p.referencia,nombre:p.nombre,precio:p.precio,cantidad:p.cantidad};
    });
    carrito = carrito.filter(function (p,i) { return carrito.findIndex(function (x) {return x.referencia === p.referencia;}) === i; });
  } catch(e) {}

  document.addEventListener("click", function (evento) {
    var agregar = evento.target.closest("[data-agregar-carrito-demo]");
    if (!agregar || agregar.disabled) return;
    var tarjeta = agregar.closest(".cargador-card");
    var nombre = tarjeta && tarjeta.querySelector(".cargador-nombre");
    var avisoTarjeta = tarjeta && tarjeta.querySelector(".cargador-stock-aviso");
    var precio = Number(agregar.dataset.precio);
    var stock = Number(agregar.dataset.stock);
    var referencia = agregar.dataset.clave;
    if (!nombre || !referencia || !Number.isFinite(precio) || precio < 0 ||
        !Number.isSafeInteger(stock) || stock < 1) return;
    var existente = carrito.find(function (p) { return p.referencia === referencia; });
    var cantidadSolicitada = (existente ? existente.cantidad : 0) + 1;
    if (cantidadSolicitada > stock) {
      if (avisoTarjeta) {
        avisoTarjeta.hidden = false;
        avisoTarjeta.textContent = "Stock insuficiente: solicitas " + cantidadSolicitada + " y solo hay " + stock + " " + (stock===1?"unidad disponible.":"unidades disponibles.");
      }
      return;
    }
    if (existente) { existente.cantidad = cantidadSolicitada; existente.precio = precio; existente.nombre = nombre.textContent; }
    else carrito.push({ referencia:referencia, nombre:nombre.textContent, precio:precio, cantidad:1 });
    if (avisoTarjeta) { avisoTarjeta.hidden = false; avisoTarjeta.textContent = "Añadido al carrito: " + cantidadSolicitada + " " + (cantidadSolicitada===1?"unidad.":"unidades."); }
    pintar();
  });
  pintar();
})();
