import test from 'node:test';
import assert from 'node:assert/strict';
import { crearSolicitudFirmada } from '../lib/redsys.js';

// Vector oficial del manual Redsys REST 4.0.1.1, anexo 2, p. 62.
// Clave GENÉRICA DE PRUEBAS publicada por Redsys; NO es un secreto de Kelatos.
// https://pagosonline.redsys.es/download/1738/
test('firma HMAC SHA-256 V1 coincide con el vector oficial de Redsys',()=>{
  const parametros = {
    DS_MERCHANT_MERCHANTCODE:'999008881',
    DS_MERCHANT_TERMINAL:'1',
    DS_MERCHANT_ORDER:'06080232580',
    DS_MERCHANT_AMOUNT:'100',
    DS_MERCHANT_CURRENCY:'978',
    DS_MERCHANT_TRANSACTIONTYPE:'3',
  };
  const result=crearSolicitudFirmada({
    claveBase64:'sq7HjrUOBfKmC576ILgskD5srU870gJ7',parametros,
  });
  assert.equal(result.Ds_Signature,
    'GmHwTovthyrztLs7D77GflclBzsANderHe3zFF6JiZQ=');
});
