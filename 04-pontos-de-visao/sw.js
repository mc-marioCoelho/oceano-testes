// Teste 04 · service worker: guarda as páginas, os alvos e as bibliotecas no telemóvel,
// para o teste funcionar dentro da sala sem rede (e no Samsung sem cartão).
// Páginas do teste: rede primeiro (para receber correções), cópia guardada se não houver rede.
// Bibliotecas externas (endereços com versão fixa): cópia guardada primeiro.

const CACHE = "oceano-teste04-v4";
const ALVOS = ["mosaico", "inscricao", "painel-central", "vento-boreas", "vento-zefiro",
               "painel-persp-a", "painel-persp-b", "inscricao-persp", "tapete-persp"];
const PROPRIOS = ["./", "index.html", "pontos-de-visao.svg", "mindar.html", "zappar.html", "estilo.css", "medicao.js"]
  .concat(...ALVOS.map(a => ["alvos/" + a + ".jpg", "alvos/" + a + ".mind", "alvos/" + a + ".zpt"]));
const EXTERNOS = [
  "https://aframe.io/releases/1.5.0/aframe.min.js",
  "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js",
  "https://aframe.io/releases/1.6.0/aframe.min.js",
  "https://libs.zappar.com/zappar-aframe/2.0.0/zappar-aframe.js",
];

self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("oceano-teste04-") && k !== CACHE).map(k => caches.delete(k))))
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
  if (req.method !== "GET") return;
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
