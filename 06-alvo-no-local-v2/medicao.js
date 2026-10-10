// Teste 06 · medição comum aos dois motores de RA (MindAR e Zappar), igual à do teste 04.
// A diferença: o alvo não vem de um ficheiro do site, mas de uma fotografia tirada no próprio ponto
// e transformada em alvo no telemóvel (ver alvos.js e index.html).
// Cada página de RA chama: Medicao.iniciar(motor, alvo), Medicao.encontrado(), Medicao.perdido()
// e regista o componente "medidor" na entidade do alvo (para medir o tremor no ecrã).

// Pontos de visão (ilustração do Mário, 7 out. 2026). Entrada em baixo;
// lado esquerdo = parede turquesa, lado direito = parede amarela.
const LOCAIS = {
  "P1-esq":  { nome: "P1 · entrada, mais à esquerda" },
  "P1":      { nome: "P1 · entrada, ao centro" },
  "P1-dir":  { nome: "P1 · entrada, mais à direita" },
  "P2":  { nome: "P2 · passadiço direito (amarelo), na diagonal → Oceano" },
  "P3":  { nome: "P3 · passadiço direito, de frente → Oceano" },
  "P4":  { nome: "P4 · passadiço direito → Bóreas" },
  "P5":  { nome: "P5 · passadiço direito, junto ao fundo → lacuna do tapete" },
  "P6":  { nome: "P6 · passadiço do fundo, ao centro" },
  "P7":  { nome: "P7 · passadiço esquerdo, junto ao fundo → lacuna do tapete" },
  "P8":  { nome: "P8 · passadiço esquerdo (turquesa) → Zéfiro" },
  "P9":  { nome: "P9 · passadiço esquerdo, de frente → Oceano" },
  "P10": { nome: "P10 · passadiço esquerdo, na diagonal → Oceano" },
  "parede-medalhao":  { nome: "Parede amarela · reprodução do medalhão" },
  "parede-inscricao": { nome: "Parede amarela · reprodução da inscrição" },
  "outro":            { nome: "Outro (escrever na nota)" },
};
const nomeLocal = id => LOCAIS[id] ? LOCAIS[id].nome : "";
const CHAVE = "oceano-teste06-resultados";
const CHAVE_LOCAL = "oceano-teste06-local";
const CHAVE_APARELHO = "oceano-teste06-aparelho";
function lerLocal() { try { return localStorage.getItem(CHAVE_LOCAL) || ""; } catch (e) { return ""; } }

function lerResultados() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || []; } catch (e) { return []; }
}
function gravarResultados(lista) {
  try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch (e) { /* sem armazenamento */ }
}

// O Chrome esconde o modelo no texto do navegador («Android 10» em todos);
// por isso pede-se o modelo verdadeiro uma vez e guarda-se.
async function descobrirAparelho() {
  try {
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      const v = await navigator.userAgentData.getHighEntropyValues(["model", "platformVersion"]);
      if (v.model || v.platformVersion) {
        const s = (v.model || "?") + " · " + v.platform + " " + (v.platformVersion || "").split(".")[0];
        localStorage.setItem(CHAVE_APARELHO, s);
        return s;
      }
    }
  } catch (e) { /* sem acesso */ }
  return aparelhoUA();
}

function aparelho() {
  try { const s = localStorage.getItem(CHAVE_APARELHO); if (s) return s; } catch (e) {}
  return aparelhoUA();
}

function aparelhoUA() {
  const ua = navigator.userAgent;
  const m = ua.match(/\(([^)]+)\)/);
  let s = m ? m[1].split(";").map(x => x.trim()).filter(x => !/^(Linux|U|wv|K)$/.test(x)).slice(0, 3).join(" ") : ua;
  if (/iPhone|iPad/.test(ua)) s = (ua.match(/(iPhone|iPad)[^;)]*/) || ["iPhone"])[0] + " · iOS " + ((ua.match(/OS (\d+[_\d]*)/) || [, "?"])[1]).replace(/_/g, ".");
  return s;
}

const Medicao = {
  motor: "", alvo: null,
  t0: 0, primeiro: null, perdas: 0, visivel: false, tVisivel: 0, desde: 0,
  passos: [], ultimoPx: null, tremor5: null, aMedir: false, fimMedir: 0, amostras: [],

  // alvo: o registo guardado em alvos.js (nome, local onde foi fotografado…)
  iniciar(motor, alvo) {
    this.motor = motor; this.alvo = alvo;
    document.getElementById("h-motor").textContent = motor + " · " + alvo.nome;
    document.getElementById("h-aparelho").textContent = aparelho();
    descobrirAparelho().then(s => { document.getElementById("h-aparelho").textContent = s; });
    const loc = document.getElementById("h-local");
    if (loc) loc.textContent = "Estás em: " + (nomeLocal(lerLocal()) || "⚠ local por escolher (volta à página inicial)");
    document.getElementById("b-recomecar").onclick = () => this.recomecar();
    document.getElementById("b-tremor").onclick = () => this.medirTremor();
    document.getElementById("b-guardar").onclick = () => this.guardar();
    const bf = document.getElementById("b-foto");
    if (bf) bf.onclick = () => fotografarRA(bf);
    this.recomecar();
    setInterval(() => this.mostrar(), 250);
  },

  recomecar() {
    this.t0 = performance.now(); this.primeiro = null; this.perdas = 0;
    this.tVisivel = 0; this.desde = this.visivel ? this.t0 : 0;
    this.passos = []; this.ultimoPx = null; this.tremor5 = null; this.aMedir = false;
    this.mostrar();
  },

  encontrado() {
    const t = performance.now();
    if (this.primeiro === null) this.primeiro = (t - this.t0) / 1000;
    this.visivel = true; this.desde = t; this.ultimoPx = null;
    document.body.classList.add("reconhecido");
  },

  perdido() {
    const t = performance.now();
    if (this.visivel) { this.perdas++; this.tVisivel += t - this.desde; }
    this.visivel = false; this.ultimoPx = null;
    document.body.classList.remove("reconhecido");
  },

  // chamado a cada imagem com a posição do centro do alvo no ecrã (px)
  frame(x, y) {
    if (!this.visivel) return;
    if (this.ultimoPx) {
      const d = Math.hypot(x - this.ultimoPx[0], y - this.ultimoPx[1]);
      const t = performance.now();
      this.passos.push([t, d]);
      while (this.passos.length && t - this.passos[0][0] > 2000) this.passos.shift();
      if (this.aMedir) {
        if (t < this.fimMedir) this.amostras.push(d);
        else { this.aMedir = false; this.tremor5 = this.amostras.length ? this.media(this.amostras) : null; document.getElementById("b-tremor").textContent = "Medir tremor (5 s)"; }
      }
    }
    this.ultimoPx = [x, y];
  },

  medirTremor() {
    this.amostras = []; this.aMedir = true; this.fimMedir = performance.now() + 5000;
    document.getElementById("b-tremor").textContent = "Segura parado…";
  },

  media(a) { return a.reduce((s, v) => s + v, 0) / a.length; },

  resumo() {
    const agora = performance.now(), total = (agora - this.t0) / 1000;
    const vis = (this.tVisivel + (this.visivel ? agora - this.desde : 0)) / 1000;
    return {
      quando: new Date().toLocaleString("pt-PT"),
      motor: this.motor, alvo: this.alvo.nome, aparelho: aparelho(),
      fotografado: nomeLocal(this.alvo.local) || "(não indicado)",
      local: nomeLocal(lerLocal()) || "(não indicado)",
      primeiro: this.primeiro === null ? null : +this.primeiro.toFixed(1),
      perdas: this.perdas,
      pctReconhecido: total > 0 ? Math.round(100 * vis / total) : 0,
      duracao: Math.round(total),
      tremor2s: this.passos.length ? +this.media(this.passos.map(p => p[1])).toFixed(1) : null,
      tremor5s: this.tremor5 === null ? null : +this.tremor5.toFixed(1),
    };
  },

  mostrar() {
    const r = this.resumo();
    document.getElementById("h-estado").textContent = this.visivel ? "RECONHECIDO" : "à procura…";
    document.getElementById("h-primeiro").textContent = r.primeiro === null ? "—" : r.primeiro.toFixed(1).replace(".", ",") + " s";
    document.getElementById("h-perdas").textContent = r.perdas;
    document.getElementById("h-pct").textContent = r.pctReconhecido + " % de " + r.duracao + " s";
    document.getElementById("h-tremor").textContent = r.tremor2s === null ? "—" : r.tremor2s.toFixed(1).replace(".", ",") + " px";
    document.getElementById("h-tremor5").textContent = r.tremor5s === null ? "—" : r.tremor5s.toFixed(1).replace(".", ",") + " px";
  },

  guardar() {
    const r = this.resumo();
    const nota = prompt("Nota (opcional: luz, hora, se o retângulo ficou desalinhado…):", "");
    if (nota === null) return; // «Cancelar» não guarda
    r.nota = nota;
    const lista = lerResultados(); lista.push(r); gravarResultados(lista);
    // recomeça logo, para que a medição seguinte não repita esta
    this.recomecar();
    confirmar(document.getElementById("b-guardar"), "Guardado · recomeçado");
  },
};

// Confirmação visível: o botão fica verde com ✓ durante 2 s e volta ao normal.
// Enquanto está verde não aceita novo toque (evita envios repetidos por dúvida).
function confirmar(botao, msg) {
  if (!botao || botao.classList.contains("ok")) return;
  const antes = botao.textContent;
  botao.classList.add("ok"); botao.textContent = "✓ " + msg; botao.disabled = true;
  setTimeout(() => { botao.classList.remove("ok"); botao.textContent = antes; botao.disabled = false; }, 2000);
}

// «Fotografar a RA» (para o DDB): junta numa imagem o que se vê no ecrã — a câmara, a moldura e os objetos 3D —
// com uma faixa em cima com os dados do momento. Guarda-a no telemóvel (alvos.js, loja «capturas»);
// segue no «Enviar tudo para o GitHub» da página inicial.
// No MindAR a câmara é um vídeo por trás da cena 3D; no Zappar já vem desenhada dentro da cena.
// A cena 3D desenha-se outra vez e copia-se logo a seguir (o navegador apaga-a entre imagens).
async function fotografarRA(botao) {
  const cena = document.querySelector("a-scene");
  if (!cena || !cena.renderer || !cena.camera) return;
  const k = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
  const c = document.createElement("canvas"); c.width = Math.round(W * k); c.height = Math.round(H * k);
  const g = c.getContext("2d"); g.scale(k, k);
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  const pinta = (el, fonte) => { const r = el.getBoundingClientRect(); g.drawImage(fonte || el, r.left, r.top, r.width, r.height); };
  for (const v of document.querySelectorAll("video")) if (v.readyState >= 2 && v.getBoundingClientRect().width) pinta(v);
  cena.renderer.render(cena.object3D, cena.camera);
  pinta(cena.canvas);

  // faixa com os dados
  const r = Medicao.resumo(), quando = new Date();
  const linhas = [
    "Teste 06 · " + Medicao.motor + " · " + Medicao.alvo.nome + (Medicao.visivel ? " · RECONHECIDO" : " · à procura"),
    "Em: " + (nomeLocal(lerLocal()) || "?") + " · " + aparelho(),
    quando.toLocaleString("pt-PT") + " · 1.º rec. " + (r.primeiro === null ? "—" : String(r.primeiro).replace(".", ",") + " s") +
      " · tremor 2 s " + (r.tremor2s === null ? "—" : String(r.tremor2s).replace(".", ",") + " px") + " · " + r.pctReconhecido + " % rec.",
  ];
  const pontos = Medicao.alvo.pontos || [], tl = 15;
  g.font = "12px system-ui, sans-serif"; g.textBaseline = "top";
  // legenda dos pontos marcados (com as cores dos objetos): passa à linha seguinte quando não cabe
  let x = 8, y = 8 + linhas.length * tl;
  const legenda = pontos.map((p, i) => {
    const t = (i + 1) + " " + (p.nome || ""), larg = 13 + g.measureText(t).width;
    if (x > 8 && x + larg > W - 8) { x = 8; y += tl; }
    const item = { t, x, y, cor: CORES_PONTOS[i % CORES_PONTOS.length] };
    x += larg + 12; return item;
  });
  const alto = (pontos.length ? y + tl : 8 + linhas.length * tl) + 6;
  g.fillStyle = "rgba(20,18,16,.78)"; g.fillRect(0, 0, W, alto);
  linhas.forEach((t, i) => { g.fillStyle = i ? "#e6ddd2" : "#ffcf6b"; g.fillText(t, 8, 8 + i * tl, W - 16); });
  for (const it of legenda) {
    g.fillStyle = it.cor; g.beginPath(); g.arc(it.x + 5, it.y + 7, 5, 0, 2 * Math.PI); g.fill();
    g.fillStyle = "#e6ddd2"; g.fillText(it.t, it.x + 13, it.y);
  }

  const jpg = await new Promise(ok => c.toBlob(ok, "image/jpeg", 0.88));
  const hora = quando.toTimeString().slice(0, 8).replace(/:/g, "");
  await Capturas.gravar({
    id: "ra-" + Medicao.motor.toLowerCase() + "-" + (lerLocal() || "sem-local").toLowerCase() + "-" + quando.toISOString().slice(0, 10) + "-" + hora,
    criado: quando.getTime(), motor: Medicao.motor, alvo: Medicao.alvo.nome, alvoId: Medicao.alvo.id, local: lerLocal(),
    reconhecido: Medicao.visivel, jpg,
  });
  // clarão breve, como numa máquina fotográfica
  const f = document.createElement("div");
  f.style.cssText = "position:fixed;inset:0;background:#fff;opacity:.7;z-index:10002;pointer-events:none;transition:opacity .35s";
  document.body.appendChild(f); requestAnimationFrame(() => { f.style.opacity = "0"; }); setTimeout(() => f.remove(), 400);
  confirmar(botao, "Fotografado");
}

// Componente A-Frame: projeta o centro do alvo no ecrã a cada imagem
function registarMedidor() {
  AFRAME.registerComponent("medidor", {
    init() { this.v = new AFRAME.THREE.Vector3(); },
    tick() {
      const cam = this.el.sceneEl.camera;
      if (!cam || !Medicao.visivel) return;
      this.el.object3D.getWorldPosition(this.v);
      this.v.project(cam);
      Medicao.frame((this.v.x + 1) / 2 * window.innerWidth, (1 - this.v.y) / 2 * window.innerHeight);
    },
  });
}

// guarda as páginas e as bibliotecas no telemóvel (ver sw.js)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => { /* sem service worker: funciona só com rede */ });
}
