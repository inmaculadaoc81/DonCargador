# DonCargador / Getnet — entrega de backend (borrador no desplegado)

**No fusionar, desplegar ni habilitar cobros todavía.** Este directorio es código para revisión, no una integración aplicada al VPS. No contiene claves ni datos bancarios. La web tiene `pagosHabilitados: false`.

## Qué incluye

- `doncargador/servicio.js`: creación de pedido con precios del servidor, intento Redsys persistido y notificación HMAC validada; descuento atómico de stock o `revision_stock` para gestionar devolución. SIN reservas.
- `doncargador/router.js`: rutas `/publico/doncargador/pedidos` (POST), `/notificacion` (POST) y `/pedidos/:id/estado` (GET), limitación de solicitudes y CORS limitado a la tienda.
- `doncargador/avisos.js`: avisos SMTP a Kelatos en bandeja transaccional, con reintentos. Entrega al menos una vez; si falla el proceso justo después de enviar, un correo puede repetirse.
- `doncargador/instalar.js`: montaje seguro de las rutas y envío periódico de avisos, desactivado si faltan requisitos.
- `migrations/006_doncargador_produccion.sql`: crea tablas nuevas `dc_` para el circuito real; no contiene funciones `dc_test_*`, no altera la tabla existente de stock y nunca se aplica automáticamente.
- `../lib/redsys*.js`: firmas y formularios, sin secretos.

## Requisitos pendientes antes de una puesta en marcha

1. Obtener **privadamente** la clave de firma del terminal Kelatos, identificación FUC completa y terminal. No enviar la clave por chat, no publicarla en GitHub ni Vercel. Distinguir credenciales de pruebas y producción.
2. Disponer de URL HTTPS **estable y pública** para la API de Kelatos. El hostname actual `*.trycloudflare.com` es temporal; no registrar un callback de pagos permanentes sobre él.
3. Confirmar con Getnet/Santander el uso del terminal de Kelatos para `https://cargadordeportatil.es` y cómo habilitar notificaciones HTTP al servidor **sin interrumpir la operativa actual de Kelatos/Paygold**. En las capturas la notificación aparece configurada como «Email Comercio» y el campo URL vacío. No cambiarla a ciegas.
4. Definir precio de envío, zona de reparto (el código actual solo acepta direcciones ES), devoluciones y atención al comprador. Configurar el precio en `DC_ENVIO_CENTIMOS` (entero, céntimos, IVA incluido). No asumir transporte gratis ni cobrar sin informar del total.
5. Revisar y probar la migración 006 primero en **otra BD aislada** `doncargador_redsys_pruebas`, con esquema `kelatos_app` y tabla de stock compatibles. La BD anterior `doncargador_pruebas` contiene la migración 005 de simulación y no debe reutilizarse ni conectarse a pagos reales.
6. Para producción: copia de seguridad comprobada, revisión del administrador y autorización expresa para aplicar 006 a `kelatos`. NO ejecutarla como parte de `npm`, Docker o Vercel.
7. Pruebas extremo a extremo del formulario, URL pública, firma, callback genuino y duplicado, cancelación, avisos SMTP, stock concurrente y procedimiento de devolución del segundo cobro.

## Estructura de instalación prevista (cuando se autorice)

El Dockerfile de Kelatos copia `api/src` a `/app/src`. Por ello, los módulos deben conservar **esta estructura relativa**, sin modificar el Dockerfile:

```text
/opt/kelatos-db/api/src/backend/doncargador/{instalar,router,servicio,avisos}.js
/opt/kelatos-db/api/src/lib/{redsys,redsys-formulario,redsys-pedido}.js
```

Importar `instalarDonCargador` desde `./backend/doncargador/instalar.js` en `api/src/server.js`, y montarlo cerca de la ruta pública `/publico/piezas-cargador`, **antes de cualquier ruta comodín**:

```js
import { instalarDonCargador } from './backend/doncargador/instalar.js';
// Una vez definido `app` y `pool`:
instalarDonCargador({ app, pool });
```

Antes de editar el servidor hay que revisar la ruta donde se aplican autenticación y middleware públicos para evitar que el callback quede bloqueado. El módulo importado no habilita cobros sin configuración explícita.

Variables **solo en el entorno privado del contenedor** (nunca en GitHub/Vercel): `DC_REDSYS_CLAVE`, `DC_REDSYS_COMERCIO`, `DC_REDSYS_TERMINAL`, `DC_REDSYS_MODO` (`pruebas` o `real`), `DC_API_ORIGEN` (origen HTTPS sin ruta), `DC_ENVIO_CENTIMOS`, `DC_AVISOS_EMAIL`. El SMTP existente requiere `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`; si `MAIL_MODO_TEST` está activo, también `MAIL_EMAIL_PRUEBA`.

`DC_PAGOS_HABILITADOS=true` solo tras las comprobaciones, con base `doncargador_redsys_pruebas` en modo pruebas o `kelatos` en modo real. En producción se requiere además `DC_COBROS_REALES_AUTORIZADOS=CONFIRMO_COBROS_REALES`, tras aprobación del titular. **No establecer aún ninguna de estas variables.**

Tras tener endpoint de notificación público y operativo, pactar con Getnet el ajuste de notificación al servidor. El retorno OK/KO del navegador no equivale a pago confirmado: el servidor verifica firma, contexto y resultado, y solo entonces realiza el descuento y genera el aviso.

**Limitación explícita SIN reservas:** dos clientes podrían pagar la última unidad; el segundo pedido no descuenta stock y queda en revisión para devolución manual. No se promete ausencia de doble cobro.
