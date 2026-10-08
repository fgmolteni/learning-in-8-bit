// Apuntes en bits — fondo ASCII del hero de la portada (<canvas data-ascii>)
// Tres escenas centradas que se turnan cada 12 s, con un fundido de bits (0 y 1) entre una y otra:
//   esp32: una ESP32-DevKitC en 3D que gira (un rayo por celda contra cajas alineadas, con sombras)
//   red:   red neuronal densa en 3D; en cada pasada hacia adelante la activación viaja capa por capa
//   uno:   una Arduino Uno en 3D que gira, con el ATmega328P en su zócalo y los LED L, TX y RX
// Cada pieza lleva uno de los cinco colores de la barra (naranja, azul, verde, magenta, ámbar), en tres
// niveles según la luz; las piezas sin color usan la rampa neutra.
//   bordes: (solo con data-escena, pie) caracteres sueltos y tenues contra los costados
// Con data-escena="esp32|red|uno|bordes" muestra solo esa escena; con data-fijo además dibuja un único cuadro, sin bucle
// ni pausa (data-t = instante en s, fija el ángulo). Es el modo del pie de la portada.
// Con data-fuente="ruta.mp4" (o .webm, .png, .jpg) convierte ese video o imagen a ASCII en vivo.
// En file:// el navegador no deja leer los píxeles de un video: ahí vuelve a las escenas.
(() => {
  const RAMPA = " .:-=+*#%@", DURA = 12, FUNDE = 1.2;   // s por escena, s de fundido
  const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

  // tintas: "n" neutra y los acentos de la barra; cada una aporta tres tonos (sombra, medio, luz)
  const TINTAS = ["n", "naranja", "azul", "verde", "magenta", "ambar"];
  const T = Object.fromEntries(TINTAS.map((h, i) => [h, i * 3]));   // primer tono de cada tinta
  // los hex viven solo en style.css: prueba cada [data-acento] y lee --a2..--a4 (sincrónico, sin repintar)
  function colores() {
    const html = document.documentElement, actual = html.dataset.acento;
    const v = (n) => getComputedStyle(html).getPropertyValue(n).trim();
    const out = [v("--n3"), v("--n4"), v("--n5")];
    for (const t of TINTAS.slice(1)) { html.dataset.acento = t; out.push(v("--a2"), v("--a3"), v("--a4")); }
    if (actual === undefined) delete html.dataset.acento; else html.dataset.acento = actual;
    return out;
  }

  // ---------------------------------------------------------------- geometría (cajas en mm)
  // caja: [x0, x1, y0, y1, z0, z1, material, tinta]; material = albedo 0..1 o "e" (LED: emite, va al tono más claro)
  const METAL = 0.92;

  // ESP32-DevKitC: x a lo largo, z a lo ancho, y hacia arriba
  function esp32(led) {
    const C = [
      [-27.2, 27.2, -0.8, 0.8, -14, 14, 0.34, "verde"],          // PCB 54,4 × 27,9 mm
      [3.7, 29.2, 0.8, 1.6, -9, 9, 0.42, "verde"],               // PCB del módulo WROOM (la antena sobresale)
      [4.6, 21.6, 1.6, 3.9, -8.6, 8.6, METAL, "n"],              // blindaje metálico
      [-28.2, -22.6, 0.8, 3.6, -3.9, 3.9, METAL, "n"],           // micro USB
      [-25.5, -21, 0.8, 2.3, -11, -6.8, 0.62, "n"],              // pulsador EN
      [-24.2, -22.3, 2.3, 3.3, -9.9, -7.9, 0.7, "magenta"],
      [-25.5, -21, 0.8, 2.3, 6.8, 11, 0.62, "n"],                // pulsador BOOT
      [-24.2, -22.3, 2.3, 3.3, 7.9, 9.9, 0.7, "azul"],
      [-16.5, -11.5, 0.8, 1.8, 0.5, 5.5, 0.16, "n"],             // puente USB-UART
      [-17, -10.5, 0.8, 2.4, -9.5, -6, 0.16, "n"],               // regulador 3,3 V
      [-12.5, -10, 0.8, 2.6, -9, -6.5, 0.7, "n"],                // su aleta
      [-19.5, -17.5, 0.8, 1.7, -5, -3.4, "e", "naranja"],        // LED de encendido
      [-6, -4, 0.8, 1.7, -5, -3.4, led ? "e" : 0.3, "azul"],     // LED de usuario (GPIO2)
    ];
    // pistas de cobre entre el puente USB, el regulador y el módulo
    for (const z of [-6, -4.6, -3.2, 3.6, 5, 6.4]) C.push([-9.5, 3.7, 0.8, 0.9, z - 0.25, z + 0.25, 0.62, "ambar"]);
    for (const x of [-8, -3, 1.5]) for (const [z0, z1] of [[-11.4, -7.5], [7.5, 11.4]]) C.push([x - 0.25, x + 0.25, 0.8, 0.9, z0, z1, 0.62, "ambar"]);
    // antena serpenteante del módulo
    for (let i = 0; i < 4; i++) C.push([22.6 + i * 1.6, 23.4 + i * 1.6, 1.6, 1.85, -7.5, 7.5, 0.85, "ambar"]);
    // dos tiras de 19 pines (paso 2,54 mm, filas a 25,4 mm)
    for (const z of [-12.7, 12.7]) {
      C.push([-24.1, 24.1, 0.8, 3.3, z - 1.27, z + 1.27, 0.14, "n"]);
      for (let i = 0; i < 19; i++) { const x = (i - 9) * 2.54; C.push([x - 0.4, x + 0.4, 3.3, 5, z - 0.4, z + 0.4, METAL, "ambar"]); }
    }
    return C;
  }
  const ESP32 = [esp32(false), esp32(true)];

  // Arduino Uno: 68,6 × 53,4 mm; USB-B y jack sobre el borde izquierdo
  function uno(led, tx) {
    const C = [
      [-34.3, 34.3, -0.8, 0.8, -26.7, 26.7, 0.3, "azul"],        // PCB
      [-40.3, -24.3, 0.8, 11.7, 6.7, 18.7, METAL, "n"],          // USB-B
      [-36.3, -22.3, 0.8, 11.8, -23.5, -14.5, 0.14, "n"],        // jack de alimentación
      [-4.5, 32, 0.8, 3.8, -21.3, -12.7, 0.2, "n"],              // zócalo DIP-28
      [-4, 31.6, 3.8, 7.3, -20.6, -13.4, 0.12, "n"],             // ATmega328P
      [-12, -1, 0.8, 4.3, -4.5, -0.5, METAL, "n"],               // cristal de 16 MHz
      [-20, -15, 0.8, 1.7, 6, 11, 0.16, "n"],                    // ATmega16U2 (USB)
      [-27, -21, 0.8, 4, 19, 25, 0.55, "n"],                     // pulsador RESET
      [-25.5, -22.5, 4, 5.5, 20.5, 23.5, 0.8, "naranja"],
      [-26, -19.5, 0.8, 2.4, -11, -7.5, 0.16, "n"],              // regulador 5 V
      [-21, -15.5, 0.8, 7.5, -25, -19.5, 0.6, "n"],              // electrolíticos
      [-14.5, -9, 0.8, 7.5, -25, -19.5, 0.6, "n"],
      [-2, -0.4, 0.8, 1.6, 14, 15.4, led ? "e" : 0.3, "ambar"],  // LED L (pin 13)
      [-2, -0.4, 0.8, 1.6, 11.4, 12.8, tx ? "e" : 0.3, "naranja"], // TX
      [-2, -0.4, 0.8, 1.6, 8.8, 10.2, tx ? 0.3 : "e", "naranja"],  // RX
      [24, 25.6, 0.8, 1.6, 10, 11.4, "e", "verde"],              // ON
      [28, 33, 0.8, 3.3, -3.9, 3.9, 0.14, "n"],                  // ICSP
    ];
    // patas del DIP-28, 14 por lado
    for (let i = 0; i < 14; i++) {
      const x = -2.5 + i * 2.54;
      C.push([x - 0.4, x + 0.4, 3, 5, -21.3, -20.6, METAL, "n"], [x - 0.4, x + 0.4, 3, 5, -13.4, -12.7, METAL, "n"]);
    }
    for (const x of [29.3, 31.8]) for (const z of [-2.54, 0, 2.54]) C.push([x - 0.4, x + 0.4, 3.3, 9, z - 0.4, z + 0.4, METAL, "ambar"]);
    // serigrafía blanca "UNO" (fuente de 4×5, celdas de 1,6 mm; la fila 0 queda hacia los headers digitales)
    const LETRAS = ["#..#.#..#.####", "#..#.##.#.#..#", "#..#.#.##.#..#", "#..#.#..#.#..#", "####.#..#.####"];
    LETRAS.forEach((fila, i) => [...fila].forEach((p, j) => {
      if (p === "#") C.push([3 + j * 1.6, 4.5 + j * 1.6, 0.8, 0.86, 6 - (i + 1) * 1.6, 6 - i * 1.6, 0.95, "n"]);
    }));
    // headers hembra: digitales arriba (10 + 8), alimentación y analógicos abajo (8 + 6), contactos dorados
    for (const [x0, n, z] of [[-13.5, 10, 24.5], [13.4, 8, 24.5], [-6.5, 8, -24.5], [17.5, 6, -24.5]]) {
      C.push([x0, x0 + n * 2.54, 0.8, 9.3, z - 1.3, z + 1.3, 0.12, "n"]);
      for (let i = 0; i < n; i++) { const x = x0 + (i + 0.5) * 2.54; C.push([x - 0.5, x + 0.5, 9.3, 9.45, z - 0.5, z + 0.5, METAL, "ambar"]); }
    }
    return C;
  }
  const UNO = [uno(false, false), uno(false, true), uno(true, false), uno(true, true)];

  // red neuronal densa: capas en columnas (x), una tinta por capa; los nodos alternan en z para que el giro
  // muestre profundidad
  const CAPAS = [4, 6, 6, 3], TINTA_CAPA = ["azul", "verde", "magenta", "naranja"], NODOS = [], ARISTAS = [];
  CAPAS.forEach((n, l) => { for (let q = 0; q < n; q++) NODOS.push({ l, q, p: [-21 + l * 14, (q - (n - 1) / 2) * 4.4, q % 2 ? 2.5 : -2.5] }); });
  NODOS.forEach((a) => NODOS.forEach((b) => { if (b.l === a.l + 1) ARISTAS.push({ a, b, w: hash(a.l * 10 + a.q, b.q) }); }));
  const PASO = 0.7;                                      // s que tarda la activación en cruzar de una capa a la siguiente

  // ---------------------------------------------------------------- trazado
  // cámara ortográfica: filas de M (objeto → vista) = Rx(pitch)·Ry(yaw); M^T lleva la vista al objeto
  const LV = [-0.45, 0.75, -0.5].map((x, _, v) => x / Math.hypot(...v));   // luz arriba a la izquierda, del lado de la cámara
  function camara(yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const ex = [cy, 0, sy], ey = [sp * sy, cp, -sp * cy], d = [-cp * sy, sp, cp * cy];
    const L = [0, 1, 2].map((i) => ex[i] * LV[0] + ey[i] * LV[1] + d[i] * LV[2]);
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
  function luz(g, i, l, tinta = "n") {
    g.car[i] = RAMPA[Math.min(RAMPA.length - 1, 1 + Math.floor(l * (RAMPA.length - 1)))];
    g.tono[i] = T[tinta] + (l < 0.3 ? 0 : l < 0.6 ? 1 : 2);
  }

  function montar(cv) {
    const hero = cv.parentElement, ctx = cv.getContext("2d");
    let col = colores(), cw = 7, ch = 12, fs = 10, W = 0, H = 0, A = grilla(0, 0), B = A, mascara = new Uint8Array(0), textoDer = 0;
    const fijo = cv.hasAttribute("data-fijo");
    let corriendo = !reducir && !fijo, visible = true, t = fijo ? +(cv.dataset.t || 7) : reducir ? 7 : 0, ultimo = 0, fuente = null, escena = -1;

    // un rayo ortográfico por celda contra las cajas
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
          if (m === "e") { g.car[i] = "@"; g.tono[i] = T[caja[7]] + 2; continue; }
          const s = -Math.sign(d[eje]);
          let nl = Math.max(0, s * L[eje]);
          if (nl > 0) {   // sombra: un segundo rayo desde el punto hacia la luz
            const p0 = o0 + mejor * d[0], p1 = o1 + mejor * d[1], p2 = o2 + mejor * d[2];
            for (const b of cajas) if (b !== caja && choca(b, p0, p1, p2, invL)) { nl = 0; break; }
          }
          let l = m * (0.2 + 0.8 * nl);
          if (m === METAL && nl > 0) l += 0.55 * Math.max(0, s * Hv[eje]) ** 24;
          luz(g, i, Math.min(1, l), caja[7]);
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

    // esfera sombreada de radio rad (mm); encendida se ve más clara
    function esfera(g, [x, y, z], rad, k, tinta, encendida) {
      const R = rad * k;
      for (let r = Math.max(0, Math.floor((y - R) / ch)); r <= Math.min(g.rows - 1, Math.floor((y + R) / ch)); r++) {
        for (let c = Math.max(0, Math.floor((x - R) / cw)); c <= Math.min(g.cols - 1, Math.floor((x + R) / cw)); c++) {
          const nx = ((c + 0.5) * cw - x) / R, ny = ((r + 0.5) * ch - y) / R, q = nx * nx + ny * ny;
          if (q > 1) continue;
          const nz = Math.sqrt(1 - q), i = r * g.cols + c, zz = z - nz * rad;
          if (zz > g.prof[i]) continue;
          g.prof[i] = zz;
          const l = 0.25 + 0.75 * Math.max(0, nx * LV[0] - ny * LV[1] - nz * LV[2]);
          luz(g, i, encendida ? 0.6 + 0.4 * l : 0.55 * l, tinta);
        }
      }
    }

    // tamaño y centro de las escenas 3D. tam = lo que mide la pieza (mm), radio = media anchura máxima en pantalla
    // al girar (mm). En escritorio va centrada si no toca el texto; si no, se corre a la derecha lo justo, sin
    // salirse del hero. En móvil va centrada detrás del texto (ahí la máscara la atenúa).
    function encuadre(tam, radio) {
      if (fijo) return { k: Math.min(W / (2 * radio), H * 1.3 / tam), px0: W / 2, py0: H / 2 };   // llena su recuadro
      const k = (W >= 760 ? Math.min(W * 0.5, H * 1.3) : Math.min(W * 0.95, H * 1.3)) / tam, R = radio * k;
      const px0 = W >= 760 ? Math.min(Math.max(W / 2, textoDer + 2 * cw + R), W - R) : W / 2;
      return { k, px0, py0: H / 2 };
    }

    function escenaEsp32(g, ts) {
      const { k, px0, py0 } = encuadre(58, 32.5);
      trazar(g, ESP32[+(Math.sin(ts * Math.PI * 1.6) > 0)], camara(ts * Math.PI * 2 / 26 + 0.6, -0.62 + 0.07 * Math.sin(ts * 0.4)), k, px0, py0);
    }

    function escenaUno(g, ts) {
      const { k, px0, py0 } = encuadre(90, 48.5);
      const led = Math.sin(ts * Math.PI) > 0, tx = Math.sin(ts * Math.PI * 5) > 0;
      trazar(g, UNO[2 * led + tx], camara(-ts * Math.PI * 2 / 28 - 0.5, -0.66 + 0.07 * Math.sin(ts * 0.4)), k, px0, py0);
    }

    function escenaRed(g, ts) {
      const { k, px0, py0 } = encuadre(48, 23), cam = camara(0.55 * Math.sin(ts * 0.3) - 0.15, -0.2);
      const P = proyectar(cam, k, px0, py0), tau = ts % (PASO * (CAPAS.length + 1));
      // solo las aristas de más peso, en la tinta de su capa de origen; el pulso viaja en el tono más claro
      for (const e of ARISTAS) {
        if (e.w < 0.45) continue;
        const A = P(e.a.p), B = P(e.b.p), f = (tau - e.a.l * PASO) / PASO, tc = T[TINTA_CAPA[e.a.l]];
        segmento(g, A, B, tc + (e.w > 0.8 ? 1 : 0));
        if (f >= 0 && f <= 1 && e.w > 0.6) {
          const en = (u) => [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u - 0.5];
          marca(g, ...en(f), "@", tc + 2);
          if (f > 0.06) marca(g, ...en(f - 0.06), "o", tc + 2);
        }
      }
      // nodos: se encienden cuando les llega la activación; al final queda la salida ganadora
      const ultima = CAPAS.length - 1;
      for (const n of NODOS) {
        const llega = tau >= n.l * PASO && tau < n.l * PASO + PASO * 1.2 && (n.l === 0 || hash(n.l, n.q) > 0.3);
        esfera(g, P(n.p), 2, k, TINTA_CAPA[n.l], n.l === ultima ? n.q === 1 && tau >= ultima * PASO : llega);
      }
    }

    // bordes: caracteres sueltos y tenues que se juntan contra los costados del recuadro y se desvanecen hacia
    // el centro (fondo del pie, quieto). Casi todos neutros; algunos, del tono oscuro de una tinta.
    function escenaBordes(g) {
      const banda = Math.max(80, W * 0.12), COLOR = ["azul", "magenta", "verde", "ambar", "naranja"];
      for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
        const x = (c + 0.5) * cw, e = 1 - Math.min(x, W - x) / banda;   // 1 contra el borde, 0 a una banda
        if (e <= 0 || hash(c, r * 7 + 1) > 0.22 * e * e) continue;
        const i = r * g.cols + c, k = hash(r * 3, c + 11);
        g.car[i] = ".:+-*/"[Math.floor(hash(c * 5, r) * 6)];
        g.tono[i] = k < 0.85 ? T.n : T[COLOR[Math.floor((k - 0.85) / 0.15 * 5)]];
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
      ["esp32", "placa ESP32-DevKitC", escenaEsp32],
      ["red", "red neuronal: una pasada hacia adelante", escenaRed],
      ["uno", "placa Arduino Uno", escenaUno],
      ["bordes", "", escenaBordes],
    ];
    const ROTAN = 3;   // las tres primeras se turnan en el hero; bordes solo se pide con data-escena
    const unica = ESCENAS.findIndex((x) => x[0] === cv.dataset.escena);   // -1: se turnan todas
    const pintar = (g, e, ts) => { limpiar(g); ESCENAS[e][2](g, ts); };

    function dibujar() {
      const e = unica >= 0 ? unica : Math.floor(t / DURA) % ROTAN, ts = unica >= 0 ? t : t % DURA;
      if (!(fuente && medio(A))) {
        pintar(A, e, ts);
        if (e !== escena) { escena = e; rotulo.textContent = ESCENAS[e][1]; }
        // fundido: cada celda pasa de la escena anterior a la nueva en su momento; en el borde, bits de colores
        if (unica < 0 && ts < FUNDE && t >= DURA) {
          pintar(B, (e + ROTAN - 1) % ROTAN, ts + DURA);
          const p = ts / FUNDE * 1.2;
          for (let i = 0; i < A.car.length; i++) {
            const h = hash(i, 7);
            if (h < p - 0.2 || (A.tono[i] < 0 && B.tono[i] < 0)) continue;
            if (h < p) { A.car[i] = hash(i, t * 9 | 0) < 0.5 ? "0" : "1"; A.tono[i] = 3 + 3 * Math.floor(hash(i, 3) * 5) + 2; }
            else { A.car[i] = B.car[i]; A.tono[i] = B.tono[i]; }
          }
        }
      }
      const dpr = devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
      ctx.textBaseline = "top";
      // una cadena por fila y por tono (solo los tonos que aparecen en la fila); bajo el texto, el tono más tenue
      const capas = col.map(() => new Array(A.cols)), usado = new Uint8Array(col.length);
      for (let r = 0; r < A.rows; r++) {
        usado.fill(0);
        for (let c = 0; c < A.cols; c++) {
          const i = r * A.cols + c;
          let tn = A.tono[i];
          if (tn < 0) continue;
          if (mascara[i]) tn -= tn % 3;
          if (!usado[tn]) { usado[tn] = 1; capas[tn].fill(" "); }
          capas[tn][c] = A.car[i];
        }
        capas.forEach((cap, n) => { if (usado[n]) { ctx.fillStyle = col[n]; ctx.fillText(cap.join(""), 0, r * ch); } });
      }
    }

    function medir() {
      const rc = hero.getBoundingClientRect(), dpr = devicePixelRatio || 1;
      W = rc.width; H = rc.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      fs = W < 640 ? 9 : 10;
      ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
      cw = ctx.measureText("M").width; ch = Math.round(fs * 1.2);
      const cols = Math.floor(W / cw), rows = Math.floor(H / ch);
      A = grilla(cols, rows); B = grilla(cols, rows);
      // renglones de texto (del hero o del pie): su borde derecho corre las escenas y sus celdas (con una de margen)
      // van a la máscara
      mascara = new Uint8Array(cols * rows); textoDer = 0;
      const rg = document.createRange();
      hero.querySelectorAll(".eyebrow, h1, h2, p, .pie-base span").forEach((el) => {
        rg.selectNodeContents(el);
        for (const b of rg.getClientRects()) {
          textoDer = Math.max(textoDer, b.right - rc.left);
          const c0 = Math.max(0, Math.floor((b.left - rc.left) / cw) - 1), c1 = Math.min(cols, Math.ceil((b.right - rc.left) / cw) + 1);
          const r0 = Math.max(0, Math.floor((b.top - rc.top) / ch)), r1 = Math.min(rows, Math.ceil((b.bottom - rc.top) / ch));
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
    if (!fijo) hero.append(pie);

    document.addEventListener("tema", () => { col = colores(); dibujar(); });
    new ResizeObserver(medir).observe(hero);
    document.fonts?.ready.then(medir);
    if (fijo) return;
    new IntersectionObserver((es) => (visible = es.at(-1).isIntersecting)).observe(hero);

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
