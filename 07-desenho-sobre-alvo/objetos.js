// Teste 07 · o que se desenha por cima do alvo reconhecido, igual no MindAR e no Zappar:
// - o DESENHO do Mário (PNG transparente do tamanho do recorte), colado ao alvo; ocupa o lugar do cubo;
// - a moldura amarela (retângulo, ou o contorno da forma do recorte: trapézio, triângulo, elipse, polígono);
// - objetos 3D com sombra: um cubo ao centro ou, se o alvo tiver pontos marcados (ex.: os nomes
//   dos quatro libertos na inscrição), um objeto de cor e forma diferentes em cada ponto.
// Cada página de RA chama registarObjetos() e junta htmlMoldura() + htmlObjetos() dentro da entidade do alvo.
// Coordenadas: o alvo fica no plano X-Y, com o centro em (0, 0); o eixo Z sai do alvo em direção à câmara.

const CORES_PONTOS = ["#e8a317", "#2a9d8f", "#d1495b", "#6c5ce7", "#3d8bfd", "#8a5a44"];
const NOMES_FORMAS = { retangulo: "retângulo", trapezio: "trapézio", triangulo: "triângulo", elipse: "elipse", poligono: "polígono" };
const nomeForma = a => a.forma ? NOMES_FORMAS[a.forma.tipo] || a.forma.tipo : "retângulo";

function registarObjetos() {
  const THREE = AFRAME.THREE;

  // «chão» invisível que só mostra a sombra (o mosaico real vê-se através dele)
  AFRAME.registerComponent("so-sombra", {
    schema: { largura: { default: 1 }, altura: { default: 1 }, opacidade: { default: 0.35 } },
    init() {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(this.data.largura, this.data.altura),
                               new THREE.ShadowMaterial({ opacity: this.data.opacidade }));
      m.receiveShadow = true;
      this.el.setObject3D("mesh", m);
    },
    remove() { this.el.removeObject3D("mesh"); },
  });

  // Os dois motores dão ao alvo escalas muito diferentes no mundo 3D (o MindAR trabalha quase em píxeis).
  // A zona onde a luz calcula sombras acompanha essa escala; sem isto a sombra podia simplesmente não aparecer.
  AFRAME.registerComponent("sombra-ajustada", {
    schema: { tamanho: { default: 1 } },
    init() { this.s = new THREE.Vector3(); this.k = 0; },
    tick() {
      const luz = this.el.getObject3D("light");
      if (!luz || !luz.shadow) return;
      this.el.parentEl.object3D.getWorldScale(this.s);
      const k = Math.max(this.s.x, this.s.y, this.s.z);
      if (!k || Math.abs(k - this.k) < 0.01 * k) return;
      this.k = k;
      const c = luz.shadow.camera, r = 1.5 * this.data.tamanho * k;
      c.left = -r; c.right = r; c.top = r; c.bottom = -r;
      c.near = 0.05 * this.data.tamanho * k; c.far = 5 * this.data.tamanho * k;
      c.updateProjectionMatrix();
    },
  });
}

const n3 = v => +v.toFixed(4);

// Moldura amarela: no retângulo, o fundo semitransparente e as quatro bordas (como no teste 05);
// nas outras formas, só o contorno, feito de tiras finas de canto a canto.
function htmlMoldura(a, W, H) {
  const t = 0.012 * Math.max(W, H);
  const tira = (x, y, c, rot) => '<a-plane position="' + n3(x) + ' ' + n3(y) + ' 0.001" width="' + n3(c) + '" height="' + n3(t) + '"' +
    (rot ? ' rotation="0 0 ' + n3(rot) + '"' : '') + ' material="color:#ffd000; shader:flat"></a-plane>';
  const uv = a.forma && a.forma.tipo !== "retangulo" ? a.forma.pts : null;
  if (!uv) {
    return '<a-entity class="moldura"><a-plane width="' + n3(W) + '" height="' + n3(H) + '" material="color:#ffd000; opacity:0.3; transparent:true; shader:flat"></a-plane>' +
      tira(0, H / 2, W) + tira(0, -H / 2, W) + tira(-W / 2, 0, H, 90) + tira(W / 2, 0, H, 90) + '</a-entity>';
  }
  return '<a-entity class="moldura">' + uv.map((p, i) => {
    const q = uv[(i + 1) % uv.length];
    const x1 = (p[0] - 0.5) * W, y1 = (0.5 - p[1]) * H, x2 = (q[0] - 0.5) * W, y2 = (0.5 - q[1]) * H;
    return tira((x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(x2 - x1, y2 - y1) + t, Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI);
  }).join("") + '</a-entity>';
}

// Objetos 3D semitransparentes, pousados no alvo, com luz e sombra
function htmlObjetos(a, W, H) {
  const D = Math.max(W, H), m = Math.min(W, H);
  const mat = cor => 'material="color:' + cor + '; opacity:0.65; transparent:true; roughness:0.6" shadow="cast:true; receive:false"';
  let obj;
  if (!a.pontos || !a.pontos.length) {
    if (a.desenho) return ""; // com desenho, não há cubo (tapava o desenho)
    const s = 0.3 * m;
    obj = '<a-box width="' + n3(s) + '" height="' + n3(s) + '" depth="' + n3(s) + '" position="0 0 ' + n3(s / 2) + '" ' + mat("#ffb000") + '></a-box>';
  } else {
    const s = 0.2 * m;
    obj = a.pontos.map((p, i) => {
      const x = n3((p.u - 0.5) * W), y = n3((0.5 - p.v) * H), cor = CORES_PONTOS[i % CORES_PONTOS.length];
      switch (i % 4) { // cubo, esfera, cilindro, cone; os dois últimos rodados 90° para ficarem de pé sobre o alvo
        case 0: return '<a-box width="' + n3(s) + '" height="' + n3(s) + '" depth="' + n3(s) + '" position="' + x + ' ' + y + ' ' + n3(s / 2) + '" ' + mat(cor) + '></a-box>';
        case 1: return '<a-sphere radius="' + n3(s / 2) + '" position="' + x + ' ' + y + ' ' + n3(s / 2) + '" ' + mat(cor) + '></a-sphere>';
        case 2: return '<a-cylinder radius="' + n3(s / 2) + '" height="' + n3(s) + '" rotation="90 0 0" position="' + x + ' ' + y + ' ' + n3(s / 2) + '" ' + mat(cor) + '></a-cylinder>';
        default: return '<a-cone radius-bottom="' + n3(s / 2) + '" radius-top="0" height="' + n3(s * 1.2) + '" rotation="90 0 0" position="' + x + ' ' + y + ' ' + n3(s * 0.6) + '" ' + mat(cor) + '></a-cone>';
      }
    }).join("");
  }
  return '<a-entity id="alvo-centro"></a-entity>' +
    '<a-entity light="type: ambient; intensity: 0.7"></a-entity>' +
    '<a-entity light="type: directional; intensity: 0.9; castShadow: true; shadowBias: -0.0005; target: #alvo-centro" sombra-ajustada="tamanho: ' + n3(D) + '"' +
      ' position="' + n3(-0.4 * D) + ' ' + n3(0.6 * D) + ' ' + n3(1.5 * D) + '"></a-entity>' +
    '<a-entity so-sombra="largura: ' + n3(3 * W) + '; altura: ' + n3(3 * H) + '" position="0 0 ' + n3(0.003 * D) + '"></a-entity>' +
    obj;
}

// O desenho: um plano do tamanho exato do alvo, com a imagem PNG (transparente onde não se desenhou).
// Fica 1 milésimo acima do alvo, para não se misturar com a moldura. Sem luz (shader flat): as cores são as do desenho.
// O <img> vai para os «assets» da cena: assim o A-Frame espera que a imagem carregue antes de começar.
function htmlDesenho(a, W, H) {
  if (!a.desenho) return "";
  return '<a-plane id="plano-desenho" width="' + n3(W) + '" height="' + n3(H) + '" position="0 0 ' + n3(0.002 * Math.max(W, H)) + '"' +
    ' material="src: #img-desenho; transparent: true; alphaTest: 0.01; shader: flat; side: double; opacity: 1"></a-plane>';
}
function htmlAssetsDesenho(a) {
  return a.desenho ? '<a-assets><img id="img-desenho" src="' + urlDe(a.desenho, "image/png") + '"></a-assets>' : "";
}

// Botões «Desenho» (opacidade 100 → 60 → 30 % → escondido) e «Moldura» (mostrar/esconder).
// O estado fica em Medicao.estadoDesenho, para entrar nos resultados e na faixa das fotografias da RA.
function ligarBotoesDesenho(a) {
  const bd = document.getElementById("b-desenho"), bm = document.getElementById("b-moldura");
  const NIVEIS = [1, 0.6, 0.3, 0];
  let i = 0;
  const estado = () => !a.desenho ? "sem desenho" : NIVEIS[i] ? Math.round(NIVEIS[i] * 100) + " %" : "escondido";
  Medicao.estadoDesenho = estado;
  if (!a.desenho) { bd.hidden = true; }
  else bd.onclick = () => {
    i = (i + 1) % NIVEIS.length;
    const pl = document.getElementById("plano-desenho");
    if (pl) { pl.setAttribute("material", "opacity", NIVEIS[i]); pl.object3D.visible = NIVEIS[i] > 0; }
    bd.textContent = "Desenho " + estado();
  };
  bd.textContent = "Desenho " + estado();
  // com desenho, a moldura começa escondida (tapa os bordos do desenho)
  let moldura = !a.desenho;
  const aplicar = () => { document.querySelectorAll(".moldura").forEach(el => el.object3D && (el.object3D.visible = moldura)); bm.textContent = moldura ? "Moldura ✓" : "Moldura ✗"; };
  bm.onclick = () => { moldura = !moldura; aplicar(); };
  document.querySelector("a-scene").addEventListener("loaded", aplicar);
  aplicar();
}

// Legenda dos pontos no painel de medição (cor, número e nome)
function mostrarLegenda(a) {
  const el = document.getElementById("h-pontos");
  if (!el || !a.pontos || !a.pontos.length) return;
  el.hidden = false;
  el.innerHTML = a.pontos.map((p, i) => '<span><i style="background:' + CORES_PONTOS[i % CORES_PONTOS.length] + '"></i>' +
    (i + 1) + ' ' + String(p.nome || "").replace(/</g, "&lt;") + '</span>').join("");
}
