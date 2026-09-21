(function () {
  "use strict";
  var lista = document.getElementById("carrito-lista");
  var total = document.getElementById("carrito-total");
  if (!lista || !total) return;
  var formato = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
  var productos = [];
  try {
    var datos = JSON.parse(sessionStorage.getItem("doncargador_carrito_demo") || "[]");
    if (Array.isArray(datos)) productos = datos.filter(function (p) {
      return p && typeof p.clave === "string" && typeof p.nombre === "string" &&
        typeof p.precio === "number" && Number.isFinite(p.precio) && p.precio >= 0;
    }).slice(0, 50).map(function (p) { return { clave: p.clave, nombre: p.nombre, precio: p.precio }; });
    productos = productos.filter(function (p, i) { return productos.findIndex(function (x) { return x.clave === p.clave; }) === i; });
  } catch (e) {}
  function pintar() {
    lista.replaceChildren();
    if (!productos.length) {
      var vacio = document.createElement("li");
      vacio.className = "producto";
      vacio.textContent = "Tu carrito está vacío.";
      lista.append(vacio);
    }
    productos.forEach(function (p) {
      var fila = document.createElement("li"); fila.className = "producto";
      var datos = document.createElement("div");
      var nombre = document.createElement("strong"); nombre.textContent = p.nombre;
      var precio = document.createElement("p"); precio.textContent = "1 unidad de prueba · " + formato.format(p.precio) + " (IVA incluido)";
      datos.append(nombre, precio);
      var quitar = document.createElement("button"); quitar.type = "button"; quitar.className = "eliminar";
      quitar.textContent = "Eliminar"; quitar.setAttribute("aria-label", "Eliminar " + p.nombre);
      quitar.addEventListener("click", function () {
        productos = productos.filter(function (x) { return x.clave !== p.clave; });
        guardar(); pintar();
      });
      fila.append(datos, quitar); lista.append(fila);
    });
    total.textContent = formato.format(productos.reduce(function (s, p) { return s + p.precio; }, 0));
  }
  function guardar() { try { sessionStorage.setItem("doncargador_carrito_demo", JSON.stringify(productos)); } catch (e) {} }
  guardar(); pintar();
})();
