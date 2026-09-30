// PixelMicro — visualización de microcontroladores sobre PixelMotor
// Módulo declarativo: describe un micro con objetos y PixelMicro lo dibuja.
// Usa solo la API pública de m (rect, linea, polilinea, marco, tramado,
// circulo, caja, flecha, texto, osciloscopio, en, zona, lupa).
//
// Reglas de capas y estética plana (GUIA.md v3):
//   TEXTO en 8-bit (fuente bitmap pixel, 1 color, sin antialias).
//   Si el espacio es reducido o sobre fondos, la misma fuente pixel sobre la grilla de 16.
//   GRÁFICOS, figuras, bloques, componentes, flechas, cables, cajas en 16-bit.
//   DETALLE en 32-bit solo donde se necesite (zona/lupa), aportando resolución y no efectos.
//   Estética plana: sin brillo/glow/shadowBlur, sin sombras de caja, sin degradados de luz.
(() => {
  const en = (m, b, fn) => (typeof m.en === "function" ? m.en(b, fn) : fn());
  const zona = (m, r, b, fn) => (typeof m.zona === "function" ? m.zona(r, b, fn) : fn());
  const lupa = (m, o, fn) => (typeof m.lupa === "function" ? m.lupa(o, fn) : fn());

  // Rótulo con fondo plano para evitar que cables o líneas lo tachen
  function textoConFondo(m, s, x, y, tok = "n6", { alin = "centro", fondo = "n0", pad = 2, tam = 5 } = {}) {
    const txt = String(s);
    const anchoAprox = txt.length * 6 + pad * 2;
    const altoAprox = 8 + pad * 2;
    const rx = alin === "centro" ? Math.round(x - anchoAprox / 2) : alin === "der" ? Math.round(x - anchoAprox) : Math.round(x - pad);
    const ry = Math.round(y - pad);
    en(m, 16, () => {
      m.rect(rx, ry, anchoAprox, altoAprox, fondo);
      m.texto(txt, x, y, tok, { alin, tam });
    });
  }

  // ================================================================ chip
  // Chip / módulo con pines numerados y rotulados (estilo pinout del WROOM).
  // pines: [{ num, nombre, lado: "izq"|"der"|"arr"|"aba", pos (0..n), color }]
  function chip(m, { x, y, w, h, nombre, sub, pines = [], estilo = "normal", pinL = 8, pinSep = 10 }) {
    // cuerpo en 16 (gráfico plano, contorno n3, relleno n1)
    en(m, 16, () => {
      m.rect(x, y, w, h, "n1");
      m.marco(x, y, w, h, "n3");
      // muesca de orientación
      m.circulo(x + w / 2, y + 3, 2, "n3", false);
      if (nombre) m.texto(nombre, x + w / 2, y + (sub ? h / 2 - 7 : h / 2 - 3.5), "n6", { alin: "centro", tam: 5 });
      if (sub) m.texto(sub, x + w / 2, y + h / 2 + 2, "n4", { alin: "centro", tam: 5 });
    });

    // pines: trazos y etiquetas en 16 (fuente pixel compacta)
    pines.forEach((p) => {
      const lado = p.lado || "izq";
      const col = p.color || "n5";
      let px, py, tx, ty, alin;
      if (lado === "izq") {
        px = x; py = y + pinSep + p.pos * pinSep;
        en(m, 16, () => m.linea(px - pinL, py, px, py, col));
        tx = px - pinL - 2; ty = py - 3; alin = "der";
      } else if (lado === "der") {
        px = x + w; py = y + pinSep + p.pos * pinSep;
        en(m, 16, () => m.linea(px, py, px + pinL, py, col));
        tx = px + pinL + 2; ty = py - 3; alin = "izq";
      } else if (lado === "aba") {
        px = x + pinSep + p.pos * pinSep; py = y + h;
        en(m, 16, () => m.linea(px, py, px, py + pinL, col));
        tx = px; ty = py + pinL + 2; alin = "centro";
      } else { // arr
        px = x + pinSep + p.pos * pinSep; py = y;
        en(m, 16, () => m.linea(px, py - pinL, px, py, col));
        tx = px; ty = py - pinL - 8; alin = "centro";
      }

      en(m, 16, () => {
        if (p.nombre) m.texto(p.nombre, tx, ty, col, { alin, tam: 5 });
        if (p.num !== undefined) {
          const nTx = lado === "izq" ? px + 2 : lado === "der" ? px - 2 : px;
          const nTy = lado === "aba" ? py - 2 : lado === "arr" ? py + 2 : py - 3;
          const nAlin = lado === "izq" ? "izq" : lado === "der" ? "der" : "centro";
          m.texto(String(p.num), nTx, nTy, "n4", { alin: nAlin, tam: 5 });
        }
      });
    });
  }

  // ================================================================ bus
  // Bus entre dos puntos, con ancho rotulado (/8, /16). Ruteo ortogonal.
  function bus(m, { puntos, ancho = 8, tok = "n4", rotulo, punteo = 0, rotuloPos = null }) {
    en(m, 16, () => {
      m.polilinea(puntos, tok, { grosor: 2, punteo });
      const p0 = puntos[0], p1 = puntos[puntos.length - 1];
      const d = 3;
      m.linea(p0[0] - d, p0[1] - d, p0[0] + d, p0[1] + d, tok);
      m.linea(p1[0] - d, p1[1] - d, p1[0] + d, p1[1] + d, tok);
    });

    if (rotulo || ancho) {
      let mx, my;
      if (rotuloPos) {
        mx = rotuloPos[0];
        my = rotuloPos[1];
      } else {
        const mi = Math.floor(puntos.length / 2);
        mx = (puntos[mi - 1][0] + puntos[mi][0]) / 2;
        my = (puntos[mi - 1][1] + puntos[mi][1]) / 2 - 8;
      }
      textoConFondo(m, rotulo || ("/" + ancho), mx, my, "n4", { alin: "centro", fondo: "n0", pad: 2, tam: 5 });
    }
  }

  // ================================================================ registro
  // Registro de N bits mostrado como celdas con valores.
  function registro(m, { x, y, w, h = 12, bits = 128, particion = 8, valores = [], nombre, tok = "n6" }) {
    const n = bits / particion;
    const cw = w / n;

    // celdas y texto en 16 (grilla de 16, texto pixel nítido)
    en(m, 16, () => {
      for (let i = 0; i < n; i++) {
        const cx = x + i * cw;
        const tieneVal = valores[i] !== undefined && valores[i] !== "";
        const [rel, bor] = tieneVal ? ["a1", "a3"] : ["n1", "n3"];
        m.rect(cx, y, cw, h, rel);
        m.marco(cx, y, cw, h, bor);
        if (tieneVal) {
          m.texto(String(valores[i]), cx + cw / 2, y + h / 2 - 3, "a4", { alin: "centro", tam: 5 });
        }
      }

      if (nombre) {
        m.texto(nombre, x - 4, y + h / 2 - 3, tok, { alin: "der", tam: 5 });
      }
      m.texto(bits + "b", x + w + 3, y + h / 2 - 3, "n4", { alin: "izq", tam: 5 });
    });
  }

  // ================================================================ memoria
  // Bloque de memoria con direcciones y bancos.
  function memoria(m, { x, y, w, filaH = 10, filas = [], nombre, bancos = 1 }) {
    const totalH = filas.length * filaH;
    const bw = w / bancos;
    en(m, 16, () => {
      m.rect(x, y, w, totalH, "n0");
      m.marco(x, y, w, totalH, "n3");
      filas.forEach((f, i) => {
        const fy = y + i * filaH;
        if (f.activa) {
          m.rect(x, fy, w, filaH, "a1");
          m.marco(x, fy, w, filaH, "a3");
        } else {
          m.linea(x, fy + filaH, x + w, fy + filaH, "n2");
        }
        if (f.dir !== undefined) {
          m.texto(f.dir, x - 2, fy + filaH / 2 - 3, "n4", { alin: "der", tam: 5 });
        }
        if (f.datos !== undefined) {
          m.texto(String(f.datos), x + w / 2, fy + filaH / 2 - 3, f.activa ? "a4" : "n5", { alin: "centro", tam: 5 });
        }
      });
      for (let b = 1; b < bancos; b++) {
        m.linea(x + b * bw, y, x + b * bw, y + totalH, "n3", { punteo: 2 });
      }
      if (nombre) m.texto(nombre, x + w / 2, y - 10, "n6", { alin: "centro", tam: 5 });
    });
  }

  // ================================================================ bloques
  // Diagrama de bloques: cajas estilo lámina con ruteo ortogonal limpio.
  function bloques(m, { cajas = [], flechas = [], zonas = [], titulo }) {
    // Título en 8
    en(m, 8, () => {
      if (titulo) m.texto(titulo, 160, 6, "n6", { alin: "centro", tam: 7 });
    });

    // Zonas: contorno punteado en acento (a3) + relleno plano suave (a1) en 16, SIN TRAMADO
    zonas.forEach((z) => {
      en(m, 16, () => {
        m.rect(z.x, z.y, z.w, z.h, z.relleno || "a1");
        m.marco(z.x, z.y, z.w, z.h, z.tok || "a3", { punteo: 3 });
        if (z.rotulo) {
          const rx = z.rotuloX !== undefined ? z.rotuloX : z.x + 6;
          const ry = z.rotuloY !== undefined ? z.rotuloY : z.y + 6;
          m.texto(z.rotulo, rx, ry, z.tok || "a3", { tam: 5 });
          if (z.sub) m.texto(z.sub, rx, ry + 10, z.tok || "a3", { tam: 5 });
        }
      });
    });

    // Cajas (16-bit plano)
    const pos = {};
    cajas.forEach((c) => {
      m.caja(c.x, c.y, c.w, c.h, { estilo: c.estilo || "normal", titulo: c.titulo, sub: c.sub });
      pos[c.id] = { cx: c.x + c.w / 2, cy: c.y + c.h / 2, x: c.x, y: c.y, w: c.w, h: c.h };
    });

    // Flechas con ruteo ortogonal (sin diagonales atravesando cajas)
    flechas.forEach((f) => {
      let x0, y0, x1, y1;
      if (Array.isArray(f.de) && Array.isArray(f.a)) {
        x0 = f.de[0]; y0 = f.de[1]; x1 = f.a[0]; y1 = f.a[1];
      } else {
        const from = pos[f.de];
        const to = pos[f.a];
        if (!from || !to) return;

        // Comprobación de solapamiento horizontal (conectar verticalmente)
        const overlapX_min = Math.max(from.x, to.x);
        const overlapX_max = Math.min(from.x + from.w, to.x + to.w);
        if (overlapX_max - overlapX_min >= 10) {
          const midX = (overlapX_min + overlapX_max) / 2;
          x0 = midX;
          x1 = midX;
          if (from.cy < to.cy) {
            y0 = from.y + from.h;
            y1 = to.y;
          } else {
            y0 = from.y;
            y1 = to.y + to.h;
          }
        } else {
          // Comprobación de solapamiento vertical (conectar horizontalmente)
          const overlapY_min = Math.max(from.y, to.y);
          const overlapY_max = Math.min(from.y + from.h, to.y + to.h);
          if (overlapY_max - overlapY_min >= 8) {
            const midY = (overlapY_min + overlapY_max) / 2;
            y0 = midY;
            y1 = midY;
            if (from.cx < to.cx) {
              x0 = from.x + from.w;
              x1 = to.x;
            } else {
              x0 = from.x;
              x1 = to.x + to.w;
            }
          } else {
            // Caso general ortogonal
            const dx = to.cx - from.cx, dy = to.cy - from.cy;
            if (Math.abs(dx) > Math.abs(dy)) {
              x0 = dx > 0 ? from.x + from.w : from.x;
              y0 = from.cy;
              x1 = dx > 0 ? to.x : to.x + to.w;
              y1 = from.cy;
            } else {
              x0 = from.cx;
              y0 = dy > 0 ? from.y + from.h : from.y;
              x1 = from.cx;
              y1 = dy > 0 ? to.y : to.y + to.h;
            }
          }
        }
      }

      m.flecha(x0, y0, x1, y1, f.tok || "n4");
      if (f.rotulo) {
        textoConFondo(m, f.rotulo, (x0 + x1) / 2, (y0 + y1) / 2 - 4, "n4", { alin: "centro", fondo: "n0", pad: 2, tam: 5 });
      }
    });
  }

  // ================================================================ cronograma
  // Cronograma tipo analizador lógico.
  function cronograma(m, { x, y, w, h, señales = [], ventana = 1, t, velocidad = 1, desde = null }) {
    const n = señales.length;
    const sH = h / n;
    const t0 = desde === null ? t - ventana : desde;
    const pasos = Math.round(w * 2);

    // Fondo y separadores en 16
    en(m, 16, () => {
      m.rect(x, y, w, h, "n0");
      m.marco(x, y, w, h, "n3");
      for (let i = 1; i < n; i++) {
        m.linea(x, y + i * sH, x + w, y + i * sH, "n2", { punteo: 2 });
      }
    });

    // Nombres de señales a la izquierda (en 16 para ajuste pixel nítido)
    señales.forEach((s, i) => {
      en(m, 16, () => {
        m.texto(s.nombre, x - 4, y + i * sH + sH / 2 - 3, s.tok || "a3", { alin: "der", tam: 5 });
      });
    });

    // Trazas en 32-bit (resolución real de flancos y buses, sin brillo)
    señales.forEach((s, i) => {
      const sy = y + i * sH;
      const alto = sy + 3;
      const bajo = sy + sH - 4;
      const medio = (alto + bajo) / 2;

      en(m, 32, () => {
        let prev = null;
        for (let j = 0; j <= pasos; j++) {
          const tt = t0 + (j / pasos) * ventana;
          if (desde !== null && tt > t) break;
          const v = s.f(tt * velocidad);
          const px = x + (j / pasos) * w;

          if (s.tipo === "bus") {
            // Bus digital: dos líneas (carriles) con cruces en transiciones
            if (v) {
              m.linea(px, alto, px, alto + 1, s.tok || "a3");
              m.linea(px, bajo, px, bajo + 1, s.tok || "a3");
            } else {
              m.linea(px, medio, px, medio + 1, "n3");
            }
          } else {
            // Señal digital normal
            const py = v ? alto : bajo;
            if (prev) {
              if (prev[1] !== py) {
                m.linea(px, prev[1], px, py, s.tok || "a3");
              }
              m.linea(prev[0], prev[1], px, py, s.tok || "a3");
            }
            prev = [px, py];
          }
        }
      });
    });
  }

  // ================================================================ paquete
  // Paquete de datos viajando plano (16-bit).
  function paquete(m, { id, camino, t, periodo = 3, tok = "a4", tam = 5, rotulo }) {
    const segs = [], pts = camino;
    let tot = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      segs.push(l);
      tot += l;
    }
    const fase = ((t % periodo) / periodo);
    const s = fase * tot;
    let r = s, idx = 0;
    while (idx < segs.length && r > segs[idx]) { r -= segs[idx]; idx++; }
    if (idx >= segs.length) return;
    const a = pts[idx], b = pts[idx + 1], f = r / segs[idx];
    const px = a[0] + (b[0] - a[0]) * f;
    const py = a[1] + (b[1] - a[1]) * f;

    en(m, 16, () => {
      m.rect(px - tam / 2, py - tam / 2, tam, tam, tok);
    });

    if (rotulo) {
      textoConFondo(m, rotulo, px, py - tam / 2 - 7, tok, { alin: "centro", fondo: "n0", pad: 1, tam: 5 });
    }
  }

  // ================================================================ paqueteMulti
  function paqueteMulti(m, { id, camino, t, n = 3, periodo = 3, tok = "a4", tam = 5, rotulo }) {
    for (let i = 0; i < n; i++) {
      paquete(m, { id: id + "_" + i, camino, t: t + (i * periodo) / n, periodo, tok, tam, rotulo: i === 0 ? rotulo : undefined });
    }
  }

  // ================================================================ contadorCiclos
  function contadorCiclos(m, { x, y, ciclos, tok = "a3", alin = "centro" }) {
    en(m, 16, () => {
      m.texto("CICLOS: " + ciclos, x, y, tok, { alin, tam: 5 });
    });
  }

  // ================================================================ cable
  function cable(m, { de, a, tok = "n4", señal, punteo = 0 }) {
    en(m, 16, () => {
      if (Array.isArray(de[0])) {
        m.polilinea(de, tok, { punteo });
      } else {
        m.linea(de[0], de[1], a[0], a[1], tok, { punteo });
      }
    });
    if (señal) {
      const mx = Array.isArray(de[0]) ? (de[0][0] + de[de.length - 1][0]) / 2 : (de[0] + a[0]) / 2;
      const my = Array.isArray(de[0]) ? (de[0][1] + de[de.length - 1][1]) / 2 : (de[1] + a[1]) / 2;
      textoConFondo(m, señal, mx, my - 4, "n5", { alin: "centro", fondo: "n0", pad: 2, tam: 5 });
    }
  }

  // ================================================================ export
  window.PixelMicro = {
    chip,
    bus,
    registro,
    memoria,
    bloques,
    cronograma,
    paquete,
    paqueteMulti,
    contadorCiclos,
    cable,
    textoConFondo,
  };
})();
