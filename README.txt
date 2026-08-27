DON CARGADOR — VENTA DE CARGADORES ORIGINALES PARA PORTÁTILES (MADRID)

Repositorio procesado por primera vez en esta sesión (no tenía README).

Dominio:
https://cargadordeportatil.es/
(coherente en canonical, og:url, JSON-LD, robots.txt y sitemap.xml;
sin colisión con ningún otro dominio revisado en esta sesión)

Sitio one-page desde su origen: no hay eliminaciones de /servicios/ ni
/modelos/ en el historial, así que NO se ha añadido middleware.mjs, no
aplica.

REVISIÓN ADICIONAL — BUG REAL (a petición del cliente):
- No existía menú móvil: la regla @media(max-width:900px){.menu{
  display:none}} ocultaba la navegación sin ningún botón/desplegable
  alternativo, así que en móvil no había forma de navegar (el hueco
  vacío arriba a la derecha del logo era justo donde debía estar el
  botón). Añadido .menu-btn ("☰") + panel #mobileMenu con los mismos
  7 enlaces, siguiendo el patrón estándar de la familia.

TELÉFONOS — CONFIRMADO POR EL CLIENTE:
- El botón de llamada del hero (.phone-cta) usa tel:+34914468503, el
  número compartido de la familia Kelatos, a propósito.
- La caja de información y el footer muestran +34 918 29 46 58, el
  número propio del negocio, a propósito. Es el mismo usado en
  schema.org. Confirmado que es intencional (mismo patrón que otros
  repos de la familia); no se ha tocado nada.

REVISIÓN (todo lo aplicado en esta primera pasada):
- Google Analytics: ya estaba configurado con G-1N6P0PDE1K (coincide
  exactamente con el código proporcionado); no se ha tocado.
- Banner de cookies: no existía. Añadido (Aceptar / Rechazar /
  Política de privacidad → https://kelatos.com/privacy-policy/), con
  diseño apilado a ancho completo en móvil.
- Schema.org: no existía. Añadido LocalBusiness (nombre, url,
  teléfono, descripción, dirección, areaServed Madrid, sameAs con
  Google Maps y YouTube).
- Meta tags og:* y robots: no existían. Añadidos.
- Sección SEO: no existía ninguna sección de contenido tipo guía (el
  sitio es one-page desde el origen, sin páginas de servicio
  dedicadas). Añadida sección "Guía" (id="guia", enlazada en el menú)
  con contenido propio sobre cómo identificar el cargador correcto,
  las marcas trabajadas y qué hacer si el problema no es el cargador.
- H1 de portada reescrito, corto, directo y totalmente afirmativo (sin
  interrogación ni condicionales): "Tu portátil no carga. Aquí
  identificamos el cargador correcto." Tamaño del H1 aumentado:
  clamp(32-52px) → clamp(46-74px).
- Sin .navcall/.navphone: el menú de cabecera no tiene ningún botón de
  teléfono (solo enlaces de texto), así que no aplica el fix de la
  píldora.
- package.json: solo tenía "private" y "dependencies". Añadidos name,
  version, engines (22.x) para igualar al resto de la familia, y
  "type":"module", ya que api/contact.js usa sintaxis ESM
  (import/export) y el package.json no lo declaraba explícitamente.
- api/contact.js ya usaba SMTP + nodemailer correctamente; no requería
  conversión.

Variables SMTP en Vercel (ya configuradas, sin cambios):
SMTP_HOST=cp7124.webempresa.eu
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=soporte@kelatos.com
SMTP_PASS=[configurada únicamente en Vercel]
CONTACT_EMAIL=soporte@kelatos.com
