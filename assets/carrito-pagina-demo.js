(function () {
  "use strict";
  // Demostración sin pagos ni reservas. Un pedido real requiere validación y reserva atómicas en el backend.
  var ENDPOINT = "https://makeup-reef-raymond-holes.trycloudflare.com/publico/piezas-cargador";
  var CLAVE = "doncargador_carrito_demo";
  var lista = document.getElementById("carrito-lista");
  var total = document.getElementById("carrito-total");
  var estado = document.getElementById("carrito-estado-stock");
  if (!lista || !total) return;
  var formato = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
  var productos = [];
  var inventario = null;
  var cargando = false;
  var solicitud = 0;
  try {
    var datos = JSON.parse(sessionStorage.getItem(CLAVE) || "[]");
    if (Array.isArray(datos)) productos = datos.filter(function (p) {
      return p && typeof p.referencia === "string" && p.referencia.trim() &&
        Number.isSafeInteger(p.cantidad) && p.cantidad > 0 && p.cantidad <= 999 &&
        typeof p.nombre === "string" && Number.isFinite(p.precio) && p.precio >= 0;
    }).slice(0, 50).map(function (p) {
      return { referencia:p.referencia, nombre:p.nombre, precio:p.precio, cantidad:p.cantidad };
    });
    productos = productos.filter(function (p,i) { return productos.findIndex(function (x) {return x.referencia === p.referencia;}) === i; });
  } catch (e) {}

  function guardar() { try { sessionStorage.setItem(CLAVE, JSON.stringify(productos)); } catch (e) {} }
  function textoEstado(mensaje, alerta) {
    if (!estado) return;
    estado.textContent = mensaje;
    estado.classList.toggle("stock-error", !!alerta);
  }
  function pintar() {
    lista.replaceChildren();
    var importe = 0, incidencias = 0;
    if (!productos.length) {
      var vacio = document.createElement("li");
      vacio.className = "producto";
      vacio.textContent = "Tu carrito está vacío.";
      lista.append(vacio);
    }
    productos.forEach(function (p) {
      var actual = inventario && inventario.get(p.referencia);
      var disponible = actual ? actual.stock : (inventario ? 0 : null);
      var precioActual = actual ? actual.precio : p.precio;
      if (actual) { p.nombre = actual.nombre; p.precio = actual.precio; }
      importe += precioActual * p.cantidad;
      var fila = document.createElement("li"); fila.className = "producto";
      var datos = document.createElement("div"); datos.className = "producto-datos";
      var nombre = document.createElement("strong"); nombre.textContent = p.nombre;
      var precio = document.createElement("p"); precio.textContent = formato.format(precioActual) + " por unidad (IVA incluido)";
      var stock = document.createElement("p"); stock.className = "stock-cantidad";
      stock.textContent = disponible === null ? "Stock: pendiente de comprobar" : "Stock disponible: " + disponible + " " + (disponible === 1 ? "unidad" : "unidades");
      var etiqueta = document.createElement("label"); etiqueta.className = "cantidad-etiqueta";
      etiqueta.textContent = "Cantidad solicitada: ";
      var cantidad = document.createElement("input");
      cantidad.type = "number"; cantidad.min = "1"; cantidad.max = "999"; cantidad.step = "1";
      cantidad.value = String(p.cantidad); cantidad.className = "cantidad-input";
      cantidad.setAttribute("aria-label", "Cantidad solicitada de " + p.nombre);
      var advertencia = document.createElement("p"); advertencia.className = "stock-advertencia";
      if (disponible === null) {
        advertencia.textContent = "No se pudo confirmar el stock. No es posible validar esta cantidad.";
        incidencias++;
      } else if (p.cantidad > disponible) {
        advertencia.textContent = "Stock insuficiente: solicitas " + p.cantidad + " y solo hay " + disponible + " " + (disponible===1?"unidad disponible.":"unidades disponibles.");
        incidencias++;
      }
      advertencia.hidden = !advertencia.textContent;
      cantidad.setAttribute("aria-invalid", advertencia.hidden ? "false" : "true");
      cantidad.addEventListener("change", function () {
        var nuevo = Number(cantidad.value);
        if (!Number.isSafeInteger(nuevo) || nuevo < 1 || nuevo > 999) {
          cantidad.value = String(p.cantidad);
          textoEstado("Introduce una cantidad entera entre 1 y 999.", true);
          return;
        }
        p.cantidad = nuevo;
        guardar(); pintar();
      });
      etiqueta.append(cantidad);
      datos.append(nombre, precio, stock, etiqueta, advertencia);
      var quitar = document.createElement("button"); quitar.type = "button"; quitar.className = "eliminar";
      quitar.textContent = "Eliminar"; quitar.setAttribute("aria-label", "Eliminar " + p.nombre);
      quitar.addEventListener("click", function () {
        productos = productos.filter(function (x) { return x.referencia !== p.referencia; });
        guardar(); pintar();
      });
      fila.append(datos, quitar); lista.append(fila);
    });
    total.textContent = formato.format(importe);
    if (cargando) textoEstado("Comprobando existencias actuales…", false);
    else if (!productos.length) textoEstado("Añade cargadores desde el catálogo para consultar sus existencias.", false);
    else if (incidencias) textoEstado("Hay productos con stock insuficiente o sin verificar. Corrige las cantidades antes de realizar cualquier compra. Los pagos siguen desactivados.", true);
    else textoEstado("Las cantidades solicitadas coinciden con el stock consultado. Carrito de prueba: pagos desactivados. El stock puede cambiar.", false);
    guardar();
  }

  function revisarStock() {
    var actualSolicitud = ++solicitud;
    inventario = null;
    cargando = true;
    pintar();
    fetch(ENDPOINT, {cache:"no-store"})
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        if (actualSolicitud !== solicitud) return;
        if (!d || d.ok !== true || !Array.isArray(d.piezas)) throw new Error("Respuesta inválida");
        var mapa = new Map();
        d.piezas.forEach(function (p) {
          var referencia = p.referencia == null ? "" : String(p.referencia).trim();
          var stock = Number(p.stock), precio = Number(p.precio);
          if (!referencia || p.stock == null || p.stock === "" || !Number.isSafeInteger(stock) || stock < 0 ||
              p.precio == null || p.precio === "" || !Number.isFinite(precio) || precio < 0) return;
          if (/\bDYSON\b/i.test(String(p.nombre || "") + " " + String(p.descripcion || ""))) return;
          mapa.set(referencia, {stock:stock, precio:precio, nombre:String(p.nombre || "Cargador")});
        });
        inventario = mapa;
        cargando = false;
        pintar();
      })
      .catch(function () { if (actualSolicitud !== solicitud) return; inventario = null; cargando = false; pintar(); });
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) revisarStock(); });
  window.addEventListener("focus", function () { if (!document.hidden) revisarStock(); });
  pintar();
  revisarStock();
})();
