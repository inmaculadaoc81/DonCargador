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
- BUG REAL adicional (a petición del cliente, tras ver capturas): el
  panel se abría pero se veía mal — salía como una columna estrecha
  junto al logo, no como un desplegable a todo el ancho debajo de la
  cabecera. Causa: .top (la cabecera) es display:flex, así que
  #mobileMenu (hermano directo del logo/nav) se comportaba como un
  elemento más de esa fila flex en vez de apilarse debajo. Corregido
  con position:absolute;top:100%;left:0;right:0 en .mobile-menu.

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

REVISIÓN ADICIONAL (checklist unificado de la familia, a petición del cliente):
- H1 repetía la plantilla "Tu X no Y. Aquí Z." usada en varios repos
  ("Tu portátil no carga. Aquí identificamos el cargador correcto.").
  Reescrito en formato imperativo: "Encuentra el cargador original
  correcto para tu portátil." (8 palabras).
- BUG REAL — el botón CTA de teléfono no tenía icono, a diferencia del
  de WhatsApp. Añadido (verificado con cuidado el cierre de las
  etiquetas </a>: 24 aperturas / 24 cierres).
- BUG REAL — el formulario no tenía ninguna casilla de consentimiento
  de política de privacidad. Añadida desde cero, con el texto y
  enlace estándar de la familia, resaltado en azul.
- BUG REAL — no existía franja de aviso de servicio técnico
  independiente debajo del menú. IMPORTANTE: como .top (la cabecera)
  es display:flex —el mismo motivo por el que el menú móvil tuvo que
  usar position:absolute en la revisión anterior—, la franja NO se ha
  insertado como hijo/hermano dentro de <header>, sino como elemento
  independiente justo después de </header> y antes de <main>, para
  que se apile correctamente debajo de la cabecera en vez de
  comportarse como un elemento más de esa fila flex.
- Añadido "Sábados, domingos y días festivos estamos cerrados" debajo
  del horario.
- Verificado sin bugs: .hero-lines es una forma decorativa sin texto
  (no es el patrón de etiqueta rotada tipo hero-chip); el texto
  decorativo ".hero:before" ("CARGADOR ORIGINAL", 72px) ya se reducía
  correctamente a 44px en el único breakpoint del sitio (900px);
  schema.org ya usaba correctamente el teléfono de la caja de
  información (+34 918 29 46 58); formulario correctamente conectado
  a /api/contact.

Variables SMTP en Vercel (ya configuradas, sin cambios):
SMTP_HOST=cp7124.webempresa.eu
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=soporte@kelatos.com
SMTP_PASS=[configurada únicamente en Vercel]
CONTACT_EMAIL=soporte@kelatos.com

REVISIÓN ADICIONAL (checklist unificado de la familia, a petición del cliente — repo 33/48):
- BUG REAL — enlace de Cal.com desactualizado. Actualizado a
  https://cal.com/kelatos/30min?embed=true&theme=light&attendeePhoneNumber=%2B34&overlayCalendar=true.
- Verificado: el correo soporte@kelatos.com no aparece visible.
- BUG REAL — el mensaje prellenado de WhatsApp decía "¡Hola Kelatos"
  (sin marca, en el botón del hero y en el flotante). Corregido a
  "¡Hola DonCargador" en ambos.
- BUG REAL — el menú móvil (#mobileMenu, estilo atributo hidden) no
  tenía ningún listener que lo cerrara al pulsar un enlace. Añadido el
  script estándar de la familia.
- Verificado: sin iconos ni imágenes con proporciones fijas
  incorrectas.
- BUG REAL — el H1 usaba clamp(46px,5.6vw,74px), con un mínimo de
  46px en pantallas muy estrechas (sin regla fija de móvil aparte).
  Corregido el mínimo a 48px: clamp(48px,5.6vw,74px).
- BUG REAL — botones del hero (.btn) con border-radius de 14px y sin
  estado hover. Aumentado a border-radius:999px; añadido
  filter:brightness(.88) en ambos botones (.wa y .blue, los dos de
  color sólido) al pasar el ratón.
- Verificado: este repo no usa el patrón de franja de insignias bajo
  el H1 (familia Dyson); no aplica la reubicación.

AUDITORÍA — ventana del chatbot rota en la tienda (catalogo.html), a
petición del cliente (captura de móvil: la ventana abierta del chat
tapaba la cabecera y ocupaba casi todo el ancho de la pantalla):

- BUG REAL — causa raíz: en la librería @n8n/chat, el elemento con
  position:fixed real es .chat-window-wrapper (el contenedor padre),
  NO .chat-window. El wrapper se posiciona y se limita en tamaño
  mediante las variables CSS --chat--window--right,
  --chat--window--bottom y --chat--window--z-index (confirmado
  descargando y leyendo el style.css real del CDN). El código anterior
  nunca definía esas variables — solo definía
  --chat--toggle--position-right/bottom (que son variables distintas,
  solo para el botón flotante) — así que el wrapper cae al valor por
  defecto de la librería (1rem de margen), quedando con
  max-width/max-height de casi el 100% del viewport. Al mismo tiempo,
  el código forzaba position:fixed!important directamente sobre
  .chat-window (el hijo), compitiendo con el propio modelo de layout
  flex del wrapper en vez de usarlo. Resultado: en móvil la ventana se
  renderizaba con el tamaño casi completo del wrapper (pantalla
  completa) en lugar del recuadro 400×560/ajustado a móvil previsto.
- Corregido en catalogo.html e index.html (index.html tenía el mismo
  fallo, aunque el cliente solo lo detectó en la tienda — corregido
  también de forma preventiva): se añadieron --chat--window--right,
  --chat--window--bottom y --chat--window--z-index al bloque
  #n8n-chat (base y dentro de @media max-width:600px), y se eliminó
  el position:fixed!important / top:auto!important / transform:none
  !important redundante sobre .chat-window, dejando solo width/height
  !important como límite de seguridad. Ahora el tamaño y la posición
  los gobierna el wrapper real de la librería, tal como está
  diseñado, en vez de pelear con él.
- Confirmado con curl que el catalogo.html en producción
  (cargadordeportatil.es/catalogo) era exactamente el mismo código
  revisado aquí (hash idéntico salvo saltos de línea).
- BUG REAL — CSS huérfana: la regla .phone-cta seguía en index.html
  pero ningún elemento del HTML actual usa esa clase (el botón de
  llamada del hero fue sustituido hace tiempo por los 3 botones
  actuales: WhatsApp / Solicita el envío / Nuestra tienda). Eliminada.
- Verificado sin bugs: enlaces internos (#cargador, #cita, #contacto,
  #guia, #marcas) resuelven todos a su id; formulario de contacto
  (name/email/phone/subject/message) coincide exactamente con lo que
  espera api/contact.js; JSON-LD válido y consistente (teléfono
  +34 918 29 46 58, dirección C. Joaquín María López 26, mismo
  place_id de Google Maps que el enlace); package.json y vercel.json
  correctos; sin archivos JS/CSS huérfanos en assets/api/backend/lib
  (los 4 scripts de assets/ se usan cada uno en su página); sin
  ninguna referencia cruzada a otras marcas de la familia
  (SmartSheets/FlujoPro/DataLabs/PowerFlow/CrmActiva/ThermomixTech);
  robots.txt y sitemap.xml apuntan al dominio correcto; los 12
  archivos JS del repo (assets/api/lib/backend) pasan
  "node --check" sin errores.
CORRECCIÓN DEL FIX ANTERIOR — el primer intento (definir
--chat--window--right/bottom/z-index como variables CSS en #n8n-chat,
esperando que .chat-window-wrapper las heredara) se desplegó
correctamente (confirmado con curl que producción tenía ese código
exacto) pero el cliente reportó que la ventana seguía viéndose igual
de mal. En vez de seguir dependiendo de que la herencia de variables
CSS llegue correctamente a .chat-window-wrapper, se ha sustituido por
un override directo con !important sobre .chat-window-wrapper mismo
(position/top/left/right/bottom/width/max-width/height/max-height/
z-index), que es el elemento con position:fixed real según el
style.css de la librería. .chat-window (el hijo) ahora solo hace
width:100%;height:100% para rellenar ese wrapper ya correctamente
posicionado y limitado, en vez de competir con position:fixed propio.
Aplicado en catalogo.html e index.html.

SOLICITUD DEL CLIENTE — botón "Solicita recogida" en el menú:
- Añadido un nuevo botón "Solicita recogida" en el hueco vacío junto
  a "Tienda" en la cabecera (captura del cliente), en index.html y
  catalogo.html, tanto en el menú de escritorio como en el menú móvil.
  Enlaza a https://sis.redsys.es/tiendaWeb/item/NDk4OzM5, se abre en
  pestaña nueva. Estilo: píldora con borde blanco (distinta de la
  píldora verde sólida de "Tienda" para no confundirse visualmente al
  estar una al lado de la otra).
- Reemplazado el enlace de Redsys en el botón existente del hero
  "Solicita el envío de tu cargador ahora" (index.html): antes
  apuntaba a .../item/NDk4OzQ=, ahora a .../item/NDk4OzM5 (mismo
  enlace nuevo). Verificado que no queda ningún .../item/NDk4OzQ= en
  el repositorio. No se ha tocado el enlace "Comprar" de
  assets/cargadores.js (usa un código de producto distinto por cada
  cargador del catálogo, no es el enlace de envío/recogida genérico).

AJUSTES DEL CLIENTE sobre los botones (misma sesión):
- Orden del menú corregido: "Tienda" va primero, "Solicita el envío"
  (antes llamado "Solicita recogida", renombrado a petición del
  cliente para que coincida con el botón del hero) va después.
- Icono de WhatsApp del hero (.hero-wa) sustituido: usaba un círculo
  + trazo de teléfono simplificado; ahora usa el mismo logotipo
  detallado de WhatsApp que ya se usa en el botón flotante (.float-wa),
  mismo patrón aplicado antes en otros repos de la familia
  (SmartSheets).
- Botón del hero "Solicita el envío de tu cargador ahora": eliminado
  el subtítulo "Gestiona tu solicitud online" y sustituido por "Solo
  para la Península", a petición del cliente (el envío no cubre
  Canarias/Baleares/Ceuta/Melilla).

- A VALORAR (no modificado, es una decisión de negocio, no un bug de
  código): catalogo.html tiene <meta name="robots"
  content="noindex,nofollow"> y no aparece en sitemap.xml, igual que
  carrito.html/pago-ok.html/pago-ko.html. Para las páginas de
  carrito/pago tiene sentido (páginas transaccionales). Para
  catalogo.html —el catálogo de productos— bloquea que Google indexe
  la tienda; si es intencional (p. ej. mientras se termina el
  catálogo) no requiere cambios, pero si se quiere que la tienda
  aparezca en búsquedas de Google habría que cambiarlo a "index,follow"
  y añadirla al sitemap.
