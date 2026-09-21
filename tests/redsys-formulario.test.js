import test from "node:test";
import assert from "node:assert/strict";
import { prepararFormularioRedireccion } from "../lib/redsys-formulario.js";
import { verificarNotificacion, REDSYS_SIGNATURE_VERSION } from "../lib/redsys.js";

// Clave inventada para pruebas unitarias; no corresponde a ningún TPV.
const claveBase64 = Buffer.from("0123456789abcdef01234567", "ascii").toString("base64");
const intento = Object.freeze({ numeroPedido: "1234ABCD", comercio: "048418743", terminal: "1", importeCentimos: "2599" });
const urls = Object.freeze({
  notificacion: "https://api.example.test/pagos/notificacion",
  ok: "https://tienda.example.test/pago/ok",
  ko: "https://tienda.example.test/pago/ko",
});

test("prepara POST firmado para pruebas y mantiene los datos del intento", () => {
  const formulario = prepararFormularioRedireccion({ modo: "pruebas", claveBase64, intento, urls });
  assert.equal(formulario.action, "https://sis-t.redsys.es:25443/sis/realizarPago");
  assert.equal(formulario.method, "POST");
  assert.equal(formulario.campos.Ds_SignatureVersion, REDSYS_SIGNATURE_VERSION);
  const p = JSON.parse(Buffer.from(formulario.campos.Ds_MerchantParameters, "base64").toString("utf8"));
  assert.deepEqual(p, {
    DS_MERCHANT_ORDER: "1234ABCD",
    DS_MERCHANT_MERCHANTCODE: "048418743",
    DS_MERCHANT_TERMINAL: "1",
    DS_MERCHANT_AMOUNT: "2599",
    DS_MERCHANT_CURRENCY: "978",
    DS_MERCHANT_TRANSACTIONTYPE: "0",
    DS_MERCHANT_MERCHANTURL: urls.notificacion,
    DS_MERCHANT_URLOK: urls.ok,
    DS_MERCHANT_URLKO: urls.ko,
  });
  assert.equal(verificarNotificacion({ claveBase64, signatureVersion: formulario.campos.Ds_SignatureVersion,
    merchantParameters: formulario.campos.Ds_MerchantParameters,
    signature: formulario.campos.Ds_Signature }).valida, false);
  // La firma de la petición se verifica usando el identificador DS_MERCHANT_ORDER;
  // verificarNotificacion está destinada exclusivamente a la respuesta bancaria DS_ORDER.
});

test("usa URL real solo cuando se pide explícitamente", () => {
  const formulario = prepararFormularioRedireccion({ modo: "real", claveBase64, intento, urls });
  assert.equal(formulario.action, "https://sis.redsys.es/sis/realizarPago");
});

test("rechaza modo, importe, pedido y URLs inseguras", () => {
  const crear = cambios => prepararFormularioRedireccion({ modo: "pruebas", claveBase64, intento, urls, ...cambios });
  assert.throws(() => crear({ modo: "desconocido" }));
  assert.throws(() => crear({ intento: { ...intento, importeCentimos: "0" } }));
  assert.throws(() => crear({ intento: { ...intento, numeroPedido: "mal!" } }));
  assert.throws(() => crear({ urls: { ...urls, notificacion: "http://inseguro.test/" } }));
  assert.throws(() => crear({ urls: { ...urls, ok: "https://usuario:clave@example.test/" } }));
});
