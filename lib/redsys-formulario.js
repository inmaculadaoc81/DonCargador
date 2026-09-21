// Formulario Redsys para servidor: todos los datos del intento proceden de PostgreSQL.
import { crearSolicitudFirmada } from "./redsys.js";

const URLS = Object.freeze({
  pruebas: "https://sis-t.redsys.es:25443/sis/realizarPago",
  real: "https://sis.redsys.es/sis/realizarPago",
});

function enteroTexto(valor, nombre, admiteCeroInicial = false) {
  if (typeof valor !== "string" || !/^[0-9]{1,12}$/.test(valor) || BigInt(valor) === 0n ||
      (!admiteCeroInicial && valor[0] === "0")) throw new TypeError(`${nombre} inválido`);
  return valor;
}

function urlHttps(valor, nombre) {
  if (typeof valor !== "string" || !valor.trim()) throw new TypeError(`${nombre} inválida`);
  const url = new URL(valor);
  if (url.protocol !== "https:" || url.username || url.password || url.hash || url.search) {
    throw new TypeError(`${nombre} debe ser HTTPS sin credenciales ni parámetros`);
  }
  return url.toString();
}

export function prepararFormularioRedireccion({ modo, claveBase64, intento, urls }) {
  if (!Object.hasOwn(URLS, modo)) throw new TypeError("Entorno Redsys inválido");
  if (!intento || typeof intento !== "object" || Array.isArray(intento)) throw new TypeError("Intento no persistido");
  if (!urls || typeof urls !== "object" || Array.isArray(urls)) throw new TypeError("URLs de retorno inválidas");
  const numero = intento.numeroPedido;
  if (typeof numero !== "string" || !/^[0-9]{4}[A-Za-z0-9]{0,8}$/.test(numero)) {
    throw new TypeError("Número de pedido Redsys inválido");
  }
  const parametros = {
    DS_MERCHANT_ORDER: numero,
    DS_MERCHANT_MERCHANTCODE: enteroTexto(intento.comercio, "Comercio", true),
    DS_MERCHANT_TERMINAL: enteroTexto(intento.terminal, "Terminal", true),
    DS_MERCHANT_AMOUNT: enteroTexto(intento.importeCentimos, "Importe"),
    DS_MERCHANT_CURRENCY: "978",
    DS_MERCHANT_TRANSACTIONTYPE: "0",
    DS_MERCHANT_MERCHANTURL: urlHttps(urls.notificacion, "Notificación"),
    DS_MERCHANT_URLOK: urlHttps(urls.ok, "Retorno OK"),
    DS_MERCHANT_URLKO: urlHttps(urls.ko, "Retorno KO"),
  };
  return { action: URLS[modo], method: "POST", campos: crearSolicitudFirmada({ claveBase64, parametros }) };
}
