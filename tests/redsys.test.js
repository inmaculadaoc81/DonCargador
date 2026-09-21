import test from "node:test";
import assert from "node:assert/strict";
import {
  REDSYS_SIGNATURE_VERSION,
  crearSolicitudFirmada,
  firmarParametros,
  verificarNotificacion,
} from "../lib/redsys.js";

// Clave inventada únicamente para tests; no es la clave de un comercio.
const claveBase64 = Buffer.from("0123456789abcdef01234567", "ascii").toString("base64");
const pedido = "1234ABCD";

function respuesta(datos = { Ds_Order: pedido, Ds_Amount: "2599", Ds_Response: "0000" }) {
  const merchantParameters = Buffer.from(JSON.stringify(datos), "utf8").toString("base64");
  return {
    claveBase64,
    signatureVersion: REDSYS_SIGNATURE_VERSION,
    merchantParameters,
    signature: firmarParametros({ claveBase64, numero: datos.Ds_Order, merchantParameters }),
  };
}

test("genera los tres campos de redirección con una firma reproducible", () => {
  const parametros = {
    DS_MERCHANT_ORDER: pedido,
    DS_MERCHANT_AMOUNT: "2599",
    DS_MERCHANT_CURRENCY: "978",
    DS_MERCHANT_TRANSACTIONTYPE: "0",
    DS_MERCHANT_TERMINAL: "1",
  };
  const solicitud = crearSolicitudFirmada({ claveBase64, parametros });
  assert.equal(solicitud.Ds_SignatureVersion, REDSYS_SIGNATURE_VERSION);
  assert.deepEqual(JSON.parse(Buffer.from(solicitud.Ds_MerchantParameters, "base64").toString()), parametros);
  assert.equal(solicitud.Ds_Signature, firmarParametros({
    claveBase64, numero: pedido, merchantParameters: solicitud.Ds_MerchantParameters,
  }));
});

test("acepta una notificación firmada y conserva sus datos para validación posterior", () => {
  const notificacion = respuesta();
  const resultado = verificarNotificacion(notificacion);
  assert.equal(resultado.valida, true);
  assert.equal(resultado.datos.Ds_Amount, "2599");
});

test("rechaza firma manipulada, versión incorrecta y respuesta con importe cambiado", () => {
  const notificacion = respuesta();
  assert.equal(verificarNotificacion({ ...notificacion, signature: "A".repeat(43) + "=" }).valida, false);
  assert.equal(verificarNotificacion({ ...notificacion, signatureVersion: "OTRA" }).valida, false);
  const alterada = Buffer.from(JSON.stringify({ Ds_Order: pedido, Ds_Amount: "1", Ds_Response: "0000" })).toString("base64");
  assert.equal(verificarNotificacion({ ...notificacion, merchantParameters: alterada }).valida, false);
});

test("rechaza números de pedido y claves con formato inválido", () => {
  assert.throws(() => crearSolicitudFirmada({ claveBase64, parametros: { DS_MERCHANT_ORDER: "bad!" } }));
  assert.throws(() => crearSolicitudFirmada({ claveBase64: "no-es-una-clave", parametros: { DS_MERCHANT_ORDER: pedido } }));
});

test("admite firma URL-safe de la notificación", () => {
  const notificacion = respuesta();
  notificacion.signature = notificacion.signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  assert.equal(verificarNotificacion(notificacion).valida, true);
});
