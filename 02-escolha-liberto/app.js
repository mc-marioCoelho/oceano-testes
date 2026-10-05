// Teste 02 — «Escolhe o teu guia»
// 1) a câmara «reconhece» a inscrição (simulado); 2) os nomes acendem-se;
// 3) as letras perdidas reaparecem; 4) surgem os quatro libertos;
// 5) toca num para o ouvir; 6) escolhe o guia (fica guardado + registo anónimo).

// ---------- Os quatro libertos (igual a guiao.md) ----------
const LIBERTOS = {
  calpurnio: { nome: 'Gaio Calpúrnio', curto: 'Calpúrnio', tom: 0.9,
    fala: 'Sou Gaio Calpúrnio. A minha família leva o peixe da Bética até Roma. O meu sobrenome? O tempo apagou-o desta pedra.' },
  vibio:     { nome: 'Gaio Víbio Quintiliano', curto: 'Víbio', tom: 1.0,
    fala: 'Gaio Víbio Quintiliano, ao teu dispor. Conheço o mar e os seus perigos melhor do que ninguém.' },
  atio:      { nome: 'Lúcio Átio', curto: 'Átio', tom: 1.15,
    fala: 'Lúcio Átio, negociante como os meus antepassados. Comigo vais seguir o caminho do garum até Pompeia.' },
  verrio:    { nome: 'Marco Vérrio Gémino', curto: 'Vérrio', tom: 0.8,
    fala: 'Marco Vérrio Gémino. O azeite da baía de Gades até ao porto de Ostia passa pelas mãos da minha família.' },
};
const ORDEM = ['calpurnio', 'vibio', 'atio', 'verrio'];
const BOAS_VINDAS = 'Excelente escolha! Segue-me: vamos começar pelos ventos.';

// ---------- Elementos ----------
const legenda = document.getElementById('legenda');
const controlos = document.getElementById('controlos');
const scanner = document.getElementById('scanner');
const contagens = document.getElementById('contagens');
const figuras = {};
document.querySelectorAll('.liberto').forEach(g => { figuras[g.dataset.l] = g; });

// ---------- Utilidades ----------
const esperar = ms => new Promise(r => setTimeout(r, ms));

function dizer(quem, texto) {
  legenda.innerHTML = quem ? `<span class="quem">${quem}</span>${texto}` : texto;
}

function botoes(lista) {               // lista de [texto, função, principal?]
  controlos.innerHTML = '';
  lista.forEach(([texto, fn, principal]) => {
    const b = document.createElement('button');
    b.textContent = texto;
    if (principal) b.className = 'principal';
    b.addEventListener('click', fn);
    controlos.appendChild(b);
  });
}

function acenderNomes(id) {             // id = um liberto, 'todos' ou null
  document.querySelectorAll('.nome').forEach(t => {
    t.classList.toggle('aceso', id === 'todos' || t.dataset.l === id);
  });
}

// ---------- Voz (síntese do telemóvel) ----------
const temVoz = 'speechSynthesis' in window;
let voz = null;
function escolherVoz() {
  if (!temVoz) return;
  const v = speechSynthesis.getVoices();
  voz = v.find(x => x.lang === 'pt-PT') || v.find(x => x.lang && x.lang.startsWith('pt')) || null;
}
if (temVoz) { escolherVoz(); speechSynthesis.onvoiceschanged = escolherVoz; }

// Fala e devolve uma promessa que termina quando acaba de falar
function falar(texto, tom = 1) {
  return new Promise(resolve => {
    if (!temVoz) return setTimeout(resolve, Math.max(2500, texto.length * 65));
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'pt-PT'; if (voz) u.voice = voz;
    u.rate = 0.95; u.pitch = tom;        // um timbre diferente para cada liberto
    u.onend = resolve; u.onerror = resolve;
    speechSynthesis.speak(u);
  });
}

// ---------- Analytics de teste (anónimo, só neste aparelho) ----------
const CHAVE = 'oceano-teste02-escolhas';
function lerEscolhas() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch { return {}; }
}
function registarEscolha(id) {
  const e = lerEscolhas(); e[id] = (e[id] || 0) + 1;
  try { localStorage.setItem(CHAVE, JSON.stringify(e)); } catch {}
  mostrarContagens();
}
function mostrarContagens() {
  const e = lerEscolhas();
  contagens.innerHTML = ORDEM.map(id => `<li>${LIBERTOS[id].nome}: <b>${e[id] || 0}</b></li>`).join('');
}
document.getElementById('btn-limpar').addEventListener('click', () => {
  try { localStorage.removeItem(CHAVE); } catch {}
  mostrarContagens();
});
mostrarContagens();

// ---------- 1–4: reconhecer a inscrição ----------
async function reconhecer() {
  botoes([]);
  dizer(null, 'A reconhecer a inscrição…');
  scanner.classList.remove('a-ler'); void scanner.getBBox(); scanner.classList.add('a-ler');
  await esperar(1400);

  dizer(null, 'Quatro nomes ficaram gravados nesta pedra…');
  for (const id of ORDEM) { acenderNomes(id); await esperar(700); }
  acenderNomes('todos');
  await esperar(500);

  dizer(null, 'As letras que o tempo apagou reaparecem (hipótese de leitura). As que ninguém conhece ficam como [?].');
  document.querySelectorAll('.lac').forEach(t => { t.textContent = t.dataset.r; t.classList.add('restaurada'); });
  await esperar(2200);

  acenderNomes(null);
  for (const id of ORDEM) { figuras[id].classList.add('visivel'); await esperar(350); }
  modoEscolha();
}

// ---------- 5: ouvir cada um ----------
let aFalar = false;
async function apresentar(id) {
  if (aFalar || figuras[id].classList.contains('afastado')) return;
  aFalar = true;
  const L = LIBERTOS[id];
  acenderNomes(id);
  figuras[id].classList.add('a-falar');
  dizer(L.nome, L.fala);
  botoes([[`✔ Escolher ${L.curto}`, () => escolher(id), true], ['Ouvir outro', modoEscolha]]);
  await falar(L.fala, L.tom);
  figuras[id].classList.remove('a-falar');
  aFalar = false;
}

async function ouvirTodos() {
  for (const id of ORDEM) { await apresentar(id); await esperar(300); }
  modoEscolha();
}

function modoEscolha() {
  if (temVoz) speechSynthesis.cancel();
  aFalar = false;
  ORDEM.forEach(id => figuras[id].classList.remove('a-falar', 'afastado', 'escolhido'));
  acenderNomes(null);
  dizer(null, 'Escolhe o teu guia: toca num dos quatro para o ouvir.');
  botoes([['🔊 Ouvir os quatro', ouvirTodos]]);
}

// ---------- 6: escolher ----------
async function escolher(id) {
  if (temVoz) speechSynthesis.cancel();
  aFalar = false;
  const L = LIBERTOS[id];
  ORDEM.forEach(o => figuras[o].classList.toggle('afastado', o !== id));
  figuras[id].classList.add('escolhido', 'a-falar');
  acenderNomes(id);
  registarEscolha(id);
  try { localStorage.setItem('oceano-guia', id); } catch {}   // o guia fica guardado para o resto da visita
  dizer(L.nome, BOAS_VINDAS);
  botoes([['↺ Mudar de guia', modoEscolha]]);
  await falar(BOAS_VINDAS, L.tom);
  figuras[id].classList.remove('a-falar');
}

// ---------- Ligações ----------
document.getElementById('btn-apontar').addEventListener('click', reconhecer);
document.querySelectorAll('.liberto').forEach(g => {
  g.addEventListener('click', () => apresentar(g.dataset.l));
  g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apresentar(g.dataset.l); } });
});
