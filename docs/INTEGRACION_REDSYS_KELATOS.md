# DonCargador — integración del TPV de Kelatos (borrador, sin cobros)

**Estado:** planificación técnica en una rama separada. Este documento no activa pagos ni modifica la API de Kelatos ni PostgreSQL.

## Lo comprobado

- La API de Kelatos expone `GET /publico/piezas-cargador`, que ya devuelve la `referencia` única de las piezas; el usuario verificó HTTP 200, 29 productos y una referencia presente después de reconstruir y recrear el contenedor.
- El catálogo web actual (`assets/cargadores.js`) solo consulta y muestra piezas; aún no tiene compra operativa.
- El TPV virtual de Getnet/Santander de Kelatos figura activo en capturas del portal. Su configuración mostraba «Notificación online: Email Comercio» y la URL de notificación vacía; no se ha modificado.
- La migración 005 está aplicada **solo** a `doncargador_pruebas`: sus funciones `dc_test_*` simulan la confirmación; **no deben invocarse desde la web ni ejecutarse en producción**.
- El usuario aportó «TPV-Virtual Manual de Integración - Redirección», versión 3.2 (31/01/2024). La página 9 documenta el formulario `Ds_SignatureVersion`, `Ds_MerchantParameters` y `Ds_Signature`; las páginas 12–13 describen la firma y la validación de notificaciones.

## Diseño previsto (pendiente de implementación y revisión)

1. Preparar un módulo **separado** de pedidos y Redsys en el backend de Kelatos, sin publicar credenciales y sin habilitar una ruta de cobro mientras falten verificaciones.
2. Definir migración **nueva, específica de producción**, con aprobación expresa y copia de seguridad previa: pedidos, líneas, intentos de pago y bandeja de avisos. Identificador del intento compatible con el formato de número de pedido de Redsys; correspondencia única entre identificador, pedido, importe y terminal. No copiar la migración 005 de pruebas a producción.
3. El servidor recalcula precios, disponibilidad y total desde `stock_piezas`, valida cantidades y referencias y excluye productos Dyson. El navegador **nunca** decide el importe ni el estado de pago.
4. Con la clave de firma del **terminal de Kelatos**, almacenada exclusivamente en el entorno del servidor, generar el formulario de redirección y sus parámetros firmados. **No almacenar claves en este repositorio público, Vercel o mensajes del chat**. Obtener las credenciales de prueba específicas del terminal o emplear exclusivamente datos genéricos de pruebas en un entorno aislado.
5. Crear un endpoint HTTPS público de notificaciones: validar firma en tiempo constante, versión, comercio, terminal, pedido/operación, tipo, moneda, importe y resultado. Registrar identidad única de transacción y evitar procesar dos veces la misma confirmación. Los retornos OK/KO del navegador **no acreditan el cobro**.
6. Tras confirmación auténtica, descontar las existencias de **todas** las líneas en una transacción con bloqueo ordenado y condiciones de stock, o no descontar ninguna. Sin reservas, dos compradores podrían pagar por la última unidad: el segundo pedido pasa a revisión y devolución; **nunca** se prometen existencias garantizadas antes de pagar.
7. Registrar el correo a Kelatos en bandeja transaccional y enviarlo con reintentos y control de duplicados. Un error SMTP no debe revertir un pago ya confirmado.
8. Habilitar el botón «Pagar» solo después de probar solicitud, firma, respuesta, cancelación, reintento, callback duplicado, concurrencia, avisos y plan de devolución, y de verificar la autorización del uso del TPV de Kelatos para `cargadordeportatil.es`.

## Pendiente antes de publicar

- Revisar el backend real y su esquema SQL de producción para definir una migración compatible y un endpoint estable para las notificaciones.
- Localizar la clave de firma sin mostrarla ni enviarla al chat; configurar credenciales y URL pública segura de forma privada.
- Confirmar con Getnet/Santander las condiciones de uso del TPV en el dominio adicional y configurar notificación **servidor a servidor**, actualmente no configurada según la captura.
- Implementación, pruebas de extremo a extremo y autorización del usuario para activar cobros reales.

**No fusionar esta rama ni desplegar cobros como consecuencia de este documento.**
