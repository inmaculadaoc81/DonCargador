import test from "node:test";
import assert from "node:assert/strict";
import { firmarParametros, REDSYS_SIGNATURE_VERSION } from "../lib/redsys.js";
import { validarPagoNotificado } from "../lib/redsys-pedido.js";

const claveBase64 = Buffer.from("0123456789abcdef01234567", "ascii").toString("base64");
const esperado = Object.freeze({ numeroPedido: "1234ABCD", comercio: "048418743", terminal: "1", importeCentimos: "2599", moneda: "978" });
const base = Object.freeze({ Ds_Order: "1234ABCD", Ds_MerchantCode: "048418743", Ds_Terminal: "1", Ds_Amount: "2599", Ds_Currency: "978", Ds_TransactionType: "0", Ds_Response: "0000" });
function firmada(datos = base) {
  const merchantParameters = Buffer.from(JSON.stringify(datos), "utf8").toString("base64");
  return { claveBase64, signatureVersion: REDSYS_SIGNATURE_VERSION, merchantParameters,
    signature: firmarParametros({ claveBase64, numero: datos.Ds_Order, merchantParameters }), esperado };
}
test("acepta un pago firmado con todos los datos coincidentes", () => {
  assert.deepEqual(validarPagoNotificado(firmada()), { autorizado: true, motivo: "pago_autorizado" });
});
test("rechaza notificaciones válidamente firmadas con número, comercio, terminal o importe distintos", () => {
  for (const [clave, valor] of [["Ds_Order", "OTRO1234"], ["Ds_MerchantCode", "000000001"], ["Ds_Terminal", "2"], ["Ds_Amount", "1"], ["Ds_Currency", "840"], ["Ds_TransactionType", "1"]]) {
    assert.deepEqual(validarPagoNotificado(firmada({ ...base, [clave]: valor })), { autorizado: false, motivo: "datos_no_coinciden" }, clave);
  }
});
test("rechaza pagos denegados, respuesta ausente y formato de respuesta inválido", () => {
  assert.equal(validarPagoNotificado(firmada({ ...base, Ds_Response: "0101" })).autorizado, false);
  assert.equal(validarPagoNotificado(firmada({ ...base, Ds_Response: "9999" })).autorizado, false);
  assert.equal(validarPagoNotificado(firmada({ ...base, Ds_Response: "no" })).autorizado, false);
  const { Ds_Response, ...sinRespuesta } = base;
  assert.equal(validarPagoNotificado(firmada(sinRespuesta)).autorizado, false);
});
test("rechaza campos duplicados con distintas mayúsculas o valores no escalares", () => {
  assert.equal(validarPagoNotificado(firmada({ ...base, ds_amount: "1" })).autorizado, false);
  assert.equal(validarPagoNotificado(firmada({ ...base, Ds_Amount: { centimos: 2599 } })).autorizado, false);
});
test("requiere firma válida y un intento de pago conocido en el servidor", () => {
  assert.deepEqual(validarPagoNotificado({ ...firmada(), signature: "A".repeat(43) + "=" }), { autorizado: false, motivo: "firma_invalida" });
  assert.deepEqual(validarPagoNotificado({ ...firmada(), esperado: null }), { autorizado: false, motivo: "pedido_no_encontrado" });
});
