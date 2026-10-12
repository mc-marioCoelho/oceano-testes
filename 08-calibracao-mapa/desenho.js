// Teste 08 · desenhar sobre o recorte do alvo (ex.: reconstituir a lacuna do tapete em P7 ou o vento Euro).
// O desenho é uma imagem PNG transparente com as MESMAS proporções do recorte: na RA cobre o alvo
// exatamente, por isso o que se desenha em cima da lacuna fica em cima da lacuna verdadeira.
// Duas maneiras de o fazer: desenhar aqui com o dedo, ou carregar um PNG feito no Photoshop
// (sobre o recorte descarregado com «Descarregar o recorte»). Os dois podem combinar-se.
//
// Camadas do editor (todas do tamanho do recorte, em píxeis do recorte):
//   fundo   = o recorte (só para orientar; não entra no desenho)
//   camada  = o desenho
//   traco   = o traço que está a ser feito (junta-se à camada quando se levanta o dedo,
//             com a transparência escolhida; assim um traço não escurece onde se cruza consigo próprio)

const Editor = (() => {
  const $ = id => document.getElementById(id);
  let alvo = null, fundo = null, W = 0, H = 0;
  let camada, cg, traco, tg, vista, vg;
  let ferramenta = "pincel", zoom = 1, aDesenhar = false, ultimo = null, laco = [], dedos = new Set();
  let historia = [], importadoOriginal = null, alterado = false, aoGuardar = null;
  const MAX_HISTORIA = 15;

  const tela = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const cor = () => $("d-cor").value;
  const espessura = () => +$("d-tamanho").value * Math.max(W, H) / 1000; // o tamanho é relativo ao recorte
  const opacidade = () => +$("d-opacidade").value / 100;
  const fundoVisivel = () => +$("d-fundo").value / 100;

  // ---- abrir / fechar ----
  async function abrir(a, guardado) {
    alvo = a; aoGuardar = guardado;
    fundo = await createImageBitmap(a.jpg);
    W = fundo.width; H = fundo.height;
    camada = tela(W, H); cg = camada.getContext("2d");
    traco = tela(W, H); tg = traco.getContext("2d");
    vista = $("d-tela"); vista.width = W; vista.height = H; vg = vista.getContext("2d");
    historia = []; importadoOriginal = null; alterado = false; barbaAplicada = false; ctl = null; $("d-ctl").hidden = true;
    if (a.desenho) { // continuar o desenho já guardado
      const img = await createImageBitmap(a.desenho);
      cg.drawImage(img, 0, 0, W, H);
      if (img.width !== W || img.height !== H) importadoOriginal = a.desenho; // PNG do Photoshop em alta resolução
    }
    paleta();
    $("desenho").hidden = false;
    $("d-titulo").textContent = a.nome;
    mudarZoom(1);
    pintar();
    $("desenho").scrollIntoView({ behavior: "smooth" });
  }
  function fechar() { $("desenho").hidden = true; alvo = null; }

  // ---- mostrar ----
  function pintar() {
    vg.clearRect(0, 0, W, H);
    vg.globalAlpha = fundoVisivel(); vg.drawImage(fundo, 0, 0); vg.globalAlpha = 1;
    if (aDesenhar && ferramenta === "borracha") {
      // pré-visualização da borracha: a camada com o traço já apagado
      const t = tela(W, H), g = t.getContext("2d");
      g.drawImage(camada, 0, 0); g.globalCompositeOperation = "destination-out"; g.drawImage(traco, 0, 0);
      vg.drawImage(t, 0, 0);
    } else {
      vg.drawImage(camada, 0, 0);
      if (aDesenhar) { vg.globalAlpha = opacidade(); vg.drawImage(traco, 0, 0); vg.globalAlpha = 1; }
    }
    if (alvo.forma && alvo.forma.tipo !== "retangulo") { // contorno do recorte, como na marcação de pontos
      vg.setLineDash([10, 8]); vg.strokeStyle = "#ffd000"; vg.lineWidth = Math.max(2, W / 400);
      vg.beginPath(); alvo.forma.pts.forEach(([u, v], i) => i ? vg.lineTo(u * W, v * H) : vg.moveTo(u * W, v * H));
      vg.closePath(); vg.stroke(); vg.setLineDash([]);
    }
    pintarControlo();
  }

  // pontos de controlo: os toques (verde, com número) e, depois de colocar a barba, onde o mapa os põe (amarelo)
  function pintarControlo() {
    if (!ctl) return;
    const r = Math.max(6, W / 120);
    vg.font = "bold " + Math.round(r * 2) + "px system-ui"; vg.lineWidth = Math.max(2, r / 3);
    ctl.toques.forEach((t, i) => { if (!t) return;
      vg.beginPath(); vg.arc(t[0], t[1], r, 0, 2 * Math.PI); vg.fillStyle = "#1f8a4c"; vg.fill(); vg.strokeStyle = "#fff"; vg.stroke();
      vg.fillStyle = "#fff"; vg.strokeStyle = "#000"; vg.strokeText(ctl.z.pontos[i].n, t[0] + r, t[1] - r); vg.fillText(ctl.z.pontos[i].n, t[0] + r, t[1] - r); });
    if (ctl.H) ctl.z.pontos.forEach(p => { const [x, y] = aplica(ctl.H, [p.x, p.y]);
      vg.beginPath(); vg.arc(x, y, r * 1.6, 0, 2 * Math.PI); vg.strokeStyle = "#ffd000"; vg.stroke(); });
  }

  // Zoom: a tela fica maior do que o ecrã e a caixa à volta deixa-se deslizar (só com a ferramenta «Mover»).
  function mudarZoom(z) {
    zoom = z;
    const caixa = $("d-caixa");
    vista.style.width = (100 * z) + "%";
    document.querySelectorAll("#d-zoom button").forEach(b => b.classList.toggle("ativo", +b.dataset.z === z));
    caixa.scrollLeft = (caixa.scrollWidth - caixa.clientWidth) / 2;
    caixa.scrollTop = (caixa.scrollHeight - caixa.clientHeight) / 2;
  }
  function mudarFerramenta(f) {
    ferramenta = f;
    document.querySelectorAll("#d-ferramentas button").forEach(b => b.classList.toggle("ativo", b.dataset.f === f));
    vista.style.touchAction = f === "mover" ? "pan-x pan-y pinch-zoom" : "none";
    vista.style.cursor = f === "mover" ? "grab" : "crosshair";
  }

  // Cores do próprio mosaico: as mais frequentes no recorte (agrupadas, para não dar dez beges quase iguais)
  function paleta() {
    const k = Math.min(1, 200 / Math.max(W, H)), t = tela(Math.max(1, Math.round(W * k)), Math.max(1, Math.round(H * k)));
    t.getContext("2d").drawImage(fundo, 0, 0, t.width, t.height);
    const px = t.getContext("2d").getImageData(0, 0, t.width, t.height).data, caixas = new Map();
    for (let i = 0; i < px.length; i += 4) {
      const ch = (px[i] >> 5) * 64 + (px[i + 1] >> 5) * 8 + (px[i + 2] >> 5);
      const c = caixas.get(ch) || [0, 0, 0, 0];
      c[0] += px[i]; c[1] += px[i + 1]; c[2] += px[i + 2]; c[3]++; caixas.set(ch, c);
    }
    const hex = v => Math.round(v).toString(16).padStart(2, "0");
    const cores = [...caixas.values()].sort((a, b) => b[3] - a[3]).slice(0, 10)
      .map(c => "#" + hex(c[0] / c[3]) + hex(c[1] / c[3]) + hex(c[2] / c[3]));
    $("d-paleta").innerHTML = cores.concat(["#000000", "#ffffff"])
      .map(c => '<button type="button" style="background:' + c + '" data-cor="' + c + '" aria-label="cor ' + c + '"></button>').join("");
  }

  // ---- desenhar ----
  function ponto(ev) {
    const b = vista.getBoundingClientRect();
    return [(ev.clientX - b.left) * W / b.width, (ev.clientY - b.top) * H / b.height];
  }
  function guardarHistoria() {
    historia.push(cg.getImageData(0, 0, W, H));
    if (historia.length > MAX_HISTORIA) historia.shift();
  }
  function marca(x, y) { // um toque sem arrastar também deixa marca
    tg.fillStyle = cor();
    if (ferramenta === "tesela") { const s = espessura(); tg.fillRect(x - s / 2, y - s / 2, s, s); }
    else { tg.beginPath(); tg.arc(x, y, espessura() / 2, 0, 2 * Math.PI); tg.fill(); }
  }
  function segmento(a, b) {
    if (ferramenta === "tesela") {
      // carimbos quadrados ao longo do traço, encostados uns aos outros (parecem tesselas)
      const s = espessura(), d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(d / (s * 1.08));
      if (!n) return false;
      for (let i = 1; i <= n; i++) { const t = i * s * 1.08 / d; marca(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); }
      return true;
    }
    tg.strokeStyle = cor(); tg.lineWidth = espessura(); tg.lineCap = "round"; tg.lineJoin = "round";
    tg.beginPath(); tg.moveTo(...a); tg.lineTo(...b); tg.stroke();
    return true;
  }

  function inicio(ev) {
    dedos.add(ev.pointerId);
    if (ferramenta === "mover") return;
    if (dedos.size > 1) { cancelar(); return; } // dois dedos: não é um traço (evita riscos ao fazer zoom)
    vista.setPointerCapture(ev.pointerId);
    const p = ponto(ev);
    if (ferramenta === "controlo") { controloToque(p); return; }
    if (ferramenta === "contagotas") { // cor do mosaico naquele ponto
      const t = tela(1, 1), g = t.getContext("2d"); g.drawImage(fundo, p[0], p[1], 1, 1, 0, 0, 1, 1);
      const d = g.getImageData(0, 0, 1, 1).data;
      $("d-cor").value = "#" + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, "0")).join("");
      mudarFerramenta(ferramentaAntes || "pincel");
      return;
    }
    aDesenhar = true; tg.clearRect(0, 0, W, H); ultimo = p;
    if (ferramenta === "laco") laco = [p];
    else marca(...p);
    pintar();
  }
  function mover(ev) {
    if (!aDesenhar) return;
    const p = ponto(ev);
    if (ferramenta === "laco") {
      laco.push(p);
      tg.clearRect(0, 0, W, H); tg.fillStyle = cor();
      tg.beginPath(); laco.forEach((q, i) => i ? tg.lineTo(...q) : tg.moveTo(...q)); tg.closePath(); tg.fill();
    } else if (segmento(ultimo, p)) ultimo = p;
    pintar();
  }
  function fim(ev) {
    dedos.delete(ev.pointerId);
    if (!aDesenhar) return;
    aDesenhar = false;
    guardarHistoria();
    cg.save();
    cg.globalCompositeOperation = ferramenta === "borracha" ? "destination-out" : "source-over";
    cg.globalAlpha = ferramenta === "borracha" ? 1 : opacidade();
    cg.drawImage(traco, 0, 0); cg.restore();
    tg.clearRect(0, 0, W, H); laco = [];
    alterado = true; importadoOriginal = null;
    pintar();
  }
  function cancelar() { aDesenhar = false; tg.clearRect(0, 0, W, H); laco = []; pintar(); }
  let ferramentaAntes = null;

  // ---- ficheiros ----
  async function carregarPNG(f) {
    const img = await createImageBitmap(f);
    const r1 = img.width / img.height, r0 = W / H;
    if (Math.abs(r1 - r0) / r0 > 0.02 &&
        !confirm("Esta imagem tem proporções diferentes do recorte (" + img.width + " × " + img.height + " em vez de " + W + " × " + H +
                 "). Vai ser esticada para caber, e o desenho pode ficar fora do sítio. Continuar?")) return;
    guardarHistoria();
    const vazio = !cg.getImageData(0, 0, W, H).data.some((v, i) => i % 4 === 3 && v);
    cg.drawImage(img, 0, 0, W, H); // por cima do que já houver
    // se o desenho estava vazio e o PNG tem as proporções certas, guarda-se o PNG original (resolução do Photoshop)
    importadoOriginal = vazio && Math.abs(r1 - r0) / r0 <= 0.02 ? f : null;
    alterado = true;
    pintar();
  }
  const pngDaCamada = () => new Promise(ok => camada.toBlob(ok, "image/png"));
  function descarregar(blob, nome) {
    const l = document.createElement("a"); l.href = URL.createObjectURL(blob); l.download = nome; l.click();
  }
  const nomeBase = () => "teste08-" + alvo.id.toLowerCase();

  async function guardar() {
    const vazio = !cg.getImageData(0, 0, W, H).data.some((v, i) => i % 4 === 3 && v);
    alvo.desenho = vazio ? null : (importadoOriginal || await pngDaCamada());
    alvo.desenhoInfo = vazio ? null : { atualizado: Date.now(), origem: importadoOriginal ? "PNG carregado" : barbaAplicada ? "mapa (pontos de controlo): " + ((alvo.controloMapa && alvo.controloMapa.pecas) || []).join(", ") : "desenhado no telemóvel" };
    await Alvos.gravar(alvo);
    alterado = false;
    confirmar($("d-guardar"), vazio ? "Desenho apagado" : "Guardado");
    if (aoGuardar) aoGuardar(alvo);
  }

  // ---- reconstituições do mapa, pelos pontos de controlo ----
  // O mapa do mosaico (vetorizado pelo Mário, em cm) tem pontos de controlo à volta da lacuna central.
  // Toca-se em cada um na fotografia do alvo; com 4 ou mais, calcula-se a perspetiva (homografia) do mapa
  // para o recorte, e as peças do mapa (a barba; as silhuetas provisórias do Euro e do Noto) são deformadas
  // para cima do recorte, como desenho. Só aparecem as peças que caem dentro da fotografia.
  let mapa = null, ctl = null, barbaAplicada = false;
  const PECA_PX_CM = 12; // resolução de cada peça rasterizada antes de a deformar
  async function carregarMapa() {
    if (mapa) return mapa;
    const m = await (await fetch("mapa/controlo.json")).json();
    for (const p of m.zonas.flatMap(z => z.pecas)) { // cada peça: recorta-se o SVG à sua caixa e rasteriza-se a 12 px/cm
      const txt = await (await fetch(p.svg)).text(), w = p.x1 - p.x0, h = p.y1 - p.y0;
      const svg = txt.replace(/<svg[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg" width="' + Math.round(w * PECA_PX_CM) + '" height="' + Math.round(h * PECA_PX_CM) + '" viewBox="' + p.x0 + ' ' + p.y0 + ' ' + w + ' ' + h + '">');
      const img = new Image(); img.src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })); await img.decode();
      const c = tela(img.width, img.height); c.getContext("2d").drawImage(img, 0, 0);
      p.img = c.getContext("2d").getImageData(0, 0, c.width, c.height);
    }
    mapa = m;
    return mapa;
  }
  async function controloIniciar() {
    $("d-ctl-msg").textContent = "A carregar o mapa…";
    $("d-ctl").hidden = false;
    try { await carregarMapa(); } catch (e) { $("d-ctl-msg").textContent = "Não foi possível carregar o mapa: " + e.message; return; }
    // primeiro escolhe-se a zona do mosaico que a fotografia do alvo mostra
    $("d-ctl-msg").textContent = "Que zona mostra esta fotografia?";
    $("d-ctl-zonas").hidden = false; $("d-ctl-passos").hidden = true;
    $("d-ctl-zonas").innerHTML = mapa.zonas.map(z => '<button type="button" data-zona="' + z.id + '">' + z.nome + '</button>').join("");
  }
  function controloZona(id) {
    const z = mapa.zonas.find(z => z.id === id); if (!z) return;
    ctl = { z, i: 0, toques: z.pontos.map(() => null), H: null };
    $("d-ctl-zonas").hidden = true; $("d-ctl-passos").hidden = false;
    ferramentaAntes = ferramenta; mudarFerramenta("controlo");
    controloMostrar();
  }
  function controloFechar() { ctl = null; $("d-ctl").hidden = true; $("d-ctl-zonas").hidden = true; mudarFerramenta(ferramentaAntes && ferramentaAntes !== "controlo" ? ferramentaAntes : "pincel"); pintar(); }
  function controloMostrar() {
    const n = ctl.toques.filter(Boolean).length;
    const p = ctl.z.pontos[ctl.i];
    $("d-ctl-msg").innerHTML = ctl.i < ctl.z.pontos.length
      ? "Toca no <strong>ponto " + p.n + "</strong>: " + p.onde + ". Se não aparece na fotografia, «Saltar». (" + n + " marcado" + (n === 1 ? "" : "s") + "; são precisos 4 ou mais)"
      : n + " pontos marcados. Carrega em «Colocar o desenho do mapa».";
    $("d-ctl-aplicar").disabled = n < 4;
    controloEsquema(); pintar();
  }
  // esquema do mapa (sem fotografia): os círculos do medalhão, a lacuna e os pontos numerados
  function controloEsquema() {
    const c = $("d-ctl-esquema"), g = c.getContext("2d"), E = ctl.z.esquema;
    c.height = Math.round(c.width * E.h / E.w);
    const X0 = E.x0, Y0 = E.y0, S = c.width / E.w;
    const q = (x, y) => [(x - X0) * S, (y - Y0) * S];
    g.fillStyle = "#fffaf2"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "rgba(0,80,255,.15)"; g.beginPath(); E.lacuna.forEach(([x, y], i) => { const [a, b] = q(x, y); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fill();
    g.strokeStyle = "#2b2622"; g.lineWidth = 1.5;
    for (const k of E.circulos) { const [a, b] = q(k.c[0], k.c[1]); g.beginPath(); g.arc(a, b, k.r * S, 0, 2 * Math.PI); g.stroke(); }
    g.fillStyle = "rgba(255,45,149,.35)"; for (const p of ctl.z.pecas) { const [a, b] = q(p.x0, p.y0); g.fillRect(a, b, (p.x1 - p.x0) * S, (p.y1 - p.y0) * S); }
    ctl.z.pontos.forEach((p, i) => { const [a, b] = q(p.x, p.y);
      g.beginPath(); g.arc(a, b, i === ctl.i ? 9 : 6, 0, 2 * Math.PI);
      g.fillStyle = ctl.toques[i] ? "#1f8a4c" : i === ctl.i ? "#ff1744" : "#999"; g.fill();
      g.fillStyle = "#2b2622"; g.font = "bold 13px system-ui"; g.fillText(p.n, a + 8, b - 6); });
  }
  function controloToque(p) {
    if (!ctl || ctl.i >= ctl.z.pontos.length) return;
    ctl.toques[ctl.i] = p; ctl.i++; ctl.H = null; controloMostrar();
  }
  // homografia por mínimos quadrados, com coordenadas normalizadas (Hartley)
  function normalizar(P) { const n = P.length, mx = P.reduce((s, p) => s + p[0], 0) / n, my = P.reduce((s, p) => s + p[1], 0) / n;
    const d = P.reduce((s, p) => s + Math.hypot(p[0] - mx, p[1] - my), 0) / n || 1, k = Math.SQRT2 / d;
    return [[k, 0, -k * mx], [0, k, -k * my], [0, 0, 1]]; }
  const mul = (A, B) => A.map((l, i) => [0, 1, 2].map(j => l[0] * B[0][j] + l[1] * B[1][j] + l[2] * B[2][j]));
  const inv = M => { const [a, b, c] = M[0], [d, e, f] = M[1], [g, h, i] = M[2]; const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, D = a * A + b * B + c * C;
    return [[A / D, -(b * i - c * h) / D, (b * f - c * e) / D], [B / D, (a * i - c * g) / D, -(a * f - c * d) / D], [C / D, -(a * h - b * g) / D, (a * e - b * d) / D]]; };
  const aplica = (H, [x, y]) => { const w = H[2][0] * x + H[2][1] * y + H[2][2]; return [(H[0][0] * x + H[0][1] * y + H[0][2]) / w, (H[1][0] * x + H[1][1] * y + H[1][2]) / w]; };
  function homografia(de, para) {
    const T1 = normalizar(de), T2 = normalizar(para), a = de.map(p => aplica(T1, p)), b = para.map(p => aplica(T2, p));
    const M = Array.from({ length: 8 }, () => new Array(9).fill(0)); // equações normais [AᵀA | Aᵀb]
    a.forEach(([x, y], i) => { const [u, v] = b[i];
      for (const [l, r] of [[[x, y, 1, 0, 0, 0, -u * x, -u * y], u], [[0, 0, 0, x, y, 1, -v * x, -v * y], v]])
        for (let j = 0; j < 8; j++) { for (let k = 0; k < 8; k++) M[j][k] += l[j] * l[k]; M[j][8] += l[j] * r; } });
    for (let c = 0; c < 8; c++) { let m = c; for (let r = c + 1; r < 8; r++) if (Math.abs(M[r][c]) > Math.abs(M[m][c])) m = r;
      [M[c], M[m]] = [M[m], M[c]]; for (let r = 0; r < 8; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 9; k++) M[r][k] -= f * M[c][k]; } }
    const h = M.map((l, i) => l[8] / l[i]);
    return mul(inv(T2), mul([[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]], T1));
  }
  function controloAplicar() {
    const pares = ctl.z.pontos.map((p, i) => ctl.toques[i] && [[p.x, p.y], ctl.toques[i]]).filter(Boolean);
    if (pares.length < 4) return;
    // pontos quase em linha: a perspetiva fica indeterminada
    const P = pares.map(q => q[0]), cx = P.reduce((s, p) => s + p[0], 0) / P.length, cy = P.reduce((s, p) => s + p[1], 0) / P.length;
    let sxx = 0, syy = 0, sxy = 0; for (const [x, y] of P) { sxx += (x - cx) ** 2; syy += (y - cy) ** 2; sxy += (x - cx) * (y - cy); }
    const tr = sxx + syy, det = sxx * syy - sxy * sxy, menor = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det));
    if (Math.sqrt(menor / P.length) < 8 && !confirm("Os pontos marcados estão quase em linha (todos em cima ou todos em baixo). A perspetiva vai sair mal. Continuar na mesma?")) return;
    const Hm = homografia(pares.map(q => q[0]), pares.map(q => q[1])), Hi = inv(Hm);
    // erro: cada toque levado de volta ao mapa, comparado com o ponto do mapa (cm)
    const erros = pares.map(([m, t]) => { const v = aplica(Hi, t); return Math.hypot(v[0] - m[0], v[1] - m[1]); });
    const erro = erros.length > 4 ? Math.sqrt(erros.reduce((s, e) => s + e * e, 0) / erros.length) : null;
    // deformar as peças: para cada píxel do recorte, onde cai no mapa, e se alguma peça tem cor lá
    const out = cg.createImageData(W, H), o = out.data, usadas = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const w = Hi[2][0] * x + Hi[2][1] * y + Hi[2][2]; if (w <= 0) continue;
      const mx = (Hi[0][0] * x + Hi[0][1] * y + Hi[0][2]) / w, my = (Hi[1][0] * x + Hi[1][1] * y + Hi[1][2]) / w;
      for (const p of ctl.z.pecas) {
        if (mx < p.x0 || mx >= p.x1 || my < p.y0 || my >= p.y1) continue;
        const bx = Math.floor((mx - p.x0) * PECA_PX_CM), by = Math.floor((my - p.y0) * PECA_PX_CM), BW = p.img.width;
        if (bx >= BW || by >= p.img.height) continue;
        const s = (by * BW + bx) * 4, src = p.img.data; if (!src[s + 3]) continue;
        const d = (y * W + x) * 4; o[d] = src[s]; o[d + 1] = src[s + 1]; o[d + 2] = src[s + 2]; o[d + 3] = src[s + 3]; usadas.add(p.nome); break;
      }
    }
    // escala: quantos cm do mosaico mede um píxel do recorte, ao centro (para converter o tremor em cm)
    const c0 = aplica(Hi, [W / 2, H / 2]), c1 = aplica(Hi, [W / 2 + 10, H / 2]), c2 = aplica(Hi, [W / 2, H / 2 + 10]);
    const cmPorPx = (Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) + Math.hypot(c2[0] - c0[0], c2[1] - c0[1])) / 20;
    guardarHistoria();
    const t = tela(W, H); t.getContext("2d").putImageData(out, 0, 0); cg.drawImage(t, 0, 0);
    ctl.H = Hm; barbaAplicada = true; alterado = true; importadoOriginal = null;
    alvo.controloMapa = { quando: Date.now(), pontos: ctl.z.pontos.map((p, i) => ({ n: p.n, mapa: [p.x, p.y], recorte: ctl.toques[i] && ctl.toques[i].map(v => +v.toFixed(1)) })),
                          H: Hm.map(l => l.map(v => +v.toPrecision(8))), erroCm: erro === null ? null : +erro.toFixed(1), cmPorPx: +cmPorPx.toFixed(3), pecas: [...usadas], zona: ctl.z.id };
    setTimeout(guardar, 50); // teste 08: grava logo (sem passo «Guardar desenho»)
    $("d-ctl-msg").innerHTML = "✓ Colocado e gravado" + (usadas.size ? " (" + [...usadas].join(", ") + ")" : ": nenhuma peça cai dentro desta fotografia") + " com " + pares.length + " pontos" + (erro === null ? " (com 4 pontos não se mede o erro; com 5 ou mais, sim)." : " · erro médio " + erro.toFixed(1).replace(".", ",") + " cm" + (erro > 3 ? " — alto: revê os toques" : "")) +
      ". Os círculos amarelos mostram onde ficam todos os pontos do mapa. Se estiverem nos sítios certos, testa com MindAR ou Zappar (passo 5); se não, «Fechar» e calibra de novo.";
    pintar();
  }

  // ---- ligar os botões (uma vez) ----
  function iniciar() {
    vista = $("d-tela");
    vista.addEventListener("pointerdown", inicio);
    vista.addEventListener("pointermove", mover);
    vista.addEventListener("pointerup", fim);
    vista.addEventListener("pointercancel", ev => { dedos.delete(ev.pointerId); cancelar(); });
    $("d-ferramentas").addEventListener("click", ev => {
      const b = ev.target.closest("button[data-f]"); if (!b) return;
      if (b.dataset.f === "contagotas") ferramentaAntes = ferramenta === "contagotas" ? ferramentaAntes : ferramenta;
      mudarFerramenta(b.dataset.f);
    });
    $("d-zoom").addEventListener("click", ev => { const b = ev.target.closest("button[data-z]"); if (b) mudarZoom(+b.dataset.z); });
    $("d-paleta").addEventListener("click", ev => {
      const b = ev.target.closest("button[data-cor]"); if (!b) return;
      $("d-cor").value = b.dataset.cor;
      if (ferramenta === "borracha" || ferramenta === "mover" || ferramenta === "contagotas") mudarFerramenta("pincel");
    });
    $("d-fundo").addEventListener("input", () => alvo && pintar());
    $("d-desfazer").onclick = () => { if (!historia.length) return; cg.putImageData(historia.pop(), 0, 0); importadoOriginal = null; alterado = true; pintar(); };
    $("d-limpar").onclick = () => { if (!confirm("Apagar todo o desenho? (Pode desfazer-se.)")) return; guardarHistoria(); cg.clearRect(0, 0, W, H); importadoOriginal = null; alterado = true; pintar(); };
    $("d-png").addEventListener("change", async ev => { const f = ev.target.files[0]; ev.target.value = ""; if (f) await carregarPNG(f); });
    $("d-baixar-recorte").onclick = () => descarregar(alvo.jpg, nomeBase() + "-recorte-" + W + "x" + H + ".jpg");
    $("d-baixar-png").onclick = async () => descarregar(importadoOriginal || await pngDaCamada(), nomeBase() + "-desenho.png");
    $("d-guardar").onclick = guardar;
    $("d-ctl-iniciar").onclick = controloIniciar;
    $("d-ctl-saltar").onclick = () => { if (ctl && ctl.i < ctl.z.pontos.length) { ctl.i++; controloMostrar(); } };
    $("d-ctl-desfazer").onclick = () => { if (!ctl) return; while (ctl.i > 0) { ctl.i--; if (ctl.toques[ctl.i]) { ctl.toques[ctl.i] = null; break; } } ctl.H = null; controloMostrar(); };
    $("d-ctl-marcar").onclick = () => { if (ctl) mudarFerramenta("controlo"); };
    $("d-ctl-mover").onclick = () => { if (ctl) mudarFerramenta("mover"); }; // teste 08: deslizar a fotografia ampliada
    $("d-ctl-aplicar").onclick = controloAplicar;
    $("d-ctl-zonas").addEventListener("click", ev => { const b = ev.target.closest("button[data-zona]"); if (b) controloZona(b.dataset.zona); });
    $("d-ctl-fechar").onclick = controloFechar;
    $("d-fechar").onclick = () => { if (alterado && !confirm("O desenho tem alterações por guardar. Fechar na mesma?")) return; fechar(); };
    mudarFerramenta("pincel");
  }

  return { iniciar, abrir, fechar, get aberto() { return !!alvo; } };
})();
