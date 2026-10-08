// Apuntes en bits — fondo ASCII del hero de la portada (<canvas data-ascii>)
// Sin data-fuente: una placa ESP32-DevKitC en 3D gira como en un plato; cada celda del texto
// lanza un rayo contra la placa (cajas alineadas, en mm) y su brillo elige el carácter.
// Con data-fuente="ruta.mp4" (o .webm, .png, .jpg): convierte ese video o imagen a ASCII en vivo.
// En file:// el navegador no deja leer los píxeles de un video: ahí vuelve a la placa.
(() => {
  const RAMPA = " .:-=+*#%@";
  const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- la placa: [x0, x1, y0, y1, z0, z1, material]; x a lo largo, z a lo ancho, y hacia arriba ----
  // material: albedo (0..1), "a" = LED de acento (parpadea), "b" = LED de encendido (segundo color)
  const METAL = 0.92, CAJAS = [
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
    [-6, -4, 0.8, 1.7, -5, -3.4, "a"],                // LED de usuario
  ];
  // pistas de cobre entre el puente USB, el regulador y el módulo
  for (const z of [-6, -4.6, -3.2, 3.6, 5, 6.4]) CAJAS.push([-9.5, 3.7, 0.8, 0.9, z - 0.25, z + 0.25, 0.62]);
  for (const x of [-8, -3, 1.5]) for (const s of [-1, 1]) CAJAS.push([x - 0.25, x + 0.25, 0.8, 0.9, Math.min(s * 7.5, s * 11.4), Math.max(s * 7.5, s * 11.4), 0.62]);
  // antena serpenteante del módulo
  for (let i = 0; i < 4; i++) CAJAS.push([22.6 + i * 1.6, 23.4 + i * 1.6, 1.6, 1.85, -7.5, 7.5, 0.85]);
  // dos tiras de 19 pines (paso 2,54 mm, filas a 25,4 mm)
  for (const z of [-12.7, 12.7]) {
    CAJAS.push([-24.1, 24.1, 0.8, 3.3, z - 1.27, z + 1.27, 0.14]);
    for (let i = 0; i < 19; i++) {
      const x = (i - 9) * 2.54;
      CAJAS.push([x - 0.4, x + 0.4, 3.3, 5, z - 0.4, z + 0.4, METAL]);
    }
  }
  const LIM = [-29.3, 29.3, -0.9, 5.1, -14.1, 14.1];  // caja que envuelve todo: descarta rayos rápido

  function colores() {
    const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
    return [v("--n3"), v("--n4"), v("--n5"), v("--a3"), v("--b3")];
  }

  function montar(cv) {
    const hero = cv.parentElement, ctx = cv.getContext("2d");
    let col = colores(), cw = 7, ch = 14, cols = 0, rows = 0, fs = 12, W = 0, H = 0;
    let corriendo = !reducir, visible = true, t = reducir ? 7 : 0, ultimo = 0, fuente = null;

    // ---- la placa: rayo ortográfico por celda contra cada caja (método de las losas) ----
    function placa(sombra) {
      const yaw = t * Math.PI * 2 / 26, pitch = -0.62 + 0.07 * Math.sin(t * 0.4);
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      // filas de M (objeto → vista) = Rx(pitch)·Ry(yaw); M^T lleva la vista al objeto
      const ex = [cy, 0, sy], ey = [sp * sy, cp, -sp * cy], d = [-cp * sy, sp, cp * cy];
      const lv = [-0.45, 0.75, -0.5], ln = Math.hypot(...lv);   // luz arriba a la izquierda, del lado de la cámara
      const L = [0, 1, 2].map((i) => (ex[i] * lv[0] + ey[i] * lv[1] + d[i] * lv[2]) / ln);
      const Hm = [L[0] - d[0], L[1] - d[1], L[2] - d[2]], hn = Math.hypot(...Hm);
      const Hv = Hm.map((x) => x / hn), inv = d.map((x) => 1 / x), invL = L.map((x) => 1 / x);
      const ancho = W >= 760;
      const k = ancho ? Math.min(W * 0.44, H * 1.2) / 58 : W * 0.9 / 58;   // px por mm
      const px0 = ancho ? W * 0.74 : W / 2, py0 = ancho ? H * 0.5 : H - W * 0.36;
      const led = Math.sin(t * Math.PI * 1.6) > 0;

      for (let r = 0; r < rows; r++) {
        const v = -((r + 0.5) * ch - py0) / k, fila = sombra[r];
        for (let c = 0; c < cols; c++) {
          const u = ((c + 0.5) * cw - px0) / k;
          const o0 = u * ex[0] + v * ey[0] - 60 * d[0], o1 = u * ex[1] + v * ey[1] - 60 * d[1], o2 = u * ex[2] + v * ey[2] - 60 * d[2];
          fila[c] = -1;
          if (!choca(LIM, o0, o1, o2, inv)) continue;
          let mejor = Infinity, eje = 0, caja = null;
          for (const b of CAJAS) {
            let t0 = (b[0] - o0) * inv[0], t1 = (b[1] - o0) * inv[0];
            let tn = Math.min(t0, t1), tf = Math.max(t0, t1), e = 0;
            t0 = (b[2] - o1) * inv[1]; t1 = (b[3] - o1) * inv[1];
            let a = Math.min(t0, t1); if (a > tn) { tn = a; e = 1; } tf = Math.min(tf, Math.max(t0, t1));
            t0 = (b[4] - o2) * inv[2]; t1 = (b[5] - o2) * inv[2];
            a = Math.min(t0, t1); if (a > tn) { tn = a; e = 2; } tf = Math.min(tf, Math.max(t0, t1));
            if (tn <= tf && tn > 0 && tn < mejor) { mejor = tn; eje = e; caja = b; }
          }
          if (!caja) continue;
          const m = caja[6];
          if (m === "a") { fila[c] = led ? 13 : 0.3; continue; }
          if (m === "b") { fila[c] = 14; continue; }
          const s = -Math.sign(d[eje]);
          let nl = Math.max(0, s * L[eje]);
          if (nl > 0) {   // sombra: un segundo rayo desde el punto hacia la luz
            const p0 = o0 + mejor * d[0], p1 = o1 + mejor * d[1], p2 = o2 + mejor * d[2];
            for (const b of CAJAS) if (b !== caja && choca(b, p0, p1, p2, invL)) { nl = 0; break; }
          }
          let l = m * (0.2 + 0.8 * nl);
          if (m === METAL && nl > 0) l += 0.55 * Math.max(0, s * Hv[eje]) ** 24;
          fila[c] = Math.min(1, l);
        }
      }
    }

    function choca(b, o0, o1, o2, inv) {
      let t0 = (b[0] - o0) * inv[0], t1 = (b[1] - o0) * inv[0], tn = Math.min(t0, t1), tf = Math.max(t0, t1);
      t0 = (b[2] - o1) * inv[1]; t1 = (b[3] - o1) * inv[1]; tn = Math.max(tn, Math.min(t0, t1)); tf = Math.min(tf, Math.max(t0, t1));
      t0 = (b[4] - o2) * inv[2]; t1 = (b[5] - o2) * inv[2]; tn = Math.max(tn, Math.min(t0, t1)); tf = Math.min(tf, Math.max(t0, t1));
      return tn <= tf && tf > 1e-4;   // tf > 0: la caja está delante del origen (sirve para la sombra)
    }

    // ---- video o imagen: cada celda toma el brillo medio de su porción del cuadro ----
    const muestra = document.createElement("canvas"), mctx = muestra.getContext("2d", { willReadFrequently: true });
    function medio(sombra) {
      const el = fuente, vw = el.videoWidth || el.naturalWidth, vh = el.videoHeight || el.naturalHeight;
      if (!vw) return false;
      muestra.width = cols; muestra.height = rows;
      const s = Math.max(W / vw, H / vh), dw = vw * s / cw, dh = vh * s / ch;
      mctx.drawImage(el, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
      let px;
      try { px = mctx.getImageData(0, 0, cols, rows).data; }
      catch { console.warn("ascii: no se pueden leer los píxeles de", el.src, "(¿file://?); uso la placa"); fuente = null; return false; }
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 4, l = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
        sombra[r][c] = l < 0.06 ? -1 : l;
      }
      return true;
    }

    let sombra = [];
    function dibujar() {
      if (!(fuente && medio(sombra))) placa(sombra);
      const dpr = devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
      ctx.textBaseline = "top";
      // una cadena por fila y por color: tres tonos de tinta según el brillo, más los dos LED
      const capas = col.map(() => new Array(cols));
      for (let r = 0; r < rows; r++) {
        capas.forEach((cap) => cap.fill(" "));
        for (let c = 0; c < cols; c++) {
          const l = sombra[r][c];
          if (l < 0) continue;
          if (l > 12) { capas[l === 13 ? 3 : 4][c] = "@"; continue; }
          const car = RAMPA[Math.min(RAMPA.length - 1, 1 + Math.floor(l * (RAMPA.length - 1)))];
          capas[l < 0.3 ? 0 : l < 0.6 ? 1 : 2][c] = car;
        }
        capas.forEach((cap, i) => { ctx.fillStyle = col[i]; ctx.fillText(cap.join(""), 0, r * ch); });
      }
    }

    function medir() {
      const rc = hero.getBoundingClientRect(), dpr = devicePixelRatio || 1;
      W = rc.width; H = rc.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      fs = W < 640 ? 9 : 10;
      ctx.font = `${fs}px "Geist Mono", ui-monospace, monospace`;
      cw = ctx.measureText("M").width; ch = Math.round(fs * 1.2);
      cols = Math.floor(W / cw); rows = Math.floor(H / ch);
      sombra = Array.from({ length: rows }, () => new Float32Array(cols));
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

    // ---- pausa (accesibilidad), visibilidad, tema y tamaño ----
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "ascii-pausa";
    const rotulo = () => { btn.textContent = corriendo ? "❚❚ pausa" : "▶ animar"; };
    rotulo();
    btn.onclick = () => {
      corriendo = !corriendo; rotulo();
      if (fuente?.play) corriendo ? fuente.play() : fuente.pause();
    };
    hero.append(btn);
    new IntersectionObserver((es) => (visible = es.at(-1).isIntersecting)).observe(hero);
    document.addEventListener("tema", () => { col = colores(); dibujar(); });
    new ResizeObserver(medir).observe(hero);
    document.fonts?.ready.then(medir);

    function bucle(ahora) {
      const dt = Math.min(0.1, (ahora - (ultimo || ahora)) / 1000);
      ultimo = ahora;
      if (corriendo && visible) { t += dt; if (!(cuadro = (cuadro + 1) % 4)) dibujar(); }  // ~15 cuadros/s
      requestAnimationFrame(bucle);
    }
    let cuadro = 0;
    requestAnimationFrame(bucle);
  }

  document.addEventListener("DOMContentLoaded", () => document.querySelectorAll("canvas[data-ascii]").forEach(montar));
})();
