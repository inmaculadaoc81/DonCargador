// /sitemap.xml: la home, la tienda, el blog y cada artículo publicado (vercel.json reescribe /sitemap.xml -> /api/sitemap).
import * as blog from "../lib/blog.js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  try {
    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=86400");
    return res.status(200).send(blog.renderSitemap(await blog.listaArticulos()));
  } catch (e) {
    console.error("sitemap:", e && e.message);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(blog.renderSitemap([])); // sin la lista, al menos la home, la tienda y el blog
  }
}
