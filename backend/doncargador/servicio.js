// Backend exclusivo de DonCargador; importar en la API de Kelatos, NUNCA desde la web.
// Sin reservas: un segundo cliente puede pagar la última unidad y requerir devolución.
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { prepararFormularioRedireccion } from '../../lib/redsys-formulario.js';
import { verificarNotificacion } from '../../lib/redsys.js';
import { validarPagoNotificado } from '../../lib/redsys-pedido.js';

export class ErrorCompra extends Error {
  constructor(mensaje, codigo = 400) { super(mensaje); this.status = codigo; }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REDSYS_ORDER = /^[0-9]{4}[A-Za-z0-9]{0,8}$/;
const MAX_CENTIMOS = 999999999999;
function campo(valor, min, max, etiqueta) {
  if (typeof valor !== 'string' || valor.trim().length < min || valor.trim().length > max) {
    throw new ErrorCompra(`${etiqueta} inválido`);
  }
  return valor.trim();
}
function validarEntrada(entrada) {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada) || !UUID.test(entrada.requestId)) {
    throw new ErrorCompra('Solicitud inválida');
  }
  if (!Array.isArray(entrada.lineas) || entrada.lineas.length < 1 || entrada.lineas.length > 20) {
    throw new ErrorCompra('El carrito debe contener entre 1 y 20 referencias');
  }
  const usadas = new Set();
  const lineas = entrada.lineas.map(l => {
    if (!l || typeof l !== 'object' || Array.isArray(l)) throw new ErrorCompra('Línea inválida');
    const referencia = campo(l.referencia, 1, 80, 'Referencia');
    if (!Number.isSafeInteger(l.cantidad) || l.cantidad < 1 || l.cantidad > 20 || usadas.has(referencia)) {
      throw new ErrorCompra('Cantidad o referencia duplicada');
    }
    usadas.add(referencia);
    return { referencia, cantidad: l.cantidad };
  }).sort((a,b) => a.referencia.localeCompare(b.referencia, 'en'));
  const c = entrada.comprador;
  if (!c || typeof c !== 'object' || Array.isArray(c)) throw new ErrorCompra('Datos del comprador inválidos');
  const comprador = {
    nombre: campo(c.nombre, 2, 120, 'Nombre'),
    email: campo(c.email, 5, 254, 'Correo'),
    telefono: campo(c.telefono, 6, 30, 'Teléfono'),
    direccion: campo(c.direccion, 5, 200, 'Dirección'),
    codigoPostal: campo(c.codigoPostal, 4, 12, 'Código postal'),
    ciudad: campo(c.ciudad, 2, 100, 'Ciudad'),
    provincia: campo(c.provincia, 2, 100, 'Provincia'),
    pais: campo(c.pais, 2, 2, 'País').toUpperCase(),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(comprador.email) || comprador.pais !== 'ES') {
    throw new ErrorCompra('Correo o país no admitido');
  }
  return { requestId: entrada.requestId.toLowerCase(), lineas, comprador };
}
function origenHttps(origen, nombre) {
  const u = new URL(origen);
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash || u.pathname !== '/') {
    throw new Error(`${nombre}: indicar solo el origen HTTPS (sin rutas)`);
  }
  return u.origin;
}
function normalizarConfig(c) {
  if (!c || !c.pool || typeof c.pool.connect !== 'function') throw new Error('Pool PostgreSQL obligatorio');
  if (!['pruebas','real'].includes(c.modo)) throw new Error('Modo Redsys no configurado');
  if (typeof c.claveBase64 !== 'string' || !c.claveBase64) throw new Error('Clave Redsys no configurada');
  if (typeof c.comercio !== 'string' || !/^[0-9]{1,12}$/.test(c.comercio)) throw new Error('Comercio inválido');
  if (typeof c.terminal !== 'string' || !/^[0-9]{1,12}$/.test(c.terminal)) throw new Error('Terminal inválido');
  if (!Number.isSafeInteger(c.envioCentimos) || c.envioCentimos < 0 || c.envioCentimos > 100000) {
    throw new Error('El importe del envío debe configurarse explícitamente en céntimos');
  }
  const apiOrigen = origenHttps(c.apiOrigen, 'API pública');
  const tiendaOrigen = origenHttps(c.tiendaOrigen, 'Tienda');
  return { ...c, apiOrigen, tiendaOrigen };
}
function urls(c) {
  return { notificacion: `${c.apiOrigen}/publico/doncargador/notificacion`,
    ok: `${c.tiendaOrigen}/pago-ok.html`, ko: `${c.tiendaOrigen}/pago-ko.html` };
}
function numeroRedsys() {
  return String(randomInt(1000,10000)) + randomBytes(4).toString('hex').toUpperCase();
}
function camposFormulario(c, intento) {
  return prepararFormularioRedireccion({ modo:c.modo, claveBase64:c.claveBase64,
    intento:{ numeroPedido:intento.numero_redsys, comercio:intento.comercio,
      terminal:intento.terminal, importeCentimos:String(intento.importe_centimos) }, urls:urls(c) });
}
function hashSolicitud(v, envioCentimos) {
  return createHash('sha256').update(JSON.stringify({ ...v, envioCentimos })).digest('hex');
}
async function consultaPedido(client, id) {
  const q = await client.query('SELECT id,estado FROM kelatos_app.dc_pedidos WHERE id=$1', [id]);
  return q.rows[0];
}

export function crearServicioDonCargador(config) {
  const c = normalizarConfig(config);
  async function comprobarBase() {
    const r = await c.pool.query('SELECT current_database() AS nombre');
    const esperada = c.modo === 'real' ? 'kelatos' : 'doncargador_redsys_pruebas';
    if (r.rows[0]?.nombre !== esperada) throw new Error(`Entorno Redsys ${c.modo}: se requiere BD ${esperada}`);
  }
  async function crearPedido(entrada) {
    const v = validarEntrada(entrada);
    const huella = hashSolicitud(v, c.envioCentimos);
    const client = await c.pool.connect();
    try {
      await client.query('BEGIN');
      let existente = await client.query(
        `SELECT p.id,p.request_hash,i.numero_redsys,i.comercio,i.terminal,i.importe_centimos
           FROM kelatos_app.dc_pedidos p JOIN kelatos_app.dc_intentos i ON i.pedido_id=p.id
          WHERE p.request_id=$1`, [v.requestId]);
      if (existente.rows.length) {
        if (existente.rows[0].request_hash !== huella) throw new ErrorCompra('Solicitud reutilizada con datos diferentes',409);
        await client.query('COMMIT');
        return { pedidoId:existente.rows[0].id, formulario:camposFormulario(c,existente.rows[0]) };
      }
      let totalProductos = 0;
      const lineas = [];
      for (const l of v.lineas) {
        const r = await client.query(
          `SELECT nombre,descripcion,categoria,activo,stock_disponible,
                  round((coalesce(precio_cliente,0)+coalesce(mano_obra,0))*1.21,2) AS precio
             FROM kelatos_app.stock_piezas WHERE referencia=$1`, [l.referencia]);
        const p = r.rows[0];
        if (!p || p.categoria !== 'CARGADOR' || p.activo !== true ||
            /dyson/i.test(`${p.nombre || ''} ${p.descripcion || ''}`) ||
            !p.nombre || Number(p.stock_disponible) < l.cantidad) {
          throw new ErrorCompra(`Cargador agotado o no disponible: ${l.referencia}`,409);
        }
        const unitario = Math.round(Number(p.precio)*100);
        if (!Number.isSafeInteger(unitario) || unitario <= 0) throw new ErrorCompra('Precio no disponible',409);
        totalProductos += unitario*l.cantidad;
        if (!Number.isSafeInteger(totalProductos) || totalProductos > MAX_CENTIMOS) throw new ErrorCompra('Importe fuera de rango');
        lineas.push({ ...l, nombre:p.nombre, precio:p.precio });
      }
      const total = totalProductos + c.envioCentimos;
      if (!Number.isSafeInteger(total) || total > MAX_CENTIMOS) throw new ErrorCompra('Importe fuera de rango');
      const pedido = await client.query(
        `INSERT INTO kelatos_app.dc_pedidos
           (request_id,request_hash,comprador,importe_productos,envio_centimos,importe_total)
         VALUES ($1,$2,$3::jsonb,$4::numeric,$5,$6::numeric)
         ON CONFLICT(request_id) DO NOTHING RETURNING id`,
        [v.requestId,huella,JSON.stringify(v.comprador),(totalProductos/100).toFixed(2),
          c.envioCentimos,(total/100).toFixed(2)]);
      if (!pedido.rows.length) {
        existente = await client.query(
          `SELECT p.id,p.request_hash,i.numero_redsys,i.comercio,i.terminal,i.importe_centimos
             FROM kelatos_app.dc_pedidos p JOIN kelatos_app.dc_intentos i ON i.pedido_id=p.id
            WHERE p.request_id=$1`,[v.requestId]);
        if (!existente.rows.length || existente.rows[0].request_hash !== huella) {
          throw new ErrorCompra('Solicitud duplicada o incompatible',409);
        }
        await client.query('COMMIT');
        return {pedidoId:existente.rows[0].id,formulario:camposFormulario(c,existente.rows[0])};
      }
      const pedidoId = pedido.rows[0].id;
      for (const l of lineas) {
        await client.query(
          `INSERT INTO kelatos_app.dc_pedido_lineas(pedido_id,referencia,nombre,cantidad,precio_unitario)
           VALUES ($1,$2,$3,$4,$5)`,[pedidoId,l.referencia,l.nombre,l.cantidad,l.precio]);
      }
      const intento = await client.query(
        `INSERT INTO kelatos_app.dc_intentos
           (pedido_id,numero_redsys,comercio,terminal,importe_centimos)
         VALUES ($1,$2,$3,$4,$5) RETURNING numero_redsys,comercio,terminal,importe_centimos`,
        [pedidoId,numeroRedsys(),c.comercio,c.terminal,total]);
      const formulario = camposFormulario(c,intento.rows[0]);
      await client.query('COMMIT');
      return {pedidoId,formulario};
    } catch(e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  }

  async function recibirNotificacion(body) {
    // No se consulta ninguna fila basándose en datos del navegador sin validar primero su firma.
    const firma = verificarNotificacion({ claveBase64:c.claveBase64,
      signatureVersion:body?.Ds_SignatureVersion, merchantParameters:body?.Ds_MerchantParameters,
      signature:body?.Ds_Signature });
    if (!firma.valida) throw new ErrorCompra('Notificación no autenticada',400);
    const numero = firma.datos.Ds_Order ?? firma.datos.DS_ORDER;
    if (typeof numero !== 'string' || !REDSYS_ORDER.test(numero)) throw new ErrorCompra('Número Redsys inválido',400);
    const client = await c.pool.connect();
    try {
      await client.query('BEGIN');
      const q = await client.query(
        `SELECT i.*,p.estado AS estado_pedido,p.id AS id_pedido
           FROM kelatos_app.dc_intentos i JOIN kelatos_app.dc_pedidos p ON p.id=i.pedido_id
          WHERE i.numero_redsys=$1 FOR UPDATE OF i,p`,[numero]);
      const intento = q.rows[0];
      if (!intento) throw new ErrorCompra('Operación desconocida',404);
      const comprobacion = validarPagoNotificado({ claveBase64:c.claveBase64,
        signatureVersion:body.Ds_SignatureVersion,merchantParameters:body.Ds_MerchantParameters,
        signature:body.Ds_Signature,esperado:{ numeroPedido:intento.numero_redsys,
          comercio:intento.comercio,terminal:intento.terminal,
          importeCentimos:String(intento.importe_centimos),moneda:intento.moneda } });
      const respuesta = firma.datos.Ds_Response ?? firma.datos.DS_RESPONSE;
      if (!comprobacion.autorizado) {
        if (comprobacion.motivo !== 'pago_no_autorizado') {
          throw new ErrorCompra('Datos de notificación no coincidentes',400);
        }
        if (intento.estado !== 'autorizado') {
          await client.query(
            `UPDATE kelatos_app.dc_intentos SET estado='denegado',respuesta_banco=$2,
              ultima_notificacion_en=clock_timestamp() WHERE id=$1`,[intento.id,String(respuesta)]);
        }
        await client.query('COMMIT');
        return {estado:intento.estado === 'autorizado' ? 'ya_autorizado' : 'denegado'};
      }
      await client.query(
        `UPDATE kelatos_app.dc_intentos SET estado='autorizado',respuesta_banco=$2,
          ultima_notificacion_en=clock_timestamp(),autorizado_en=coalesce(autorizado_en,clock_timestamp())
         WHERE id=$1`,[intento.id,String(respuesta)]);
      if (intento.estado_pedido === 'pagado' || intento.estado_pedido === 'revision_stock') {
        await client.query('COMMIT');
        return {estado:intento.estado_pedido};
      }
      const r = await client.query(
        `SELECT referencia,cantidad FROM kelatos_app.dc_pedido_lineas
          WHERE pedido_id=$1 ORDER BY referencia`,[intento.id_pedido]);
      if (r.rows.length < 1) throw new Error('Pedido sin líneas: requiere intervención');
      let suficiente = intento.estado_pedido === 'pendiente_pago';
      for (const l of r.rows) {
        const s = await client.query(
          `SELECT categoria,activo,stock_disponible,nombre,descripcion
             FROM kelatos_app.stock_piezas WHERE referencia=$1 FOR UPDATE`,[l.referencia]);
        const p = s.rows[0];
        if (!p || p.categoria !== 'CARGADOR' || p.activo !== true ||
            /dyson/i.test(`${p.nombre || ''} ${p.descripcion || ''}`) ||
            Number(p.stock_disponible) < l.cantidad) suficiente = false;
      }
      if (suficiente) {
        for (const l of r.rows) {
          const descuento = await client.query(
            `UPDATE kelatos_app.stock_piezas SET stock_disponible=stock_disponible-$2
              WHERE referencia=$1 AND stock_disponible >= $2 AND activo=true AND categoria='CARGADOR'
                AND nombre !~* 'dyson' AND coalesce(descripcion,'') !~* 'dyson'`,
            [l.referencia,l.cantidad]);
          if (descuento.rowCount !== 1) throw new Error('Descuento incompleto: transacción revertida');
        }
      }
      const estado = suficiente ? 'pagado' : 'revision_stock';
      await client.query(
        `UPDATE kelatos_app.dc_pedidos SET estado=$2,confirmado_en=clock_timestamp(),
          actualizado_en=clock_timestamp() WHERE id=$1`,[intento.id_pedido,estado]);
      await client.query(
        `INSERT INTO kelatos_app.dc_avisos(pedido_id,tipo) VALUES ($1,$2)
          ON CONFLICT(pedido_id,tipo) DO NOTHING`,
        [intento.id_pedido,suficiente ? 'pedido_pagado' : 'revision_stock']);
      await client.query('COMMIT');
      return {estado};
    } catch(e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  }
  async function estadoPedido(id) {
    if (typeof id !== 'string' || !UUID.test(id)) throw new ErrorCompra('Pedido inválido');
    const pedido = await consultaPedido(c.pool,id);
    if (!pedido) throw new ErrorCompra('Pedido no encontrado',404);
    return {estado:pedido.estado};
  }
  return { comprobarBase,crearPedido,recibirNotificacion,estadoPedido };
}
