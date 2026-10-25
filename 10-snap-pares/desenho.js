// Teste 10 · calibrar o alvo com o mapa do mosaico (pontos de controlo) e colocar a barba e os ventos.
// Herdado do teste 09 (editor do desenho sobre o recorte; aqui só se usa a calibração). Novo no teste 10:
//   - lista curta: os pontos que o Mário marcou no Illustrator (mapa/pontos-mario.json), por ponto de visão;
//   - corrigir um par: tocar no par (na lista), movê-lo na fotografia ou com as setas, ou apagá-lo;
//   - mira: ao marcar, o ponto fica acima do dedo e aparece uma lupa (o dedo não tapa o sítio);
//     setas de ajuste fino (1 píxel do recorte) com uma lupa fixa;
//   - «snap» (encaixe.js): encaixa os pontos nos traços escuros e junta sozinho outros cruzamentos do mapa;
//     mostra o erro em cm antes e depois e a validação cruzada; assinala os pontos duvidosos;
//   - a calibração fica guardada com os pares, e volta a abrir-se para corrigir (sem marcar tudo de novo).
//
// O desenho (barba, ventos) é uma imagem PNG transparente com as MESMAS proporções do recorte: na RA cobre o alvo
// exatamente, por isso o que está em cima da lacuna fica em cima da lacuna verdadeira.

const Editor = (() => {
  const $ = id => document.getElementById(id);
  let alvo = null, fundo = null, W = 0, H = 0;
  let camada, cg, traco, tg, vista, vg;
  let ferramenta = "pincel", zoom = 1, aDesenhar = false, ultimo = null, laco = [], dedos = new Set();
  let historia = [], importadoOriginal = null, alterado = false, aoGuardar = null;
  const MAX_HISTORIA = 15;
  const MIRA_ACIMA = 70;   // a mira fica 70 px (do ecrã) acima do dedo
  const LUPA = 150;        // lado da lupa (px do ecrã)

  const tela = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const cor = () => $("d-cor").value;
  const espessura = () => +$("d-tamanho").value * Math.max(W, H) / 1000;
  const opacidade = () => +$("d-opacidade").value / 100;
  const fundoVisivel = () => +$("d-fundo").value / 100;
  const virgula = (v, c = 1) => v === null || v === undefined ? "—" : v.toFixed(c).replace(".", ",");

  // ---- abrir / fechar ----
  async function abrir(a, guardado) {
    alvo = a; aoGuardar = guardado;
    fundo = await createImageBitmap(a.jpg);
    W = fundo.width; H = fundo.height;
    camada = tela(W, H); cg = camada.getContext("2d");
    traco = tela(W, H); tg = traco.getContext("2d");
    vista = $("d-tela"); vista.width = W; vista.height = H; vg = vista.getContext("2d");
    historia = []; importadoOriginal = null; alterado = false; barbaAplicada = false; ctl = null; $("d-ctl").hidden = true; $("d-ctl-feedback").hidden = true; $("d-ctl-baixo").hidden = true;
    if (a.desenho) {
      const img = await createImageBitmap(a.desenho);
      cg.drawImage(img, 0, 0, W, H);
      if (img.width !== W || img.height !== H) importadoOriginal = a.desenho;
    }
    paleta();
    $("desenho").hidden = false;
    $("d-titulo").textContent = a.nome;
    mudarZoom(1);
    pintar();
    $("desenho").scrollIntoView({ behavior: "smooth" });
  }
  function fechar() { $("desenho").hidden = true; alvo = null; ctl = null; esconderLupa(); }

  // ---- mostrar ----
  function pintar() {
    vg.clearRect(0, 0, W, H);
    vg.globalAlpha = fundoVisivel(); vg.drawImage(fundo, 0, 0); vg.globalAlpha = 1;
    if (aDesenhar && ferramenta === "borracha") {
      const t = tela(W, H), g = t.getContext("2d");
      g.drawImage(camada, 0, 0); g.globalCompositeOperation = "destination-out"; g.drawImage(traco, 0, 0);
      vg.drawImage(t, 0, 0);
    } else {
      // com a malha do mapa à vista, o desenho fica meio transparente (para se ver a fotografia por baixo)
      vg.globalAlpha = ctl && ctl.verMalha ? 0.35 : 1; vg.drawImage(camada, 0, 0); vg.globalAlpha = 1;
      if (aDesenhar) { vg.globalAlpha = opacidade(); vg.drawImage(traco, 0, 0); vg.globalAlpha = 1; }
    }
    if (alvo.forma && alvo.forma.tipo !== "retangulo") {
      vg.setLineDash([10, 8]); vg.strokeStyle = "#ffd000"; vg.lineWidth = Math.max(2, W / 400);
      vg.beginPath(); alvo.forma.pts.forEach(([u, v], i) => i ? vg.lineTo(u * W, v * H) : vg.moveTo(u * W, v * H));
      vg.closePath(); vg.stroke(); vg.setLineDash([]);
    }
    pintarControlo();
    if (ctl && ctl.livre) pintarLupaFixa();
  }

  // a perspetiva atual (mapa → recorte): a do snap em pré-visualização, a aplicada, ou a dos pares marcados (4 ou mais)
  function perspetivaAtual() {
    if (!ctl) return null;
    if (ctl.previa) return ctl.previa.H;
    if (ctl.H) return ctl.H;
    const p = paresUsados(); return p.length >= 4 ? Encaixe.homografia(p.map(q => q.mapa), p.map(q => q.foto)) : null;
  }
  // pares que entram na perspetiva: os do Mário (menos os que o snap pôs de fora) e os cruzamentos que o snap juntou
  function paresUsados() {
    if (!ctl) return [];
    return ctl.pares.filter(p => p.usar !== false).map(p => ({ mapa: p.mapa, foto: p.foto })).concat((ctl.automaticos || []).map(p => ({ mapa: p.mapa, foto: p.foto })));
  }

  function pintarControlo() {
    if (!ctl) return;
    const r = Math.max(6, W / 120);
    vg.font = "bold " + Math.round(r * 2) + "px system-ui"; vg.lineWidth = Math.max(2, r / 3);
    const Hm = perspetivaAtual();
    // malha do mapa levada à fotografia: mostra se a calibração assenta nos traços
    if (ctl.verMalha && Hm && malhaMapa) {
      vg.strokeStyle = "rgba(0,229,255,.9)"; vg.lineWidth = Math.max(1, W / 900);
      for (const lista of [malhaMapa.malha, malhaMapa.denteado]) for (const l of lista) {
        vg.beginPath(); let ok = false;
        for (const p of l) { const w = Hm[2][0] * p[0] + Hm[2][1] * p[1] + Hm[2][2]; if (w <= 0) { ok = false; continue; } const [x, y] = Encaixe.aplica(Hm, p); ok ? vg.lineTo(x, y) : vg.moveTo(x, y); ok = true; }
        vg.stroke(); }
      vg.lineWidth = Math.max(2, r / 3);
    }
    const marca = (x, y, cheio, borda, raio) => { vg.beginPath(); vg.arc(x, y, raio || r, 0, 2 * Math.PI); if (cheio) { vg.fillStyle = cheio; vg.fill(); } vg.strokeStyle = borda; vg.stroke(); };
    const texto = (t, x, y, c) => { vg.fillStyle = c || "#fff"; vg.strokeStyle = "#000"; vg.lineWidth = Math.max(2, r / 3); vg.strokeText(t, x, y); vg.fillText(t, x, y); };
    if (!ctl.livre) return;
    // cruzamentos juntados pelo snap (pequenos, ciano)
    for (const p of (ctl.previa ? ctl.previa.automaticos : ctl.automaticos) || []) marca(p.foto[0], p.foto[1], "#00e5ff", "#003844", r * 0.5);
    ctl.pares.forEach((p, i) => {
      const nome = rotulo(p, i), info = ctl.previa ? ctl.previa.info[i] : p.info;
      if (ctl.previa) { // pré-visualização do snap: do toque (laranja) ao sítio encaixado (verde); duvidoso a vermelho
        const q = ctl.previa.pares[i].foto;
        vg.strokeStyle = "#ff8f00"; vg.beginPath(); vg.moveTo(p.foto[0], p.foto[1]); vg.lineTo(q[0], q[1]); vg.stroke();
        marca(p.foto[0], p.foto[1], null, "#ff8f00", r * 0.8);
        if (info.tipo === "duvidoso" || info.tipo === "fora") { marca(q[0], q[1], null, "#ff1744", r * 1.3); texto(nome + " ?", q[0] + r, q[1] - r, "#ff8a80"); }
        else { marca(q[0], q[1], "#1f8a4c", "#fff"); texto(nome, q[0] + r, q[1] - r); }
        return;
      }
      const escolhido = ctl.escolhido === i, fora = p.usar === false;
      marca(p.foto[0], p.foto[1], fora ? null : "#1f8a4c", escolhido ? "#ffd000" : fora ? "#ff1744" : "#fff", escolhido ? r * 1.4 : r);
      texto(nome + (fora ? " ✗" : ""), p.foto[0] + r, p.foto[1] - r, escolhido ? "#ffd000" : "#fff");
    });
    // onde a calibração aplicada põe os pontos do mapa (amarelo): se coincidir com os verdes, está certo
    if (ctl.H && !ctl.previa) ctl.pares.forEach(p => { const [x, y] = Encaixe.aplica(ctl.H, p.mapa); marca(x, y, null, "#ffd000", r * 1.6); });
    // marca por confirmar (laranja, com cruz)
    if (ctl.toque) { const [x, y] = ctl.toque; vg.strokeStyle = "#ff8f00"; vg.lineWidth = Math.max(2, r / 3);
      vg.beginPath(); vg.arc(x, y, r * 1.4, 0, 2 * Math.PI); vg.moveTo(x - r * 2.4, y); vg.lineTo(x + r * 2.4, y); vg.moveTo(x, y - r * 2.4); vg.lineTo(x, y + r * 2.4); vg.stroke(); }
    // mira enquanto o dedo está pousado
    if (ctl.mira) { const [x, y] = ctl.mira; vg.strokeStyle = "#ff1744"; vg.lineWidth = Math.max(1.5, r / 4);
      vg.beginPath(); vg.moveTo(x - r * 3, y); vg.lineTo(x + r * 3, y); vg.moveTo(x, y - r * 3); vg.lineTo(x, y + r * 3); vg.stroke(); }
  }
  const rotulo = (p, i) => p.n || String(i + 1);

  // ---- lupas ----
  // escala do ecrã: quantos px do ecrã mede um píxel do recorte
  const escalaEcra = () => vista.getBoundingClientRect().width / W;
  function desenharLupa(c, centro, ladoRecorte) {
    const r = window.devicePixelRatio || 1, L = c.clientWidth || LUPA;
    if (c.width !== Math.round(L * r)) { c.width = Math.round(L * r); c.height = Math.round(L * r); }
    const g = c.getContext("2d"); g.setTransform(r, 0, 0, r, 0, 0);
    g.fillStyle = "#222"; g.fillRect(0, 0, L, L);
    if (!centro) { g.fillStyle = "#aaa"; g.font = "13px system-ui"; g.textAlign = "center"; g.fillText("sem ponto", L / 2, L / 2); g.textAlign = "start"; return; }
    g.imageSmoothingEnabled = true;
    // só a fotografia (sem as marcas, que tapariam o sítio exato), com a mira ao centro; da original, se houver (mais nítida)
    if (lupaOriginal && lupaOriginal.id === alvo.id) { const o = lupaOriginal, k = o.k;
      g.drawImage(o.c, centro[0] * k + o.ox - ladoRecorte * k / 2, centro[1] * k + o.oy - ladoRecorte * k / 2, ladoRecorte * k, ladoRecorte * k, 0, 0, L, L); }
    else g.drawImage(fundo, centro[0] - ladoRecorte / 2, centro[1] - ladoRecorte / 2, ladoRecorte, ladoRecorte, 0, 0, L, L);
    g.strokeStyle = "#ff1744"; g.lineWidth = 1.5; g.beginPath();
    g.moveTo(L / 2, 0); g.lineTo(L / 2, L / 2 - 6); g.moveTo(L / 2, L / 2 + 6); g.lineTo(L / 2, L);
    g.moveTo(0, L / 2); g.lineTo(L / 2 - 6, L / 2); g.moveTo(L / 2 + 6, L / 2); g.lineTo(L, L / 2); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1; g.strokeRect(L / 2 - 2, L / 2 - 2, 4, 4);
  }
  // lupa que acompanha o dedo: 5 vezes maior do que se vê no ecrã, por cima do dedo
  function mostrarLupa(ev) {
    const c = $("d-lupa"); c.hidden = false;
    let left = ev.clientX - LUPA / 2, top = ev.clientY - MIRA_ACIMA - LUPA - 30;
    if (top < 4) top = ev.clientY + 40; // perto do cimo do ecrã: por baixo do dedo
    left = Math.max(4, Math.min(window.innerWidth - LUPA - 4, left));
    c.style.left = left + "px"; c.style.top = top + "px";
    desenharLupa(c, ctl.mira, LUPA / (5 * escalaEcra()));
  }
  function esconderLupa() { const c = $("d-lupa"); if (c) c.hidden = true; }
  // lupa fixa, ao lado das setas: o ponto por confirmar ou o par escolhido
  function pintarLupaFixa() {
    const c = $("d-lupa-fixa"); if (!c || $("d-ctl-baixo").hidden) return;
    desenharLupa(c, alvoDoAjuste(), 48);
  }
  function alvoDoAjuste() { return ctl.toque || (ctl.escolhido !== null && ctl.pares[ctl.escolhido] ? ctl.pares[ctl.escolhido].foto : null); }

  // Zoom: a tela fica maior do que o ecrã e a caixa à volta deixa-se deslizar.
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
    document.querySelectorAll("#d-ctl-modo button").forEach(b => b.classList.toggle("ativo", (b.dataset.modo === "mira") === (f === "mira")));
    // «controlo» (deslizar): arrastar desliza a fotografia ampliada, só um toque curto marca. «mira»: o dedo arrasta a mira.
    vista.style.touchAction = f === "mover" ? "pan-x pan-y pinch-zoom" : f === "controlo" ? "pan-x pan-y" : "none";
    vista.style.cursor = f === "mover" ? "grab" : "crosshair";
  }

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

  // ---- toques na fotografia ----
  function ponto(ev, acima = 0) {
    const b = vista.getBoundingClientRect();
    return [(ev.clientX - b.left) * W / b.width, (ev.clientY - acima - b.top) * H / b.height];
  }
  function guardarHistoria() {
    historia.push(cg.getImageData(0, 0, W, H));
    if (historia.length > MAX_HISTORIA) historia.shift();
  }
  function marca(x, y) {
    tg.fillStyle = cor();
    if (ferramenta === "tesela") { const s = espessura(); tg.fillRect(x - s / 2, y - s / 2, s, s); }
    else { tg.beginPath(); tg.arc(x, y, espessura() / 2, 0, 2 * Math.PI); tg.fill(); }
  }
  function segmento(a, b) {
    if (ferramenta === "tesela") {
      const s = espessura(), d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(d / (s * 1.08));
      if (!n) return false;
      for (let i = 1; i <= n; i++) { const t = i * s * 1.08 / d; marca(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); }
      return true;
    }
    tg.strokeStyle = cor(); tg.lineWidth = espessura(); tg.lineCap = "round"; tg.lineJoin = "round";
    tg.beginPath(); tg.moveTo(...a); tg.lineTo(...b); tg.stroke();
    return true;
  }

  let toqueIni = null;
  function inicio(ev) {
    dedos.add(ev.pointerId);
    if (ferramenta === "mover") return;
    if (ferramenta === "mira") { // a mira segue o dedo, um pouco acima dele; ao levantar o dedo, o ponto fica lá
      if (!ctl || dedos.size > 1) { ctl && (ctl.mira = null); esconderLupa(); pintar(); return; }
      try { vista.setPointerCapture(ev.pointerId); } catch (e) {}
      ctl.mira = ponto(ev, MIRA_ACIMA); pintar(); mostrarLupa(ev); return;
    }
    if (ferramenta === "controlo") { toqueIni = dedos.size === 1 ? { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: performance.now() } : null; return; }
    if (dedos.size > 1) { cancelar(); return; }
    vista.setPointerCapture(ev.pointerId);
    const p = ponto(ev);
    if (ferramenta === "contagotas") {
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
    if (ferramenta === "mira") { if (ctl && ctl.mira && dedos.size === 1) { ctl.mira = ponto(ev, MIRA_ACIMA); pintar(); mostrarLupa(ev); } return; }
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
    if (ferramenta === "mira") {
      dedos.delete(ev.pointerId); esconderLupa();
      if (ctl && ctl.mira) { const p = ctl.mira; ctl.mira = null; colocarPonto(p); }
      return;
    }
    if (ferramenta === "controlo") {
      const t = toqueIni; toqueIni = null; dedos.delete(ev.pointerId);
      if (t && t.id === ev.pointerId && Math.hypot(ev.clientX - t.x, ev.clientY - t.y) < 10 && performance.now() - t.t < 800) colocarPonto(ponto(ev));
      return;
    }
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
    cg.drawImage(img, 0, 0, W, H);
    importadoOriginal = vazio && Math.abs(r1 - r0) / r0 <= 0.02 ? f : null;
    alterado = true;
    pintar();
  }
  const pngDaCamada = () => new Promise(ok => camada.toBlob(ok, "image/png"));
  function descarregar(blob, nome) {
    const l = document.createElement("a"); l.href = URL.createObjectURL(blob); l.download = nome; l.click();
  }
  const nomeBase = () => "teste10-" + alvo.id.toLowerCase();

  async function guardar() {
    const vazio = !cg.getImageData(0, 0, W, H).data.some((v, i) => i % 4 === 3 && v);
    alvo.desenho = vazio ? null : (importadoOriginal || await pngDaCamada());
    alvo.desenhoInfo = vazio ? null : { atualizado: Date.now(), origem: importadoOriginal ? "PNG carregado" : barbaAplicada ? "mapa (pontos de controlo): " + ((alvo.controloMapa && alvo.controloMapa.pecas) || []).join(", ") : "desenhado no telemóvel" };
    await Alvos.gravar(alvo);
    alterado = false;
    confirmar($("d-guardar"), vazio ? "Desenho apagado" : "Guardado");
    if (aoGuardar) aoGuardar(alvo);
  }

  // ---- calibração: pares (ponto do mapa ↔ ponto da fotografia) ----
  let mapa = null, ctl = null, barbaAplicada = false;
  const PECA_PX_CM = 12;
  async function carregarMapa() {
    if (mapa) return mapa;
    const m = await (await fetch("mapa/controlo.json")).json();
    for (const p of m.zonas.flatMap(z => z.pecas)) {
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
    try { await carregarMapa(); await livreIniciar(); }
    catch (e) { $("d-ctl-msg").textContent = "Não foi possível carregar o mapa: " + e.message; }
  }
  function controloFechar() {
    ctl = null; esconderLupa(); $("d-ctl").hidden = true; $("d-ctl-baixo").hidden = true;
    mudarFerramenta(ferramentaAntes && ferramentaAntes !== "controlo" && ferramentaAntes !== "mira" ? ferramentaAntes : "pincel"); pintar();
  }

  let malhaMapa = null, candidatos = null, pontosMario = null, modelo = null;
  const vm = { s: 2, ox: 0, oy: 0 }; // vista do mapa: píxeis por cm e canto superior esquerdo (cm)
  async function livreIniciar() {
    if (!malhaMapa) {
      malhaMapa = await (await fetch("mapa/malha.json")).json();
      candidatos = await (await fetch("mapa/candidatos.json")).json();
      try { pontosMario = await (await fetch("mapa/pontos-mario.json")).json(); } catch (e) { pontosMario = {}; }
    }
    const curta = (pontosMario && pontosMario[alvo.local]) || [];
    ctl = { livre: true, z: { id: "livre", nome: "pontos à escolha", pontos: [], pecas: mapa.zonas.flatMap(z => z.pecas) },
      pares: [], sel: null, toque: null, mira: null, escolhido: null, H: null, previa: null, automaticos: [], encaixe: null,
      curta, todos: !curta.length, verMalha: false, saltados: new Set(), sugerir: false, foraAuto: new Set() };
    // calibração já feita neste alvo: os pares voltam, para se corrigir só o que estiver mal
    const cm = alvo.controloMapa;
    if (cm && cm.zona === "livre" && !cm.endireitado && cm.pontos) {
      ctl.pares = cm.pontos.filter(p => p.recorte).map(p => ({ mapa: p.mapa.slice(), foto: p.recorte.slice(), n: /^M\d+$/.test(p.n) ? p.n : null, usar: p.usar !== false, info: p.tipo ? { tipo: p.tipo } : null }));
      ctl.automaticos = (cm.automaticos || []).map(p => ({ mapa: p.mapa, foto: p.recorte }));
      ctl.encaixe = cm.encaixe || null;
    }
    $("d-ctl-todos").checked = ctl.todos; $("d-ctl-malha").checked = false; $("d-ctl-sugerir").checked = false;
    $("d-ctl-livre").hidden = false; $("d-ctl-baixo").hidden = false; $("d-snap").hidden = true;
    ferramentaAntes = ferramenta; mudarFerramenta("mira");
    const c = $("d-ctl-mapa"), r = window.devicePixelRatio || 1;
    c.width = Math.round(c.clientWidth * r); c.height = Math.round(c.clientHeight * r);
    // o mapa começa centrado nos pontos da lista curta (ou no medalhão)
    if (curta.length) { const xs = curta.map(p => p.x), ys = curta.map(p => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      vm.s = Math.min(c.clientWidth / (x1 - x0 + 60), c.clientHeight / (y1 - y0 + 60)); vm.ox = (x0 + x1) / 2 - c.clientWidth / vm.s / 2; vm.oy = (y0 + y1) / 2 - c.clientHeight / vm.s / 2; }
    else { vm.s = c.clientWidth / 200; vm.ox = 185 - 100; vm.oy = 400 - c.clientHeight / vm.s / 2; }
    proximoDaLista(); // propõe sempre o próximo ponto M sem par (também num alvo com pares antigos)
    prepararLupa(alvo);
    livreMostrar(ctl.pares.length ? "Calibração anterior carregada: " + ctl.pares.length + " pares. Para corrigir um, toca nele na lista «Pares»." : "");
  }
  // escolhe sozinho o ponto seguinte da lista curta que ainda não tem par
  // Com 4 ou mais pares, a perspetiva provisória diz onde cada ponto do mapa deve cair na fotografia.
  // A 1× nem todos os pontos M se veem (os de cima e os de baixo ficam fora): saltam-se sozinhos e sugerem-se outros.
  function hPrevisao() { const p = paresUsados(); return p.length >= 4 ? Encaixe.homografia(p.map(q => q.mapa), p.map(q => q.foto)) : null; }
  function dentroDaFoto(m, Hp) {
    if (!Hp) return null;
    const w = Hp[2][0] * m[0] + Hp[2][1] * m[1] + Hp[2][2]; if (w <= 0) return false;
    const [x, y] = Encaixe.aplica(Hp, m);
    return x > 0.03 * W && x < 0.97 * W && y > 0.03 * H && y < 0.97 * H;
  }
  function proximoDaLista() {
    const Hp = hPrevisao(); ctl.foraAuto = new Set();
    let livre = null;
    for (const q of ctl.curta) {
      if (ctl.saltados.has(q.n) || ctl.pares.some(p => Math.hypot(p.mapa[0] - q.x, p.mapa[1] - q.y) < 0.5)) continue;
      if (Hp && dentroDaFoto([q.x, q.y], Hp) === false) { ctl.foraAuto.add(q.n); continue; }
      if (!livre) livre = q;
    }
    ctl.sel = livre ? [livre.x, livre.y] : null;
  }
  const pontoDaLista = m => ctl.curta.find(q => Math.hypot(m[0] - q.x, m[1] - q.y) < 0.5);
  function invalidarEncaixe() { ctl.automaticos = []; ctl.encaixe = null; ctl.H = null; ctl.previa = null; $("d-snap").hidden = true; }

  function livreMostrar(extra) {
    const n = ctl.pares.length, q = ctl.sel && pontoDaLista(ctl.sel);
    let passo;
    if (ctl.escolhido !== null) passo = "A corrigir o par <strong>" + rotulo(ctl.pares[ctl.escolhido], ctl.escolhido) + "</strong>: arrasta a mira na fotografia ou usa as setas; «Apagar este par» ou «Largar».";
    else if (!ctl.sel) passo = n >= 4 ? "Podes «Encaixar nos traços» ou juntar mais pares (toca num ponto do mapa)." : "1) Toca num ponto do <strong>mapa</strong> que vês na fotografia.";
    else if (!ctl.toque) passo = "2) Na <strong>fotografia</strong>, pousa o dedo por baixo do " + (q ? "<strong>ponto M" + q.n + "</strong> (" + q.onde + ")" : "ponto escolhido") + " e arrasta até a mira vermelha ficar no sítio; levanta o dedo. (Se não o vês na fotografia, toca noutro ponto do mapa.)";
    else passo = "3) Afina com as setas, se for preciso, e «Confirmar par».";
    const fora = ctl.foraAuto && ctl.foraAuto.size ? [...ctl.foraAuto].map(k => "M" + k).join(", ") + " provavelmente fora da fotografia (saltados sozinhos; se os vês, toca neles no mapa). " : "";
    let banner;
    if (ctl.escolhido !== null) banner = "A corrigir o par " + rotulo(ctl.pares[ctl.escolhido], ctl.escolhido) + ": arrasta a mira na fotografia ou usa as setas. Depois «Largar».";
    else if (!ctl.sel) banner = n >= 4 ? "Tens " + n + " pares. " + fora + "Podes juntar mais (toca num ponto do mapa, em cima; ativa «Sugerir pontos dentro da fotografia») ou carregar em «Encaixar nos traços»." : "1) Toca num ponto do mapa (em cima). Marca primeiro os que vês bem na fotografia.";
    else if (!ctl.toque) banner = "2) Na fotografia, pousa o dedo por baixo do " + (q ? "ponto M" + q.n + " (" + q.onde + ")" : "ponto escolhido") + " e arrasta a mira até ao sítio; levanta o dedo. " + fora;
    else banner = "3) Falta carregar em ✓ CONFIRMAR PAR (botão verde, aqui em cima). Sem isso, o ponto não fica guardado.";
    $("d-passo").textContent = banner;
    $("d-ctl-msg").innerHTML = "<strong>Pares: " + n + "</strong> (bastam 4, bem espalhados; com 5 ou mais vê-se o erro). " + passo + (extra ? "<br>" + extra : "");
    $("d-ctl-par").disabled = !(ctl.sel && ctl.toque);
    $("d-ctl-saltar").hidden = !q || ctl.escolhido !== null;
    $("d-ctl-recomecar").hidden = !ctl.curta.length || !ctl.pares.some(p => !pontoDaLista(p.mapa));
    $("d-ctl-aplicar2").disabled = paresUsados().length < 4;
    $("d-ctl-snap").disabled = n < 4;
    // lista dos pares
    $("d-ctl-lista").innerHTML = ctl.pares.map((p, i) => { const t = p.info && p.info.tipo, s = t === "cruzamento" ? " ✓" : t === "linha" ? " ↔" : t === "duvidoso" || t === "fora" ? " ?" : "";
      return '<button type="button" data-par="' + i + '"' + (ctl.escolhido === i ? ' class="ativo"' : "") + ">" + rotulo(p, i) + s + (p.usar === false ? " ✗" : "") + "</button>"; }).join("") || '<span class="sub">ainda nenhum</span>';
    $("d-ctl-escolhido").hidden = ctl.escolhido === null;
    if (ctl.escolhido !== null) { const p = ctl.pares[ctl.escolhido], inf = p.info;
      $("d-ctl-escolhido-msg").textContent = "Par " + rotulo(p, ctl.escolhido) + " · mapa " + p.mapa.map(v => virgula(v)).join(" × ") + " cm" + (inf && inf.tipo ? " · snap: " + inf.tipo + (inf.motivos && inf.motivos.length ? " (" + inf.motivos.join("; ") + ")" : "") : "") + (p.usar === false ? " · não entra no cálculo" : "");
      $("d-ctl-incluir").hidden = p.usar !== false; }
    pintarMapa(); pintar();
  }
  function pintarMapa() {
    const c = $("d-ctl-mapa"), g = c.getContext("2d"), r = window.devicePixelRatio || 1;
    g.setTransform(r, 0, 0, r, 0, 0);
    const w = c.width / r, h = c.height / r, q = (x, y) => [(x - vm.ox) * vm.s, (y - vm.oy) * vm.s];
    g.fillStyle = "#fffaf2"; g.fillRect(0, 0, w, h);
    const linha = (lista, cor, fundo) => { for (const l of lista) { g.beginPath(); l.forEach(([x, y], i) => { const [a, b] = q(x, y); i ? g.lineTo(a, b) : g.moveTo(a, b); });
      if (fundo) { g.fillStyle = fundo; g.fill(); } g.strokeStyle = cor; g.lineWidth = 1; g.stroke(); } };
    linha(malhaMapa.lacunas, "#7aa0ff", "rgba(0,80,255,.12)"); linha(malhaMapa.malha, "#2b2622"); linha(malhaMapa.denteado, "#2b2622", "rgba(43,38,34,.25)"); linha(malhaMapa.peltas, "#b5651d");
    const Hp = (ctl.sugerir || (ctl.foraAuto && ctl.foraAuto.size)) ? hPrevisao() : null;
    if (ctl.sugerir && Hp) for (const [x, y, e] of candidatos) { if (e || !dentroDaFoto([x, y], Hp)) continue; const [a, b] = q(x, y); if (a < -5 || b < -5 || a > w + 5 || b > h + 5) continue;
      g.beginPath(); g.arc(a, b, 7, 0, 2 * Math.PI); g.strokeStyle = "#1f8a4c"; g.lineWidth = 2.5; g.stroke(); g.beginPath(); g.arc(a, b, 2.5, 0, 2 * Math.PI); g.fillStyle = "#1f8a4c"; g.fill(); }
    if (ctl.todos) for (const [x, y, e] of candidatos) { const [a, b] = q(x, y); if (a < -5 || b < -5 || a > w + 5 || b > h + 5) continue;
      g.beginPath(); g.arc(a, b, 4, 0, 2 * Math.PI); g.fillStyle = e ? "rgba(255,23,68,.45)" : "rgba(0,0,0,.35)"; g.fill(); }
    // lista curta (pontos do Mário): grandes e numerados
    for (const p of ctl.curta) { const [a, b] = q(p.x, p.y), usado = ctl.pares.some(z => Math.hypot(z.mapa[0] - p.x, z.mapa[1] - p.y) < 0.5);
      const fora = ctl.foraAuto && ctl.foraAuto.has(p.n);
      g.beginPath(); g.arc(a, b, 8, 0, 2 * Math.PI); g.fillStyle = usado ? "#1f8a4c" : fora ? "#bbb" : "#ff8f00"; g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke();
      g.fillStyle = "#2b2622"; g.font = "bold 13px system-ui"; g.fillText("M" + p.n + (fora ? " (fora?)" : ""), a + 10, b - 6); }
    ctl.pares.forEach((p, i) => { if (pontoDaLista(p.mapa)) return; const [a, b] = q(p.mapa[0], p.mapa[1]); g.beginPath(); g.arc(a, b, 7, 0, 2 * Math.PI); g.fillStyle = "#1f8a4c"; g.fill();
      g.fillStyle = "#2b2622"; g.font = "bold 13px system-ui"; g.fillText(rotulo(p, i), a + 8, b - 6); });
    for (const p of ctl.automaticos || []) { const [a, b] = q(p.mapa[0], p.mapa[1]); g.beginPath(); g.arc(a, b, 3, 0, 2 * Math.PI); g.fillStyle = "#00acc1"; g.fill(); }
    if (ctl.escolhido !== null) { const p = ctl.pares[ctl.escolhido].mapa, [a, b] = q(p[0], p[1]); g.beginPath(); g.arc(a, b, 12, 0, 2 * Math.PI); g.strokeStyle = "#ffd000"; g.lineWidth = 3; g.stroke(); }
    if (ctl.sel) { const [a, b] = q(ctl.sel[0], ctl.sel[1]); g.beginPath(); g.arc(a, b, 12, 0, 2 * Math.PI); g.strokeStyle = "#ff1744"; g.lineWidth = 3; g.stroke(); }
  }
  // um ponto na fotografia (mira ou toque curto): move o par escolhido, ou é o toque do par novo
  function colocarPonto(p) {
    if (!ctl || !ctl.livre) return;
    if (ctl.previa) { ctl.previa = null; $("d-snap").hidden = true; }
    if (ctl.escolhido !== null) { const par = ctl.pares[ctl.escolhido]; par.foto = p; par.info = null; par.usar = true; invalidarEncaixe(); }
    else { ctl.toque = p; if ($("d-ctl-auto").checked && ctl.sel) { $("d-ctl-par").onclick(); return; } }
    livreMostrar();
  }
  function ajustar(dx, dy) {
    if (!ctl || !ctl.livre) return;
    if (ctl.toque) { ctl.toque = [ctl.toque[0] + dx, ctl.toque[1] + dy]; }
    else if (ctl.escolhido !== null) { const par = ctl.pares[ctl.escolhido]; par.foto = [par.foto[0] + dx, par.foto[1] + dy]; par.info = null; par.usar = true; invalidarEncaixe(); }
    else return;
    livreMostrar();
  }
  function ligarMapa() {
    const c = $("d-ctl-mapa"); let ini = null;
    c.addEventListener("pointerdown", ev => { try { c.setPointerCapture(ev.pointerId); } catch (e) {} ini = { x: ev.clientX, y: ev.clientY, ox: vm.ox, oy: vm.oy, mexeu: false }; });
    c.addEventListener("pointermove", ev => { if (!ini) return; const dx = ev.clientX - ini.x, dy = ev.clientY - ini.y;
      if (Math.hypot(dx, dy) > 6) ini.mexeu = true; if (ini.mexeu) { vm.ox = ini.ox - dx / vm.s; vm.oy = ini.oy - dy / vm.s; pintarMapa(); } });
    c.addEventListener("pointerup", ev => { if (!ini) return; const mexeu = ini.mexeu; ini = null; if (mexeu || !ctl || !ctl.livre) return;
      const b = c.getBoundingClientRect(), x = vm.ox + (ev.clientX - b.left) / vm.s, y = vm.oy + (ev.clientY - b.top) / vm.s;
      const Hp = ctl.sugerir ? hPrevisao() : null;
      const lista = ctl.curta.map(p => [p.x, p.y]).concat(ctl.todos ? candidatos : (Hp ? candidatos.filter(c => !c[2] && dentroDaFoto(c, Hp)) : []));
      let melhor = null, dm = 24 / vm.s; for (const p of lista) { const d = Math.hypot(p[0] - x, p[1] - y); if (d < dm) { dm = d; melhor = p; } }
      if (melhor) { ctl.escolhido = null; ctl.sel = [melhor[0], melhor[1]]; livreMostrar(); } });
    c.addEventListener("pointercancel", () => { ini = null; });
    const zoomM = k => { const cx = vm.ox + c.clientWidth / vm.s / 2, cy = vm.oy + c.clientHeight / vm.s / 2; vm.s *= k; vm.ox = cx - c.clientWidth / vm.s / 2; vm.oy = cy - c.clientHeight / vm.s / 2; pintarMapa(); };
    $("d-ctl-mapa-mais").onclick = () => zoomM(1.6); $("d-ctl-mapa-menos").onclick = () => zoomM(1 / 1.6);
    $("d-ctl-par").onclick = () => { if (!ctl || !ctl.sel || !ctl.toque) return;
      const q = pontoDaLista(ctl.sel);
      // o mesmo ponto do mapa outra vez: substitui o par antigo
      ctl.pares = ctl.pares.filter(p => Math.hypot(p.mapa[0] - ctl.sel[0], p.mapa[1] - ctl.sel[1]) > 0.5);
      ctl.pares.push({ mapa: ctl.sel, foto: ctl.toque, n: q ? "M" + q.n : null, usar: true, info: null });
      ctl.sel = null; ctl.toque = null; invalidarEncaixe(); proximoDaLista(); livreMostrar(); };
    $("d-ctl-par-desfazer").onclick = () => { if (!ctl || !ctl.livre) return;
      if (ctl.toque) ctl.toque = null; else if (ctl.escolhido !== null) ctl.escolhido = null; else if (ctl.pares.length) { ctl.pares.pop(); invalidarEncaixe(); proximoDaLista(); }
      livreMostrar(); };
    $("d-ctl-aplicar2").onclick = () => controloAplicar();
    // um ponto da lista curta que não aparece na fotografia: passa ao seguinte
    // pares antigos (ex.: L1–L12 do teste 09): apagá-los todos e marcar só os pontos M
    $("d-ctl-recomecar").onclick = () => { if (!ctl || !ctl.pares.length) return;
      if (!confirm("Apagar os " + ctl.pares.length + " pares desta calibração e recomeçar só com os pontos M?")) return;
      ctl.pares = []; ctl.escolhido = null; ctl.toque = null; ctl.saltados.clear(); invalidarEncaixe(); proximoDaLista(); livreMostrar("Pares apagados. Marca os pontos M, um de cada vez."); };
    $("d-ctl-saltar").onclick = () => { if (!ctl || !ctl.sel) return; const q = pontoDaLista(ctl.sel); if (q) ctl.saltados.add(q.n); ctl.toque = null; proximoDaLista(); livreMostrar(q ? "M" + q.n + " saltado." : ""); };
    $("d-ctl-lista").addEventListener("click", ev => { const b = ev.target.closest("button[data-par]"); if (!b || !ctl) return;
      const i = +b.dataset.par; escolherPar(ctl.escolhido === i ? null : i); });
    // Escolher um par para corrigir: a fotografia ampliada desliza para o centrar (as setas e a lupa trabalham sobre ele).
    function escolherPar(i) { ctl.escolhido = i; ctl.toque = null; ctl.sel = null; livreMostrar(); if (i !== null) centrarNoPar(i); }
    function centrarNoPar(i) {
      const p = ctl && ctl.pares[i]; if (!p) return;
      const caixa = $("d-caixa"), cr = caixa.getBoundingClientRect(), vr = vista.getBoundingClientRect();
      caixa.scrollLeft += vr.left + p.foto[0] / W * vr.width - (cr.left + cr.width / 2);
      caixa.scrollTop += vr.top + p.foto[1] / H * vr.height - (cr.top + cr.height / 2);
    }
    function parVizinho(d) { if (!ctl || !ctl.pares.length) return; const n = ctl.pares.length; escolherPar(ctl.escolhido === null ? (d > 0 ? 0 : n - 1) : (ctl.escolhido + d + n) % n); }
    $("d-ctl-ant").onclick = () => parVizinho(-1);
    $("d-ctl-seg").onclick = () => parVizinho(1);
    $("d-ctl-apagar").onclick = () => { if (!ctl || ctl.escolhido === null) return; ctl.pares.splice(ctl.escolhido, 1); ctl.escolhido = null; invalidarEncaixe(); proximoDaLista(); livreMostrar(); };
    $("d-ctl-largar").onclick = () => { if (!ctl) return; ctl.escolhido = null; if (!ctl.sel) proximoDaLista(); livreMostrar(); };
    $("d-ctl-incluir").onclick = () => { if (!ctl || ctl.escolhido === null) return; ctl.pares[ctl.escolhido].usar = true; ctl.H = null; livreMostrar(); };
    $("d-ctl-todos").onchange = ev => { if (ctl) { ctl.todos = ev.target.checked; pintarMapa(); } };
    $("d-ctl-sugerir").onchange = ev => { if (!ctl) return;
      if (ev.target.checked && !hPrevisao()) { ev.target.checked = false; livreMostrar("Para sugerir pontos precisas de pelo menos 4 pares confirmados."); return; }
      ctl.sugerir = ev.target.checked; livreMostrar(); };
    try { $("d-ctl-auto").checked = localStorage.getItem("oceano-teste10-auto") === "1"; } catch (e) {}
    $("d-ctl-auto").onchange = ev => { try { localStorage.setItem("oceano-teste10-auto", ev.target.checked ? "1" : "0"); } catch (e) {} };
    $("d-ctl-malha").onchange = ev => { if (ctl) { ctl.verMalha = ev.target.checked; pintar(); } };
    $("d-ctl-modo").addEventListener("click", ev => { const b = ev.target.closest("button[data-modo]"); if (b && ctl) mudarFerramenta(b.dataset.modo === "mira" ? "mira" : "controlo"); });
    for (const [id, dx, dy] of [["d-seta-cima", 0, -1], ["d-seta-baixo", 0, 1], ["d-seta-esq", -1, 0], ["d-seta-dir", 1, 0]]) $(id).onclick = () => ajustar(dx, dy);
    $("d-ctl-snap").onclick = encaixar;
    $("d-snap-aceitar").onclick = aceitarEncaixe;
    $("d-snap-manter").onclick = () => { if (!ctl) return; ctl.previa = null; $("d-snap").hidden = true; livreMostrar("Ficaram os teus toques."); };
  }

  // a fotografia original recortada à volta do alvo, a cores, para as lupas (carrega-se ao abrir a calibração)
  let lupaOriginal = null;
  async function prepararLupa(a) {
    if (lupaOriginal && lupaOriginal.id === a.id) return;
    lupaOriginal = null;
    if (!a.original || !a.recorte) return;
    try {
      const bm = await createImageBitmap(a.original), [sx, sy, sw, sh] = a.recorte, m = Math.round(0.05 * Math.max(sw, sh));
      const x0 = Math.max(0, sx - m), y0 = Math.max(0, sy - m), x1 = Math.min(bm.width, sx + sw + m), y1 = Math.min(bm.height, sy + sh + m);
      const c = tela(x1 - x0, y1 - y0); c.getContext("2d").drawImage(bm, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
      try { bm.close(); } catch (e) {}
      if (alvo && alvo.id === a.id) { lupaOriginal = { id: a.id, c, k: sw / a.largura, ox: sx - x0, oy: sy - y0 }; pintar(); }
    } catch (e) { /* sem a original: a lupa usa o recorte */ }
  }

  // ---- snap ----
  // A fotografia para o snap: a original (mais nítida), recortada à volta do recorte do alvo; sem original, o recorte.
  const fontes = new Map();
  async function fonteDoAlvo(a) {
    if (fontes.has(a.id)) return fontes.get(a.id);
    let f;
    if (a.original && a.recorte) {
      const bm = await createImageBitmap(a.original); // o Chrome endireita segundo a orientação gravada, como no recorte
      const [sx, sy, sw, sh] = a.recorte, m = Math.round(0.15 * Math.max(sw, sh));
      const x0 = Math.max(0, sx - m), y0 = Math.max(0, sy - m), x1 = Math.min(bm.width, sx + sw + m), y1 = Math.min(bm.height, sy + sh + m);
      const c = tela(x1 - x0, y1 - y0), g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(bm, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
      const cinz = Encaixe.cinzentoDeRGBA(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
      f = Encaixe.fonteDeCinzento(cinz, c.width, c.height, sw / a.largura, sx - x0, sy - y0, a.largura, a.altura); f.nome = "fotografia original";
      try { bm.close(); } catch (e) {}
    } else {
      const c = tela(W, H), g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(fundo, 0, 0);
      f = Encaixe.fonteDeCinzento(Encaixe.cinzentoDeRGBA(g.getImageData(0, 0, W, H).data, W, H), W, H, 1, 0, 0, W, H); f.nome = "recorte (sem a original)";
    }
    fontes.set(a.id, f);
    return f;
  }
  async function encaixar() {
    if (!ctl || ctl.pares.length < 4) return;
    const b = $("d-ctl-snap"); b.disabled = true; ctl.escolhido = null; ctl.toque = null;
    $("d-ctl-msg").innerHTML = "A encaixar nos traços… (pode demorar até 30 s; não mexas no telemóvel)";
    await new Promise(ok => setTimeout(ok, 50));
    let ecra = null; try { ecra = await navigator.wakeLock.request("screen"); } catch (e) {}
    try {
      const fonte = await fonteDoAlvo(alvo);
      if (!modelo) modelo = Encaixe.modelo(malhaMapa.malha, malhaMapa.denteado, malhaMapa.peltas);
      await new Promise(ok => setTimeout(ok, 20));
      const t0 = performance.now();
      const res = Encaixe.encaixar(ctl.pares.map(p => ({ mapa: p.mapa, foto: p.foto })), fonte, modelo, {}, candidatos.map(c => [c[0], c[1]]));
      res.segundos = +((performance.now() - t0) / 1000).toFixed(1); res.fonte = fonte.nome;
      ctl.previa = res;
      mostrarEncaixe(res);
      livreMostrar(res.falhou ? "⚠ " + res.falhou : "Vê na fotografia: laranja = o teu toque, verde = encaixado, vermelho = duvidoso; ciano = cruzamentos que o snap juntou.");
    } catch (e) { $("d-ctl-msg").textContent = "O encaixe falhou: " + e.message; }
    finally { b.disabled = false; try { if (ecra) await ecra.release(); } catch (e) {} }
  }
  function mostrarEncaixe(r) {
    const tipos = { cruzamento: "cruzamento ✓", linha: "linha ↔ (só de lado)", duvidoso: "duvidoso ?", fora: "destoa ?" };
    const loo = r.depois.looParesRms;
    $("d-snap-resumo").innerHTML =
      "<strong>Erro (validação cruzada, um ponto de fora de cada vez):</strong> " + virgula(r.antes.loo) + " cm → <strong>" + virgula(loo) + " cm</strong>" +
      (loo !== null && loo > 3 ? " — acima do limite de 3 cm" : loo !== null ? " ✓" : "") +
      "<br>Erro médio nos próprios pontos: " + virgula(r.antes.rms) + " → " + virgula(r.depois.rms) + " cm · cruzamentos juntados pelo snap: " + r.automaticos.length +
      " · pontos na perspetiva: " + r.nUsados + " · " + r.segundos + " s (" + r.fonte + ")" +
      (r.falhou ? '<br><strong class="aviso-snap">⚠ ' + r.falhou + "</strong>" : "");
    $("d-snap-tabela").innerHTML = "<tr><th>Par</th><th>Snap</th><th>Mexeu</th><th>Erro (val. cruzada)</th></tr>" +
      ctl.pares.map((p, i) => { const e = r.info[i], l = r.depois.looPares[i];
        return "<tr" + (e.tipo === "duvidoso" || e.tipo === "fora" ? ' class="duvidoso"' : "") + "><td>" + rotulo(p, i) + "</td><td>" + tipos[e.tipo] +
          (e.motivos && e.motivos.length && (e.tipo === "duvidoso" || e.tipo === "fora") ? "<br><small>" + e.motivos.join("; ") + "</small>" : "") + (e.segundaVolta ? "<br><small>encaixou à 2.ª</small>" : "") +
          "</td><td>" + virgula(e.movidoCm) + " cm</td><td>" + (l === null ? "não entra" : virgula(l) + " cm") + "</td></tr>"; }).join("");
    $("d-snap-aceitar").disabled = !!r.falhou;
    $("d-snap").hidden = false;
  }
  function aceitarEncaixe() {
    const r = ctl && ctl.previa; if (!r || r.falhou) return;
    ctl.pares.forEach((p, i) => { p.foto = r.pares[i].foto; p.usar = r.pares[i].usar; p.info = { tipo: r.info[i].tipo, motivos: r.info[i].motivos || [] }; });
    ctl.automaticos = r.automaticos;
    ctl.encaixe = { quando: Date.now(), antes: { rms: r.antes.rms, loo: r.antes.loo }, depois: { rms: r.depois.rms, loo: r.depois.loo, looPares: r.depois.looParesRms },
      automaticos: r.automaticos.length, usados: r.nUsados, fonte: r.fonte, segundos: r.segundos,
      porPar: ctl.pares.map((p, i) => ({ n: rotulo(p, i), tipo: r.info[i].tipo, movidoCm: +r.info[i].movidoCm.toFixed(2), looCm: r.depois.looPares[i] === null ? null : +r.depois.looPares[i].toFixed(2), motivos: r.info[i].motivos || [] })) };
    ctl.previa = null; $("d-snap").hidden = true;
    controloAplicar();
  }

  // ---- aplicar a calibração: perspetiva, barba e ventos, gravar ----
  function controloAplicar() {
    const usados = paresUsados();
    if (usados.length < 4) return;
    const e = Encaixe.espalhamento(usados.map(p => p.mapa));
    if (e < 8 && !confirm("Os pontos marcados estão quase em linha (todos em cima ou todos em baixo). A perspetiva vai sair mal. Continuar na mesma?")) return;
    const Hm = Encaixe.homografia(usados.map(p => p.mapa), usados.map(p => p.foto)), Hi = Encaixe.inv(Hm);
    // erros dos pares do Mário (os extras do snap também contam para a perspetiva)
    const meus = ctl.pares.filter(p => p.usar !== false), errosMeus = Encaixe.erros(meus.map(p => ({ mapa: p.mapa, foto: p.foto })), Hm);
    const erro = usados.length > 4 ? Encaixe.rmsDe(Encaixe.erros(usados, Hm)) : null;
    const loo = ctl.encaixe ? ctl.encaixe.depois.looPares : (Encaixe.resumoErros(meus.map(p => ({ mapa: p.mapa, foto: p.foto }))).loo);
    const { out, usadas } = pecasParaImagem(Hi, W, H, ctl.z.pecas);
    const c0 = Encaixe.aplica(Hi, [W / 2, H / 2]), c1 = Encaixe.aplica(Hi, [W / 2 + 10, H / 2]), c2 = Encaixe.aplica(Hi, [W / 2, H / 2 + 10]);
    const cmPorPx = (Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) + Math.hypot(c2[0] - c0[0], c2[1] - c0[1])) / 20;
    guardarHistoria();
    cg.clearRect(0, 0, W, H); // o desenho do mapa substitui o anterior (não se acumulam duas barbas)
    const t = tela(W, H); t.getContext("2d").putImageData(out, 0, 0); cg.drawImage(t, 0, 0);
    ctl.H = Hm; barbaAplicada = true; alterado = true; importadoOriginal = null;
    alvo.controloMapa = { quando: Date.now(),
      pontos: ctl.pares.map((p, i) => ({ n: p.n || "L" + (i + 1), mapa: p.mapa, recorte: p.foto.map(v => +v.toFixed(1)), usar: p.usar !== false, tipo: p.info ? p.info.tipo : null,
        erroCm: p.usar === false ? null : +errosMeus[meus.indexOf(p)].toFixed(2) })),
      automaticos: (ctl.automaticos || []).map(p => ({ mapa: p.mapa, recorte: p.foto.map(v => +v.toFixed(1)) })),
      H: Hm.map(l => l.map(v => +v.toPrecision(8))), erroCm: erro === null ? null : +erro.toFixed(1), looCm: loo === null || loo === undefined ? null : +loo.toFixed(1),
      encaixe: ctl.encaixe || null, cmPorPx: +cmPorPx.toFixed(3), pecas: [...usadas], zona: "livre" };
    setTimeout(guardar, 50);
    livreMostrar("✓ Colocado e gravado" + (usadas.size ? " (" + [...usadas].join(", ") + ")" : ": nenhuma peça cai dentro desta fotografia") + " com " + usados.length + " pontos" +
      (loo !== null && loo !== undefined ? " · erro (validação cruzada) <strong>" + virgula(loo) + " cm</strong>" + (loo > 3 ? " — alto: revê os pares com «?» ou marca mais" : "") : erro !== null ? " · erro médio " + virgula(erro) + " cm" : " (com 4 pontos não se mede o erro)") +
      ". Os círculos amarelos mostram onde a calibração põe cada ponto do mapa. Se estiver bem, testa com MindAR ou Zappar (passo 5).");
    // A mensagem de cima fica fora do ecrã quando se carrega nos botões de baixo: repete-se aqui, junto dos botões.
    const fb = $("d-ctl-feedback");
    fb.hidden = false; fb.style.fontWeight = "bold";
    fb.textContent = "✓ Colocado e gravado com " + usados.length + " pontos" + (loo !== null && loo !== undefined ? " · erro (validação cruzada) " + virgula(loo) + " cm" : erro !== null ? " · erro médio " + virgula(erro) + " cm" : "") + ". Já podes «Fechar a calibração».";
  }

  function pecasParaImagem(Hi, W, H, pecas) {
    const out = new ImageData(W, H), o = out.data, usadas = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const w = Hi[2][0] * x + Hi[2][1] * y + Hi[2][2]; if (w <= 0) continue;
      const mx = (Hi[0][0] * x + Hi[0][1] * y + Hi[0][2]) / w, my = (Hi[1][0] * x + Hi[1][1] * y + Hi[1][2]) / w;
      for (const p of pecas) {
        if (mx < p.x0 || mx >= p.x1 || my < p.y0 || my >= p.y1) continue;
        const bx = Math.floor((mx - p.x0) * PECA_PX_CM), by = Math.floor((my - p.y0) * PECA_PX_CM), BW = p.img.width;
        if (bx >= BW || by >= p.img.height) continue;
        const s = (by * BW + bx) * 4, src = p.img.data; if (!src[s + 3]) continue;
        const d = (y * W + x) * 4; o[d] = src[s]; o[d + 1] = src[s + 1]; o[d + 2] = src[s + 2]; o[d + 3] = src[s + 3]; usadas.add(p.nome); break;
      }
    }
    return { out, usadas };
  }

  // ---- alvo endireitado (teste 09) ----
  // A fotografia calibrada é posta de frente e à escala do mapa (vista de cima): cada píxel da imagem nova é um
  // ponto do mapa (cm), cuja cor se vai buscar ao recorte pela homografia da calibração.
  async function endireitar(a) {
    const Hm = a.controloMapa.H, Hi = Encaixe.inv(Hm), f = await createImageBitmap(a.jpg);
    const c = tela(f.width, f.height), g = c.getContext("2d"); g.drawImage(f, 0, 0);
    const src = g.getImageData(0, 0, f.width, f.height), SW = f.width, SH = f.height;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const borda = []; for (let t = 0; t <= 20; t++) borda.push([SW * t / 20, 0], [SW * t / 20, SH], [0, SH * t / 20], [SW, SH * t / 20]);
    for (const p of borda) { const w = Hi[2][0] * p[0] + Hi[2][1] * p[1] + Hi[2][2]; if (w <= 0) continue; const [x, y] = Encaixe.aplica(Hi, p);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(369.2, x1); y1 = Math.min(996.2, y1);
    if (!(x1 > x0 + 10 && y1 > y0 + 10)) throw new Error("a calibração não dá uma zona do mosaico utilizável");
    const k = 1024 / Math.max(x1 - x0, y1 - y0), OW = Math.round((x1 - x0) * k), OH = Math.round((y1 - y0) * k);
    const out = new ImageData(OW, OH), o = out.data, valido = new Uint8Array(OW * OH);
    let r = 0, gg = 0, b = 0, n = 0;
    for (let v = 0; v < OH; v++) for (let u = 0; u < OW; u++) {
      const mx = x0 + (u + 0.5) / k, my = y0 + (v + 0.5) / k, w = Hm[2][0] * mx + Hm[2][1] * my + Hm[2][2]; if (w <= 0) continue;
      const px = (Hm[0][0] * mx + Hm[0][1] * my + Hm[0][2]) / w, py = (Hm[1][0] * mx + Hm[1][1] * my + Hm[1][2]) / w;
      if (px < 0 || py < 0 || px >= SW - 1 || py >= SH - 1) continue;
      const ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy, d = (v * OW + u) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const s = (iy * SW + ix) * 4 + ch, a00 = src.data[s], a10 = src.data[s + 4], a01 = src.data[s + SW * 4], a11 = src.data[s + SW * 4 + 4];
        o[d + ch] = a00 * (1 - fx) * (1 - fy) + a10 * fx * (1 - fy) + a01 * (1 - fx) * fy + a11 * fx * fy;
      }
      o[d + 3] = 255; valido[v * OW + u] = 1; r += o[d]; gg += o[d + 1]; b += o[d + 2]; n++;
    }
    const mr = n ? r / n : 128, mg = n ? gg / n : 128, mb = n ? b / n : 128;
    for (let i = 0; i < OW * OH; i++) if (!valido[i]) { o[i * 4] = mr; o[i * 4 + 1] = mg; o[i * 4 + 2] = mb; o[i * 4 + 3] = 255; }
    const t = tela(OW, OH); t.getContext("2d").putImageData(out, 0, 0);
    const jpg = await new Promise(ok => t.toBlob(ok, "image/jpeg", 0.92));
    const He = [[k, 0, -k * x0], [0, k, -k * y0], [0, 0, 1]];
    return { jpg, largura: OW, altura: OH, H: He, regiao: { x0: +x0.toFixed(1), y0: +y0.toFixed(1), x1: +x1.toFixed(1), y1: +y1.toFixed(1), pxPorCm: +k.toFixed(3) } };
  }
  async function desenhoDoMapa(a) {
    await carregarMapa();
    const { out, usadas } = pecasParaImagem(Encaixe.inv(a.controloMapa.H), a.largura, a.altura, mapa.zonas.flatMap(z => z.pecas));
    const t = tela(a.largura, a.altura); t.getContext("2d").putImageData(out, 0, 0);
    return { png: await new Promise(ok => t.toBlob(ok, "image/png")), pecas: [...usadas] };
  }

  // ---- ligar os botões (uma vez) ----
  function iniciar() {
    vista = $("d-tela");
    vista.addEventListener("pointerdown", inicio);
    vista.addEventListener("pointermove", mover);
    vista.addEventListener("pointerup", fim);
    vista.addEventListener("pointercancel", ev => { dedos.delete(ev.pointerId); toqueIni = null; if (ctl) ctl.mira = null; esconderLupa();
      if (ferramenta !== "controlo" && ferramenta !== "mira") cancelar(); else pintar(); });
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
    ligarMapa();
    $("d-ctl-fechar").onclick = controloFechar;
    $("d-fechar").onclick = () => { if (alterado && !confirm("O desenho tem alterações por guardar. Fechar na mesma?")) return; fechar(); };
    mudarFerramenta("pincel");
  }

  return { iniciar, abrir, fechar, endireitar, desenhoDoMapa, get aberto() { return !!alvo; } };
})();
