// Punto de montaje único en la API de Kelatos. Importarlo no activa cobros.
import nodemailer from 'nodemailer';
import { crearRouterDonCargador } from './router.js';
import { enviarAvisosDonCargador } from './avisos.js';

export function instalarDonCargador({app,pool,env=process.env}) {
  if (!app?.use || !pool?.connect) throw new Error('Express y Pool son obligatorios');
  const solicitado = env.DC_PAGOS_HABILITADOS === 'true';
  const modoTestCorreo = ['1','true','si'].includes(String(env.MAIL_MODO_TEST || '').toLowerCase());
  const destino=modoTestCorreo ? env.MAIL_EMAIL_PRUEBA : env.DC_AVISOS_EMAIL;
  const smtpListo = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && destino);
  // Si cualquier requisito falla, montar ruta que devuelve 503 y mantener el resto de Kelatos.
  let habilitado = solicitado && smtpListo;
  let router;
  try {
    router = crearRouterDonCargador({pool,env:{...env,DC_PAGOS_HABILITADOS:habilitado?'true':'false'}});
  } catch {
    console.error('[DonCargador] configuración inválida; pagos deshabilitados');
    habilitado = false;
    router = crearRouterDonCargador({pool,env:{...env,DC_PAGOS_HABILITADOS:'false'}});
  }
  app.use('/publico/doncargador',router);
  if (!habilitado) {
    if (solicitado) console.error('[DonCargador] pago deshabilitado: falta configuración SMTP, Redsys o destinatario');
    return {habilitado:false,detener:()=>{}};
  }
  const puerto = Number(env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host:env.SMTP_HOST,port:puerto,secure:puerto === 465,
    auth:{user:env.SMTP_USER,pass:env.SMTP_PASS},
  });
  let trabajando=false;
  async function trabajar() {
    if (trabajando) return;
    trabajando=true;
    try {await enviarAvisosDonCargador({pool,transporter,
      desde:`DonCargador <${env.SMTP_USER}>`,destino,limite:5});}
    catch(e) {console.error('[DonCargador] aviso pendiente por error interno',e?.name||'Error');}
    finally {trabajando=false;}
  }
  const timer=setInterval(()=>{void trabajar();},60000);
  timer.unref?.();
  void trabajar();
  return {habilitado:true,detener:()=>clearInterval(timer)};
}
