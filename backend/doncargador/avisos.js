// Procesar avisos DESPUÉS del COMMIT del pago: un fallo SMTP nunca deshace un cobro.
// Entrega al menos una vez; si el proceso cae después del SMTP y antes de marcar enviado,
// puede producirse un duplicado. El Message-ID estable ayuda a identificarlo.
export async function enviarAvisosDonCargador({pool,transporter,desde,destino,limite=5}) {
  if (!pool?.connect || !transporter?.sendMail || !desde || !destino) {
    throw new Error('Configuración de avisos incompleta');
  }
  let procesados=0;
  while(procesados < Math.min(20,Math.max(1,limite))) {
    const client = await pool.connect();
    let aviso;
    try {
      await client.query('BEGIN');
      const q = await client.query(
        `SELECT a.id,a.pedido_id,a.tipo,p.comprador,p.importe_total
           FROM kelatos_app.dc_avisos a JOIN kelatos_app.dc_pedidos p ON p.id=a.pedido_id
          WHERE a.intentos < 10 AND (
            a.estado='pendiente' OR
            (a.estado='error' AND a.reclamado_en < clock_timestamp()-interval '5 minutes') OR
            (a.estado='enviando' AND a.reclamado_en < clock_timestamp()-interval '15 minutes')
          ) ORDER BY a.creado_en FOR UPDATE OF a SKIP LOCKED LIMIT 1`);
      aviso = q.rows[0];
      if (!aviso) { await client.query('COMMIT'); break; }
      await client.query(
        `UPDATE kelatos_app.dc_avisos SET estado='enviando',
          reclamado_en=clock_timestamp(),intentos=intentos+1,ultimo_error=NULL WHERE id=$1`,[aviso.id]);
      await client.query('COMMIT');
    } catch(e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
    const l = await pool.query(
      `SELECT referencia,nombre,cantidad,precio_unitario
         FROM kelatos_app.dc_pedido_lineas WHERE pedido_id=$1 ORDER BY referencia`,[aviso.pedido_id]);
    const c = aviso.comprador;
    const detalle=l.rows.map(x=>`${x.cantidad} × ${x.nombre} [${x.referencia}] — ${x.precio_unitario} € unidad`).join('\n');
    const revision = aviso.tipo==='revision_stock';
    const texto = [revision ? 'PAGO RECIBIDO: PEDIDO SIN STOCK. REVISAR Y GESTIONAR DEVOLUCIÓN.' : 'PEDIDO PAGADO: PREPARAR ENVÍO.',
      `Pedido: ${aviso.pedido_id}`,`Total cobrado: ${aviso.importe_total} €`,
      `Nombre: ${c.nombre}`,`Email: ${c.email}`,`Teléfono: ${c.telefono}`,
      `Dirección: ${c.direccion}`,`Código postal: ${c.codigoPostal}`,
      `Ciudad: ${c.ciudad}`,`Provincia: ${c.provincia}`,`País: ${c.pais}`,
      '', 'Productos:', detalle].join('\n');
    try {
      await transporter.sendMail({from:desde,to:destino,
        subject:revision ? `DonCargador: REVISAR PAGO SIN STOCK ${aviso.pedido_id}` : `DonCargador: nuevo pedido pagado ${aviso.pedido_id}`,
        text:texto,messageId:`<doncargador-${aviso.pedido_id}-${aviso.tipo}@cargadordeportatil.es>`});
      await pool.query(
        `UPDATE kelatos_app.dc_avisos SET estado='enviado',enviado_en=clock_timestamp(),ultimo_error=NULL
          WHERE id=$1 AND estado='enviando'`,[aviso.id]);
    } catch(e) {
      await pool.query(
        `UPDATE kelatos_app.dc_avisos SET estado='error',ultimo_error=$2
          WHERE id=$1 AND estado='enviando'`,[aviso.id,String(e?.message||'Error SMTP').slice(0,300)]);
    }
    procesados++;
  }
  return procesados;
}
