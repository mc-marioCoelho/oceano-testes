// Teste 10 · «snap»: encaixar os pontos de controlo nos traços escuros do próprio mosaico.
//
// A ideia, em termos de desenho: depois de uma primeira calibração (os pares marcados a dedo), sabe-se mais ou
// menos onde cada ponto do mapa cai na fotografia. À volta de cada ponto, a fotografia é «endireitada» (vista
// de cima, à escala do mapa, como um recorte em perspetiva do Photoshop) e posta por baixo de um decalque das
// linhas do mapa (a malha e o denteado). Desliza-se o decalque até as linhas do mapa ficarem em cima dos traços
// escuros da fotografia. O deslize que encaixa melhor diz quanto o ponto estava fora do sítio. Corrige-se o
// ponto, recalcula-se a perspetiva com todos os pontos corrigidos e repete-se (cada volta procura mais perto).
//
// Também diz quanto se pode confiar em cada ponto («duvidoso» quando o encaixe é fraco, quando há dois sítios
// quase tão bons, quando o ponto fica numa linha sem cruzamento, ou ao fundo da imagem, onde um píxel da
// fotografia mede demasiados centímetros).
//
// Este ficheiro não depende da página: corre no telemóvel (index.html) e no PC (verificação em Node).
// Coordenadas: mapa em cm (como o SVG do Mário); fotografia em píxeis do recorte do alvo.

const Encaixe = (() => {
  // ---------- álgebra da perspetiva (homografia), igual à do teste 09 ----------
  function normalizar(P) {
    const n = P.length, mx = P.reduce((s, p) => s + p[0], 0) / n, my = P.reduce((s, p) => s + p[1], 0) / n;
    const d = P.reduce((s, p) => s + Math.hypot(p[0] - mx, p[1] - my), 0) / n || 1, k = Math.SQRT2 / d;
    return [[k, 0, -k * mx], [0, k, -k * my], [0, 0, 1]];
  }
  const mul = (A, B) => A.map(l => [0, 1, 2].map(j => l[0] * B[0][j] + l[1] * B[1][j] + l[2] * B[2][j]));
  const inv = M => {
    const [a, b, c] = M[0], [d, e, f] = M[1], [g, h, i] = M[2];
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, D = a * A + b * B + c * C;
    return [[A / D, -(b * i - c * h) / D, (b * f - c * e) / D], [B / D, (a * i - c * g) / D, -(a * f - c * d) / D], [C / D, -(a * h - b * g) / D, (a * e - b * d) / D]];
  };
  const aplica = (H, [x, y]) => { const w = H[2][0] * x + H[2][1] * y + H[2][2]; return [(H[0][0] * x + H[0][1] * y + H[0][2]) / w, (H[1][0] * x + H[1][1] * y + H[1][2]) / w]; };
  // perspetiva por mínimos quadrados (4 pares ou mais), com coordenadas normalizadas (Hartley)
  function homografia(de, para) {
    const T1 = normalizar(de), T2 = normalizar(para), a = de.map(p => aplica(T1, p)), b = para.map(p => aplica(T2, p));
    const M = Array.from({ length: 8 }, () => new Array(9).fill(0));
    a.forEach(([x, y], i) => { const [u, v] = b[i];
      for (const [l, r] of [[[x, y, 1, 0, 0, 0, -u * x, -u * y], u], [[0, 0, 0, x, y, 1, -v * x, -v * y], v]])
        for (let j = 0; j < 8; j++) { for (let k = 0; k < 8; k++) M[j][k] += l[j] * l[k]; M[j][8] += l[j] * r; } });
    for (let c = 0; c < 8; c++) { let m = c; for (let r = c + 1; r < 8; r++) if (Math.abs(M[r][c]) > Math.abs(M[m][c])) m = r;
      [M[c], M[m]] = [M[m], M[c]]; for (let r = 0; r < 8; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 9; k++) M[r][k] -= f * M[c][k]; } }
    const h = M.map((l, i) => l[8] / l[i]);
    return mul(inv(T2), mul([[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]], T1));
  }
  const deParesH = pares => homografia(pares.map(p => p.mapa), pares.map(p => p.foto));
  // Perspetiva com pontos de dois tipos: um cruzamento fixa o ponto (2 equações); um ponto numa linha sem cruzamento
  // só fixa o lado da linha (1 equação: a distância à linha, na fotografia). normais[i]: null, ou a normal (unitária)
  // da linha na fotografia.
  function homografiaMista(de, para, normais) {
    const T1 = normalizar(de), T2 = normalizar(para), a = de.map(p => aplica(T1, p)), b = para.map(p => aplica(T2, p));
    const M = Array.from({ length: 8 }, () => new Array(9).fill(0));
    const junta = (l, r) => { for (let j = 0; j < 8; j++) { for (let k = 0; k < 8; k++) M[j][k] += l[j] * l[k]; M[j][8] += l[j] * r; } };
    a.forEach(([x, y], i) => { const [u, v] = b[i], ru = [x, y, 1, 0, 0, 0, -u * x, -u * y], rv = [0, 0, 0, x, y, 1, -v * x, -v * y], nn = normais && normais[i];
      if (nn) junta(ru.map((t, j) => nn[0] * t + nn[1] * rv[j]), nn[0] * u + nn[1] * v); else { junta(ru, u); junta(rv, v); } });
    for (let c = 0; c < 8; c++) { let m = c; for (let r = c + 1; r < 8; r++) if (Math.abs(M[r][c]) > Math.abs(M[m][c])) m = r;
      [M[c], M[m]] = [M[m], M[c]]; for (let r = 0; r < 8; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 9; k++) M[r][k] -= f * M[c][k]; } }
    const h = M.map((l, i) => l[8] / l[i]);
    return mul(inv(T2), mul([[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]], T1));
  }
  // normal, na fotografia, de uma linha do mapa (direção unitária «dir», em cm) que passa em m
  function normalNaFoto(H, m, dir) { const p = aplica(H, m), q = aplica(H, [m[0] + dir[0], m[1] + dir[1]]), dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
    return [-dy / L, dx / L]; }
  // pares com «linha» (direção no mapa) entram só com a componente perpendicular
  function deParesMisto(pares, Hrefer) { return homografiaMista(pares.map(p => p.mapa), pares.map(p => p.foto), pares.map(p => p.linha ? normalNaFoto(Hrefer, p.mapa, p.linha) : null)); }

  // ---------- erros em cm ----------
  // erro de cada par: o ponto tocado na fotografia, levado de volta ao mapa, comparado com o ponto do mapa
  function erros(pares, H) { const Hi = inv(H); return pares.map(p => { const v = aplica(Hi, p.foto); return Math.hypot(v[0] - p.mapa[0], v[1] - p.mapa[1]); }); }
  const rmsDe = l => l.length ? Math.sqrt(l.reduce((s, e) => s + e * e, 0) / l.length) : null;
  // validação cruzada (um ponto de fora de cada vez): calcula a perspetiva sem esse ponto e mede onde ele cai.
  // É o erro «honesto»: o erro médio de cima mede o encaixe nos próprios pontos usados; este mede a previsão.
  function validacaoCruzada(pares) {
    if (pares.length < 5) return null;
    return pares.map((p, i) => { const resto = pares.filter((_, j) => j !== i); const H = deParesH(resto);
      const v = aplica(inv(H), p.foto); return Math.hypot(v[0] - p.mapa[0], v[1] - p.mapa[1]); });
  }
  function resumoErros(pares) {
    if (pares.length < 4) return { rms: null, loo: null, looPorPar: null };
    const H = deParesH(pares), e = erros(pares, H), l = validacaoCruzada(pares);
    return { rms: pares.length > 4 ? rmsDe(e) : null, loo: l ? rmsDe(l) : null, looPorPar: l, porPar: e };
  }
  // o mesmo com pontos de linha: o erro de um ponto de linha é só a distância perpendicular à linha (cm)
  const erroDe = (H, p) => { const v = aplica(inv(H), p.foto), dx = v[0] - p.mapa[0], dy = v[1] - p.mapa[1];
    return p.linha ? Math.abs(-dx * p.linha[1] + dy * p.linha[0]) : Math.hypot(dx, dy); };
  const equacoes = pares => pares.reduce((s, p) => s + (p.linha ? 1 : 2), 0);
  function resumoMisto(pares, Hrefer) {
    if (equacoes(pares) < 8) return { rms: null, loo: null, looPorPar: null };
    const H = deParesMisto(pares, Hrefer), e = pares.map(p => erroDe(H, p));
    const l = equacoes(pares) >= 10 ? pares.map((p, i) => { const resto = pares.filter((_, j) => j !== i); return equacoes(resto) >= 9 ? erroDe(deParesMisto(resto, Hrefer), p) : null; }) : null;
    const lv = l && l.filter(v => v !== null);
    return { rms: equacoes(pares) > 8 ? rmsDe(e) : null, loo: lv && lv.length ? rmsDe(lv) : null, looPorPar: l, porPar: e, H };
  }

  // ---------- o decalque do mapa ----------
  // modelo: segmentos das linhas (malha) e formas cheias (denteado e peltas, escuras na fotografia), em cm.
  // As lacunas não se tiram: na sala, o restauro continua as linhas dos círculos e do painel pintadas na argamassa
  // (visto na fotografia endireitada do P2, 15 out.).
  function modelo(malha, denteado, peltas) {
    const segs = [];
    for (const l of malha) for (let i = 1; i < l.length; i++) segs.push([l[i - 1][0], l[i - 1][1], l[i][0], l[i][1]]);
    const caixa = p => {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      return { p, x0, y0, x1, y1 };
    };
    // só as formas pequenas (um dente, uma pelta) ficam cheias; as grandes (o anel inteiro) contam como linhas
    const polis = [];
    for (const p of (denteado || []).concat(peltas || [])) { if (p.length < 3) continue; const q = caixa(p);
      if (Math.hypot(q.x1 - q.x0, q.y1 - q.y0) < 40) polis.push(q);
      else for (let i = 1; i < p.length; i++) segs.push([p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]]); }
    return { segs, polis };
  }
  function distSeg(px, py, s) {
    const dx = s[2] - s[0], dy = s[3] - s[1], L = dx * dx + dy * dy;
    let t = L ? ((px - s[0]) * dx + (py - s[1]) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - s[0] - t * dx, py - s[1] - t * dy);
  }
  function dentro(px, py, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c; } return c; }
  // decalque à volta de (cx, cy): n × n amostras, r por cm; valor 1 em cima de um traço, a cair suavemente para os lados
  function decalque(mod, cx, cy, R, r, largura) {
    const n = 2 * Math.round(R * r) + 1, h = (n - 1) / 2, T = new Float32Array(n * n), sig = largura / 2;
    const segs = mod.segs.filter(s => Math.min(s[0], s[2]) < cx + R + 3 && Math.max(s[0], s[2]) > cx - R - 3 && Math.min(s[1], s[3]) < cy + R + 3 && Math.max(s[1], s[3]) > cy - R - 3);
    const polis = mod.polis.filter(q => q.x0 < cx + R && q.x1 > cx - R && q.y0 < cy + R && q.y1 > cy - R);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = cx + (i - h) / r, y = cy + (j - h) / r;
      let d = 1e9; for (const s of segs) { const e = distSeg(x, y, s); if (e < d) d = e; }
      let v = d < 3 * sig ? Math.exp(-0.5 * (d / sig) * (d / sig) * 0.6) : 0; // perfil do traço (≈ largura do traço negro)
      if (v < 1) for (const q of polis) if (x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1 && dentro(x, y, q.p)) { v = 1; break; }
      T[j * n + i] = v;
    }
    return { T, n };
  }

  // ---------- a fotografia endireitada à volta de um ponto ----------
  // escurecimento (255 − luminosidade) em m × m amostras, r por cm; fora da fotografia: NaN (não conta)
  function retalho(fonte, H, cx, cy, R, r) {
    const m = 2 * Math.round(R * r) + 1, h = (m - 1) / 2, F = new Float32Array(m * m);
    for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) {
      const [px, py] = aplica(H, [cx + (i - h) / r, cy + (j - h) / r]);
      const v = fonte.amostra(px, py); F[j * m + i] = v === null ? NaN : 255 - v;
    }
    return { F, m };
  }
  // correlação normalizada (de −1 a 1) do decalque com a fotografia, para cada deslize até ±S amostras
  function correlacao(T, n, F, m, S) {
    const k = 2 * S + 1, C = new Float32Array(k * k).fill(-2), off = (m - n) / 2 - S;
    for (let b = 0; b < k; b++) for (let a = 0; a < k; a++) {
      let st = 0, sf = 0, stt = 0, sff = 0, stf = 0, c = 0;
      for (let j = 0; j < n; j++) { const fr = (j + b + off) * m + a + off, tr = j * n;
        for (let i = 0; i < n; i++) { const f = F[fr + i]; if (f !== f) continue; const t = T[tr + i];
          st += t; sf += f; stt += t * t; sff += f * f; stf += t * f; c++; } }
      if (c < n * n * 0.5) continue; // mais de metade do decalque fora da fotografia: não conta
      const vt = stt - st * st / c, vf = sff - sf * sf / c;
      if (vt > 1e-6 && vf > 1e-6) C[b * k + a] = (stf - st * sf / c) / Math.sqrt(vt * vf);
    }
    return { C, k };
  }

  // cm do mosaico por píxel da fonte, à volta do ponto (pior direção): ao fundo da imagem cresce muito
  function cmPorPxFonte(H, m, escalaPx) {
    const Hi = inv(H), p = aplica(H, m), a = aplica(Hi, [p[0] + 1, p[1]]), b = aplica(Hi, [p[0], p[1] + 1]);
    return Math.max(Math.hypot(a[0] - m[0], a[1] - m[1]), Math.hypot(b[0] - m[0], b[1] - m[1])) / (escalaPx || 1);
  }

  const OPC = { R: 12, r: 3, largura: 2.4, procura: [6, 2, 1], minimo: 0.35, ambiguo: 0.85, abertura: 0.05, maxCmPx: 1.5, espalhamento: 10, maxFugaPx: 40, segunda: 4 };

  // quanto os pontos se afastam de uma linha reta (cm; desvio na direção mais estreita). Abaixo de ~10 cm, a perspetiva
  // fica mal determinada longe deles (por exemplo, todos na mesma fila do painel de baixo).
  function espalhamento(P) {
    const n = P.length, cx = P.reduce((s, p) => s + p[0], 0) / n, cy = P.reduce((s, p) => s + p[1], 0) / n;
    let sxx = 0, syy = 0, sxy = 0; for (const [x, y] of P) { sxx += (x - cx) ** 2; syy += (y - cy) ** 2; sxy += (x - cx) * (y - cy); }
    const tr = sxx + syy, det = sxx * syy - sxy * sxy; return Math.sqrt(Math.max(0, tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det))) / n);
  }

  // Mede o encaixe à volta de um ponto. m: o ponto do mapa (cm); c: onde o ponto está agora (o toque, levado ao mapa
  // pela perspetiva H). O decalque é o mapa à volta de m; a fotografia endireita-se à volta de c. Desliza-se o
  // decalque até ±S cm: o melhor deslize d diz que m está, na fotografia endireitada, em c + d.
  // Se «linha» vier dada (direção da linha, da 1.ª volta), só conta o deslize perpendicular a ela.
  function encaixarPonto(mod, fonte, H, m, c, S, o, linha) {
    const { T, n } = decalque(mod, m[0], m[1], o.R, o.r, o.largura);
    const Sp = Math.round(S * o.r), { F, m: mm } = retalho(fonte, H, c[0], c[1], o.R + S + 1 / o.r, o.r);
    const { C, k } = correlacao(T, n, F, mm, Sp);
    let best = -2, bi = -1; for (let i = 0; i < C.length; i++) if (C[i] > best) { best = C[i]; bi = i; }
    if (bi < 0 || best <= -1) return { ok: false, motivos: ["fora da fotografia"], duvidoso: true };
    const ba = bi % k, bb = (bi - ba) / k;
    const at = (a, b) => (a >= 0 && b >= 0 && a < k && b < k) ? C[b * k + a] : -2;
    // posição fina (entre amostras): parábola pelos vizinhos
    const fino = (c0, cm, cp) => { const d = cm - 2 * c0 + cp; return d < 0 && cm > -2 && cp > -2 ? Math.max(-0.5, Math.min(0.5, 0.5 * (cm - cp) / d)) : 0; };
    let d = [(ba + fino(best, at(ba - 1, bb), at(ba + 1, bb)) - Sp) / o.r, (bb + fino(best, at(ba, bb - 1), at(ba, bb + 1)) - Sp) / o.r];
    if (linha) { const t = d[0] * linha[0] + d[1] * linha[1]; d = [d[0] - t * linha[0], d[1] - t * linha[1]]; }
    const borda = ba === 0 || bb === 0 || ba === k - 1 || bb === k - 1;
    const r = { ok: true, d, nota: best, borda };
    if (linha !== undefined) return r; // voltas seguintes: só o deslize
    // 1.ª volta (procura larga): quanto piora o encaixe ao deslizar 1,5 cm em cada uma de 4 direções (0°, 45°, 90°, 135°)
    const p15 = Math.round(1.5 * o.r), quedas = [0, 1, 2, 3].map(t => { const ang = t * Math.PI / 4, ux = Math.cos(ang), uy = Math.sin(ang);
      const v1 = at(ba + Math.round(p15 * ux), bb + Math.round(p15 * uy)), v2 = at(ba - Math.round(p15 * ux), bb - Math.round(p15 * uy));
      const vs = [v1, v2].filter(v => v > -2); return vs.length ? best - Math.max(...vs) : 1; });
    const qmin = Math.min(...quedas), qmax = Math.max(...quedas), tmin = quedas.indexOf(qmin);
    r.queda = qmin;
    // linha sem cruzamento: piora pouco ao longo de uma direção e muito na perpendicular
    if (qmin < o.abertura && qmax >= 2 * o.abertura) r.linha = [Math.cos(tmin * Math.PI / 4), Math.sin(tmin * Math.PI / 4)];
    // segundo melhor sítio, a mais de 3 cm (outro cruzamento, uma linha paralela); numa linha, não conta a própria linha
    let seg = -2;
    for (let b = 0; b < k; b++) for (let a = 0; a < k; a++) { const dx = a - ba, dy = b - bb, dist = Math.hypot(dx, dy);
      if (dist <= 3 * o.r) continue;
      if (r.linha && Math.abs(dx * r.linha[1] - dy * r.linha[0]) < 1.5 * o.r) continue;
      if (C[b * k + a] > seg) seg = C[b * k + a]; }
    r.segundo = seg;
    r.res = cmPorPxFonte(H, m, fonte.escalaPx);
    const motivos = [];
    if (best < o.minimo) motivos.push("encaixe fraco (" + best.toFixed(2) + ")");
    if (qmax < 2 * o.abertura) motivos.push("sem traços claros à volta");
    if (seg > -2 && seg / best > o.ambiguo) motivos.push("há outro sítio quase tão bom");
    if (borda) motivos.push("o melhor sítio fica a mais de " + S + " cm do toque");
    if (r.res > o.maxCmPx) motivos.push("ao fundo: 1 píxel = " + r.res.toFixed(1) + " cm");
    r.motivos = motivos; r.duvidoso = motivos.length > 0;
    if (r.linha) { r.d = (t => [d[0] - t * r.linha[0], d[1] - t * r.linha[1]])(d[0] * r.linha[0] + d[1] * r.linha[1]); }
    return r;
  }

  // Encaixe de todos os pares. Em desenho:
  //  1. cada par procura, à volta do sítio onde o dedo o pôs (até 6 cm), o sítio onde o decalque do mapa assenta nos
  //     traços escuros. Fica «cruzamento» (vai para o cruzamento), «linha» (linha sem cruzamento: só desliza para o
  //     lado; ao longo da linha fica onde o dedo o pôs) ou «duvidoso» (fica onde o dedo o pôs);
  //  2. com a perspetiva assim melhorada, os outros cruzamentos do mapa que caem na fotografia («extras», os
  //     candidatos) procuram-se sozinhos à volta de onde a perspetiva os põe (até 4 cm); só ficam os que encaixam com
  //     certeza. É como rebater a quadrícula inteira, e não só os pontos marcados;
  //  3. refaz-se a perspetiva com os pontos seguros (sem os duvidosos, se houver seguros que cheguem, bem espalhados),
  //     tiram-se os que destoam muito dos outros, e afina-se tudo (2 e 1 cm).
  // pares: [{ mapa: [x, y] (cm), foto: [x, y] (px do recorte) }, …] (4 ou mais)
  // fonte: { amostra(x, y) → luminosidade 0–255 ou null fora da fotografia, escalaPx: píxeis da fonte por píxel do recorte }
  // extras: pontos do mapa [[x, y], …] para o passo 2 (opcional)
  // Devolve: pares (os do Mário, encaixados, com «usar»), automaticos (os extras que encaixaram), info, erros antes/depois.
  function encaixar(pares, fonte, mod, opcoes, extras) {
    const o = Object.assign({}, OPC, opcoes || {});
    if (pares.length < 4) throw new Error("são precisos 4 pares ou mais");
    const antes = resumoErros(pares), n = pares.length;
    // 1. à volta do toque
    let H = deParesH(pares), Hi = inv(H);
    const pts = pares.map((p, i) => { const c = aplica(Hi, p.foto), e = encaixarPonto(mod, fonte, H, p.mapa, c, o.procura[0], o);
      const bom = e.ok && !e.duvidoso;
      return { mapa: p.mapa.slice(), foto: bom ? aplica(H, [c[0] + e.d[0], c[1] + e.d[1]]) : p.foto.slice(), toque: p.foto.slice(), e, bom, origem: "par", i }; });
    H = deParesH(pts); Hi = inv(H);
    // segunda oportunidade para os duvidosos, à volta de onde a perspetiva já melhorada os põe
    for (const p of pts) if (!p.bom) { const e = encaixarPonto(mod, fonte, H, p.mapa, p.mapa, o.segunda, o);
      if (e.ok && !e.duvidoso) { p.e = Object.assign(e, { segundaVolta: true, motivos1: p.e.motivos }); p.bom = true; p.foto = aplica(H, [p.mapa[0] + e.d[0], p.mapa[1] + e.d[1]]); }
      else if (e.ok) p.e.motivos2 = e.motivos; }
    // 2. os extras (só cruzamentos seguros: uma linha sem cruzamento não ajuda aqui)
    const W = fonte.largura || 1e9, Hh = fonte.altura || 1e9, margem = 20;
    const ja = new Set(pares.map(p => Math.round(p.mapa[0]) + "," + Math.round(p.mapa[1])));
    for (const m of extras || []) {
      if (ja.has(Math.round(m[0]) + "," + Math.round(m[1])) || pares.some(p => Math.hypot(p.mapa[0] - m[0], p.mapa[1] - m[1]) < 5)) continue;
      const q = aplica(H, m); if (!(q[0] > margem && q[1] > margem && q[0] < W - margem && q[1] < Hh - margem)) continue;
      const e = encaixarPonto(mod, fonte, H, m, m, o.segunda, o);
      if (e.ok && !e.duvidoso && !e.linha) pts.push({ mapa: [m[0], m[1]], foto: aplica(H, [m[0] + e.d[0], m[1] + e.d[1]]), e, bom: true, origem: "auto" });
    }
    // 3. perspetiva com os seguros; fora os que destoam (resíduo > 3 × mediana e > 1,5 cm), até 20 % dos pontos
    const usar = () => { const bons = pts.filter(p => p.bom && !p.fora);
      return bons.length >= 6 && espalhamento(bons.map(p => p.mapa)) >= o.espalhamento ? bons : pts.filter(p => !p.fora || p.origem === "par"); };
    for (let k = 0; k < 3; k++) {
      const u = usar(); H = deParesH(u);
      const r = u.map(p => erroDe(H, p)), med = r.slice().sort((x, y) => x - y)[Math.floor(r.length / 2)];
      const maxFora = Math.floor(0.2 * u.length) - pts.filter(p => p.fora).length; if (maxFora <= 0) break;
      const piores = u.map((p, j) => [r[j], p]).filter(([v, p]) => v > 3 * med && v > 1.5 && p.bom).sort((x, y) => y[0] - x[0]).slice(0, maxFora);
      if (!piores.length) break;
      for (const [v, p] of piores) { p.fora = true; p.e.motivos = (p.e.motivos || []).concat(["destoa dos outros (" + v.toFixed(1) + " cm)"]); }
    }
    // afinar (2 e 1 cm) os seguros
    for (const S of o.procura.slice(1)) {
      const u = usar(); H = deParesH(u); Hi = inv(H);
      for (const p of pts) { if (!p.bom || p.fora) continue;
        const c = aplica(Hi, p.foto), e = encaixarPonto(mod, fonte, H, p.mapa, c, S, o, p.e.linha || null);
        if (e.ok) { p.foto = aplica(H, [c[0] + e.d[0], c[1] + e.d[1]]); p.e.nota = e.nota; if (e.borda) p.e.fugiu = true; } }
    }
    const usados = usar();
    for (const p of pts) p.usar = usados.includes(p);
    const Hd = deParesH(usados), Hdi = inv(Hd);
    const depois = resumoErros(usados);
    // validação cruzada só dos pares do Mário (os extras também contam para a perspetiva, mas são muitos)
    let falhou = null;
    const parTxt = pts.filter(p => p.origem === "par");
    const fugas = parTxt.map(p => { const q = aplica(Hd, p.mapa); return Math.hypot(q[0] - p.toque[0], q[1] - p.toque[1]); });
    if (Math.max(...fugas) > o.maxFugaPx) falhou = "a perspetiva encaixada põe um ponto a " + Math.round(Math.max(...fugas)) + " píxeis do toque (limite " + o.maxFugaPx + "): o encaixe pode ter-se agarrado a outra linha, ou o toque está longe do sítio. Confirma esse ponto com a lupa.";
    if (!falhou && usados.filter(p => p.bom).length < 4) falhou = "poucos pontos encaixaram com certeza (" + usados.filter(p => p.bom).length + "). Junta pares em cruzamentos bem visíveis, em zonas diferentes da fotografia.";
    const looPar = parTxt.map(p => { if (!p.usar) return null; const resto = usados.filter(q => q !== p); if (resto.length < 4) return null;
      const v = aplica(inv(deParesH(resto)), p.foto); return Math.hypot(v[0] - p.mapa[0], v[1] - p.mapa[1]); });
    const lista = parTxt.map(p => { const q1 = aplica(Hdi, p.toque), q2 = aplica(Hdi, p.foto);
      const tipo = !p.bom ? "duvidoso" : p.fora ? "fora" : p.e.linha ? "linha" : "cruzamento";
      return Object.assign({}, p.e, { tipo, usar: p.usar, movidoCm: Math.hypot(q1[0] - q2[0], q1[1] - q2[1]), movidoPx: Math.hypot(p.toque[0] - p.foto[0], p.toque[1] - p.foto[1]) }); });
    const automaticos = pts.filter(p => p.origem === "auto" && p.usar).map(p => ({ mapa: p.mapa, foto: p.foto, nota: +p.e.nota.toFixed(2) }));
    depois.looPares = looPar; depois.looParesRms = rmsDe(looPar.filter(v => v !== null));
    return { pares: parTxt.map(p => ({ mapa: p.mapa, foto: p.foto, usar: p.usar })), automaticos, info: lista, antes, depois, H: Hd, falhou,
      nUsados: usados.length, espalhamento: espalhamento(usados.map(p => p.mapa)) };
  }

  // Fonte a partir de uma imagem em tons de cinzento (Uint8 / Float, w × h), com uma transformação recorte → imagem
  // (para usar a fotografia original, mais nítida do que o recorte de 1024 px): xi = x * k + ox, yi = y * k + oy
  function fonteDeCinzento(dados, w, h, k = 1, ox = 0, oy = 0, largura, altura) {
    return {
      escalaPx: k, largura, altura,
      amostra(x, y) {
        const X = x * k + ox, Y = y * k + oy; if (!(X >= 0 && Y >= 0 && X < w - 1 && Y < h - 1)) return null;
        const i = Math.floor(X), j = Math.floor(Y), fx = X - i, fy = Y - j, s = j * w + i;
        return dados[s] * (1 - fx) * (1 - fy) + dados[s + 1] * fx * (1 - fy) + dados[s + w] * (1 - fx) * fy + dados[s + w + 1] * fx * fy;
      },
    };
  }
  // luminosidade de uma ImageData (RGBA) do navegador
  function cinzentoDeRGBA(px, w, h) { const g = new Float32Array(w * h); for (let i = 0; i < w * h; i++) g[i] = 0.299 * px[4 * i] + 0.587 * px[4 * i + 1] + 0.114 * px[4 * i + 2]; return g; }

  return { homografiaMista, deParesMisto, resumoMisto, normalNaFoto, espalhamento, decalque, retalho, correlacao, homografia, deParesH, aplica, inv, erros, rmsDe, validacaoCruzada, resumoErros, modelo, encaixar, encaixarPonto, fonteDeCinzento, cinzentoDeRGBA, cmPorPxFonte, OPC };
})();
if (typeof module !== "undefined") module.exports = Encaixe;
