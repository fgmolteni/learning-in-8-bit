// PixelMotor v2 — compositor de resolución mixta (8 + 16 + 32 bit en el mismo cuadro)
// Tres capas alineadas sobre una grilla común (escenas siempre en unidades de 320 de ancho):
//   8: 160 px (texto bitmap ×4, fondos) · 16: 320 px (componentes, cables, ejes, bitmap ×2) · 32: 640 px (trazas, detalle).
// Estética plana (v3): sin brillo, sombras ni degradados; el 32 aporta resolución, no efectos.
// El lienzo visible es de 640 px; cada capa se compone encima con escalado sin suavizado.
//   <canvas data-motor="nombre" data-bits="mixto"> + PixelMotor.escena(nombre, { alto, descripcion, dibujar(m, t, s) })
// Capas: m.en(8|16|32, fn) · m.zona({x,y,w,h}, bits, fn) · m.lupa({de, a, bits}, fn).
// Formato único: mixto. Bajo cada figura solo hay un botón de pausa/animar.
(() => {
  // ---------------------------------------------------------------- modos y capas
  const FPS = { 8: 10, 16: 20, 32: 60 };
  const CAPA_K = { 8: 0.5, 16: 1, 32: 2 };   // unidades → px de cada capa (factores enteros ×4 ×2 ×1)
  const CAPA_W = { 8: 160, 16: 320, 32: 640 };
  // 8-bit: cada token cae en uno de 7 colores (neutros n0, n3, n6 más el paso 3 de cada canal)
  const A_8BIT = { n0: "n0", n1: "n0", n2: "n3", n3: "n3", n4: "n3", n5: "n6", n6: "n6" };
  for (const c of "abcd") Object.assign(A_8BIT, { [c + 1]: "n0", [c + 2]: c + 3, [c + 3]: c + 3, [c + 4]: c + 3 });

  // tokens de los 4 canales fijos de las figuras (no siguen al acento de la UI)
  const CANAL = { a: "naranja", b: "azul", c: "verde", d: "magenta" };
  const COL = {};
  function leerColores() {
    const cs = getComputedStyle(document.documentElement);
    for (const k of Object.keys(A_8BIT)) {
      const v = k[0] === "n" ? "--m" + k[1] : `--${CANAL[k[0]]}${k[1]}`;
      COL[k] = cs.getPropertyValue(v).trim() || "#888888";
    }
  }
  const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

  // ---------------------------------------------------------------- fuente bitmap 5x7
  const GLIFOS = {
    A: "01110 10001 10001 11111 10001 10001 10001", B: "11110 10001 10001 11110 10001 10001 11110",
    C: "01110 10001 10000 10000 10000 10001 01110", D: "11100 10010 10001 10001 10001 10010 11100",
    E: "11111 10000 10000 11110 10000 10000 11111", F: "11111 10000 10000 11110 10000 10000 10000",
    G: "01110 10001 10000 10111 10001 10001 01111", H: "10001 10001 10001 11111 10001 10001 10001",
    I: "01110 00100 00100 00100 00100 00100 01110", J: "00111 00010 00010 00010 00010 10010 01100",
    K: "10001 10010 10100 11000 10100 10010 10001", L: "10000 10000 10000 10000 10000 10000 11111",
    M: "10001 11011 10101 10101 10001 10001 10001", N: "10001 10001 11001 10101 10011 10001 10001",
    O: "01110 10001 10001 10001 10001 10001 01110", P: "11110 10001 10001 11110 10000 10000 10000",
    Q: "01110 10001 10001 10001 10101 10010 01101", R: "11110 10001 10001 11110 10100 10010 10001",
    S: "01111 10000 10000 01110 00001 00001 11110", T: "11111 00100 00100 00100 00100 00100 00100",
    U: "10001 10001 10001 10001 10001 10001 01110", V: "10001 10001 10001 01010 01010 00100 00100",
    W: "10001 10001 10001 10101 10101 10101 01010", X: "10001 10001 01010 00100 01010 10001 10001",
    Y: "10001 10001 10001 01010 00100 00100 00100", Z: "11111 00001 00010 00100 01000 10000 11111",
    0: "01110 10001 10011 10101 11001 10001 01110", 1: "00100 01100 00100 00100 00100 00100 01110",
    2: "01110 10001 00001 00010 00100 01000 11111", 3: "11111 00010 00100 00010 00001 10001 01110",
    4: "00010 00110 01010 10010 11111 00010 00010", 5: "11111 10000 11110 00001 00001 10001 01110",
    6: "00110 01000 10000 11110 10001 10001 01110", 7: "11111 00001 00010 00100 01000 01000 01000",
    8: "01110 10001 10001 01110 10001 10001 01110", 9: "01110 10001 10001 01111 00001 00010 01100",
    ".": "00000 00000 00000 00000 00000 01100 01100", ",": "00000 00000 00000 00000 01100 00100 01000",
    ":": "00000 01100 01100 00000 01100 01100 00000", "-": "00000 00000 00000 11111 00000 00000 00000",
    "+": "00000 00100 00100 11111 00100 00100 00000", "=": "00000 00000 11111 00000 11111 00000 00000",
    "/": "00000 00001 00010 00100 01000 10000 00000", "(": "00010 00100 01000 01000 01000 00100 00010",
    ")": "01000 00100 00010 00010 00010 00100 01000", "%": "11000 11001 00010 00100 01000 10011 00011",
    "?": "01110 10001 00001 00010 00100 00000 00100", "!": "00100 00100 00100 00100 00100 00000 00100",
    "'": "01100 00100 01000 00000 00000 00000 00000", "<": "00010 00100 01000 10000 01000 00100 00010",
    ">": "01000 00100 00010 00001 00010 00100 01000", "µ": "00000 00000 10001 10001 10011 11101 10000",
    "Ω": "01110 10001 10001 10001 01010 01010 11011", "°": "01100 10010 10010 01100 00000 00000 00000",
    "×": "00000 10001 01010 00100 01010 10001 00000", "~": "00000 00000 01000 10101 00010 00000 00000",
    "_": "00000 00000 00000 00000 00000 00000 11111", "*": "00000 00100 10101 01110 10101 00100 00000",
    "·": "00000 00000 00000 01100 01100 00000 00000", "→": "00000 00100 00010 11111 00010 00100 00000",
    "¿": "00100 00000 00100 01000 10000 10001 01110", "¡": "00100 00000 00100 00100 00100 00100 00100",
  };
  const FUENTE = {};
  for (const [c, s] of Object.entries(GLIFOS)) FUENTE[c] = s.split(" ").map((f) => parseInt(f, 2));
  // mayúsculas con tilde, Ñ y Ü: la letra entera y la marca en 2 filas por encima de la línea (texto() las sube)
  for (const [c, [base, marca]] of Object.entries({ "Á": ["A", "00010 00100"], "É": ["E", "00010 00100"], "Í": ["I", "00010 00100"],
    "Ó": ["O", "00010 00100"], "Ú": ["U", "00010 00100"], "Ü": ["U", "01010 00000"], "Ñ": ["N", "01101 10010"] }))
    FUENTE[c] = marca.split(" ").map((f) => parseInt(f, 2)).concat(FUENTE[base]);
  // minúsculas → mayúsculas con tilde (Á É Í Ó Ú Ñ Ü tienen glifo; otras marcas se quitan; µ y Ω se conservan)
  // minúsculas solo para unidades (mA, ms, kHz, Hz, pF, ns): el resto del texto va en mayúsculas
  Object.assign(FUENTE, Object.fromEntries(Object.entries({
    m: "00000 00000 11010 10101 10101 10001 10001", s: "00000 00000 01110 10000 01110 00001 11110",
    k: "10000 10000 10010 10100 11000 10100 10010", h: "10000 10000 10110 11001 10001 10001 10001", z: "00000 00000 11111 00010 00100 01000 11111",
    p: "00000 00000 11110 10001 11110 10000 10000", n: "00000 00000 10110 11001 10001 10001 10001",
  }).map(([c, g]) => [c, g.split(" ").map((f) => parseInt(f, 2))])));
  const UNIDAD = /^(p|n|µ|m|k)?(A|V|W|F|H|Hz|s|Ω)(·s)?$|^(Hz|ms|kHz|MHz|mA|mAh|Ah|Wh|mWh|mV|mW|mF|µF|µA|µs|kB|KB|MB|GB)$/;
  const normalizar = (s) => String(s).split(/(\s+)/).map((pal) => {
    // una palabra que es unidad (o número+unidad, ej. "100mA") conserva sus minúsculas
    const m = pal.match(/^([(~≈<>+-]?[\d.,]*)(.*?)([),.:]?)$/);
    const conserva = m && m[2] && UNIDAD.test(m[2]);
    return [...pal].map((c) => (c === "µ" || c === "Ω" || c === "·" || c === "°" || c === "×" || c === "→") ? c
      : conserva && FUENTE[c] ? c : FUENTE[c.toUpperCase()] ? c.toUpperCase() : c.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()).join("");
  }).join("");

  // bandas de resistor (código EIA) desde un valor como "1k", "330", "4.7k"
  const EIA = ["#141414", "#6e3b1f", "#d43a2a", "#ef7d23", "#f2d024", "#2ca95c", "#2c6fe8", "#8b4fc4", "#8a8a8a", "#f2f2f2"];
  function bandas(valor) {
    const m = /([\d.]+)\s*([kKmM])?/.exec(valor || "");
    if (!m) return null;
    const ohms = parseFloat(m[1]) * ({ k: 1e3, K: 1e3, M: 1e6 }[m[2]] || 1);
    if (!(ohms > 0)) return null;
    const exp = Math.floor(Math.log10(ohms)), d = Math.floor(ohms / Math.pow(10, exp - 1));
    return [Math.floor(d / 10), d % 10, exp - 1];
  }

  // ---------------------------------------------------------------- figura (3 capas + compositor)
  class Motor {
    constructor(cv, def) {
      this.cv = cv; this.def = def; this.estado = {}; this.t = 0; this.corriendo = true;
      this._lastT = {};
      // lienzo visible: resolución de 32-bit; capas offscreen transparentes
      this.capas = {};
      for (const L of [8, 16, 32]) {
        const c = document.createElement("canvas");
        c.width = CAPA_W[L]; c.height = Math.round((def.alto || 180) * CAPA_K[L]);
        this.capas[L] = { cv: c, g: c.getContext("2d"), k: CAPA_K[L], W: c.width, H: c.height };
      }
      this.cv.width = CAPA_W[32]; this.cv.height = this.capas[32].H;
      this.gPant = cv.getContext("2d");
      this.modo = "mixto";   // público y fijo: las escenas ya no necesitan ramas por modo
      this.cv.style.imageRendering = "auto";
    }
    // capa efectiva de algo cuya capa por defecto es `def` (tabla, salvo en/zona)
    _ef(def) { return this._exp > 0 ? this._capa : def; }
    // --- coordenadas en unidades (con zoom de lupa si hay)
    _X(v) { const m = this._map; return Math.round((m ? m.ox + v * m.s : v) * this._kcur); }
    _Y(v) { const m = this._map; return Math.round((m ? m.oy + v * m.s : v) * this._kcur); }
    _W(v) { const m = this._map; return v * (m ? m.s : 1) * this._kcur; }
    // --- color
    c(token) {
      if (!token) return COL.n6;
      if (token[0] === "#") return token;
      if (this._pass === 8) token = A_8BIT[token] || token;
      return COL[token] || token;
    }
    // mezcla entre dos tokens (solo 32-bit; en 8/16 cuantiza al más cercano)
    mezcla(a, b, t) {
      t = Math.max(0, Math.min(1, t));
      if (this._pass !== 32) return t < 0.5 ? a : b;
      const A = hexRgb(this.c(a)), B = hexRgb(this.c(b));
      return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
    }
    // --- primitivas (cada una dibuja solo en su pasada)
    limpiar(tok = "n0") {
      if (this._ef(8) !== this._pass) return;
      this.g.fillStyle = this.c(tok); this.g.fillRect(0, 0, this.W, this.H);
    }
    punto(x, y, tok, tam = 1) {
      if (this._ef(32) !== this._pass) return;
      this.g.fillStyle = this.c(tok); const s = Math.max(1, Math.round(tam * this._kcur));
      this.g.fillRect(this._X(x) - (s >> 1), this._Y(y) - (s >> 1), s, s);
    }
    rect(x, y, w, h, tok) {
      if (this._ef(8) !== this._pass) return;
      this.g.fillStyle = this.c(tok);
      this.g.fillRect(this._X(x), this._Y(y), Math.max(1, Math.round(this._W(w))), Math.max(1, Math.round(this._W(h))));
    }
    // línea pixel (Bresenham); punteada opcional
    linea(x0, y0, x1, y1, tok, { punteo = 0, grosor = 1 } = {}) {
      if (this._ef(8) !== this._pass) return;
      const g = this.g; g.fillStyle = this.c(tok);
      let a = this._X(x0), b = this._Y(y0); const c = this._X(x1), d = this._Y(y1);
      const dx = Math.abs(c - a), dy = -Math.abs(d - b), sx = a < c ? 1 : -1, sy = b < d ? 1 : -1;
      let e = dx + dy, n = 0; const gr = Math.max(1, Math.round(grosor * this._kcur));
      for (;;) {
        if (!punteo || Math.floor(n / punteo) % 2 === 0) g.fillRect(a - (gr >> 1), b - (gr >> 1), gr, gr);
        if (a === c && b === d) break;
        const e2 = 2 * e; if (e2 >= dy) { e += dy; a += sx; } if (e2 <= dx) { e += dx; b += sy; } n++;
      }
    }
    polilinea(pts, tok, op) { for (let i = 1; i < pts.length; i++) this.linea(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], tok, op); }
    marco(x, y, w, h, tok, op) { this.polilinea([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], tok, op); }
    // tramado 2x2 con significado (vacío, zona de interés…) — en 8-bit tablero grueso
    tramado(x, y, w, h, tok) {
      if (this._ef(8) !== this._pass) return;
      const g = this.g; g.fillStyle = this.c(tok);
      const X = this._X(x), Y = this._Y(y), W = Math.round(this._W(w)), H = Math.round(this._W(h)), p = this._pass === 8 ? 2 : 1;
      for (let j = 0; j < H; j += p) for (let i = ((j / p) % 2) * p; i < W; i += 2 * p) g.fillRect(X + i, Y + j, p, p);
    }
    circulo(cx, cy, r, tok, relleno = false) {
      if (this._ef(32) !== this._pass) return;
      const g = this.g; g.fillStyle = this.c(tok);
      const X = this._X(cx), Y = this._Y(cy), R = Math.max(1, Math.round(this._W(r)));
      for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
        const d = Math.sqrt(i * i + j * j);
        if (relleno ? d <= R + 0.3 : Math.abs(d - R) < 0.6) g.fillRect(X + i, Y + j, 1, 1);
      }
    }
    // caja de la lámina: relleno plano, borde, esquinas escalonadas (sin sombra: estética plana)
    caja(x, y, w, h, { estilo = "normal", titulo, sub } = {}) {
      this._def(16, () => {
        const [rel, bor, tt] = { activo: ["a1", "a3", "n6"], apagado: ["n1", "n2", "n4"], segundo: ["b1", "b3", "n6"],
          tercero: ["c1", "c3", "n6"], cuarto: ["d1", "d3", "n6"] }[estilo] || ["n1", "n3", "n6"];
        this.rect(x, y, w, h, rel);
        this.marco(x, y, w, h, bor);
        if (this._pass !== 32) { this.punto(x, y, "n0"); this.punto(x + w, y, "n0"); this.punto(x, y + h, "n0"); this.punto(x + w, y + h, "n0"); }
        if (titulo) this.texto(titulo, x + w / 2, y + (sub ? h / 2 - 7 : h / 2 - 3.5), tt, { alin: "centro" });
        if (sub) this.texto(sub, x + w / 2, y + h / 2 + 2, "n4", { alin: "centro" });
      });
    }
    // flecha simple (chevrón): asta + punta de 2 trazos; nítida hasta en 8-bit
    flecha(x0, y0, x1, y1, tok = "n4") {
      this._def(16, () => {
        const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
        const ux = dx / L, uy = dy / L, LC = 4, LA = 2.5; // largo y medio-ancho de la punta
        const bx = x1 - ux * Math.min(LC, L), by = y1 - uy * Math.min(LC, L);
        this.linea(x0, y0, bx, by, tok);
        this.linea(x1, y1, bx - uy * LA, by + ux * LA, tok);
        this.linea(x1, y1, bx + uy * LA, by - ux * LA, tok);
      });
    }
    // texto: SIEMPRE bitmap 5x7 (1 color, sin antialias). Por defecto en grilla de 16 (×2, 6 u/car, entra);
    // con grande: true va a la grilla de 8 (×4, 12 u/car, solo títulos).
    texto(s, x, y, tok = "n6", { alin = "izq", tam = 7, grande = false } = {}) {
      const L = grande ? 8 : this._exp > 0 ? this._capa : 16;
      if (L !== this._pass) return;
      const g = this.g, k = this._kcur;
      const txt = normalizar(s), esc = Math.max(1, Math.round((tam / 7) * k)), ancho = txt.length * 6 * esc - esc;
      let X = this._X(x) - (alin === "centro" ? ancho >> 1 : alin === "der" ? ancho : 0); const Y = this._Y(y);
      g.fillStyle = this.c(tok);
      for (const ch of txt) {
        const gl = FUENTE[ch];
        const sube = gl ? gl.length - 7 : 0;   // filas de tilde por encima de la línea
        if (gl) gl.forEach((fila, j) => { for (let i = 0; i < 5; i++) if (fila & (16 >> i)) g.fillRect(X + i * esc, Y + (j - sube) * esc, esc, esc); });
        X += 6 * esc;
      }
    }
    // brillo: no-op por estética plana (se mantiene la firma: las escenas lo llaman y dibujan igual)
    brillo(fn) { fn(); }

    // ------------------------------------------------------------ capas explícitas
    // todo lo que dibuja fn va a la capa bits
    en(bits, fn) {
      this._exp = (this._exp || 0) + 1;
      const prev = this._capa; this._capa = bits;
      try { fn(); } finally { this._capa = prev; this._exp--; }
    }
    // como en, pero solo si no hay capa explícita afuera (para los interiores de cada módulo)
    _def(bits, fn) { if (this._exp > 0) fn(); else this.en(bits, fn); }
    // como en, pero recortado al rectángulo (en unidades)
    zona({ x, y, w, h }, bits, fn) {
      this.en(bits, () => {
        const g = this.g, k = this._kcur;
        g.save(); g.beginPath(); g.rect(Math.round(x * k), Math.round(y * k), Math.round(w * k), Math.round(h * k)); g.clip();
        try { fn(); } finally { g.restore(); }
      });
    }
    // recuadro ampliado: vuelve a dibujar fn con la región `de` ocupando `a` (zoom uniforme),
    // con marco estilo lámina y guías desde la región original
    lupa({ de, a, bits = 32 }, fn) {
      const [dx, dy, dw, dh] = de, [ax, ay, aw, ah] = a;
      this._def(16, () => {
        this.marco(dx, dy, dw, dh, "n3", { punteo: 2 });
        this.marco(ax, ay, aw, ah, "n3");
        for (const [cx, cy, qx, qy] of [[dx, dy, ax, ay], [dx + dw, dy, ax + aw, ay], [dx, dy + dh, ax, ay + ah], [dx + dw, dy + dh, ax + aw, ay + ah]])
          this.linea(cx, cy, qx, qy, "n3");
      });
      const s = aw / dw, prev = this._map;                       // zoom uniforme (documentado)
      this._map = { ox: ax - dx * s, oy: ay - dy * s, s };
      try {
        this.en(bits, () => {
          const g = this.g, k = this._kcur;
          g.save(); g.beginPath(); g.rect(Math.round(ax * k), Math.round(ay * k), Math.round(aw * k), Math.round(ah * k)); g.clip();
          try { fn(); } finally { g.restore(); }
        });
      } finally { this._map = prev; }
    }

    // ------------------------------------------------------------ osciloscopio / gráfica
    // trazos: [{ f: (tiempo) => valor, tok, rotulo }]; ventana: segundos visibles; barrido: dibuja hasta t
    osciloscopio({ x, y, w, h, trazos, rango = [-1, 1], ventana = 1, t = this.t, divs = [8, 4], ejes = true, rotulos = true, desde = null }) {
      this._def(8, () => {
        this.rect(x, y, w, h, "n0"); this.marco(x, y, w, h, "n3");
        for (let i = 1; i < divs[0]; i++) this.linea(x + (w * i) / divs[0], y + 1, x + (w * i) / divs[0], y + h - 1, "n2", { punteo: 2 });
        for (let j = 1; j < divs[1]; j++) this.linea(x + 1, y + (h * j) / divs[1], x + w - 1, y + (h * j) / divs[1], "n2", { punteo: 2 });
        const [lo, hi] = rango, cero = y + h - ((0 - lo) / (hi - lo)) * h;
        if (ejes && lo < 0 && hi > 0) this.en(16, () => this.linea(x, cero, x + w, cero, "n3")); // ejes en 16
      });
      if (rotulos) trazos.forEach((tr, i) => { if (tr.rotulo) this.texto(tr.rotulo, x + 4, y + 4 + i * 10, tr.tok || "a3"); });
      const L = this._ef(32);
      this._def(32, () => {
        if (L !== this._pass) return;
        const [lo, hi] = rango;
        const t0 = desde === null ? t - ventana : desde;
        const pasos = Math.max(8, Math.round(this._W(w)));
        trazos.forEach((tr) => {
          const col = this.c(tr.tok || "a3");
          const dibujar = () => {
            if (L === 32 && !this._map) {
              // trazo nativo: antialias real en 32-bit
              const g = this.g, k = this._kcur;
              const X = (tt) => (x + ((tt - t0) / ventana) * w) * k, Y = (v) => (y + h - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * h) * k;
              g.strokeStyle = col; g.lineWidth = Math.max(1.5, k); g.lineJoin = "round"; g.beginPath();
              let primero = true;
              for (let i = 0; i <= pasos; i++) {
                const tt = t0 + (i / pasos) * ventana;
                if (desde !== null && tt > t) break;
                const px = X(tt), py = Y(tr.f(tt));
                if (primero) { g.moveTo(px, py); primero = false; } else g.lineTo(px, py);
              }
              g.stroke();
            } else {
              let prev = null;
              for (let i = 0; i <= pasos; i++) {
                const tt = t0 + (i / pasos) * ventana;
                if (desde !== null && tt > t) break;
                const v = tr.f(tt), py = y + h - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * h, px = x + (i / pasos) * w;
                if (prev) this.linea(prev[0], prev[1], px, py, tr.tok || "a3");
                prev = [px, py];
              }
            }
          };
          this.brillo(dibujar, tr.tok || "a3", 4);
        });
      });
    }

    // ------------------------------------------------------------ circuitos
    // componente entre dos puntos alineados (horizontal o vertical); cuerpo de 28 unidades centrado
    componente(tipo, a, b, { rotulo, valor, tok = "n5", encendido = 0 } = {}) {
      const [x0, y0] = a, [x1, y1] = b, L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
      const nx = -uy, ny = ux, cuerpo = Math.min(28, L - 4), m0 = (L - cuerpo) / 2;
      const P = (s, n = 0) => [x0 + ux * s + nx * n, y0 + uy * s + ny * n];
      const L2 = (s0, n0, s1, n1, tk = tok) => { const p = P(s0, n0), q = P(s1, n1); this.linea(p[0], p[1], q[0], q[1], tk); };
      const detalle = this._ef(16) === 32 && (tipo === "R" || tipo === "C" || tipo === "LED" || tipo === "LAMP");
      if (tipo === "cable") { this._def(16, () => L2(0, 0, L, 0, "n4")); return; }
      const s0 = m0, s1 = L - m0, sm = L / 2;
      this._def(16, () => {                                            // patas y cuerpo en 16 (o 32 con detalle)
        L2(0, 0, m0, 0, "n4"); L2(L - m0, 0, L, 0, "n4");
        if (detalle) return this._detalle(tipo, { P, L2, s0, s1, sm, ux, tok, valor, encendido });
        switch (tipo) {
          case "R": { const n = 6, d = cuerpo / n; let s = s0; L2(s, 0, s + d / 2, -4); for (let i = 0; i < n - 1; i++) { L2(s + d / 2 + i * d, (i % 2 ? 4 : -4), s + d / 2 + (i + 1) * d, (i % 2 ? -4 : 4)); } L2(s1 - d / 2, (n % 2 ? 4 : -4) * -1, s1, 0); break; }
          case "C": L2(s0, 0, sm - 2, 0, "n4"); L2(sm + 2, 0, s1, 0, "n4"); L2(sm - 2, -7, sm - 2, 7); L2(sm + 2, -7, sm + 2, 7); break;
          case "L": { const n = 4, d = cuerpo / n; for (let i = 0; i < n; i++) for (let k = 0; k <= 8; k++) { const a1 = Math.PI * k / 8, a2 = Math.PI * (k + 1) / 8; if (k < 8) L2(s0 + i * d + d / 2 - Math.cos(a1) * d / 2, -Math.sin(a1) * 5, s0 + i * d + d / 2 - Math.cos(a2) * d / 2, -Math.sin(a2) * 5); } break; }
          case "V": L2(s0, 0, sm - 2, 0, "n4"); L2(sm + 2, 0, s1, 0, "n4"); L2(sm - 2, -8, sm - 2, 8); L2(sm + 2, -4, sm + 2, 4); { const p = P(sm - 7, -9); this.texto("+", p[0] - 3, p[1] - 3, "n4"); } break;
          case "AC": { const c = P(sm, 0); L2(s0, 0, sm - 9, 0, "n4"); L2(sm + 9, 0, s1, 0, "n4"); this.circulo(c[0], c[1], 9, tok); let pa = null; for (let k = 0; k <= 10; k++) { const q = P(sm - 5 + k, -Math.sin((k / 10) * 2 * Math.PI) * 3); if (pa) this.linea(pa[0], pa[1], q[0], q[1], tok); pa = q; } break; }
          case "D": case "LED": {
            L2(s0, 0, sm - 5, 0, "n4"); L2(sm + 5, 0, s1, 0, "n4");
            for (let n = -6; n <= 6; n++) L2(sm - 5, n, sm + 5, 0, encendido > 0.5 ? "a3" : tok);
            L2(sm + 5, -6, sm + 5, 6);
            if (tipo === "LED") { const on = encendido > 0.05; const f = (d) => { const p = P(sm + d, -9), q = P(sm + d + 5, -15); this.flecha(p[0], p[1], q[0], q[1], on ? "a4" : "n3"); }; this.brillo(() => { f(-3); f(3); }, "a4", 8 * encendido); }
            break;
          }
          case "SW": { const ab = encendido > 0.5; L2(s0, 0, sm - 6, 0, "n4"); L2(sm + 6, 0, s1, 0, "n4"); this.punto(...P(sm - 6, 0), tok, 3); this.punto(...P(sm + 6, 0), tok, 3); L2(sm - 6, 0, sm + 6, ab ? 0 : -8); break; }
          case "LAMP": { const c = P(sm, 0); L2(s0, 0, sm - 8, 0, "n4"); L2(sm + 8, 0, s1, 0, "n4"); this.circulo(c[0], c[1], 8, encendido > 0.5 ? "a3" : tok); L2(sm - 5, -5, sm + 5, 5); L2(sm - 5, 5, sm + 5, -5); break; }
        }
      });
      if (rotulo || valor) {
        const p = P(sm, ux !== 0 ? -13 : 14);
        if (rotulo) this.texto(rotulo, p[0], p[1] - (valor ? 8 : 3), "n5", { alin: "centro" });
        if (valor) this.texto(valor, p[0], p[1] + 1, "n4", { alin: "centro" });
      }
    }
    // versión con detalle real (capa 32): mismo símbolo, más geometría plana (sin luces)
    // RR dibuja un rect en coords locales (s = a lo largo, n = a lo ancho): vale H y V
    _detalle(tipo, { P, L2, s0, s1, sm, ux, tok, valor, encendido }) {
      const RR = (s, n, w, h, tk) => {
        const p = P(s, n), W = Math.abs(ux) > 0 ? w : h, H = Math.abs(ux) > 0 ? h : w;
        this.rect(p[0] - W / 2, p[1] - H / 2, W, H, tk);
      };
      const borde = (s, n, w, h, tk) => {
        L2(s - w / 2, n - h / 2, s + w / 2, n - h / 2, tk); L2(s + w / 2, n - h / 2, s + w / 2, n + h / 2, tk);
        L2(s + w / 2, n + h / 2, s - w / 2, n + h / 2, tk); L2(s - w / 2, n + h / 2, s - w / 2, n - h / 2, tk);
      };
      switch (tipo) {
        case "R": { // cuerpo con bandas de color según el valor
          L2(s0, 0, sm - 13, 0, "n4"); L2(sm + 13, 0, s1, 0, "n4");
          RR(sm, 0, 26, 11, "a1");
          const bd = bandas(valor) || [1, 0, 2];
          bd.forEach((d, i) => RR(sm - 8 + i * 6, 0, 3, 11, EIA[d]));
          RR(sm + 10, 0, 2, 11, "#c9a227"); // tolerancia
          [-5, 1, 7].forEach((s) => RR(sm + s, 0, 1, 11, "n6")); // separadores: contraste entre bandas vecinas
          borde(sm, 0, 26, 11, "a3");
          break;
        }
        case "C": // placas con espesor
          L2(s0, 0, sm - 3, 0, "n4"); L2(sm + 3, 0, s1, 0, "n4");
          RR(sm - 3, 0, 3, 15, "n5");
          RR(sm + 3, 0, 3, 15, "n5");
          break;
        case "LED": { // cúpula plana
          L2(s0, 0, sm - 6, 0, "n4"); L2(sm + 6, 0, s1, 0, "n4");
          const c = P(sm, 0), on = encendido > 0.05;
          this.circulo(c[0], c[1], 7, on ? "a3" : "n3", true);
          L2(sm + 6, -6, sm + 6, 6);
          const f = (d) => { const p = P(sm + d, -11), q = P(sm + d + 5, -17); this.flecha(p[0], p[1], q[0], q[1], on ? "a4" : "n3"); };
          f(-3); f(3);
          break;
        }
        case "LAMP": { // filamento en vez de cruz
          const c = P(sm, 0);
          L2(s0, 0, sm - 8, 0, "n4"); L2(sm + 8, 0, s1, 0, "n4");
          this.circulo(c[0], c[1], 8, encendido > 0.5 ? "a3" : tok);
          this.polilinea([P(sm - 4, 4), P(sm - 2, -3), P(sm, 2), P(sm + 2, -3), P(sm + 4, 4)], encendido > 0.05 ? "a4" : tok);
          break;
        }
      }
    }
    // atajo: componente con detalle 32 repintado sobre su versión 16 (sin zona ni fondo: no borra nada)
    detalle(tipo, a, b, opc) { this.en(32, () => this.componente(tipo, a, b, opc)); }
    nodo(x, y, tok = "n5") { this._def(16, () => this.punto(x, y, tok, 3)); }
    tierra(x, y, tok = "n4") {
      this._def(16, () => {
        this.linea(x, y, x, y + 5, tok); this.linea(x - 7, y + 5, x + 7, y + 5, tok);
        this.linea(x - 4, y + 8, x + 4, y + 8, tok); this.linea(x - 1, y + 11, x + 1, y + 11, tok);
      });
    }
    // corriente animada por un camino: puntos que avanzan con velocidad ∝ I (sentido convencional)
    corriente(id, pts, I, { tok = "a4", sep = 10, escala = 40, ref = 1 } = {}) {
      this._def(32, () => {
        if (this._ef(32) !== this._pass) return;
        const st = this.estado[id] || (this.estado[id] = { fase: 0 });
        st.fase += I * escala * this.dt;
        const seg = [], tot = pts.slice(1).reduce((acc, p, i) => { const l = Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]); seg.push(l); return acc + l; }, 0);
        const brillo = Math.min(1, Math.abs(I) / ref);
        if (brillo < 0.02) return;
        const col = this._pass === 32 ? this.mezcla("n3", tok, brillo) : brillo > 0.4 ? tok : "a2";
        const desp = ((st.fase % sep) + sep) % sep;
        this.brillo(() => {
          for (let s = desp; s < tot; s += sep) {
            let r = s, i = 0; while (i < seg.length && r > seg[i]) { r -= seg[i]; i++; }
            if (i >= seg.length) break;
            const a = pts[i], b = pts[i + 1], f = r / seg[i];
            this.punto(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, col, this._pass === 8 ? 3 : 2);
          }
        }, tok, 5);
      });
    }

    // ------------------------------------------------------------ campo eléctrico
    // cargas: [{x, y, q}] (q en unidades arbitrarias, signo importa); flechas en una grilla
    campo({ x, y, w, h, cargas, paso = 20, tok = "n4" }) {
      // pasada 1: magnitudes para normalizar al máximo de la escena
      const pts = [];
      let max = 0;
      for (let gy = y + paso / 2; gy < y + h; gy += paso) for (let gx = x + paso / 2; gx < x + w; gx += paso) {
        let ex = 0, ey = 0, cerca = false;
        cargas.forEach((c) => { const dx = gx - c.x, dy = gy - c.y, r2 = dx * dx + dy * dy; if (r2 < 100) cerca = true; const r3 = Math.pow(r2, 1.5) || 1; ex += (c.q * dx) / r3; ey += (c.q * dy) / r3; });
        if (cerca) continue;
        const mag = Math.hypot(ex, ey);
        if (mag > max) max = mag;
        pts.push([gx, gy, ex, ey, mag]);
      }
      // pasada 2: flechas con intensidad 0..1 (fuerte entre cargas, débil lejos)
      this._def(16, () => {
        pts.forEach(([gx, gy, ex, ey, mag]) => {
          const n = max ? mag / max : 0, L = paso * 0.42;
          if (n < 0.05 || !mag) return;
          const ux = ex / mag, uy = ey / mag;
          const col = this._pass === 32 ? this.mezcla("n2", tok, n) : n > 0.6 ? tok : n > 0.25 ? "n3" : "n2";
          this.flecha(gx - ux * L / 2, gy - uy * L / 2, gx + ux * L / 2, gy + uy * L / 2, col);
        });
      });
      cargas.forEach((c) => {
        this.brillo(() => this.circulo(c.x, c.y, 7, c.q > 0 ? "a3" : "n5", true), "a3", c.q > 0 ? 10 : 0);
        this.texto(c.q > 0 ? "+" : "-", c.x, c.y - 3, "n0", { alin: "centro" });
      });
    }

    // ------------------------------------------------------------ pasadas y compositor
    pasar(L, tq, dt) {
      const c = this.capas[L];
      this._pass = L; this.g = c.g; this._kcur = c.k; this.W = c.W; this.H = c.H;
      this.dt = dt; this._capa = null; this._exp = 0; this._map = null;
      c.g.clearRect(0, 0, c.W, c.H);
      this.def.dibujar(this, tq, this.estado);
    }
    componer() {
      const g = this.gPant, W = this.cv.width, H = this.cv.height;
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, W, H);
      for (const L of [8, 16, 32]) g.drawImage(this.capas[L].cv, 0, 0, W, H);
    }
    avanzar(dt) {
      this.t += dt;
      let cambio = false;
      for (const L of [8, 16, 32]) {
        const tq = Math.floor(this.t * FPS[L]) / FPS[L];       // cada capa a su fps (saltos retro)
        if (tq !== this._lastT[L]) { this._lastT[L] = tq; this.pasar(L, tq, L === 32 ? dt : 0); cambio = true; }
      }
      if (cambio) this.componer();
    }
    redibujar() {
      this._lastT = {};
      for (const L of [8, 16, 32]) { const tq = Math.floor(this.t * FPS[L]) / FPS[L]; this._lastT[L] = tq; this.pasar(L, tq, 0); }
      this.componer();
    }
  }

  // ------------------------------------------------------------ señales y transitorios (poco código, nada de SPICE)
  // sen: fuentes periódicas de frecuencia f (Hz) y amplitud A. rc: carga/descarga de primer orden,
  // t = segundos desde que cerró la llave (t <= 0 vale 0), tau = R*C (o L/R).
  const SEN = {
    seno: (t, f, A = 1) => A * Math.sin(2 * Math.PI * f * t),
    cuadrada: (t, f, A = 1) => ((((t * f) % 1) + 1) % 1) < 0.5 ? A : -A,
    triangular: (t, f, A = 1) => { const p = (((t * f) % 1) + 1) % 1; return A * (p < 0.5 ? 4 * p - 1 : 3 - 4 * p); },
    pwm: (t, f, ciclo = 0.5, A = 1) => ((((t * f) % 1) + 1) % 1) < ciclo ? A : 0,
  };
  const RC = {
    vCarga: (t, V, tau) => (t <= 0 ? 0 : V * (1 - Math.exp(-t / tau))),
    iCarga: (t, V, R, tau) => (t <= 0 ? 0 : (V / R) * Math.exp(-t / tau)),
    vDescarga: (t, V0, tau) => (t <= 0 ? V0 : V0 * Math.exp(-t / tau)),
  };

  window.PixelMotor = {
    escena(nombre, def) { ESCENAS[nombre] = def; },
    sen: SEN, rc: RC,
  };

  // ---------------------------------------------------------------- registro y montaje
  const ESCENAS = {}, VIVOS = [];
  const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function montar(cv) {
    const def = ESCENAS[cv.dataset.motor];
    if (!def) { console.warn("PixelMotor: escena desconocida", cv.dataset.motor); return; }
    try { localStorage.removeItem("motor-bits:" + cv.dataset.motor); } catch {}   // resto de la versión con selector
    const m = new Motor(cv, def);
    m.visible = true; m.corriendo = !reducir;
    // barra: solo pausa/animar (accesibilidad)
    const barra = document.createElement("div");
    barra.className = "controles motor-barra";
    barra.innerHTML = `<button type="button">${m.corriendo ? "❚❚ pausa" : "▶ animar"}</button>`;
    cv.after(barra);
    barra.firstChild.addEventListener("click", (e) => { m.corriendo = !m.corriendo; e.target.textContent = m.corriendo ? "❚❚ pausa" : "▶ animar"; });
    new IntersectionObserver((es) => es.forEach((en) => (m.visible = en.isIntersecting))).observe(cv);
    cv.setAttribute("role", "img");
    if (def.descripcion && !cv.getAttribute("aria-label")) cv.setAttribute("aria-label", def.descripcion);
    if (reducir) m.t = def.tFijo || 1;
    m.redibujar();
    VIVOS.push(m);
  }

  let ultimo = performance.now();
  function bucle(ahora) {
    const dtReal = Math.min(0.1, (ahora - ultimo) / 1000);
    VIVOS.forEach((m) => { if (m.visible && m.corriendo) m.avanzar(dtReal); });
    ultimo = ahora;
    requestAnimationFrame(bucle);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try { await Promise.all([document.fonts.load('13px "Geist Mono"'), document.fonts.ready]); } catch {}
    leerColores();
    document.querySelectorAll("canvas[data-motor]").forEach(montar);
    document.addEventListener("tema", () => { leerColores(); VIVOS.forEach((m) => m.redibujar()); });
    requestAnimationFrame(bucle);
  });
})();
