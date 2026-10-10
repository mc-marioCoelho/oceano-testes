// Teste 07 · desenhar sobre o recorte do alvo (ex.: reconstituir a lacuna do tapete em P7 ou o vento Euro).
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
    historia = []; importadoOriginal = null; alterado = false;
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
  const nomeBase = () => "teste07-" + alvo.id.toLowerCase();

  async function guardar() {
    const vazio = !cg.getImageData(0, 0, W, H).data.some((v, i) => i % 4 === 3 && v);
    alvo.desenho = vazio ? null : (importadoOriginal || await pngDaCamada());
    alvo.desenhoInfo = vazio ? null : { atualizado: Date.now(), origem: importadoOriginal ? "PNG carregado" : "desenhado no telemóvel" };
    await Alvos.gravar(alvo);
    alterado = false;
    confirmar($("d-guardar"), vazio ? "Desenho apagado" : "Guardado");
    if (aoGuardar) aoGuardar(alvo);
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
    $("d-fechar").onclick = () => { if (alterado && !confirm("O desenho tem alterações por guardar. Fechar na mesma?")) return; fechar(); };
    mudarFerramenta("pincel");
  }

  return { iniciar, abrir, fechar, get aberto() { return !!alvo; } };
})();
