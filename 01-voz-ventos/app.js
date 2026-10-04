// Teste 01 — «ouvir primeiro, ler se quiser»
// Cada fala do narrador mostra uma legenda e acende uma parte do mosaico.
// A voz é a do próprio telemóvel (síntese de fala); se o som estiver desligado,
// as legendas avançam sozinhas ao ritmo de leitura.

// ---------- O guião (igual a guiao.md) ----------
const NARRADOR = 'Gaio Víbio Quintiliano';
const FALAS = [
  { texto: 'Salve, viajante! Sou Gaio Víbio Quintiliano. O meu nome está ali, à entrada, escrito em pedra.', acende: ['h-inscricao'] },
  { texto: 'Agora olha para os cantos deste quadro. Ali vivem os ventos, os senhores do mar.', acende: ['h-zefiro', 'h-boreas', 'h-perdidos'] },
  { texto: 'À esquerda, o jovem Zéfiro, o vento de oeste. Traz a primavera e empurra as velas com brandura.', acende: ['h-zefiro'] },
  { texto: 'À direita, Bóreas, o vento do norte. Vês a barba e o ar feroz? Esse é de temer!', acende: ['h-boreas'] },
  { texto: 'Em baixo estavam Noto e Euro… mas o tempo levou-os.', acende: ['h-perdidos'] },
  { texto: 'Um só naufrágio podia afundar uma fortuna. Por isso pusemos os ventos aos pés do grande Oceano, para que soprassem sempre a nosso favor.', acende: ['h-oceano'] },
];

// ---------- Elementos da página ----------
const legenda = document.getElementById('legenda');
const btnOuvir = document.getElementById('btn-ouvir');
const btnSom = document.getElementById('btn-som');
const btnRecomecar = document.getElementById('btn-recomecar');
const painel = document.getElementById('painel');

const narrador = document.getElementById('narrador');

// Se existir uma ilustração própria (narrador.png), substitui o retrato provisório
const ilustracao = new Image();
ilustracao.onload = () => {
  const svg = document.getElementById('narrador-svg');
  ilustracao.alt = '';
  svg.replaceWith(ilustracao);
};
ilustracao.src = 'narrador.png';

// Mostrar / esconder a silhueta e marcar quando está a falar
function narradorVisivel(sim) {
  narrador.classList.toggle('visivel', sim);
  legenda.classList.toggle('balao', sim);
  document.body.classList.toggle('com-narrador', sim);
  if (!sim) narrador.classList.remove('a-falar', 'discreto');
}
function narradorAFalar(sim) { narrador.classList.toggle('a-falar', sim); }

// Se existir a fotografia, o esquema passa a servir só de realce por cima dela
if (document.getElementById('foto')) {
  const img = new Image();
  img.onload = () => painel.classList.add('com-foto');
  img.src = 'painel-central.jpg';
}

// ---------- Estado ----------
let indice = 0;          // fala atual
let aTocar = false;      // está a avançar?
let somLigado = true;
let temporizador = null; // usado quando não há voz

const temVoz = 'speechSynthesis' in window;
let voz = null;

// Escolhe uma voz portuguesa: primeiro pt-PT, depois qualquer pt
function escolherVoz() {
  if (!temVoz) return;
  const vozes = speechSynthesis.getVoices();
  voz = vozes.find(v => v.lang === 'pt-PT') ||
        vozes.find(v => v.lang && v.lang.startsWith('pt')) || null;
}
if (temVoz) {
  escolherVoz();
  speechSynthesis.onvoiceschanged = escolherVoz; // em Android as vozes chegam mais tarde
} else {
  somLigado = false;
  btnSom.disabled = true;
  btnSom.textContent = '🔇 Sem voz neste browser';
}

// ---------- Mostrar uma fala ----------
function acender(ids) {
  document.querySelectorAll('.alvo').forEach(el => el.classList.remove('aceso'));
  ids.forEach(id => document.getElementById(id)?.classList.add('aceso'));
}

function mostrar(fala) {
  legenda.innerHTML = `<span class="quem">${NARRADOR}</span>${fala.texto}`;
  acender(fala.acende);
}

// ---------- Avançar no guião ----------
function tocarFala() {
  if (!aTocar) return;
  if (indice >= FALAS.length) return terminar();

  const fala = FALAS[indice];
  mostrar(fala);
  narradorVisivel(true);
  // se a fala acende os cantos de baixo, a silhueta fica mais transparente para não os tapar
  narrador.classList.toggle('discreto', fala.acende.includes('h-perdidos'));

  if (somLigado && temVoz) {
    const u = new SpeechSynthesisUtterance(fala.texto);
    u.lang = 'pt-PT';
    if (voz) u.voice = voz;
    u.rate = 0.95;                         // um pouco mais pausado
    u.onstart = () => narradorAFalar(true);
    u.onend = () => { narradorAFalar(false); indice++; setTimeout(tocarFala, 400); };
    u.onerror = () => { narradorAFalar(false); indice++; tocarFala(); };
    speechSynthesis.speak(u);
  } else {
    // sem som: tempo de leitura (cerca de 15 caracteres por segundo, mínimo 3 s)
    narradorAFalar(true);
    const ms = Math.max(3000, fala.texto.length * 65);
    temporizador = setTimeout(() => { narradorAFalar(false); indice++; tocarFala(); }, ms);
  }
}

function parar() {
  aTocar = false;
  clearTimeout(temporizador);
  if (temVoz) speechSynthesis.cancel();
  narradorAFalar(false);   // em pausa fica visível, mas calado
}

function terminar() {
  parar();
  acender([]);
  legenda.innerHTML = `<span class="quem">${NARRADOR}</span>Vale! Até à próxima paragem.`;
  btnOuvir.textContent = '▶ Ouvir de novo';
  indice = 0;
  // despede-se e desaparece
  setTimeout(() => { if (!aTocar) narradorVisivel(false); }, 1800);
}

// ---------- Botões ----------
btnOuvir.addEventListener('click', () => {
  if (aTocar) {                 // pausa
    parar();
    btnOuvir.textContent = '▶ Continuar';
  } else {                      // começar / continuar (precisa de um toque: regra dos browsers)
    aTocar = true;
    btnOuvir.textContent = '❚❚ Pausa';
    tocarFala();
  }
});

btnSom.addEventListener('click', () => {
  somLigado = !somLigado;
  btnSom.setAttribute('aria-pressed', String(somLigado));
  btnSom.textContent = somLigado ? '🔊 Som ligado' : '🔇 Só legendas';
  if (aTocar) { parar(); aTocar = true; tocarFala(); } // retoma a mesma fala no novo modo
});

btnRecomecar.addEventListener('click', () => {
  parar();
  indice = 0;
  acender([]);
  narradorVisivel(false);
  legenda.textContent = 'Toca em «Ouvir» para começar.';
  btnOuvir.textContent = '▶ Ouvir';
});
