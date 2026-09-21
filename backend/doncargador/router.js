// Montar en server.js: app.use('/publico/doncargador', crearRouterDonCargador({pool}));
// El módulo no configura credenciales, no migra BD y falla cerrado sin activación explícita.
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { crearServicioDonCargador, ErrorCompra } from './servicio.js';

const ORIGEN_TIENDA = 'https://cargadordeportatil.es';
export function crearRouterDonCargador({pool,env=process.env} = {}) {
  if (!pool || typeof pool.query !== 'function') throw new Error('Pool obligatorio');
  const router = express.Router();
  const modo = env.DC_REDSYS_MODO;
  const autorizado = env.DC_PAGOS_HABILITADOS === 'true' &&
    (modo === 'pruebas' || (modo === 'real' && env.DC_COBROS_REALES_AUTORIZADOS === 'CONFIRMO_COBROS_REALES'));
  let servicio = null;
  if (autorizado) {
    servicio = crearServicioDonCargador({pool,modo,
      claveBase64:env.DC_REDSYS_CLAVE,
      comercio:env.DC_REDSYS_COMERCIO,terminal:env.DC_REDSYS_TERMINAL,
      envioCentimos:env.DC_ENVIO_CENTIMOS === undefined ? NaN : Number(env.DC_ENVIO_CENTIMOS),
      apiOrigen:env.DC_API_ORIGEN,tiendaOrigen:ORIGEN_TIENDA});
  }
  router.use((req,res,next) => {
    res.set('Cache-Control','no-store');
    const origen = req.get('Origin');
    if (origen && origen !== ORIGEN_TIENDA) return res.status(403).json({error:'Origen no admitido'});
    if (origen === ORIGEN_TIENDA) {
      res.set('Access-Control-Allow-Origin',ORIGEN_TIENDA);
      res.set('Vary','Origin');
      res.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers','Content-Type');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  function disponible(req,res,next) {
    if (!servicio) return res.status(503).json({error:'Pago online no habilitado'});
    next();
  }
  const limitarPedidos = rateLimit({ windowMs:15*60*1000,limit:15,standardHeaders:'draft-7',legacyHeaders:false });
  router.post('/pedidos',disponible,limitarPedidos,express.json({limit:'16kb'}),async(req,res,next) => {
    try {
      await servicio.comprobarBase();
      const pedido = await servicio.crearPedido(req.body);
      res.status(201).json({ok:true,...pedido});
    } catch(e) {next(e);}
  });
  router.post('/notificacion',disponible,express.urlencoded({extended:false,limit:'16kb'}),async(req,res,next) => {
    try {
      await servicio.comprobarBase();
      await servicio.recibirNotificacion(req.body);
      // A Redsys solo se confirma recepción tras COMMIT. Nunca devolver información del comprador.
      res.status(200).type('text/plain').send('OK');
    } catch(e) {next(e);}
  });
  router.get('/pedidos/:id/estado',disponible,async(req,res,next) => {
    try {
      await servicio.comprobarBase();
      res.json({ok:true,...await servicio.estadoPedido(req.params.id)});
    } catch(e) {next(e);}
  });
  router.use((err,req,res,next) => {
    if (res.headersSent) return next(err);
    if (err instanceof ErrorCompra) return res.status(err.status).json({error:err.message});
    // No filtrar SQL, credenciales, stack ni datos personales a clientes.
    console.error('[DonCargador] error interno',err?.name || 'Error');
    return res.status(500).json({error:'No se pudo procesar la operación'});
  });
  return router;
}
