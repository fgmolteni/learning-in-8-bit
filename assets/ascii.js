// Apuntes en bits — fondo ASCII del hero de la portada (<canvas data-ascii>)
// Tres escenas que se turnan cada 12 s, con un fundido de bits (0 y 1) entre una y otra:
//   placa: una ESP32-DevKitC en 3D que gira (un rayo por celda contra cajas alineadas, con sombras)
//   red:   red neuronal densa en 3D; en cada pasada hacia adelante la activación viaja capa por capa
//   audio: espectro de un micrófono I2S en cascada; la línea nueva entra adelante y las viejas se alejan
// Debajo del texto del hero los caracteres se atenúan para que se lea.
// Con data-fuente="ruta.mp4" (o .webm, .png, .jpg) convierte ese video o imagen a ASCII en vivo.
// En file:// el navegador no deja leer los píxeles de un video: ahí vuelve a las escenas.
(() => {
  const RAMPA = " .:-=+*#%@", DURA = 12, FUNDE = 1.2;   // s por escena, s de fundido
  const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  // tono de cada celda: 0..2 tinta según el brillo, 3 acento, 4 segundo color, 5 tinta tenue; -1 = vacía
  function colores() {
    const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
    return [v("--n3"), v("--n4"), v("--n5"), v("--a3"), v("--b3"), v("--n2")];
  }

  // ---------------------------------------------------------------- geometría (cajas en mm)
  // caja: [x0, x1, y0, y1, z0, z1, material]; material = albedo 0..1, "a" acento o "b" segundo color (emiten)
  const METAL = 0.92;

  // placa ESP32-DevKitC: x a lo largo, z a lo ancho, y hacia arriba
  function placa(led) {
    const C = [
      [-27.2, 27.2, -0.8, 0.8, -14, 14, 0.34],          // PCB 54,4 × 27,9 mm
      [3.7, 29.2, 0.8, 1.6, -9, 9, 0.42],               // PCB del módulo WROOM (la antena sobresale)
      [4.6, 21.6, 1.6, 3.9, -8.6, 8.6, METAL],          // blindaje metálico
      [-28.2, -22.6, 0.8, 3.6, -3.9, 3.9, METAL],       // micro USB
      [-25.5, -21, 0.8, 2.3, -11, -6.8, 0.62],          // pulsador EN
      [-24.2, -22.3, 2.3, 3.3, -9.9, -7.9, 0.2],
      [-25.5, -21, 0.8, 2.3, 6.8, 11, 0.62],            // pulsador BOOT
      [-24.2, -22.3, 2.3, 3.3, 7.9, 9.9, 0.2],
      [-16.5, -11.5, 0.8, 1.8, 0.5, 5.5, 0.16],         // puente USB-UART
      [-17, -10.5, 0.8, 2.4, -9.5, -6, 0.16],           // regulador 3,3 V
      [-12.5, -10, 0.8, 2.6, -9, -6.5, 0.7],            // su aleta
      [-19.5, -17.5, 0.8, 1.7, -5, -3.4, "b"],          // LED de encendido
      [-6, -4, 0.8, 1.7, -5, -3.4, led ? "a" : 0.3],    // LED de usuario
    ];
    // pistas de cobre entre el puente USB, el regulador y el módulo
    for (const z of [-6, -4.6, -3.2, 3.6, 5, 6.4]) C.push([-9.5, 3.7, 0.8, 0.9, z - 0.25, z + 0.25, 0.62]);
    for (const x of [-8, -3, 1.5]) { C.push([x - 0.25, x + 0.25, 0.8, 0.9, -11.4, -7.5, 0.62]); C.push([x - 0.25, x + 0.25, 0.8, 0.9, 7.5, 11.4, 0.62]); }
    // antena serpenteante del módulo
    for (let i = 0; i < 4; i++) C.push([22.6 + i * 1.6, 23.4 + i * 1.6, 1.6, 1.85, -7.5, 7.5, 0.85]);
    // dos tiras de 19 pines (paso 2,54 mm, filas a 25,4 mm)
    for (const z of [-12.7, 12.7]) {
      C.push([-24.1, 24.1, 0.8, 3.3, z - 1.27, z + 1.27, 0.14]);
      for (let i = 0; i < 19; i++) { const x = (i - 9) * 2.54; C.push([x - 0.4, x + 0.4, 3.3, 5, z - 0.4, z + 0.4, METAL]); }
    }
    return C;
  }
  const PLACA = [placa(false), placa(true)];

  // red neuronal densa: capas en columnas (x); los nodos alternan en z para que el giro muestre profundidad
  const CAPAS = [4, 6, 6, 3], NODOS = [], ARISTAS = [];
  CAPAS.forEach((n, l) => { for (let q = 0; q < n; q++) NODOS.push({ l, q, p: [-21 + l * 14, (q - (n - 1) / 2) * 4.4, q % 2 ? 2.5 : -2.5] }); });
  NODOS.forEach((a) => NODOS.forEach((b) => { if (b.l === a.l + 1) ARISTAS.push({ a, b, w: hash(a.l * 10 + a.q, b.q) }); }));
  const PASO = 0.7;                                      // s que tarda la activación en cruzar de una capa a la siguiente

  // espectro de una nota: armónicos de f0 que decaen, sobre un piso de ruido (x = frecuencia 0..1)
  function espectro(n, x) {
    const nota = Math.floor(n / 21), k = n - nota * 21;          // nota nueva cada 21 líneas (3 s)
    const f0 = 0.05 + 0.05 * hash(nota), env = Math.exp(-k / 9) * (0.55 + 0.45 * hash(nota, 1));
    let a = 0.05 * hash(n, Math.floor(x * 90));
    for (let h = 1; h <= 7; h++) { const dx = (x - h * f0) / 0.011; a += env * Math.exp(-dx * dx) / h ** 0.6; }
    return Math.min(1, a);
  }

  // ---------------------------------------------------------------- trazado
  // cámara ortográfica: filas de M (objeto → vista) = Rx(pitch)·Ry(yaw); M^T lleva la vista al objeto
  function camara(yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const ex = [cy, 0, sy], ey = [sp * sy, cp, -sp * cy], d = [-cp * sy, sp, cp * cy];
    const lv = [-0.45, 0.75, -0.5], ln = Math.hypot(...lv);    // luz arriba a la izquierda, del lado de la cámara
    const L = [0, 1, 2].map((i) => (ex[i] * lv[0] + ey[i] * lv[1] + d[i] * lv[2]) / ln);
    const Hm = L.map((x, i) => x - d[i]), hn = Math.hypot(...Hm);
    return { ex, ey, d, L, Hv: Hm.map((x) => x / hn), inv: d.map((x) => 1 / x), invL: L.map((x) => 1 / x) };
  }

  // ¿el rayo o + t·dir (inv = 1/dir) cruza la caja b delante del origen? (método de las losas)
  function choca(b, o0, o1, o2, inv) {
    let t0 = (b[0] - o0) * inv[0], t1 = (b[1] - o0) * inv[0], tn = Math.min(t0, t1), tf = Math.max(t0, t1);
    t0 = (b[2] - o1) * inv[1]; t1 = (b[3] - o1) * inv[1]; tn = Math.max(tn, Math.min(t0, t1)); tf = Math.min(tf, Math.max(t0, t1));
    t0 = (b[4] - o2) * inv[2]; t1 = (b[5] - o2) * inv[2]; tn = Math.max(tn, Math.min(t0, t1)); tf = Math.min(tf, Math.max(t0, t1));
    return tn <= tf && tf > 1e-4;
  }

  function grilla(cols, rows) {
    const n = cols * rows;
    return { cols, rows, car: new Array(n).fill(" "), tono: new Int8Array(n).fill(-1), prof: new Float32Array(n) };
  }
  function limpiar(g) { g.car.fill(" "); g.tono.fill(-1); g.prof.fill(Infinity); }
  function luz(g, i, l) {
    g.car[i] = RAMPA[Math.min(RAMPA.length - 1, 1 + Math.floor(l * (RAMPA.length - 1)))];
    g.tono[i] = l < 0.3 ? 0 : l < 0.6 ? 1 : 2;
  }

  function montar(cv) {
    const hero = cv.parentElement, ctx = cv.getContext("2d");
    let col = colores(), cw = 7, ch = 12, fs = 10, W = 0, H = 0, A = grilla(0, 0), B = A, mascara = new Uint8Array(0);
    let corriendo = !reducir, visible = true, t = reducir ? 7 : 0, ultimo = 0, fuente = null, escena = -1;

    // un rayo ortográfico por celda contra las cajas; guarda la profundidad para las líneas
    function trazar(g, cajas, cam, k, px0, py0) {
      const { ex, ey, d, L, Hv, inv, invL } = cam;
      const lim = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
      for (const b of cajas) for (let a = 0; a < 6; a += 2) { lim[a] = Math.min(lim[a], b[a]); lim[a + 1] = Math.max(lim[a + 1], b[a + 1]); }
      for (let r = 0; r < g.rows; r++) {
        const v = -((r + 0.5) * ch - py0) / k;
        for (let c = 0; c < g.cols; c++) {
          const u = ((c + 0.5) * cw - px0) / k;
          const o0 = u * ex[0] + v * ey[0] - 60 * d[0], o1 = u * ex[1] + v * ey[1] - 60 * d[1], o2 = u * ex[2] + v * ey[2] - 60 * d[2];
          if (!choca(lim, o0, o1, o2, inv)) continue;
          let mejor = Infinity, eje = 0, caja = null;
          for (const b of cajas) {
            let t0 = (b[0] - o0) * inv[0], t1 = (b[1] - o0) * inv[0];
            let tn = Math.min(t0, t1), tf = Math.max(t0, t1), e = 0;
            t0 = (b[2] - o1) * inv[1]; t1 = (b[3] - o1) * inv[1];
            let a = Math.min(t0, t1); if (a > tn) { tn = a; e = 1; } tf = Math.min(tf, Math.max(t0, t1));
            t0 = (b[4] - o2) * inv[2]; t1 = (b[5] - o2) * inv[2];
            a = Math.min(t0, t1); if (a > tn) { tn = a; e = 2; } tf = Math.min(tf, Math.max(t0, t1));
            if (tn <= tf && tn > 0 && tn < mejor) { mejor = tn; eje = e; caja = b; }
          }
          if (!caja) continue;
          const i = r * g.cols + c, m = caja[6];
          g.prof[i] = mejor;
          if (m === "a" || m === "b") { g.car[i] = "@"; g.tono[i] = m === "a" ? 3 : 4; continue; }
          const s = -Math.sign(d[eje]);
          let nl = Math.max(0, s * L[eje]);
          if (nl > 0) {   // sombra: un segundo rayo desde el punto hacia la luz
            const p0 = o0 + mejor * d[0], p1 = o1 + mejor * d[1], p2 = o2 + mejor * d[2];
            for (const b of cajas) if (b !== caja && choca(b, p0, p1, p2, invL)) { nl = 0; break; }
          }
          let l = m * (0.2 + 0.8 * nl);
          if (m === METAL && nl > 0) l += 0.55 * Math.max(0, s * Hv[eje]) ** 24;
          luz(g, i, Math.min(1, l));
        }
      }
    }

    // proyección de un punto 3D a pantalla: [x px, y px, profundidad en mm]
    const proyectar = (cam, k, px0, py0) => (p) => [px0 + k * (p[0] * cam.ex[0] + p[1] * cam.ex[1] + p[2] * cam.ex[2]),
      py0 - k * (p[0] * cam.ey[0] + p[1] * cam.ey[1] + p[2] * cam.ey[2]), 60 + p[0] * cam.d[0] + p[1] * cam.d[1] + p[2] * cam.d[2]];

    // marca una celda si queda delante de lo que ya hay
    function marca(g, x, y, z, car, tono) {
      const c = Math.floor(x / cw), r = Math.floor(y / ch);
      if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return;
      const i = r * g.cols + c;
      if (z <= g.prof[i]) { g.prof[i] = z; g.car[i] = car; g.tono[i] = tono; }
    }

    // segmento con su carácter según la pendiente en pantalla
    function segmento(g, [x0, y0, z0], [x1, y1, z1], tono) {
      const dx = x1 - x0, dy = y1 - y0;
      const car = Math.abs(dy) < Math.abs(dx) * 0.4 ? "-" : Math.abs(dx) < Math.abs(dy) * 0.4 ? "|" : dx * dy > 0 ? "\\" : "/";
      const n = Math.ceil(Math.max(Math.abs(dx) / cw, Math.abs(dy) / ch) * 2) + 1;
      for (let j = 0; j <= n; j++) { const f = j / n; marca(g, x0 + dx * f, y0 + dy * f, z0 + (z1 - z0) * f, car, tono); }
    }

    // esfera sombreada de radio rad (mm); encendida va en acento
    const LV = [-0.45, 0.75, -0.5].map((x, _, v) => x / Math.hypot(...v));
    function esfera(g, [x, y, z], rad, k, encendida) {
      const R = rad * k;
      for (let r = Math.max(0, Math.floor((y - R) / ch)); r <= Math.min(g.rows - 1, Math.floor((y + R) / ch)); r++) {
        for (let c = Math.max(0, Math.floor((x - R) / cw)); c <= Math.min(g.cols - 1, Math.floor((x + R) / cw)); c++) {
          const nx = ((c + 0.5) * cw - x) / R, ny = ((r + 0.5) * ch - y) / R, q = nx * nx + ny * ny;
          if (q > 1) continue;
          const nz = Math.sqrt(1 - q), i = r * g.cols + c, zz = z - nz * rad;
          if (zz > g.prof[i]) continue;
          g.prof[i] = zz;
          const l = 0.25 + 0.75 * Math.max(0, nx * LV[0] - ny * LV[1] - nz * LV[2]);
          luz(g, i, l);
          if (encendida) g.tono[i] = 3;
        }
      }
    }

    // tamaño y centro de las escenas 3D, medidos sobre la columna del texto (el hero ocupa todo el ancho):
    // detrás del título en escritorio, centradas en móvil
    let col0 = 0, colW = 0;
    function encuadre(tam, cx) {
      const ancho = W >= 760;
      return { k: (ancho ? Math.min(colW * 0.5, H * 1.3) : Math.min(W * 0.95, H * 1.3)) / tam, px0: ancho ? col0 + colW * cx : W / 2, py0: H * 0.5 };
    }

    function escenaPlaca(g, ts) {
      const { k, px0, py0 } = encuadre(58, 0.46);
      trazar(g, PLACA[+(Math.sin(ts * Math.PI * 1.6) > 0)], camara(ts * Math.PI * 2 / 26 + 0.6, -0.62 + 0.07 * Math.sin(ts * 0.4)), k, px0, py0);
    }

    function escenaRed(g, ts) {
      const { k, px0, py0 } = encuadre(48, 0.56), cam = camara(0.55 * Math.sin(ts * 0.3) - 0.15, -0.2);
      const P = proyectar(cam, k, px0, py0), tau = ts % (PASO * (CAPAS.length + 1));
      // solo las aristas de más peso, en tinta tenue (las más fuertes, un tono más); el pulso viaja en acento
      for (const e of ARISTAS) {
        if (e.w < 0.45) continue;
        const A = P(e.a.p), B = P(e.b.p), f = (tau - e.a.l * PASO) / PASO;
        segmento(g, A, B, e.w > 0.8 ? 1 : 0);
        if (f >= 0 && f <= 1 && e.w > 0.6) {
          const en = (u) => [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u - 0.5];
          marca(g, ...en(f), "@", 3);
          if (f > 0.06) marca(g, ...en(f - 0.06), "o", 3);
        }
      }
      // nodos: se encienden cuando les llega la activación; al final queda la salida ganadora
      const ultima = CAPAS.length - 1;
      for (const n of NODOS) {
        const llega = tau >= n.l * PASO && tau < n.l * PASO + PASO * 1.2 && (n.l === 0 || hash(n.l, n.q) > 0.3);
        esfera(g, P(n.p), 2, k, n.l === ultima ? n.q === 1 && tau >= ultima * PASO : llega);
      }
    }

    // cascada de espectros, de adelante hacia atrás: cada línea solo se ve por encima del horizonte de las de adelante
    function escenaAudio(g, ts) {
      const N = 28, f = ts * 7 + 400, base = Math.floor(f), frac = f - base;
      const hor = new Float32Array(g.cols).fill(g.rows), Y = new Float32Array(g.cols);
      for (let i = 0; i < N; i++) {
        const q = (i + frac) / N, n = base - i;              // q: 0 adelante … 1 atrás
        const yb = g.rows * (0.97 - 0.66 * q), amp = g.rows * 0.42 * (1 - 0.45 * q);
        const mitad = g.cols * 0.49 * (1 - 0.3 * q), c0 = Math.round(g.cols / 2 - mitad), c1 = Math.round(g.cols / 2 + mitad);
        const tono = i === 0 ? 3 : q < 0.3 ? 2 : q < 0.65 ? 1 : 0;
        Y.fill(NaN);
        for (let c = Math.max(0, c0); c <= Math.min(g.cols - 1, c1); c++) Y[c] = yb - amp * espectro(n, (c - c0) / (c1 - c0));
        const yy = (j, y) => (j >= 0 && j < g.cols && Y[j] === Y[j] ? Y[j] : y);
        const nuevo = hor.slice();
        for (let c = 0; c < g.cols; c++) {
          const y = Y[c];
          if (y !== y) continue;
          const r = Math.round(y), rp = Math.round(yy(c - 1, y)), m = (yy(c + 1, y) - yy(c - 1, y)) / 2 * ch / cw;
          const car = Math.abs(m) < 0.3 ? "_" : Math.abs(m) > 2.2 ? "|" : m < 0 ? "/" : "\\";
          const pon = (rr, cc) => { if (rr >= 0 && rr < hor[c]) { const i = rr * g.cols + c; g.car[i] = cc; g.tono[i] = tono; } };
          pon(r, car);
          for (let rr = Math.min(r, rp) + 1; rr < Math.max(r, rp); rr++) pon(rr, "|");
          nuevo[c] = Math.min(nuevo[c], rp < r - 1 ? rp + 1 : r);
        }
        hor.set(nuevo);
      }
    }

    // video o imagen: cada celda toma el brillo medio de su porción del cuadro (cubre todo el hero)
    const muestra = document.createElement("canvas"), mctx = muestra.getContext("2d", { willReadFrequently: true });
    function medio(g) {
      const el = fuente, vw = el.videoWidth || el.naturalWidth, vh = el.videoHeight || el.naturalHeight;
      if (!vw) return false;
      muestra.width = g.cols; muestra.height = g.rows;
      const s = Math.max(W / vw, H / vh), dw = vw * s / cw, dh = vh * s / ch;
      mctx.drawImage(el, (g.cols - dw) / 2, (g.rows - dh) / 2, dw, dh);
      let px;
      try { px = mctx.getImageData(0, 0, g.cols, g.rows).data; }
      catch { console.warn("ascii: no se pueden leer los píxeles de", el.src, "(¿file://?); uso las escenas"); fuente = null; return false; }
      limpiar(g);
      for (let i = 0; i < g.cols * g.rows; i++) {
        const l = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
        if (l >= 0.06) luz(g, i, l);
      }
      return true;
    }

    const ESCENAS = [
      ["placa ESP32-DevKitC", escenaPlaca],
      ["red neuronal: una pasada hacia adelante", escenaRed],
      ["espectro de un micrófono I2S", escenaAudio],
    ];
    const pintar = (g, e, ts) => { limpiar(g); ESCENAS[e][1](g, ts); };

    function dibujar() {
      const e = Math.floor(t / DURA) % ESCENAS.length, ts = t % DURA;
      if (!(fuente && medio(A))) {
        pintar(A, e, ts);
        if (e !== escena) { escena = e; rotulo.textContent = ESCENAS[e][0]; }
        // fundido: cada celda pasa de la escena anterior a la nueva en su momento; en el borde, bits
        if (ts < FUNDE && t >= DURA) {
          pintar(B, (e + ESCENAS.length - 1) % ESCENAS.length, ts + DURA);
          const p = ts / FUNDE * 1.2;
          for (let i = 0; i < A.car.length; i++) {
            const h = hash(i, 7);
            if (h < p - 0.2 || (A.tono[i] < 0 && B.tono[i] < 0)) continue;
            if (h < p) { A.car[i] = hash(i, t * 9 | 0) < 0.5 ? "0" : "1"; A.tono[i] = 3; }
            else { A.car[i] = B.car[i]; A.tono[i] = B.tono[i]; }
          }
        }
      }
      const dpr = devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
      ctx.textBaseline = "top";
      // una cadena por fila y por tono; debajo del texto la tinta baja a los tonos tenues
      const capas = col.map(() => new Array(A.cols));
      for (let r = 0; r < A.rows; r++) {
        capas.forEach((cap) => cap.fill(" "));
        for (let c = 0; c < A.cols; c++) {
          const i = r * A.cols + c;
          let tn = A.tono[i];
          if (tn < 0) continue;
          if (mascara[i] && tn < 3) tn = tn === 2 ? 0 : 5;
          capas[tn][c] = A.car[i];
        }
        capas.forEach((cap, n) => { ctx.fillStyle = col[n]; ctx.fillText(cap.join(""), 0, r * ch); });
      }
    }

    function medir() {
      const rc = hero.getBoundingClientRect(), dpr = devicePixelRatio || 1;
      W = rc.width; H = rc.height;
      const est = getComputedStyle(hero);
      col0 = parseFloat(est.paddingLeft); colW = W - col0 - parseFloat(est.paddingRight);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      fs = W < 640 ? 9 : 10;
      ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
      cw = ctx.measureText("M").width; ch = Math.round(fs * 1.2);
      const cols = Math.floor(W / cw), rows = Math.floor(H / ch);
      A = grilla(cols, rows); B = grilla(cols, rows);
      // máscara: celdas que caen debajo de cada renglón de texto del hero (con una celda de margen)
      mascara = new Uint8Array(cols * rows);
      const rg = document.createRange();
      hero.querySelectorAll(".eyebrow, h1, p").forEach((el) => {
        rg.selectNodeContents(el);
        for (const b of rg.getClientRects()) {
          const c0 = Math.max(0, Math.floor((b.left - rc.left) / cw) - 1), c1 = Math.min(cols - 1, Math.ceil((b.right - rc.left) / cw) + 1);
          const r0 = Math.max(0, Math.floor((b.top - rc.top) / ch)), r1 = Math.min(rows - 1, Math.ceil((b.bottom - rc.top) / ch));
          for (let r = r0; r < r1; r++) mascara.fill(1, r * cols + c0, r * cols + c1);
        }
      });
      dibujar();
    }

    // ---- fuente externa opcional ----
    const src = cv.dataset.fuente;
    if (src) {
      const video = /\.(mp4|webm|ogv|mov)$/i.test(src);
      fuente = video ? Object.assign(document.createElement("video"), { muted: true, loop: true, playsInline: true, src })
                     : Object.assign(new Image(), { src });
      if (video) fuente.addEventListener("loadeddata", () => corriendo && fuente.play());
      else fuente.onload = () => dibujar();
    }

    // ---- pie: nombre de la escena y pausa (accesibilidad) ----
    const pie = document.createElement("div"), rotulo = document.createElement("span"), btn = document.createElement("button");
    pie.className = "ascii-pie"; btn.type = "button";
    const estado = () => { btn.textContent = corriendo ? "❚❚ pausa" : "▶ animar"; };
    estado();
    btn.onclick = () => {
      corriendo = !corriendo; estado();
      if (fuente?.play) corriendo ? fuente.play() : fuente.pause();
    };
    pie.append(rotulo, btn);
    hero.append(pie);

    new IntersectionObserver((es) => (visible = es.at(-1).isIntersecting)).observe(hero);
    document.addEventListener("tema", () => { col = colores(); dibujar(); });
    new ResizeObserver(medir).observe(hero);
    document.fonts?.ready.then(medir);

    let cuadro = 0;
    function bucle(ahora) {
      const dt = Math.min(0.1, (ahora - (ultimo || ahora)) / 1000);
      ultimo = ahora;
      if (corriendo && visible) { t += dt; if (!(cuadro = (cuadro + 1) % 4)) dibujar(); }  // ~15 cuadros/s
      requestAnimationFrame(bucle);
    }
    requestAnimationFrame(bucle);
  }

  document.addEventListener("DOMContentLoaded", () => document.querySelectorAll("canvas[data-ascii]").forEach(montar));
})();
