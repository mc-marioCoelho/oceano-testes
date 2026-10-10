// Teste 06 · service worker: guarda as páginas, as bibliotecas de RA e os dois programas
// que criam alvos (MindAR e Zappar), para o teste funcionar dentro da sala sem rede.
// Os alvos criados não passam por aqui: ficam no próprio navegador (IndexedDB, ver alvos.js).
// Páginas do teste: rede primeiro (para receber correções), cópia guardada se não houver rede.
// Bibliotecas externas (endereços com versão fixa): cópia guardada primeiro.

const CACHE = "oceano-teste06-v4";
const PROPRIOS = ["./", "index.html", "pontos-de-visao.svg", "mindar.html", "zappar.html", "estilo.css", "alvos.js", "medicao.js", "objetos.js"];
const ZT = "https://cdn.jsdelivr.net/npm/@zappar/imagetraining@4.3.2/umd/";
const EXTERNOS = [
  "https://aframe.io/releases/1.5.0/aframe.min.js",
  "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js",
  "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js",
  "https://aframe.io/releases/1.6.0/aframe.min.js",
  "https://libs.zappar.com/zappar-aframe/2.0.0/zappar-aframe.js",
  ZT + "zappar-imagetraining.js", ZT + "c98e74d5b0eadc72a3c6.wasm",
  "https://cdn.jsdelivr.net/npm/buffer@6.0.3/+esm",
  "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
  "https://cdn.jsdelivr.net/npm/base64-js@1.5.1/+esm", "https://cdn.jsdelivr.net/npm/ieee754@1.2.1/+esm",
];

self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("oceano-teste06-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// a página inicial pede «preparar»: descarrega tudo e vai dizendo quanto falta
self.addEventListener("message", async e => {
  if (!e.data || e.data.tipo !== "preparar") return;
  const cache = await caches.open(CACHE);
  const todos = PROPRIOS.concat(EXTERNOS);
  let feitos = 0, falhas = [];
  for (const url of todos) {
    try {
      const r = await fetch(url, { cache: "reload" });
      if (!r.ok) throw new Error(r.status);
      await cache.put(url, r);
    } catch (err) { falhas.push(url); }
    feitos++;
    e.source.postMessage({ tipo: "progresso", feitos, total: todos.length });
  }
  e.source.postMessage({ tipo: "fim", falhas });
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith("http")) return; // os alvos guardados (blob:) passam ao lado
  const proprio = new URL(req.url).origin === self.location.origin;
  if (proprio) {
    // rede primeiro; sem rede, a cópia guardada (ignora ?alvo=… ao procurar)
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const c = r.clone(); caches.open(CACHE).then(cache => cache.put(req, c)); }
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true })));
  } else {
    // bibliotecas: cópia guardada primeiro; o que vier da rede também se guarda
    // (o Zappar descarrega ficheiros extra na primeira utilização)
    e.respondWith(caches.match(req).then(g => g || fetch(req).then(r => {
      if (r.ok || r.type === "opaque") { const c = r.clone(); caches.open(CACHE).then(cache => cache.put(req, c)); }
      return r;
    })));
  }
});
