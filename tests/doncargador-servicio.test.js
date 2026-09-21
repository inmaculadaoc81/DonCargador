import test from 'node:test';
import assert from 'node:assert/strict';
import {crearServicioDonCargador,ErrorCompra} from '../backend/doncargador/servicio.js';

const pool = { query:async()=>({rows:[{nombre:'doncargador_redsys_pruebas'}]}),
  connect:async()=>{throw new Error('No debe conectar para entradas inválidas');} };
const config = {pool,modo:'pruebas',claveBase64:Buffer.from('0123456789abcdef01234567').toString('base64'),
  comercio:'048418743',terminal:'1',envioCentimos:500,
  apiOrigen:'https://api.ejemplo.es',tiendaOrigen:'https://cargadordeportatil.es'};
const comprador = {nombre:'Cliente de prueba',email:'prueba@example.org',telefono:'600000000',
  direccion:'Calle de Prueba 10',codigoPostal:'28015',ciudad:'Madrid',provincia:'Madrid',pais:'ES'};
const entrada = {requestId:'f05eb8c7-7b5b-4388-a159-60ff9ed0aeb6',comprador,
  lineas:[{referencia:'666',cantidad:1}]};

test('exige coste de envío explícito y URLs HTTPS sin rutas',()=>{
  assert.throws(()=>crearServicioDonCargador({...config,envioCentimos:undefined}),/envío/);
  assert.throws(()=>crearServicioDonCargador({...config,apiOrigen:'http://api.ejemplo.es'}),/HTTPS/);
  assert.throws(()=>crearServicioDonCargador({...config,apiOrigen:'https://api.ejemplo.es/ruta'}),/HTTPS/);
});
test('la BD de pruebas nunca puede confundirse con producción',async()=>{
  const servicio=crearServicioDonCargador({...config,modo:'real'});
  await assert.rejects(servicio.comprobarBase(),/BD kelatos/);
});
test('el pedido inválido se rechaza sin abrir transacciones',async()=>{
  const servicio=crearServicioDonCargador(config);
  await assert.rejects(servicio.crearPedido({...entrada,lineas:[{referencia:'666',cantidad:0}]}),ErrorCompra);
  await assert.rejects(servicio.crearPedido({...entrada,lineas:[{referencia:'666',cantidad:1},{referencia:'666',cantidad:1}]}),ErrorCompra);
  await assert.rejects(servicio.crearPedido({...entrada,comprador:{...comprador,pais:'US'}}),ErrorCompra);
  await assert.rejects(servicio.crearPedido({...entrada,requestId:'mal'}),ErrorCompra);
});
test('rechaza notificación no firmada sin consultar pedidos ni stock',async()=>{
  const servicio=crearServicioDonCargador(config);
  await assert.rejects(servicio.recibirNotificacion({Ds_MerchantParameters:'x'}),/no autenticada/);
});
test('estado del pedido solo admite UUID válido',async()=>{
  const servicio=crearServicioDonCargador(config);
  await assert.rejects(servicio.estadoPedido('1234'),ErrorCompra);
});
