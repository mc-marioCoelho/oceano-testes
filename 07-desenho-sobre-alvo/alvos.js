// Teste 07 · alvos criados no próprio telemóvel, guardados no navegador (IndexedDB).
// Cada alvo guarda: a fotografia recortada (JPG), o alvo MindAR (.mind) e o alvo Zappar (.zpt),
// o ponto onde foi fotografado e quanto tempo cada motor levou a criá-lo.

// Desde 10 out. guarda também as fotografias da RA («Fotografar a RA», ver medicao.js), numa loja à parte.
const BD_NOME = "oceano-teste07", BD_LOJA = "alvos", BD_CAPTURAS = "capturas";

function abrirBD() {
  return new Promise((ok, erro) => {
    const r = indexedDB.open(BD_NOME, 2); // versão 2: acrescenta a loja das capturas sem mexer nos alvos
    r.onupgradeneeded = () => {
      for (const loja of [BD_LOJA, BD_CAPTURAS])
        if (!r.result.objectStoreNames.contains(loja)) r.result.createObjectStore(loja, { keyPath: "id" });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}

async function transacao(modo, fn, loja = BD_LOJA) {
  const bd = await abrirBD();
  return new Promise((ok, erro) => {
    const t = bd.transaction(loja, modo);
    const pedido = fn(t.objectStore(loja));
    t.oncomplete = () => ok(pedido ? pedido.result : undefined);
    t.onerror = () => erro(t.error);
  });
}

const Alvos = {
  gravar: alvo => transacao("readwrite", s => s.put(alvo)),
  ler: id => transacao("readonly", s => s.get(id)),
  apagar: id => transacao("readwrite", s => s.delete(id)),
  async todos() {
    const lista = await transacao("readonly", s => s.getAll());
    return (lista || []).sort((a, b) => b.criado - a.criado);
  },
};

const Capturas = {
  gravar: c => transacao("readwrite", s => s.put(c), BD_CAPTURAS),
  async todas() {
    const lista = await transacao("readonly", s => s.getAll(), BD_CAPTURAS);
    return (lista || []).sort((a, b) => a.criado - b.criado);
  },
};

// Endereço temporário para os motores lerem um ficheiro guardado (o MindAR e o Zappar pedem um URL)
function urlDe(dados, tipo) {
  return URL.createObjectURL(new Blob([dados], { type: tipo || "application/octet-stream" }));
}
