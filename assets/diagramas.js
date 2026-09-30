// Learning in 8-bit — widgets interactivos en canvas (pixel art)
// Uso: <canvas data-widget="conv"></canvas> dentro de <figure class="diagrama">, con .controles opcional.
// Todos los canvas: 640 px lógicos de ancho (ver "Especificación de figuras" en GUIA.md), margen 16,
// rótulos 13px mono, etiquetas 10px pixel, contornos 2px, brillo (rampa 6) solo para lo que se mueve o el dato clave.

// Paleta monocromática: cada nombre apunta a un nivel de la rampa --m0..--m6 del CSS,
// así los canvas siguen el tema claro/oscuro.
const NIVELES = {
  fondo: 0, negro: 0, noche: 1, vino: 2, verdeO: 1, marron: 3, grisO: 2, gris: 4, blanco: 6,
  rojo: 5, naranja: 4, amarillo: 6, verde: 5, celeste: 4, lavanda: 3, rosa: 3, piel: 3, apagado: 1,
};
const PAL = {};
function leerPaleta() {
  const cs = getComputedStyle(document.documentElement);
  const m = [0, 1, 2, 3, 4, 5, 6].map((k) => cs.getPropertyValue("--m" + k).trim());
  for (const [n, k] of Object.entries(NIVELES)) PAL[n] = m[k];
  PAL.rampa = m;
  PAL.acento = [null, 1, 2, 3, 4].map((k) => (k ? cs.getPropertyValue("--a" + k).trim() : ""));
}
const PIX = '"Jersey 10", "Press Start 2P", monospace';   // texto 8-bit: pixel font con tildes, ñ, µ, ° y ×
const W = 640, MG = 16;                       // ancho lógico y margen
const R = (n) => PAL.rampa[n];
const A = (n) => PAL.acento[n];             // acento 1..4

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mezcla(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return `rgb(${A.map((c, i) => Math.round(c + (B[i] - c) * t)).join(",")})`;
}
function gris(v) { return mezcla(R(1), R(6), v); }

// canvas en resolución de dispositivo, coordenadas lógicas de 640 de ancho
function prepCanvas(cv, h) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  cv.width = Math.round(W * dpr); cv.height = Math.round(h * dpr);
  const g = cv.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.imageSmoothingEnabled = false;
  g.H = h;
  return g;
}
const limpiar = (g) => g.clearRect(0, 0, W, g.H);
// coordenadas lógicas de un evento de puntero
function puntero(cv, e) {
  const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (g_alto(cv) / r.height)];
}
const g_alto = (cv) => cv.height / Math.max(1, window.devicePixelRatio || 1);

// ---- texto: dos tamaños y uno grande para cifras clave. Devuelven el ancho. y = centro vertical.
function txt(g, s, x, y, color, alin, px) {           // tamaños múltiplos de 10 (grilla de la fuente), coords enteras
  g.font = `${px}px ${PIX}`; g.fillStyle = color; g.textAlign = alin; g.textBaseline = "middle";
  g.fillText(s, Math.round(x), Math.round(y)); return g.measureText(s).width;
}
const rotulo = (g, s, x, y, color = R(5), alin = "left") => txt(g, s, x, y, color, alin, 20);
const titulo = (g, s, x, y, color = R(6), alin = "left") => txt(g, s, x, y, color, alin, 20);
const etiqueta = (g, s, x, y, color = R(5), alin = "left") => txt(g, s, x, y, color, alin, 20);
const numero = (g, s, x, y, color = R(6), alin = "left", tam = 20) => txt(g, s, x, y, color, alin, Math.max(20, Math.round(tam / 10) * 10));

// ---- formas
const ESTILOS = { normal: [() => R(1), () => R(3)], activo: [() => A(1), () => A(3)], apagado: [() => R(1), () => R(2)] };   // [relleno, trazo]
// rect con esquinas escalonadas de 2 px (solo si la caja es grande)
function rectEsc(g, x, y, w, h) {
  if (w < 28 || h < 28) { g.fillRect(x, y, w, h); return; }
  g.fillRect(x + 2, y, w - 4, h); g.fillRect(x, y + 2, w, h - 4);
}
function caja(g, x, y, w, h, estilo = "normal") {
  const [f, s] = ESTILOS[estilo];
  g.fillStyle = s(); rectEsc(g, x, y, w, h);
  if (w > 4 && h > 4) { g.fillStyle = f(); rectEsc(g, x + 2, y + 2, w - 4, h - 4); }
}
function punteado(g, x, y, w, h, color) {           // zona de interés: trazo 2 con guiones 4/4
  g.fillStyle = color;
  for (let k = 0; k < w; k += 8) { const l = Math.min(4, w - k); g.fillRect(x + k, y, l, 2); g.fillRect(x + k, y + h - 2, l, 2); }
  for (let k = 0; k < h; k += 8) { const l = Math.min(4, h - k); g.fillRect(x, y + k, 2, l); g.fillRect(x + w - 2, y + k, 2, l); }
}
function contorno(g, x, y, w, h, color) {           // trazo de 2 hacia adentro, sin relleno
  g.fillStyle = color;
  g.fillRect(x, y, w, 2); g.fillRect(x, y + h - 2, w, 2); g.fillRect(x, y, 2, h); g.fillRect(x + w - 2, y, 2, h);
}
function marco(g, x, y, w, h, color, grosor = 2) {   // trazo hacia afuera
  g.fillStyle = color;
  g.fillRect(x - grosor, y - grosor, w + 2 * grosor, grosor);
  g.fillRect(x - grosor, y + h, w + 2 * grosor, grosor);
  g.fillRect(x - grosor, y, grosor, h);
  g.fillRect(x + w, y, grosor, h);
}
function base(g, x, y, w, nivel = 3) { g.fillStyle = R(nivel); g.fillRect(x, y, w, 2); }   // eje / línea base
function tramado(g, x, y, w, h, color) {              // damero 2x2
  g.fillStyle = color;
  for (let yy = 0; yy < h; yy += 2) for (let xx = (yy / 2) % 2 ? 2 : 0; xx < w; xx += 4) g.fillRect(x + xx, y + yy, Math.min(2, w - xx), Math.min(2, h - yy));
}
// celda con signo: positivos = relleno sólido (más claro cuanto mayor), negativos = tramado
function celdaSigno(g, x, y, w, h, v, max, tope = 1) {
  const t = Math.min(1, Math.abs(v) / (max || 1));
  g.fillStyle = R(1); g.fillRect(x, y, w, h);
  if (t < 0.02) return;
  const color = mezcla(R(1), R(6), (0.25 + 0.75 * t) * tope);
  if (v >= 0) { g.fillStyle = color; g.fillRect(x, y, w, h); return; }
  tramado(g, x, y, w, h, color);
}

// ------------------------------------------------------------------
// Widget: convolución 2D paso a paso
// ------------------------------------------------------------------
const IMAGEN_CASA = [
  "0000000000",
  "0000110000",
  "0001111000",
  "0011111100",
  "0111111110",
  "0010000100",
  "0010110100",
  "0010110100",
  "0011111100",
  "0000000000",
].map((f) => [...f].map(Number));

const KERNELS = {
  "Bordes verticales": [[1, 0, -1], [1, 0, -1], [1, 0, -1]],
  "Bordes horizontales": [[1, 1, 1], [0, 0, 0], [-1, -1, -1]],
  "Desenfoque": [[1, 1, 1], [1, 1, 1], [1, 1, 1]].map((f) => f.map((v) => +(v / 9).toFixed(2))),
  "Realzar": [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
};

function widgetConv(cv) {
  const fig = cv.closest("figure");
  const g = prepCanvas(cv, 288);
  const img = IMAGEN_CASA, N = img.length, K = 3, M = N - K + 1;
  let nombreK = Object.keys(KERNELS)[0], ker = KERNELS[nombreK];
  let paso = 0, jugando = true, relu = false, salida = [];

  const cel = 18, ox = 18, oy = 40;             // entrada
  const kc = 30, kx = 260, ky = 86;             // kernel
  const oc = 20, sx = 464, sy = 40;             // salida

  function calc(i, j) {
    let s = 0;
    for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) s += img[i + a][j + b] * ker[a][b];
    return relu ? Math.max(0, s) : s;
  }
  function reiniciar() { paso = 0; salida = []; }

  function dibujar() {
    limpiar(g);
    const i = Math.floor(paso / M), j = paso % M;

    etiqueta(g, "ENTRADA 10x10", ox, 16);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      g.fillStyle = gris(img[r][c]); g.fillRect(ox + c * cel, oy + r * cel, cel - 2, cel - 2);
    }
    marco(g, ox + j * cel, oy + i * cel, K * cel - 2, K * cel - 2, A(3), 2);

    etiqueta(g, "FILTRO 3x3", kx, 16);
    for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) {
      const v = ker[a][b], x = kx + b * kc, y = ky + a * kc;
      celdaSigno(g, x, y, kc - 2, kc - 2, v, 1, 0.4);
      contorno(g, x, y, kc - 2, kc - 2, R(v ? 3 : 2));
      rotulo(g, v % 1 ? "1/9" : String(v), x + (kc - 2) / 2, y + (kc - 2) / 2 + 1, R(v ? 6 : 3), "center");
    }
    numero(g, "×", 232, ky + 43, R(4), "center");

    etiqueta(g, "SALIDA 8x8", sx, 16);
    const max = Math.max(1, ...salida.map(Math.abs));
    for (let r = 0; r < M; r++) for (let c = 0; c < M; c++) {
      const idx = r * M + c;
      if (idx < salida.length) celdaSigno(g, sx + c * oc, sy + r * oc, oc - 2, oc - 2, salida[idx], max);
      else { g.fillStyle = R(1); g.fillRect(sx + c * oc, sy + r * oc, oc - 2, oc - 2); }
    }
    marco(g, sx + j * oc, sy + i * oc, oc - 2, oc - 2, A(3), 2);

    // flecha kernel -> salida
    const ya = ky + 43;
    g.fillStyle = R(4); g.fillRect(366, ya - 1, 72, 2);
    g.fillRect(434, ya - 5, 2, 10); g.fillRect(438, ya - 3, 2, 6); g.fillRect(442, ya - 1, 2, 2);

    // cuenta
    const v = calc(i, j);
    const w = rotulo(g, "9 multiplicaciones + suma =", ox, 252, R(5));
    numero(g, `${+v.toFixed(2)}${relu ? " (ReLU)" : ""}`, ox + w + 10, 252, A(3));
    rotulo(g, `posición ${paso + 1}/${M * M} · MACs acumulados: ${(paso + 1) * K * K}`, ox, 274, R(4));
  }

  function tick() {
    if (jugando) {
      const i = Math.floor(paso / M), j = paso % M;
      salida[paso] = calc(i, j);
      dibujar();
      paso = (paso + 1) % (M * M);
      if (paso === 0) { setTimeout(() => { salida = []; }, 1200); }
    }
  }

  // controles
  const ctl = fig.querySelector(".controles");
  if (ctl) {
    ctl.innerHTML = `
      <button type="button" data-a="play">❚❚ PAUSA</button>
      <button type="button" data-a="paso">PASO ▸</button>
      <label>Filtro: <select data-a="ker"></select></label>
      <label><input type="checkbox" data-a="relu"> aplicar ReLU</label>`;
    const sel = ctl.querySelector("select");
    sel.innerHTML = Object.keys(KERNELS).map((k) => `<option>${k}</option>`).join("");
    ctl.querySelector('[data-a="play"]').onclick = (e) => { jugando = !jugando; e.target.textContent = jugando ? "❚❚ PAUSA" : "▶ SEGUIR"; };
    ctl.querySelector('[data-a="paso"]').onclick = () => {
      jugando = false; ctl.querySelector('[data-a="play"]').textContent = "▶ SEGUIR";
      const i = Math.floor(paso / M), j = paso % M; salida[paso] = calc(i, j); dibujar(); paso = (paso + 1) % (M * M);
    };
    sel.onchange = () => { nombreK = sel.value; ker = KERNELS[nombreK]; reiniciar(); dibujar(); };
    ctl.querySelector('[data-a="relu"]').onchange = (e) => { relu = e.target.checked; salida = salida.map((_, k) => calc(Math.floor(k / M), k % M)); dibujar(); };
  }
  document.addEventListener("redibujar", dibujar);
  dibujar();
  setInterval(tick, 180);
}

// ------------------------------------------------------------------
// Widget: cuantización float -> intN
// ------------------------------------------------------------------
function widgetQuant(cv) {
  if (cv.dataset.vista === "canal") return widgetQuantCanal(cv);
  const fig = cv.closest("figure");
  const g = prepCanvas(cv, 240);
  // pesos "reales" de ejemplo (distribución tipo campana, determinística)
  const pesos = Array.from({ length: 48 }, (_, k) => {
    const x = Math.sin(k * 12.9898) * 43758.5453; const u = x - Math.floor(x);
    const y = Math.sin(k * 78.233) * 12345.678; const w = y - Math.floor(y);
    return +(Math.sqrt(-2 * Math.log(u + 1e-6)) * Math.cos(2 * Math.PI * w) * 0.35).toFixed(3);
  });
  let bits = 8;

  function dibujar() {
    limpiar(g);
    const niveles = 2 ** bits, qmax = niveles / 2 - 1;
    const maxAbs = Math.max(...pesos.map(Math.abs));
    const escala = maxAbs / qmax;
    const x0 = MG + 2, W2 = W - 2 * MG - 4;
    const px = (v) => x0 + ((v + maxAbs) / (2 * maxAbs)) * W2;

    etiqueta(g, "PESOS · FLOAT32", MG, 16);
    pesos.forEach((p) => { g.fillStyle = R(4); g.fillRect(Math.round(px(p)) - 1, 32, 2, 28); });
    base(g, MG, 62, W - 2 * MG);

    etiqueta(g, `CUANTIZADOS · INT${bits}`, MG, 84, A(3));
    // escalones visibles
    const pasoVis = Math.max(1, Math.round(niveles / 64));
    g.fillStyle = R(2);
    for (let q = -qmax; q <= qmax; q += pasoVis) g.fillRect(Math.round(px(q * escala)), 104, 1, 28);
    let err = 0;
    pesos.forEach((p) => {
      const q = Math.max(-qmax, Math.min(qmax, Math.round(p / escala)));
      const r = q * escala; err += Math.abs(p - r);
      g.fillStyle = A(3); g.fillRect(Math.round(px(r)) - 1, 104, 2, 28);
      // desplazamiento (original -> cuantizado)
      g.fillStyle = R(3); const a = px(p), b = px(r);
      g.fillRect(Math.round(Math.min(a, b)), 94, Math.max(1, Math.round(Math.abs(a - b))), 2);
    });
    base(g, MG, 134, W - 2 * MG);
    const bytes = pesos.length * bits / 8;
    rotulo(g, `memoria: ${bytes} B  (float32: ${pesos.length * 4} B)`, MG, 164, R(5));
    rotulo(g, `error medio: ${(err / pesos.length).toFixed(4)}`, MG, 188, R(5));
    rotulo(g, `escala: ${escala.toFixed(4)}`, MG, 212, R(4));
    numero(g, `${(32 / bits).toFixed(1)}x`, W - MG, 182, A(3), "right", 28);
    rotulo(g, "menos memoria", W - MG, 208, R(4), "right");
  }

  document.addEventListener("redibujar", dibujar);
  const ctl = fig.querySelector(".controles");
  if (ctl) {
    ctl.innerHTML = `<label for="qb">Bits por peso</label>
      <input id="qb" type="range" min="2" max="8" value="8" step="1"><output>8 bits</output>`;
    const r = ctl.querySelector("input"), o = ctl.querySelector("output");
    r.oninput = () => { bits = +r.value; o.textContent = bits + " bits"; dibujar(); };
  }
  dibujar();
}

// ------------------------------------------------------------------
// Widget: convolución estándar vs depthwise separable (una capa 28×28, 32 → 64 canales, k=3)
// ------------------------------------------------------------------
const coma = (s) => String(s).replace(".", ",");
function flecha(g, x, y, w, color) {        // línea horizontal de 2 px con punta escalonada
  g.fillStyle = color; g.fillRect(x, y - 1, w - 4, 2);
  g.fillRect(x + w - 6, y - 5, 2, 10); g.fillRect(x + w - 4, y - 3, 2, 6); g.fillRect(x + w - 2, y - 1, 2, 2);
}
function widgetSeparable(cv) {
  const fig = cv.closest("figure");
  const g = prepCanvas(cv, 262);
  const hw = 28, cin = 32, cout = 64, k = 3;
  const macsE = hw * hw * cout * k * k * cin;
  const macsD = hw * hw * cin * k * k, macsP = hw * hw * cin * cout, macsS = macsD + macsP;   // = H·W·Cin·(k²+Cout)
  const parE = (k * k * cin + 1) * cout, parS = k * k * cin + cin * cout + cout;
  const fmtM = (v) => coma((v / 1e6).toFixed(2)) + " M";
  const fmtK = (v) => coma((v / 1e3).toFixed(1)) + " K";
  let sep = false, t0 = performance.now();
  const filas = [34, 78, 122, 166], nombres = ["1", "2", "3", "32"];

  function dibujar() {
    limpiar(g);
    const ahora = performance.now();
    const fase = sep ? Math.floor(ahora / 1200) % 2 : 0;         // 0 = depthwise (o todo), 1 = pointwise
    const fA = !sep || fase === 0, pA = !sep || fase === 1;      // etapa resaltada
    const neutro = R(3);

    etiqueta(g, "CANAL", 16, 16, R(4));
    etiqueta(g, "3×3", 76, 16, fA ? A(3) : R(4));
    if (sep) etiqueta(g, "MAPAS", 146, 16, fA ? A(3) : R(4));
    etiqueta(g, sep ? "1×1×C" : "Σ", 216, 16, pA ? A(3) : R(4));
    etiqueta(g, "SALIDA", 290, 16, pA ? A(3) : R(4));

    filas.forEach((y, i) => {
      contorno(g, 16, y, 32, 32, R(3)); g.fillStyle = R(1); g.fillRect(18, y + 2, 28, 28);
      txt(g, nombres[i], 32, y + 17, R(4), "center", 20);
      flecha(g, 52, y + 16, 22, R(3));
      g.fillStyle = fA ? A(3) : neutro;                          // filtro 3×3: 9 celdas
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) g.fillRect(76 + b * 10, y + 1 + a * 10, 9, 9);
      if (sep) {
        flecha(g, 110, y + 16, 32, fA ? A(3) : R(3));
        contorno(g, 146, y, 32, 32, fA ? A(3) : R(3)); g.fillStyle = fA ? A(1) : R(1); g.fillRect(148, y + 2, 28, 28);
        flecha(g, 182, y + 16, 30, pA ? A(3) : R(3));
      } else flecha(g, 110, y + 16, 102, R(3));
    });
    txt(g, "⋮", 32, 208, R(4), "center", 20);
    // barra de mezcla (Σ o 1×1×C)
    g.fillStyle = pA ? A(3) : R(3); g.fillRect(216, 30, 24, 168);
    g.fillStyle = pA ? A(1) : R(1); g.fillRect(218, 32, 20, 164);
    flecha(g, 242, 114, 44, pA ? A(3) : R(3));
    contorno(g, 290, 98, 32, 32, pA ? A(3) : R(3)); g.fillStyle = pA ? A(1) : R(1); g.fillRect(292, 100, 28, 28);
    if (!sep) punteado(g, 70, 28, 42, 172, A(3));                // los 32 cortes forman UN solo filtro 3×3×32

    const l1 = sep ? "etapa 1: 32 filtros 3×3, uno por canal" : "1 filtro 3×3×32 mira todos los canales";
    const l2 = sep ? "etapa 2: 1×1×32 mezcla canales (×64)" : "y se repite 64 veces (uno por salida)";
    rotulo(g, l1, 16, 228, sep ? (fA ? A(3) : R(4)) : R(5));
    rotulo(g, l2, 16, 250, sep ? (pA ? A(3) : R(4)) : R(5));

    // panel de costo
    const px = 360, pw = 264;
    etiqueta(g, "MACS DE LA CAPA", px, 16, R(4));
    const objetivo = sep ? macsS : macsE, prog = Math.min(1, (ahora - t0) / 900);
    numero(g, fmtM(objetivo * prog), px, 44, sep ? A(3) : R(6), "left", 30);
    rotulo(g, "estándar " + fmtM(macsE), px, 78, sep ? R(4) : R(6));
    g.fillStyle = R(1); g.fillRect(px, 90, pw, 16); tramado(g, px, 90, pw, 16, R(3)); contorno(g, px, 90, pw, 16, R(3));
    rotulo(g, "separable " + fmtM(macsS), px, 124, sep ? A(3) : R(4));
    const wD = Math.max(2, Math.round(pw * macsD / macsE)), wP = Math.max(2, Math.round(pw * macsP / macsE));
    g.fillStyle = sep ? A(3) : R(3); g.fillRect(px, 136, wD, 16); g.fillRect(px + wD + 2, 136, wP, 16);
    rotulo(g, `dw ${fmtM(macsD)} + pw ${fmtM(macsP)}`, px, 170, R(4));
    if (sep) {
      const w = numero(g, coma((macsE / macsS).toFixed(1)) + "×", px, 200, A(3), "left", 30);
      rotulo(g, "menos cálculo", px + w + 10, 202, R(5));
    } else rotulo(g, "referencia: 1×", px, 200, R(5));
    rotulo(g, sep ? `parámetros: ${fmtK(parE)} → ${fmtK(parS)}` : `parámetros: ${fmtK(parE)}`, px, 232, R(5));
  }

  const ctl = fig.querySelector(".controles");
  if (ctl) {
    ctl.innerHTML = `<button type="button" data-m="std">CONVOLUCIÓN ESTÁNDAR</button><button type="button" data-m="sep">DEPTHWISE SEPARABLE</button>`;
    const marcar = () => ctl.querySelectorAll("button").forEach((b) => {
      const on = (b.dataset.m === "sep") === sep;
      b.setAttribute("aria-pressed", on);
      b.style.background = on ? "var(--a3)" : ""; b.style.color = on ? "var(--fondo)" : ""; b.style.borderColor = on ? "var(--a3)" : "";
    });
    ctl.querySelectorAll("button").forEach((b) => (b.onclick = () => { sep = b.dataset.m === "sep"; t0 = performance.now(); marcar(); dibujar(); }));
    marcar();
  }
  document.addEventListener("redibujar", dibujar);
  setInterval(dibujar, 100);
  dibujar();
}

// ------------------------------------------------------------------
// Widget: cuantización por tensor vs por canal (3 filtros con rangos distintos, int8 simétrico)
// ------------------------------------------------------------------
function widgetQuantCanal(cv) {
  const fig = cv.closest("figure");
  const g = prepCanvas(cv, 300);
  const QMAX = 127, NIV = 2 * QMAX + 1;                          // −127…127
  const filtros = [{ n: "A", rango: 0.9 }, { n: "B", rango: 0.45 }, { n: "C", rango: 0.06 }];
  const base = Array.from({ length: 48 }, (_, k) => {            // pesos deterministas tipo campana
    const x = Math.sin(k * 12.9898) * 43758.5453, u = x - Math.floor(x);
    const y = Math.sin(k * 78.233) * 12345.678, w = y - Math.floor(y);
    return Math.sqrt(-2 * Math.log(u + 1e-6)) * Math.cos(2 * Math.PI * w);
  });
  const mb = Math.max(...base.map(Math.abs));
  filtros.forEach((f) => (f.w = base.map((v) => (v / mb) * f.rango)));
  const global = Math.max(...filtros.map((f) => f.rango));
  let canal = false;

  function dibujar() {
    limpiar(g);
    const bw = W - 2 * MG;
    let usoTotal = 0;
    filtros.forEach((f, i) => {
      const S = (canal ? f.rango : global) / QMAX;
      const usados = 2 * Math.floor(f.rango / S + 1e-9) + 1;
      usoTotal += usados;
      const err = f.w.reduce((s, v) => s + Math.abs(v - Math.max(-QMAX, Math.min(QMAX, Math.round(v / S))) * S), 0) / f.w.length;
      const y = 32 + i * 80;
      rotulo(g, `FILTRO ${f.n} · pesos hasta ${coma(f.rango.toFixed(2))}`, MG, y, R(6));
      rotulo(g, `S = ${coma(S.toFixed(4))}`, W - MG, y, canal ? A(3) : R(5), "right");
      g.fillStyle = R(1); g.fillRect(MG, y + 14, bw, 24);
      tramado(g, MG, y + 14, bw, 24, R(3));                       // tramado neutro = escalones sin usar
      const w = Math.max(4, Math.round(bw * usados / NIV));
      g.fillStyle = A(3); g.fillRect(MG + Math.round((bw - w) / 2), y + 14, w, 24);
      contorno(g, MG, y + 14, bw, 24, R(3));
      rotulo(g, `usa ${usados} de ${NIV} escalones`, MG, y + 54, usados === NIV ? A(3) : R(6));
      rotulo(g, `error medio: ${coma((100 * err / f.rango).toFixed(1))} % del rango`, W - MG, y + 54, R(5), "right");
    });
    g.fillStyle = R(1); g.fillRect(MG, 274, 14, 14); tramado(g, MG, 274, 14, 14, R(3)); contorno(g, MG, 274, 14, 14, R(3));
    rotulo(g, "escalón sin usar", MG + 22, 282, R(4));
    rotulo(g, `aprovechamiento medio: ${Math.round((100 * usoTotal) / (3 * NIV))} %`, W - MG, 282, canal ? A(3) : R(6), "right");
  }

  const ctl = fig.querySelector(".controles");
  if (ctl) {
    ctl.innerHTML = `<button type="button" data-m="t">POR TENSOR</button><button type="button" data-m="c">POR CANAL</button>`;
    const marcar = () => ctl.querySelectorAll("button").forEach((b) => {
      const on = (b.dataset.m === "c") === canal;
      b.setAttribute("aria-pressed", on);
      b.style.background = on ? "var(--a3)" : ""; b.style.color = on ? "var(--fondo)" : ""; b.style.borderColor = on ? "var(--a3)" : "";
    });
    ctl.querySelectorAll("button").forEach((b) => (b.onclick = () => { canal = b.dataset.m === "c"; marcar(); dibujar(); }));
    marcar();
  }
  document.addEventListener("redibujar", dibujar);
  dibujar();
}

// ------------------------------------------------------------------
// Widget: familia ESP como "selección de personaje"
// ------------------------------------------------------------------
const CHIPS = [
  { n: "ESP8266", a: 2014, nuc: "1x Xtensa L106", mhz: 160, n_: 1, sram: 160, psram: 0, ia: 0, radio: "Wi-Fi 4", nota: "El que empezó todo: un puente Wi-Fi barato." },
  { n: "ESP32", a: 2016, nuc: "2x Xtensa LX6", mhz: 240, n_: 2, sram: 520, psram: 1, ia: 1, radio: "Wi-Fi 4 + BT 4.2", nota: "Doble núcleo y PSRAM: primeros modelos TinyML." },
  { n: "ESP32-S2", a: 2020, nuc: "1x Xtensa LX7", mhz: 240, n_: 1, sram: 320, psram: 1, ia: 1, radio: "Wi-Fi 4", nota: "Un núcleo, USB nativo, sin Bluetooth." },
  { n: "ESP32-S3", a: 2021, nuc: "2x Xtensa LX7", mhz: 240, n_: 2, sram: 512, psram: 2, ia: 3, radio: "Wi-Fi 4 + BLE 5", nota: "Vectorial (PIE) + PSRAM octal: el de visión." },
  { n: "ESP32-C3", a: 2021, nuc: "1x RISC-V", mhz: 160, n_: 1, sram: 400, psram: 0, ia: 0, radio: "Wi-Fi 4 + BLE 5", nota: "RISC-V barato y simple. Sin PSRAM." },
  { n: "ESP32-C6", a: 2023, nuc: "1x RISC-V + LP", mhz: 160, n_: 1, sram: 512, psram: 0, ia: 0, radio: "Wi-Fi 6 + BLE 5 + 802.15.4", nota: "Wi-Fi 6, Thread y Zigbee. Para IoT, no visión." },
  { n: "ESP32-H2", a: 2023, nuc: "1x RISC-V", mhz: 96, n_: 1, sram: 320, psram: 0, ia: 0, radio: "BLE 5 + 802.15.4", nota: "Sin Wi-Fi: redes malladas a pila." },
  { n: "ESP32-P4", a: 2024, nuc: "2x RISC-V HP + LP", mhz: 400, n_: 2, sram: 768, psram: 3, ia: 3, radio: "ninguna (usa otro chip)", nota: "Sin radio, MIPI-CSI y 400 MHz: el multimedia." },
];

function spriteChip(g, x, y, s, sel) {
  g.fillStyle = sel ? A(3) : R(3);
  for (let k = 0; k < 4; k++) {
    g.fillRect(x + (3 + k * 3) * s, y, s, s * 2); g.fillRect(x + (3 + k * 3) * s, y + 14 * s, s, s * 2);
    g.fillRect(x, y + (3 + k * 3) * s, s * 2, s); g.fillRect(x + 14 * s, y + (3 + k * 3) * s, s * 2, s);
  }
  g.fillStyle = sel ? A(3) : R(3); g.fillRect(x + 2 * s, y + 2 * s, 12 * s, 12 * s);
  g.fillStyle = sel ? A(1) : R(1); g.fillRect(x + 2 * s + 2, y + 2 * s + 2, 12 * s - 4, 12 * s - 4);
  g.fillStyle = sel ? A(4) : R(3); g.fillRect(x + 5 * s, y + 5 * s, 6 * s, 6 * s);
  g.fillStyle = sel ? A(1) : R(1); g.fillRect(x + 7 * s, y + 7 * s, 2 * s, 2 * s);
}

function widgetFamilia(cv) {
  const g = prepCanvas(cv, 336);
  let sel = 3, auto = true, t = 0;
  const celda = 76, oy = 16;

  function barra(y, etq, val, max, txt) {
    rotulo(g, etq, MG, y + 7, R(4));
    const x = 160, Wb = 300, seg = 20, n = Math.round((val / max) * seg);
    for (let k = 0; k < seg; k++) { g.fillStyle = k < n ? A(3) : R(1); g.fillRect(x + k * (Wb / seg), y, Wb / seg - 3, 14); }
    rotulo(g, txt, x + Wb + 12, y + 7, R(6));
  }

  function dibujar() {
    limpiar(g);
    CHIPS.forEach((c, i) => {
      const x = MG + i * celda, on = i === sel;
      if (on) caja(g, x, oy, celda - 4, 84, "activo");
      const sube = on ? -2 + (t % 2) * 2 : 0;
      spriteChip(g, x + 12, oy + 10 + sube, 3, on);
      etiqueta(g, c.n.replace("ESP32-", "").replace("ESP", ""), x + (celda - 4) / 2, oy + 72, on ? A(3) : R(4), "center");
    });
    const c = CHIPS[sel];
    titulo(g, `${c.n} · ${c.a}`, MG, 126, R(6));
    rotulo(g, c.nota, MG, 152, R(5));
    barra(176, "RELOJ", c.mhz, 400, `${c.mhz} MHz`);
    barra(204, "NÚCLEOS", c.n_, 2, c.nuc);
    barra(232, "SRAM", c.sram, 768, `${c.sram} KB`);
    barra(260, "PSRAM", c.psram, 3, ["no", "sí", "sí, octal", "sí, rápida"][c.psram]);
    barra(288, "AYUDA IA", c.ia, 3, ["nula", "básica", "", "vectorial"][c.ia] || "");
    rotulo(g, "RADIO", MG, 324, R(4));
    rotulo(g, c.radio, 160, 324, R(6));
  }

  cv.style.cursor = "pointer";
  cv.addEventListener("click", (e) => {
    const [x, y] = puntero(cv, e);
    if (y < 120) { const i = Math.floor((x - MG) / celda); if (i >= 0 && i < CHIPS.length) { sel = i; auto = false; dibujar(); } }
  });
  cv.tabIndex = 0;
  cv.setAttribute("aria-label", "Selector de chips ESP: usar flechas izquierda y derecha");
  cv.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") sel = (sel + 1) % CHIPS.length;
    else if (e.key === "ArrowLeft") sel = (sel + CHIPS.length - 1) % CHIPS.length;
    else return;
    auto = false; e.preventDefault(); dibujar();
  });
  document.addEventListener("redibujar", dibujar);
  setInterval(() => { t++; if (auto && t % 8 === 0) sel = (sel + 1) % CHIPS.length; dibujar(); }, 400);
  dibujar();
}

// ------------------------------------------------------------------
// Widget: carrera escalar vs SIMD (PIE, 16 MAC por instrucción)
// ------------------------------------------------------------------
function widgetSimd(cv) {
  const g = prepCanvas(cv, 216);
  const N = 64; // productos a calcular (un "punto" de convolución de 64 entradas)
  let t = 0;
  const pesos = Array.from({ length: N }, (_, k) => (k * 37) % 7 - 3);
  const act = Array.from({ length: N }, (_, k) => (k * 11) % 5);

  function fila(y, titulo, hechos, ciclos, carriles) {
    etiqueta(g, titulo, MG, y, carriles > 1 ? A(3) : R(5));
    const cw = 9, x0 = MG, y0 = y + 16;
    for (let k = 0; k < N; k++) {
      const activa = k >= hechos && k < hechos + carriles && hechos < N;
      const vec = carriles > 1;
      g.fillStyle = k < hechos ? (vec ? A(3) : R(3)) : activa ? (vec ? A(4) : R(5)) : R(1);
      g.fillRect(x0 + k * cw, y0, cw - 2, 16);
      if (k < hechos && !vec) tramado(g, x0 + k * cw, y0, cw - 2, 16, R(1));
    }
    const suma = pesos.slice(0, hechos).reduce((s, w, k) => s + w * act[k], 0);
    rotulo(g, `ciclos: ${ciclos}`, MG, y0 + 36, R(5));
    rotulo(g, `acumulador = ${suma}`, 200, y0 + 36, R(5));
    if (hechos >= N) etiqueta(g, "LISTO", W - MG, y0 + 36, carriles > 1 ? A(3) : R(5), "right");
  }

  function dibujar() {
    limpiar(g);
    const esc = Math.min(N, t), vec = Math.min(N, t * 16);
    fila(16, "ESCALAR · 1 POR CICLO", esc, Math.min(t, N), 1);
    fila(96, "PIE SIMD · 16 POR CICLO", vec, Math.min(t, N / 16), 16);
    const w = numero(g, "16x", MG, 192, A(3), "left", 28);
    rotulo(g, "menos ciclos: 64 → 4", MG + w + 12, 192, R(5));
  }
  document.addEventListener("redibujar", dibujar);
  setInterval(() => { t = t > N + 12 ? 0 : t + 1; dibujar(); }, 140);
  dibujar();
}

// ------------------------------------------------------------------
// Widget: carrera de la jerarquía de memoria (latencia relativa)
// ------------------------------------------------------------------
function widgetMemoria(cv) {
  const g = prepCanvas(cv, 248);
  // ciclos aproximados (órdenes de magnitud) para traer un dato
  const niveles = [
    { n: "REGISTRO", c: 1 },
    { n: "SRAM", c: 2 },
    { n: "PSRAM", c: 25 },
    { n: "FLASH", c: 80 },
  ];
  const cuentas = niveles.map(() => 0);
  const pos = niveles.map(() => 0);
  const x0 = 120, ancho = 340;

  function dibujar() {
    limpiar(g);
    etiqueta(g, "BYTES TRAIDOS POR VIAJE", MG, 16, A(3));
    niveles.forEach((nv, i) => {
      const cy = 68 + i * 52;
      etiqueta(g, nv.n, MG, cy, R(5));
      // pista: largo proporcional a log(ciclos)
      const largo = 30 + (ancho - 30) * Math.log(nv.c + 1) / Math.log(81);
      base(g, x0, cy - 1, Math.round(largo), 2);
      // estante (destino)
      caja(g, x0 + Math.round(largo), cy - 14, 12, 28, "normal");
      // mensajero: ida y vuelta
      const f = pos[i], ida = f < .5 ? f * 2 : 2 - f * 2;
      const mx = x0 + Math.round(ida * largo);
      g.fillStyle = A(4); g.fillRect(mx - 4, cy - 4, 8, 8);
      if (f >= .5) { g.fillStyle = A(3); g.fillRect(mx - 2, cy - 10, 4, 4); }
      rotulo(g, `~${nv.c} ciclo${nv.c > 1 ? "s" : ""}`, W - MG, cy - 10, R(4), "right");
      numero(g, String(cuentas[i]), W - MG, cy + 10, i === 0 ? A(3) : R(6), "right", 18);
    });
  }
  document.addEventListener("redibujar", dibujar);
  setInterval(() => {
    niveles.forEach((nv, i) => {
      pos[i] += 1 / (nv.c * 3); // pasos por viaje proporcional a la latencia
      if (pos[i] >= 1) { pos[i] = 0; cuentas[i]++; }
    });
    if (cuentas[0] > 999) cuentas.fill(0);
    dibujar();
  }, 50);
  dibujar();
}

// ------------------------------------------------------------------
// Widget: tensor arena — reutilizar memoria entre capas
// ------------------------------------------------------------------
function widgetArena(cv) {
  const fig = cv.closest("figure");
  const g = prepCanvas(cv, 328);
  // tamaño (KB) del mapa de activación que produce cada capa de una CNN chica
  const capas = [
    { n: "entrada", kb: 27 }, { n: "conv1", kb: 72 }, { n: "conv2", kb: 72 }, { n: "pool1", kb: 18 },
    { n: "conv3", kb: 36 }, { n: "pool2", kb: 9 }, { n: "conv4", kb: 18 }, { n: "densa", kb: 1 },
  ];
  let reuso = true, paso = 0;
  const X0 = MG, AN = 64, PIT = 76, Y0 = 296, ESC = 0.9;

  function dibujar() {
    limpiar(g);
    let pico = 0;
    capas.forEach((c, i) => {
      const x = X0 + i * PIT;
      // qué buffers están vivos cuando se calcula la capa i
      let vivos;
      if (reuso) vivos = i === 0 ? [0] : [i - 1, i];
      else vivos = capas.map((_, k) => k).filter((k) => k <= i);
      const total = vivos.reduce((s, k) => s + capas[k].kb, 0);
      if (i <= paso) pico = Math.max(pico, total);
      let y = Y0;
      if (i <= paso) vivos.forEach((k) => {
        const h = Math.max(4, Math.round(capas[k].kb * ESC));
        y -= h;
        caja(g, x, y, AN, h - 2, k === i ? "activo" : "normal");
      });
      rotulo(g, c.n, x + AN / 2, Y0 + 16, i === paso ? A(3) : R(4), "center");
      if (i === paso) rotulo(g, total + " KB", x + AN / 2, y - 12, A(3), "center");
    });
    base(g, MG, Y0, W - 2 * MG);
    etiqueta(g, reuso ? "CON REUSO" : "SIN REUSO", MG, 16, R(5));
    numero(g, `pico ${pico} KB`, W - MG, 16, A(3), "right");
  }
  const ctl = fig.querySelector(".controles");
  if (ctl) {
    ctl.innerHTML = `<button type="button" data-a="modo">ver sin reuso</button><button type="button" data-a="rei">reiniciar</button>`;
    ctl.querySelector('[data-a="modo"]').onclick = (e) => { reuso = !reuso; e.target.textContent = reuso ? "ver sin reuso" : "ver con reuso"; paso = 0; dibujar(); };
    ctl.querySelector('[data-a="rei"]').onclick = () => { paso = 0; dibujar(); };
  }
  document.addEventListener("redibujar", dibujar);
  setInterval(() => { paso = paso >= capas.length + 3 ? 0 : paso + 1; dibujar(); }, 700);
  dibujar();
}

// ------------------------------------------------------------------
// Widget: presupuesto de SRAM del ESP32-S3
// ------------------------------------------------------------------
function widgetPresupuesto(cv) {
  const fig = cv.closest("figure");
  const g = prepCanvas(cv, 200);
  const fijos = [{ n: "sistema + RTOS", kb: 130 }];
  const opc = { wifi: { n: "Wi-Fi", kb: 75, on: true }, ble: { n: "BLE", kb: 70, on: false } };

  function dibujar() {
    limpiar(g);
    const X = MG, Wb = W - 2 * MG, esc = Wb / 512, y = 40, h = 64;
    let x = X;
    const bloques = [...fijos, ...Object.values(opc).filter((o) => o.on)];
    etiqueta(g, "SRAM INTERNA · 512 KB", MG, 16, R(5));
    bloques.forEach((b) => {
      const w = Math.round(b.kb * esc);
      caja(g, x, y, w - 4, h, "normal");
      titulo(g, b.n, x + 10, y + 20, R(6));
      rotulo(g, `~${b.kb} KB`, x + 10, y + 44, R(6));
      x += w;
    });
    const libre = 512 - bloques.reduce((s, b) => s + b.kb, 0);
    // zona libre: tramada, destacada
    g.fillStyle = A(1); g.fillRect(x, y, X + Wb - x, h);
    tramado(g, x + 2, y + 2, X + Wb - x - 4, h - 4, A(2));
    punteado(g, x, y, X + Wb - x, h, A(3));
    etiqueta(g, "LIBRE", x + 10, y + 16, A(3));
    numero(g, `~${libre} KB`, MG, 142, A(3), "left", 28);
    rotulo(g, "libres para la red neuronal", MG, 174, R(5));
  }
  const ctl = fig.querySelector(".controles");
  if (ctl) {
    ctl.innerHTML = `<label><input type="checkbox" data-k="wifi" checked> Wi-Fi activo</label>
      <label><input type="checkbox" data-k="ble"> Bluetooth LE activo</label>`;
    ctl.querySelectorAll("input").forEach((i) => (i.onchange = () => { opc[i.dataset.k].on = i.checked; dibujar(); }));
  }
  document.addEventListener("redibujar", dibujar);
  dibujar();
}

// ------------------------------------------------------------------
// Widget: red CNN completa (estilo fósforo) — dígito → mapas → densa → 0..9
// ------------------------------------------------------------------
const DIGITOS = {
  4: ["............", "..#.....#...", "..#.....#...", "..#.....#...", "..#.....#...", "..#.....#...",
      "..########..", "........#...", "........#...", "........#...", "........#...", "............"],
  7: ["............", ".#########..", "........##..", ".......##...", "......##....", ".....##.....",
      "....##......", "....#.......", "...##.......", "...#........", "...#........", "............"],
  1: ["............", ".....##.....", "....###.....", "...#.##.....", ".....##.....", ".....##.....",
      ".....##.....", ".....##.....", ".....##.....", ".....##.....", "...######...", "............"],
};
function bitmap(d) { return DIGITOS[d].map((f) => [...f].map((c) => (c === "#" ? 1 : 0))); }
function convRelu(img, k) {
  const N = img.length, M = N - 2, o = [];
  for (let i = 0; i < M; i++) { o.push([]); for (let j = 0; j < M; j++) {
    let s = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s += img[i + a][j + b] * k[a][b];
    o[i].push(Math.max(0, s));
  } }
  const mx = Math.max(1e-6, ...o.flat()); return o.map((f) => f.map((v) => v / mx));
}
function pool2(m) {
  const n = Math.floor(m.length / 2), o = [];
  for (let i = 0; i < n; i++) { o.push([]); for (let j = 0; j < n; j++) o[i].push(Math.max(m[2*i][2*j], m[2*i+1][2*j], m[2*i][2*j+1], m[2*i+1][2*j+1])); }
  return o;
}
const K_RED = [
  [[1,0,-1],[1,0,-1],[1,0,-1]], [[-1,0,1],[-1,0,1],[-1,0,1]], [[1,1,1],[0,0,0],[-1,-1,-1]],
  [[-1,-1,-1],[0,0,0],[1,1,1]], [[0,1,0],[1,-4,1],[0,1,0]].map((f) => f.map((v) => -v)), [[1,1,0],[1,0,-1],[0,-1,-1]],
];

function widgetRedCnn(cv) {
  const g = prepCanvas(cv, 224);
  const orden = [4, 7, 1];
  let idx = 0, t = 0, datos;

  function preparar() {
    const img = bitmap(orden[idx]);
    const m1 = K_RED.map((k) => convRelu(img, k));               // 6 mapas 10x10
    const m2 = m1.map(pool2);                                      // 6 mapas 5x5
    const m3 = m2.map((m, i) => convRelu(m, K_RED[(i + 2) % 6]));   // 6 mapas 3x3
    datos = { img, m1, m2, m3 };
  }

  // mapa con "perspectiva" pixelada: cada columna baja un poco (cizalla entera)
  function mapa(x, y, m, cel, marcoCol) {
    const n = m.length, sh = 0.35;
    for (let c = 0; c < n; c++) {
      const dy = Math.round(c * cel * sh * 0.25);
      for (let r = 0; r < n; r++) {
        const v = m[r][c];
        g.fillStyle = v > 0.05 ? mezcla(R(1), R(6), Math.min(1, v)) : R(1);
        g.fillRect(x + c * cel, y + r * cel + dy, cel, cel);
      }
    }
    const Wm = n * cel, Hm = n * cel, caida = Math.round((n - 1) * cel * sh * 0.25);
    g.fillStyle = marcoCol;
    for (let c = 0; c <= n; c++) {
      const dy = Math.round(Math.min(c, n - 1) * cel * sh * 0.25);
      g.fillRect(x + c * cel, y + dy - 2, cel, 2);
      g.fillRect(x + c * cel, y + Hm + dy, cel, 2);
    }
    g.fillRect(x - 2, y - 2, 2, Hm + 4);
    g.fillRect(x + Wm, y + caida - 2, 2, Hm + 4);
  }

  function conexion(x0, y0, x1, y1, color, fase) {
    // línea punteada pixel (cada 3 px), con un "pulso" que la recorre
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 3 | 0;
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n);
      const cerca = fase >= 0 && Math.abs(k / n - fase) < 0.06;
      g.fillStyle = cerca ? A(4) : color;
      g.fillRect(x, y, cerca ? 2 : 1, cerca ? 2 : 1);
    }
  }

  function dibujar() {
    limpiar(g);
    const { img, m1, m2, m3 } = datos;
    const borde = R(3);
    mapa(MG + 2, 88, img, 7, borde);
    etiqueta(g, "ENTRADA", MG, 208, R(4));
    for (let i = m1.length - 1; i >= 0; i--) mapa(122 + i * 12, 112 - i * 8, m1[i], 6, borde);
    etiqueta(g, "CONV 1", 122, 208, R(4));
    for (let i = m2.length - 1; i >= 0; i--) mapa(262 + i * 10, 122 - i * 7, m2[i], 8, borde);
    etiqueta(g, "POOL", 262, 208, R(4));
    for (let i = m3.length - 1; i >= 0; i--) mapa(372 + i * 8, 125 - i * 6, m3[i], 10, borde);
    etiqueta(g, "CONV 2", 372, 208, R(4));

    // densa y salida
    const nD = 12, xD = 500, xS = 570;
    const yD = (k) => 24 + k * 14, yS = (k) => 32 + k * 16;
    const fase = ((t % 40) / 40);
    const pred = orden[idx];
    for (let k = 0; k < nD; k++) {
      conexion(456, 128, xD, yD(k), R(2), (k % 3 === 0) ? fase : -1);
      for (let s = 0; s < 10; s++) if ((k + s) % 3 === 0 || s === pred) conexion(xD, yD(k), xS, yS(s), s === pred ? A(3) : R(1), s === pred ? (fase * 2) % 1 : -1);
    }
    for (let k = 0; k < nD; k++) nodo(xD, yD(k), 6, (k * 7 + pred) % 5 === 0 ? 0.8 : 0.25);
    for (let s = 0; s < 10; s++) {
      const on = s === pred;
      nodo(xS, yS(s), 6, on ? 1 : 0.15, on);
      rotulo(g, String(s), xS + 14, yS(s), on ? A(3) : R(3));
    }
    etiqueta(g, "DENSA", xD, 208, R(4), "center");
    etiqueta(g, "SALIDA", W - MG, 208, A(3), "right");
  }
  function nodo(x, y, r, v, acc) {
    const col = acc ? A(3) : R(3), rel = acc ? A(4) : null;
    g.fillStyle = col;
    for (let a = -r; a <= r; a += 2) for (let b = -r; b <= r; b += 2) {
      const d = Math.sqrt(a * a + b * b);
      if (d <= r && d > r - 2.5) g.fillRect(x + a, y + b, 2, 2);
      else if (d <= r - 2.5) { g.fillStyle = rel || mezcla(R(1), R(6), v); g.fillRect(x + a, y + b, 2, 2); g.fillStyle = col; }
    }
  }
  preparar();
  document.addEventListener("redibujar", dibujar);
  setInterval(() => { t++; if (t % 120 === 0) { idx = (idx + 1) % orden.length; preparar(); } dibujar(); }, 60);
  dibujar();
}

// ------------------------------------------------------------------
// Widget: píxeles como números
// ------------------------------------------------------------------
function widgetPixeles(cv) {
  const g = prepCanvas(cv, 272);
  const img = bitmap(4).map((f, i) => f.map((v, j) => v ? 200 + ((i * 7 + j * 13) % 55) : ((i * 3 + j * 5) % 23)));
  let hover = null;
  const c = 18, x0 = MG, y0 = 40, X = 248, cc = 30;
  function dibujar() {
    limpiar(g);
    etiqueta(g, "LO QUE VES", x0, 16);
    img.forEach((f, i) => f.forEach((v, j) => { g.fillStyle = mezcla(R(0), R(6), v / 255); g.fillRect(x0 + j * c, y0 + i * c, c - 2, c - 2); }));
    etiqueta(g, "LO QUE VE EL CHIP · 0-255", X, 16);
    img.forEach((f, i) => f.forEach((v, j) => {
      const sel = hover && hover[0] === i && hover[1] === j;
      if (sel) { g.fillStyle = A(1); g.fillRect(X + j * cc, y0 + i * c, cc - 2, c - 2); contorno(g, X + j * cc, y0 + i * c, cc - 2, c - 2, A(3)); }
      rotulo(g, String(v), X + j * cc + (cc - 2) / 2, y0 + i * c + (c - 2) / 2 + 1, sel ? A(3) : R(v > 100 ? 6 : 3), "center");
    }));
    if (hover) marco(g, x0 + hover[1] * c, y0 + hover[0] * c, c - 2, c - 2, A(3), 2);
  }
  cv.addEventListener("mousemove", (e) => {
    const [x, y] = puntero(cv, e);
    const j = Math.floor((x - x0) / c), i = Math.floor((y - y0) / c);
    hover = i >= 0 && i < 12 && j >= 0 && j < 12 ? [i, j] : null; dibujar();
  });
  let k = 0;
  setInterval(() => { if (!cv.matches(":hover")) { k = (k + 1) % 144; hover = [Math.floor(k / 12), k % 12]; dibujar(); } }, 250);
  document.addEventListener("redibujar", dibujar);
  dibujar();
}

// ------------------------------------------------------------------
// Widget: calculadora de parámetros y MACs (estándar vs separable)
// ------------------------------------------------------------------
function widgetMacs(cv) {
  const fig = cv.closest("figure");
  const g = prepCanvas(cv, 224);
  const p = { hw: 28, cin: 32, cout: 64, k: 3 };
  const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(2) + " M" : n >= 1e3 ? (n / 1e3).toFixed(1) + " K" : String(n);

  function dibujar() {
    limpiar(g);
    const { hw, cin, cout, k } = p;
    const macsE = hw * hw * cout * k * k * cin, parE = (k * k * cin + 1) * cout;
    const macsS = hw * hw * cin * (k * k + cout), parS = k * k * cin + cin * cout + cout;
    const max = macsE, Wb = W - 2 * MG;
    const barra = (y, etq, v, acc) => {
      etiqueta(g, etq, MG, y, acc ? A(3) : R(5));
      rotulo(g, fmt(v) + " MAC", W - MG, y, acc ? A(3) : R(5), "right");
      const w = Math.max(4, Math.round(Wb * v / max));
      if (acc) { g.fillStyle = A(3); g.fillRect(MG, y + 16, w, 24); }
      else { g.fillStyle = R(1); g.fillRect(MG, y + 16, w, 24); tramado(g, MG, y + 16, w, 24, R(3)); contorno(g, MG, y + 16, w, 24, R(3)); }
    };
    barra(16, "ESTÁNDAR", macsE, false);
    barra(80, "SEPARABLE", macsS, true);
    numero(g, `${(macsE / macsS).toFixed(1)}x`, MG, 156, A(3), "left", 28);
    rotulo(g, "menos cálculo", MG + 90, 156, R(5));
    rotulo(g, `parámetros: ${fmt(parE)} → ${fmt(parS)}`, MG, 188, R(5));
    const ms = macsE / (240e6 * 16) * 1000;
    rotulo(g, `techo teórico (S3 + PIE): ${ms.toFixed(2)} → ${(ms * macsS / macsE).toFixed(2)} ms`, MG, 210, R(4));
  }
  const ctl = fig.querySelector(".controles");
  if (ctl) {
    const campos = [["hw", "tamaño (alto = ancho)", 4, 96, 4], ["cin", "canales de entrada", 1, 128, 1], ["cout", "canales de salida", 1, 256, 1], ["k", "kernel k×k", 1, 7, 2]];
    ctl.style.display = "grid"; ctl.style.gridTemplateColumns = "auto 1fr auto"; ctl.style.gap = ".3rem .8rem";
    ctl.innerHTML = campos.map(([id, n, a, b, s]) => `<label for="m-${id}">${n}</label><input id="m-${id}" type="range" min="${a}" max="${b}" step="${s}" value="${p[id]}"><output>${p[id]}</output>`).join("");
    campos.forEach(([id]) => {
      const i = ctl.querySelector("#m-" + id);
      i.oninput = () => { p[id] = +i.value; i.nextElementSibling.textContent = i.value; dibujar(); };
    });
  }
  document.addEventListener("redibujar", dibujar);
  dibujar();
}

// ------------------------------------------------------------------
// Widget: cronograma tipo analizador lógico (doble buffer ping-pong)
// ------------------------------------------------------------------
function widgetTiming(cv) {
  const fig = cv.closest("figure");
  const g = prepCanvas(cv, 240);
  let doble = true, t0 = 0;
  const T = { cap: 30, pre: 6, inf: 54 }; // ms aproximados por cuadro
  const esc = 1.6, X0 = 104, X1 = W - MG;

  function dibujar() {
    limpiar(g);
    const carriles = ["cámara", "preproceso", "inferencia", "decisión"];
    const cy = (i) => 56 + i * 44;
    carriles.forEach((c, i) => {
      rotulo(g, c, MG, cy(i), i === 2 ? A(3) : R(5));
      g.fillStyle = R(2); g.fillRect(X0, cy(i) + 12, X1 - X0, 2);
    });
    const ventana = (X1 - X0) / esc; // ms visibles
    const offset = t0 % 1000;
    let n = 0;
    // cada cuadro N: captura -> pre -> inferencia -> decisión
    let capIni = 0, infLibre = 0, cuadros = [];
    while (capIni < offset + ventana + 200) {
      const capFin = capIni + T.cap;
      const preIni = capFin, preFin = preIni + T.pre;
      const infIni = Math.max(preFin, infLibre), infFin = infIni + T.inf;
      infLibre = infFin;
      cuadros.push({ n, capIni, capFin, preIni, preFin, infIni, infFin });
      // con doble buffer se captura el siguiente mientras se infiere; sin él, se espera a que termine
      capIni = doble ? Math.max(capFin, infFin - T.cap - T.pre) : infFin;
      n++;
    }
    const px = (ms) => X0 + (ms - offset) * esc;
    g.save(); g.beginPath(); g.rect(X0, 0, X1 - X0, g.H); g.clip();
    const bloque = (a, b, fila, estilo, etq) => {
      const x = Math.round(px(a)), w = Math.max(4, Math.round((b - a) * esc));
      if (x + w < X0 || x > X1) return;
      if (w < 8) { g.fillStyle = R(4); g.fillRect(x, cy(fila) - 10, w, 20); return; }
      caja(g, x, cy(fila) - 10, w - 2, 20, estilo);
      const vis = Math.min(x + w, X1) - Math.max(x, X0);
      if (etq && vis > 34) rotulo(g, etq, Math.max(x, X0) + 6, cy(fila), estilo === "activo" ? A(3) : R(5));
    };
    cuadros.forEach((c) => {
      bloque(c.capIni, c.capFin, 0, "normal", "#" + c.n);
      bloque(c.preIni, c.preFin, 1, "normal", "");
      bloque(c.infIni, c.infFin, 2, "activo", "#" + c.n);
      bloque(c.infFin, c.infFin + 3, 3, "normal", "");
    });
    g.restore();
    const periodo = doble ? Math.max(T.inf, T.cap + T.pre) : T.cap + T.pre + T.inf;
    etiqueta(g, doble ? "CON DOBLE BUFFER" : "SIN DOBLE BUFFER", MG, 16, R(5));
    const w = numero(g, `${(1000 / periodo).toFixed(1)} fps`, MG, 220, A(3), "left", 20);
    rotulo(g, `un cuadro cada ${periodo} ms`, MG + w + 12, 220, R(4));
  }
  const ctl = fig.querySelector(".controles");
  if (ctl) {
    ctl.innerHTML = `<button type="button">ver sin doble buffer</button>`;
    const b = ctl.querySelector("button");
    b.onclick = () => { doble = !doble; b.textContent = doble ? "ver sin doble buffer" : "ver con doble buffer"; };
  }
  document.addEventListener("redibujar", dibujar);
  setInterval(() => { t0 += 3; dibujar(); }, 50);
  dibujar();
}

// ------------------------------------------------------------------
// Widget: calculadora de batería con ciclos de trabajo
// ------------------------------------------------------------------
function widgetBateria(cv) {
  const fig = cv.closest("figure");
  const g = prepCanvas(cv, 256);
  const p = { eventos: 100, activo: 1500, ma: 150, sueno: 10, mah: 2500 };

  function dibujar() {
    limpiar(g);
    const V = 3.3;
    const eActivo = p.eventos * (p.activo / 1000) * (p.ma / 1000) * V;           // J/día
    const eSueno = (p.sueno / 1e6) * V * 86400;                                    // J/día
    const eBat = (p.mah / 1000) * V * 3600;                                        // J
    const dias = eBat / (eActivo + eSueno);
    const frac = eActivo / (eActivo + eSueno);
    // barra de energía diaria: contorno + tramo "despierto"
    const Wb = W - 2 * MG;
    etiqueta(g, "ENERGÍA POR DÍA", MG, 16, R(5));
    caja(g, MG, 32, Wb, 24, "normal");
    g.fillStyle = A(3); g.fillRect(MG + 2, 34, Math.max(2, Math.round((Wb - 4) * frac)), 20);
    rotulo(g, `despierto ${eActivo.toFixed(1)} J`, MG, 72, A(3));
    rotulo(g, `dormido ${eSueno.toFixed(1)} J`, W - MG, 72, R(4), "right");
    etiqueta(g, "AUTONOMÍA ESTIMADA", MG, 108, R(4));
    numero(g, dias > 730 ? (dias / 365).toFixed(1) + " años" : dias.toFixed(0) + " días", MG, 136, A(3), "left", 28);
    // gráfico i(t) de un evento
    etiqueta(g, "I(T) DE UN DESPERTAR", MG, 172, R(4));
    const y0 = 240, h = 40;
    base(g, MG, y0 + 6, Wb, 3);
    g.fillStyle = A(3);
    g.fillRect(MG, y0 - 2, 160, 2); g.fillRect(176, y0 - h, 2, h); g.fillRect(176, y0 - h, 160, 2); g.fillRect(336, y0 - h, 2, h); g.fillRect(336, y0 - 2, W - MG - 336, 2);
    rotulo(g, `${p.sueno} µA`, MG + 8, y0 - 16, R(4));
    rotulo(g, `${p.ma} mA · ${p.activo} ms`, 184, y0 - h - 12, R(5));
  }
  const ctl = fig.querySelector(".controles");
  if (ctl) {
    const campos = [["eventos", "despertares por día", 1, 2000, 1], ["activo", "ms despierto por evento", 50, 5000, 50], ["ma", "corriente despierto (mA)", 20, 350, 5], ["sueno", "sueño profundo (µA)", 5, 500, 5], ["mah", "batería (mAh)", 200, 10000, 100]];
    ctl.style.display = "grid"; ctl.style.gridTemplateColumns = "auto 1fr auto"; ctl.style.gap = ".3rem .8rem";
    ctl.innerHTML = campos.map(([id, n, a, b, s]) => `<label for="b-${id}">${n}</label><input id="b-${id}" type="range" min="${a}" max="${b}" step="${s}" value="${p[id]}"><output>${p[id]}</output>`).join("");
    campos.forEach(([id]) => { const i = ctl.querySelector("#b-" + id); i.oninput = () => { p[id] = +i.value; i.nextElementSibling.textContent = i.value; dibujar(); }; });
  }
  document.addEventListener("redibujar", dibujar);
  dibujar();
}

// ------------------------------------------------------------------
// Widget: árbol de decisión para elegir chip (HTML, no canvas)
// Uso: <div data-arbol></div>
// ------------------------------------------------------------------
const ARBOL = {
  inicio: { p: "¿Qué señal procesa tu red?", o: [["Audio, vibración u otra señal 1D", "radio"], ["Imágenes de una cámara", "res"]] },
  radio: { p: "¿Necesitás Thread/Zigbee o Wi-Fi 6, a batería?", o: [["Sí", "c6"], ["No, alcanza con Wi-Fi 4 / BLE y quiero más cómputo", "s3audio"]] },
  res: { p: "¿Qué tamaño de entrada y velocidad necesitás?", o: [["Chico: hasta ~160 × 160, unos pocos a ~15 cuadros/s", "s3"], ["Grande: 224 × 224 o más, o video fluido", "p4"]] },
  c6: { r: "ESP32-C6 (o H2)", d: "Clasificadores 1D chicos, radios modernas y bajo consumo. Sin PSRAM ni cámara." },
  s3audio: { r: "ESP32-S3", d: "PIE acelera también redes de audio (palabras clave, clasificación de sonidos) y sobra memoria." },
  s3: { r: "ESP32-S3", d: "El caballito de batalla: cámara paralela con DMA, PIE y PSRAM octal. Detección de personas, caras, gestos." },
  p4: { r: "ESP32-P4", d: "400 MHz, MIPI-CSI, acelerador de píxeles y PSRAM rápida. Sin radio: sumale un C6 si necesitás Wi-Fi." },
};
function montarArbol(el) {
  const ir = (k, camino) => {
    const n = ARBOL[k];
    const hist = camino.map((c) => `<div class="arbol-paso">▸ ${c}</div>`).join("");
    if (n.r) {
      el.innerHTML = `${hist}<p class="arbol-res"><strong>→ ${n.r}</strong><br>${n.d}</p><button type="button" class="btn sec" data-k="inicio">empezar de nuevo</button>`;
    } else {
      el.innerHTML = `${hist}<p class="pregunta">${n.p}</p><div class="opciones">${n.o.map(([t, s]) => `<button type="button" data-k="${s}" data-t="${t}">${t}</button>`).join("")}</div>`;
    }
    el.querySelectorAll("button").forEach((b) => (b.onclick = () => ir(b.dataset.k, b.dataset.k === "inicio" ? [] : [...camino, b.dataset.t])));
  };
  ir("inicio", []);
}

// ------------------------------------------------------------------
const WIDGETS = {
  timing: widgetTiming, bateria: widgetBateria,
  redcnn: widgetRedCnn, pixeles: widgetPixeles, macs: widgetMacs,
  conv: widgetConv, separable: widgetSeparable, quant: widgetQuant, familia: widgetFamilia, simd: widgetSimd,
  memoria: widgetMemoria, arena: widgetArena, presupuesto: widgetPresupuesto,
};

document.addEventListener("DOMContentLoaded", async () => {
  try { await Promise.all([document.fonts.load(`20px ${PIX}`)]); } catch {}
  leerPaleta();
  document.addEventListener("tema", () => { leerPaleta(); document.dispatchEvent(new Event("redibujar")); });
  document.querySelectorAll("canvas[data-widget]").forEach((cv) => WIDGETS[cv.dataset.widget]?.(cv));
  document.querySelectorAll("[data-arbol]").forEach(montarArbol);
});
