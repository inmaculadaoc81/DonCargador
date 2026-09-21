# DonCargador — TPV de Kelatos / Getnet (revisión, sin cobros)

**Estado real:** módulos de pago, pedidos, carrito, callbacks y avisos creados en esta rama. **No están instalados en el VPS, no se ha ejecutado la migración 006 y el pago en el navegador sigue desactivado.** No fusionar el PR como si fuera una tienda lista para cobrar.

## Verificado previamente

- Catálogo público de Kelatos `GET /publico/piezas-cargador`: HTTP 200, 29 productos y referencias de producto presentes después de reconstruir el contenedor.
- TPV Getnet/Santander de Kelatos: activo en capturas, sin cambiar sus ajustes. La notificación mostrada era «Email Comercio» con URL de notificación vacía.
- El archivo SQL 005 y `dc_test_*` solo existen en `doncargador_pruebas` y simulan pagos: no utilizarlos con el TPV ni copiarlos a producción.
- Manual aportado por el titular: «TPV-Virtual Manual de Integración - Redirección», versión 3.2, 31/01/2024; formulario HMAC_SHA256_V1 con `Ds_SignatureVersion`, `Ds_MerchantParameters`, `Ds_Signature`, y notificación firmada.

## Cambios en el PR

- `lib/redsys.js`, `lib/redsys-formulario.js`, `lib/redsys-pedido.js`: formulario y firma 3DES + HMAC SHA256, validación de firma y de comercio, terminal, pedido, importe, moneda, operación y respuesta.
- `backend/doncargador/servicio.js`: pedido e intento persistidos con idempotencia de solicitud, precio calculado en PostgreSQL, exclusión Dyson, confirmación solo por notificación verificada, descuento transaccional con bloqueo de todas las referencias, aviso de pedido pagado o falta de stock.
- `backend/doncargador/router.js`: endpoints públicos aislados con limitación de solicitudes; desactivados por defecto.
- `backend/doncargador/avisos.js` e `instalar.js`: cola de avisos SMTP con reintentos y activación controlada. Correo al menos una vez (posible duplicado en un fallo excepcional después de SMTP).
- `backend/migrations/006_doncargador_produccion.sql`: DDL nuevo, aún **NO ejecutado**. Permite solamente `kelatos` o una nueva BD aislada `doncargador_redsys_pruebas` sin tablas dc_ previas.
- `catalogo.html`, `carrito.html`, `pago-ok.html`, `pago-ko.html`, `assets/*.js`: carrito por referencia, formulario de envío, presentación del total firmado antes de redirigir, y consulta posterior del estado en servidor. `assets/compra-config.js` mantiene `pagosHabilitados:false` y URL API temporal.
- Pruebas automáticas con Node 24 en `.github/workflows/redsys-tests.yml`, con vector público oficial HMAC SHA256 además de pruebas de validación y cierre seguro. Pasar estas pruebas **no sustituye** las pruebas contra Getnet ni PostgreSQL.

## Bloqueos para habilitar pagos reales

- Clave de firma privada, FUC y terminal exactos; establecerlos solo en el entorno del VPS.
- Dominio HTTPS **estable** para API y callback (no usar hostname temporal `trycloudflare.com`).
- Confirmación de Getnet sobre uso del TPV de Kelatos en `cargadordeportatil.es` y sobre notificación HTTP **sin romper la operativa actual de Kelatos/Paygold**.
- Precio de envío confirmado en céntimos (IVA incluido), ámbito de reparto (por ahora ES) y política de devolución.
- Revisión e instalación manual de código en `api/src`, nueva BD aislada de pruebas compatible con SQL 006, pruebas reales en sandbox, validación del proceso de avisos, despliegue controlado y autorización explícita antes de cobrar.

Ver `backend/README.md` para la estructura de instalación, las variables privadas y las comprobaciones previas. **Sin reservas**: dos clientes pueden pagar por la última unidad; el segundo debe ir a revisión y devolución manual, no se promete prevenir un doble cobro.
