// Teste 06 · alvos criados no próprio telemóvel, guardados no navegador (IndexedDB).
// Cada alvo guarda: a fotografia recortada (JPG), o alvo MindAR (.mind) e o alvo Zappar (.zpt),
// o ponto onde foi fotografado e quanto tempo cada motor levou a criá-lo.

const BD_NOME = "oceano-teste06", BD_LOJA = "alvos";

function abrirBD() {
  return new Promise((ok, erro) => {
    const r = indexedDB.open(BD_NOME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(BD_LOJA, { keyPath: "id" });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}

async function transacao(modo, fn) {
  const bd = await abrirBD();
  return new Promise((ok, erro) => {
    const t = bd.transaction(BD_LOJA, modo);
    const pedido = fn(t.objectStore(BD_LOJA));
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

// Endereço temporário para os motores lerem um ficheiro guardado (o MindAR e o Zappar pedem um URL)
function urlDe(dados, tipo) {
  return URL.createObjectURL(new Blob([dados], { type: tipo || "application/octet-stream" }));
}
