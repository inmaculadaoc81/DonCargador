// Blog de Don Cargador (cargadordeportatil.es). Los artículos NO viven en este repositorio: los crea y aprueba el agente SEO de Kelatos
// y se leen en vivo de la API pública de Kelatos (solo lectura, sin claves), igual que el resto de webs de la familia.
//   GET {API}/publico/blog?org=doncargador          -> lista de artículos publicados
//   GET {API}/publico/blog/<slug>?org=doncargador   -> un artículo (con su texto en Markdown)
// Las páginas se generan en el servidor (HTML completo, bueno para Google) y Vercel las guarda en caché unos minutos; si la API de
// Kelatos no responde, se sigue sirviendo la última copia en caché.
//
// Los estilos (van incrustados en el <head> de la home), la cabecera con su menú móvil, el pie, el botón de WhatsApp, el banner de
// cookies y Google Analytics se copian de index.html, así que cualquier cambio en la home se refleja también aquí.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = (process.env.KELATOS_BLOG_API || "https://db.affirmatechnology.com/kelatos-api/publico/blog").replace(/\/$/, "");
const ORG = process.env.BLOG_ORG || "doncargador";
const SITIO = "https://cargadordeportatil.es";
const NOMBRE = "Don Cargador";
const LOGO = "/assets/logo-don-cargador.jpg";
const WHATSAPP = "https://api.whatsapp.com/send?phone=34649970128&text=%C2%A1Hola%20DonCargador";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fechaLarga = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// ── API de Kelatos ──
async function pedir(ruta) {
  const r = await fetch(`${API}${ruta}${ruta.includes("?") ? "&" : "?"}org=${encodeURIComponent(ORG)}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`La API del blog respondió ${r.status}`);
  return r.json();
}
/** Lista de artículos (más recientes primero). Lanza si la API no responde. */
export async function listaArticulos() {
  const j = await pedir("");
  return (j && Array.isArray(j.posts) ? j.posts : []).filter((p) => p && p.slug && p.title);
}
/** Un artículo, o null si no existe. Lanza si la API no responde. */
export async function articulo(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const j = await pedir(`/${slug}`);
  return j && j.post && j.post.body ? j.post : null;
}

// ── Markdown → HTML (el HTML en bruto se descarta: los artículos son solo texto y Markdown) ──
let marked = null;
async function aHtml(md) {
  if (!marked) { const { Marked } = await import("marked"); marked = new Marked({ gfm: true, breaks: false, renderer: { html: () => "" } }); }
  return marked.parse(String(md || ""))
    .replace(/<a href="(https?:\/\/[^"]+)"/g, '<a rel="noopener" target="_blank" href="$1"')
    .replace(/<h1>/g, "<h2>").replace(/<\/h1>/g, "</h2>");
}

// ── Piezas copiadas de la home ──
let piezas = null;
function cargarPiezas() {
  if (piezas) return piezas;
  let index = "";
  const aqui = path.dirname(fileURLToPath(import.meta.url));
  for (const ruta of [path.join(process.cwd(), "index.html"), path.join(aqui, "..", "index.html")]) { try { index = fs.readFileSync(ruta, "utf8"); break; } catch { /* siguiente */ } }
  const tomar = (re, respaldo = "") => { const m = index.match(re); return m ? m[0] : respaldo; };
  const arreglar = (html) => html.replace(/href="#/g, 'href="/#');
  const iCookies = index.indexOf('<div id="cookie-banner"');
  piezas = {
    analytics: tomar(/<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]+"><\/script>\s*<script>[\s\S]*?<\/script>/),
    estilos: tomar(/<style>[\s\S]*?<\/style>/),
    cabecera: arreglar(tomar(/<header class="top">[\s\S]*?<\/header>/, `<header class="top"><div class="wrap nav"><a href="/" class="logo-link"><img class="logo" src="${LOGO}" alt="${NOMBRE}"></a></div></header>`)),
    pie: arreglar(tomar(/<footer>[\s\S]*?<\/footer>/)),
    whatsapp: tomar(/<a class="float-wa"[\s\S]*?<\/a>/),
    cookies: iCookies >= 0 ? index.slice(iCookies, index.lastIndexOf("</body>")) : "",
  };
  return piezas;
}

function pagina({ titulo, descripcion, canonical, imagen, tipoOg = "website", jsonld = [], cuerpo, noindex = false }) {
  const p = cargarPiezas();
  const og = `<meta property="og:image" content="${esc(imagen || `${SITIO}${LOGO}`)}">`;
  return `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(descripcion)}"><meta property="og:type" content="${tipoOg}"><meta property="og:url" content="${esc(canonical)}">${og}
<link rel="icon" href="/assets/favicon.jpg">
<meta name="robots" content="${noindex ? "noindex,follow" : "index,follow"}">
${p.analytics}
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("\n")}
${p.estilos}
<link rel="stylesheet" href="/assets/blog.css">
</head><body>
${p.cabecera}
<main>
${cuerpo}
</main>
${p.pie}
${p.whatsapp}
${p.cookies}
</body></html>
`;
}

const botones = `<div class="post-cta-actions"><a class="btn wa" href="${WHATSAPP}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a><a class="btn post-tienda" href="/catalogo">Ver cargadores disponibles</a><a class="btn post-consulta" href="/#contacto">Consultar compatibilidad</a></div>`;

function tarjeta(a) {
  return `<article class="blog-card"><a class="blog-card-link" href="/blog/${esc(a.slug)}">
${a.image ? `<img class="blog-card-img" src="${esc(a.image)}" alt="${esc(a.imageAlt || a.title)}" loading="lazy">` : ""}
<div class="blog-card-body"><div class="sectiontag">${esc(a.category)}</div><h2>${esc(a.title)}</h2><p>${esc(a.description)}</p><span class="blog-card-meta">${fechaLarga(a.date)}${a.readingMinutes ? ` · ${Number(a.readingMinutes)} min` : ""} · Leer →</span></div></a></article>`;
}

export function renderPortada(articulos) {
  const lista = articulos.length
    ? `<div class="blog-grid">${articulos.map(tarjeta).join("\n")}</div>`
    : `<div class="blog-empty"><h2>Estamos preparando las primeras guías</h2><p>Mientras tanto, dinos la marca y el modelo de tu portátil y te ayudamos a identificar el cargador que necesita.</p>${botones}</div>`;
  const cuerpo = `<section class="blog-hero"><div class="wrap"><div class="eyebrow">Blog de ${NOMBRE}</div><h1>Guías para elegir el cargador correcto de tu portátil</h1><p class="blog-lead">Cómo saber qué cargador necesita tu portátil HP, Dell, Lenovo, Asus, Acer, MSI o Surface, qué significan los vatios y el conector, y cómo saber si el problema es el cargador. Para no comprar dos veces.</p></div></section>
<section class="blog-list"><div class="wrap">${lista}</div></section>`;
  return pagina({
    titulo: `Blog de cargadores para portátiles | ${NOMBRE}`,
    descripcion: "Guías claras para identificar el cargador correcto de tu portátil HP, Dell, Lenovo, Asus, Acer, MSI o Surface: potencia, conector, USB-C y cómo saber si el problema es el cargador.",
    canonical: `${SITIO}/blog`,
    jsonld: [{ "@context": "https://schema.org", "@type": "Blog", name: `Blog de ${NOMBRE}`, url: `${SITIO}/blog`, inLanguage: "es" }],
    cuerpo,
  });
}

export async function renderArticulo(a, todos) {
  const url = `${SITIO}/blog/${a.slug}`;
  const relacionados = todos.filter((x) => x.slug !== a.slug).slice(0, 3);
  const cuerpo = `<article class="post"><div class="wrap post-wrap">
<nav class="crumbs" aria-label="Migas de pan"><a href="/">Inicio</a> › <a href="/blog">Blog</a> › <span>${esc(a.title)}</span></nav>
<div class="sectiontag">${esc(a.category)}</div>
<h1>${esc(a.title)}</h1>
<p class="post-meta">Publicado el ${fechaLarga(a.date)}${a.readingMinutes ? ` · ${Number(a.readingMinutes)} min de lectura` : ""} · ${NOMBRE}, cargadores originales para portátiles</p>
${a.image ? `<img class="post-img" src="${esc(a.image)}" alt="${esc(a.imageAlt || a.title)}">${a.imageCredit ? `<p class="post-meta">Foto: ${esc(a.imageCredit)}</p>` : ""}` : ""}
<div class="post-body">${await aHtml(a.body)}</div>
<aside class="post-cta"><h2>¿No sabes qué cargador necesitas?</h2><p>Dinos la marca y el modelo de tu portátil. Primero identificamos el equipo y después te indicamos la referencia que le corresponde, para que no compres dos veces.</p>${botones}</aside>
</div>
${relacionados.length ? `<div class="wrap post-related"><h2>Sigue leyendo</h2><div class="blog-grid">${relacionados.map(tarjeta).join("\n")}</div></div>` : ""}
</article>`;
  return pagina({
    titulo: `${a.title} | ${NOMBRE}`, descripcion: a.description || a.title, canonical: url, imagen: a.image, tipoOg: "article",
    jsonld: [
      { "@context": "https://schema.org", "@type": "BlogPosting", headline: a.title, description: a.description, datePublished: String(a.date).slice(0, 10), dateModified: String(a.updated || a.date).slice(0, 10), inLanguage: "es", mainEntityOfPage: url,
        ...(a.image ? { image: a.image } : {}), keywords: Array.isArray(a.tags) ? a.tags.join(", ") : undefined,
        author: { "@type": "Organization", name: NOMBRE, url: SITIO }, publisher: { "@type": "Organization", name: NOMBRE, url: SITIO, logo: { "@type": "ImageObject", url: `${SITIO}${LOGO}` } } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITIO}/` }, { "@type": "ListItem", position: 2, name: "Blog", item: `${SITIO}/blog` }, { "@type": "ListItem", position: 3, name: a.title, item: url } ] },
    ],
    cuerpo,
  });
}

export function renderNoEncontrado() {
  return pagina({
    titulo: `Artículo no encontrado | ${NOMBRE}`, descripcion: "Este artículo no existe o ya no está disponible.", canonical: `${SITIO}/blog`, noindex: true,
    cuerpo: `<section class="blog-hero"><div class="wrap"><div class="eyebrow">Blog de ${NOMBRE}</div><h1>No encontramos este artículo</h1><p class="blog-lead">Puede que se haya movido. Mira el resto de guías del <a href="/blog" style="text-decoration:underline">blog</a>.</p></div></section>`,
  });
}

/** El sitemap incluye también la tienda (/catalogo), que estaba en el sitemap.xml estático. */
export function renderSitemap(articulos) {
  const urls = [`<url><loc>${SITIO}/</loc></url>`, `<url><loc>${SITIO}/catalogo</loc></url>`, `<url><loc>${SITIO}/blog</loc>${articulos[0] ? `<lastmod>${String(articulos[0].updated || articulos[0].date).slice(0, 10)}</lastmod>` : ""}</url>`,
    ...articulos.map((a) => `<url><loc>${SITIO}/blog/${esc(a.slug)}</loc><lastmod>${String(a.updated || a.date).slice(0, 10)}</lastmod></url>`)];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
}
