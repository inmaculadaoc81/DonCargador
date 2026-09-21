// Configuración PÚBLICA del navegador. Nunca incluir aquí claves del TPV.
// Ruta HTTPS existente, comprobada con HTTP 200 y certificado válido el 21/09/2026.
// Nginx elimina /kelatos-api/ antes de reenviar las peticiones a la API interna.
// La habilitación de pagos requiere pruebas completas y autorización separada.
window.DONCARGADOR_COMPRA = Object.freeze({
  apiOrigen: 'https://db.affirmatechnology.com/kelatos-api',
  pagosHabilitados: false,
});
