// Teste 03 · medição comum aos dois motores de RA (MindAR e Zappar).
// Cada página de RA chama: Medicao.iniciar(motor, alvo), Medicao.encontrado(), Medicao.perdido()
// e regista o componente "medidor" na entidade do alvo (para medir o tremor no ecrã).

const ALVOS = {
  "mosaico":        { nome: "Mosaico inteiro",  aspeto: 700 / 1889 },
  "inscricao":      { nome: "Inscrição",        aspeto: 2092 / 485 },
  "painel-central": { nome: "Painel central",   aspeto: 1000 / 980 },
  "vento-boreas":   { nome: "Vento Bóreas",     aspeto: 351 / 412 },
  "vento-zefiro":   { nome: "Vento Zéfiro",     aspeto: 459 / 451 },
};
const CHAVE = "oceano-teste03-resultados";

function lerResultados() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || []; } catch (e) { return []; }
}
function gravarResultados(lista) {
  try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch (e) { /* sem armazenamento */ }
}

function aparelho() {
  const ua = navigator.userAgent;
  const m = ua.match(/\(([^)]+)\)/);
  let s = m ? m[1].split(";").map(x => x.trim()).filter(x => !/^(Linux|U|wv|K)$/.test(x)).slice(0, 3).join(" ") : ua;
  if (/iPhone|iPad/.test(ua)) s = (ua.match(/(iPhone|iPad)[^;)]*/) || ["iPhone"])[0] + " · iOS " + ((ua.match(/OS (\d+[_\d]*)/) || [, "?"])[1]).replace(/_/g, ".");
  return s;
}

const Medicao = {
  motor: "", alvo: "",
  t0: 0, primeiro: null, perdas: 0, visivel: false, tVisivel: 0, desde: 0,
  passos: [], ultimoPx: null, tremor5: null, aMedir: false, fimMedir: 0, amostras: [],

  iniciar(motor, alvo) {
    this.motor = motor; this.alvo = alvo;
    document.getElementById("h-motor").textContent = motor + " · " + (ALVOS[alvo] ? ALVOS[alvo].nome : alvo);
    document.getElementById("h-aparelho").textContent = aparelho();
    document.getElementById("b-recomecar").onclick = () => this.recomecar();
    document.getElementById("b-tremor").onclick = () => this.medirTremor();
    document.getElementById("b-guardar").onclick = () => this.guardar();
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
      motor: this.motor, alvo: ALVOS[this.alvo] ? ALVOS[this.alvo].nome : this.alvo, aparelho: aparelho(),
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
    const nota = prompt("Nota para este registo (ex.: passadiço, manhã, luz natural):", "") || "";
    r.nota = nota;
    const lista = lerResultados(); lista.push(r); gravarResultados(lista);
    const b = document.getElementById("b-guardar"); b.textContent = "Guardado ✓";
    setTimeout(() => { b.textContent = "Guardar resultado"; }, 1500);
  },
};

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

function parametros() {
  const p = new URLSearchParams(location.search);
  const alvo = ALVOS[p.get("alvo")] ? p.get("alvo") : "inscricao";
  return { alvo };
}
