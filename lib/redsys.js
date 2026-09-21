// Utilidades de servidor para TPV Virtual Redsys (redirección HMAC_SHA256_V1).
// No importar este módulo desde assets/ ni incluir claves de firma en el repositorio.
import { createCipheriv, createHmac, timingSafeEqual } from "node:crypto";

export const REDSYS_SIGNATURE_VERSION = "HMAC_SHA256_V1";

function claveTerminal(claveBase64) {
  if (typeof claveBase64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(claveBase64)) {
    throw new TypeError("Clave de firma no configurada correctamente");
  }
  const clave = Buffer.from(claveBase64, "base64");
  if (clave.toString("base64") !== claveBase64 || ![16, 24].includes(clave.length)) {
    throw new TypeError("Clave de firma no configurada correctamente");
  }
  // 3DES EDE con clave de 16 bytes (K1,K2,K1) o 24 bytes (K1,K2,K3).
  return clave.length === 16 ? Buffer.concat([clave, clave.subarray(0, 8)]) : clave;
}

function numeroPedido(numero) {
  if (typeof numero !== "string" || !/^[A-Za-z0-9]{4,12}$/.test(numero)) {
    throw new TypeError("Número de pedido Redsys inválido");
  }
  return numero;
}

function claveOperacion(claveBase64, pedido) {
  const numero = Buffer.from(numeroPedido(pedido), "ascii");
  const datos = Buffer.alloc(Math.ceil(numero.length / 8) * 8);
  numero.copy(datos);
  const cifrador = createCipheriv("des-ede3-cbc", claveTerminal(claveBase64), Buffer.alloc(8));
  cifrador.setAutoPadding(false); // Redsys: completar el número de pedido con bytes cero.
  return Buffer.concat([cifrador.update(datos), cifrador.final()]);
}

function parametrosCodificados(valor) {
  if (typeof valor !== "string" || !valor || !/^[A-Za-z0-9+/]+={0,2}$/.test(valor)) {
    throw new TypeError("Parámetros Redsys inválidos");
  }
  const bytes = Buffer.from(valor, "base64");
  if (bytes.toString("base64") !== valor || bytes.length > 16384) {
    throw new TypeError("Parámetros Redsys inválidos");
  }
  return bytes;
}

function firmaNormalizada(firma) {
  // Las notificaciones de Redsys pueden representar Base64 con el alfabeto URL-safe.
  if (typeof firma !== "string" || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(firma)) return null;
  const normalizada = firma.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Buffer.from(normalizada, "base64");
  if (bytes.length !== 32 || bytes.toString("base64").replace(/=+$/, "") !== normalizada.replace(/=+$/, "")) return null;
  return bytes;
}

export function firmarParametros({ claveBase64, numero, merchantParameters }) {
  parametrosCodificados(merchantParameters);
  return createHmac("sha256", claveOperacion(claveBase64, numero))
    .update(merchantParameters, "ascii").digest("base64");
}

export function crearSolicitudFirmada({ claveBase64, parametros }) {
  if (!parametros || typeof parametros !== "object" || Array.isArray(parametros)) {
    throw new TypeError("Datos de pago inválidos");
  }
  const numero = parametros.DS_MERCHANT_ORDER;
  numeroPedido(numero);
  const merchantParameters = Buffer.from(JSON.stringify(parametros), "utf8").toString("base64");
  return {
    Ds_SignatureVersion: REDSYS_SIGNATURE_VERSION,
    Ds_MerchantParameters: merchantParameters,
    Ds_Signature: firmarParametros({ claveBase64, numero, merchantParameters }),
  };
}

export function verificarNotificacion({ claveBase64, signatureVersion, merchantParameters, signature }) {
  // Solo verifica autenticidad. El consumidor DEBE validar además comercio, terminal,
  // número de pedido, importe, moneda, operación y resultado frente al pedido persistido.
  if (signatureVersion !== REDSYS_SIGNATURE_VERSION) return { valida: false };
  const recibida = firmaNormalizada(signature);
  if (!recibida) return { valida: false };
  let datos;
  try {
    const bytes = parametrosCodificados(merchantParameters);
    datos = JSON.parse(bytes.toString("utf8"));
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) return { valida: false };
    const numero = datos.Ds_Order ?? datos.DS_ORDER;
    const esperada = Buffer.from(firmarParametros({ claveBase64, numero, merchantParameters }), "base64");
    if (!timingSafeEqual(recibida, esperada)) return { valida: false };
  } catch {
    return { valida: false };
  }
  return { valida: true, datos };
}
