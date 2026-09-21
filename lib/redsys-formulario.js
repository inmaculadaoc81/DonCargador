// Construye exclusivamente el formulario de redirección, sin cobrar ni crear pedidos.
// Los valores `intento` DEBEN provenir de la base de datos del servidor y NO del navegador.
import { crearSolicitudFirmada } from "./redsys.js";

const URLS = Object.freeze({
  pruebas: "https://sis-t.redsys.es:25443/sis/realizarPago",
  real: "https://sis.redsys.es/sis/realizarPago",
});

function textoNoVacio(valor, nombre) {
  if (typeof valor !== "string" || !valor.trim()) throw new TypeError(`${nombre} inválido`);
  return valor;
}

function enteroPositivoEnTexto(valor, nombre) {
  if (typeof valor !== "string" || !/^[1-9][0-9]*$/.test(valor)) throw new TypeError(`${nombre} inválido`);
  return valor;
}

function urlHttps(valor, nombre) {
  const url = new URL(textoNoVacio(valor, nombre));
  if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new TypeError(`${nombre} debe ser una URL HTTPS segura`);
  return url.toString();
}

export function prepararFormularioRedireccion({ modo, claveBase64, intento, urls }) {
  if (!(modo in URLS)) throw new TypeError("Entorno Redsys inválido");
  if (!intento || typeof intento !== "object" || Array.isArray(intento)) throw new TypeError("Intento no persistido");
  if (!urls || typeof urls !== "object" || Array.isArray(urls)) throw new TypeError("URLs de retorno inválidas");

  const parametros = {
    DS_MERCHANT_ORDER: textoNoVacio(intento.numeroPedido, "Pedido"),
    DS_MERCHANT_MERCHANTCODE: enteroPositivoEnTexto(intento.comercio, "Comercio"),
    DS_MERCHANT_TERMINAL: enteroPositivoEnTexto(intento.terminal, "Terminal"),
    DS_MERCHANT_AMOUNT: enteroPositivoEnTexto(intento.importeCentimos, "Importe"),
    DS_MERCHANT_CURRENCY: "978", // EUR.
    DS_MERCHANT_TRANSACTIONTYPE: "0", // Pago inmediato, no preautorización.
    DS_MERCHANT_MERCHANTURL: urlHttps(urls.notificacion, "Notificación"),
    DS_MERCHANT_URLOK: urlHttps(urls.ok, "Retorno OK"),
    DS_MERCHANT_URLKO: urlHttps(urls.ko, "Retorno KO"),
  };
  if (!/^[A-Za-z0-9]{4,12}$/.test(parametros.DS_MERCHANT_ORDER)) throw new TypeError("Pedido Redsys inválido");
  const campos = crearSolicitudFirmada({ claveBase64, parametros });
  return { action: URLS[modo], method: "POST", campos };
}
