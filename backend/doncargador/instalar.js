// Punto de montaje único en la API de Kelatos. Nunca se activa por importar este archivo.
import nodemailer from 'nodemailer';
import { crearRouterDonCargador } from './router.js';
import { enviarAvisosDonCargador } from './avisos.js';

export function instalarDonCargador({app,pool,env=process.env}) {
  if (!app?.use || !pool?.connect) throw new Error('Express y Pool son obligatorios');
  const solicitado = env.DC_PAGOS_HABILITADOS === 'true';
  const smtpListo = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.DC_AVISOS_EMAIL);
  // Ante una configuración incompleta o inválida, conservar operativos los demás servicios
  // de Kelatos, pero el endpoint de pago devuelve 503 y no se abre a los compradores.
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
    if (solicitado) console.error('[DonCargador] pago deshabilitado: falta configuración SMTP o Redsys');
    return {habilitado:false,detener:()=>{}};
  }
  const puerto = Number(env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host:env.SMTP_HOST,port:puerto,secure:puerto === 465,
    auth:{user:env.SMTP_USER,pass:env.SMTP_PASS},
  });
  const pruebasCorreo = ['1','true','SI','si'].includes(String(env.MAIL_MODO_TEST || ''));
  const destino=pruebasCorreo ? env.MAIL_EMAIL_PRUEBA : env.DC_AVISOS_EMAIL;
  if (!destino) {
    console.error('[DonCargador] no se ha configurado destinatario de prueba de correo');
    // Este caso debe impedir habilitar pagos antes de instalar el módulo.
    throw new Error('Configurar MAIL_EMAIL_PRUEBA si MAIL_MODO_TEST está activo');
  }
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
