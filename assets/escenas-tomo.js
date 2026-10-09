// Escenas del Tomo I (esp-cnn) sobre PixelMotor: caché/XIP (nivel 03), consumo (nivel 07), SIMD real (nivel 02).
// Español, sin dependencias, estética plana (v3). Cifras: órdenes de magnitud del Tomo, no mediciones.
// Cada escena pide sus controles con <div class="controles" data-ctl="nombre"> dentro de la figura.
(() => {
const PM = window.PixelMotor;
const e16 = (m, fn) => m.en(16, fn), e32 = (m, fn) => m.en(32, fn);
const fondo = (m) => m.en(8, () => m.limpiar("n0"));
const txt = (m, s, x, y, tok, op) => m.texto(s, x, y, tok, op);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// estado de cada escena: lo comparten la escena (lee) y sus controles (escriben)
const ST = { cache: { modo: "seq", t0: 0 }, energia: { S: 10 }, simd: { modo: "al", t0: 0 } };

// ---- controles (botones excluyentes / deslizador) ----
function botones(el, st, opciones) {
  el.innerHTML = opciones.map(([k, n]) => `<button type="button" data-k="${k}" aria-pressed="${k === st.modo}">${n}</button>`).join("");
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    st.modo = b.dataset.k; st.t0 = st.m ? st.m.t : 0;
    el.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    st.m && st.m.redibujar();
  });
}
const CONTROLES = {
  "mem-cache": (el) => botones(el, ST.cache, [["seq", "lectura secuencial"], ["salt", "lectura salteada"]]),
  "simd-stalls": (el) => botones(el, ST.simd, [["al", "alineado a 16 bytes"], ["des", "desalineado"]]),
  "pipe-energia": (el) => {
    el.innerHTML = `<label for="pe-s">reposo entre despertares</label><input id="pe-s" type="range" min="1" max="60" step="1" value="${ST.energia.S}"><output>${ST.energia.S} s</output>`;
    const inp = el.querySelector("input"), out = el.querySelector("output");
    inp.addEventListener("input", () => { ST.energia.S = +inp.value; out.textContent = inp.value + " s"; ST.energia.m && ST.energia.m.redibujar(); });
  },
};
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-ctl]").forEach((el) => CONTROLES[el.dataset.ctl]?.(el));
});

// =====================================================================================
// mem-cache · XIP: aciertos (HIT) vs fallos (MISS) de caché hacia la flash por bus SPI
// =====================================================================================
// Línea de 8 palabras, 4 líneas en la caché. HIT ~2 ciclos, MISS ~40 (orden de magnitud).
const HIT_C = 2, MISS_C = 40, N_ACC = 12, T_HIT = 0.3, T_MISS = 1.5, PAUSA = 1.5;
const LINEAS = {};
function lineaTiempo(modo) {
  if (LINEAS[modo]) return LINEAS[modo];
  const ev = [], slots = [-1, -1, -1, -1]; let rr = 0, t = 0, cyc = 0;
  for (let i = 0; i < N_ACC; i++) {
    const linea = modo === "seq" ? Math.floor(i / 8) : (i * 5) % 13, w = modo === "seq" ? i % 8 : (i * 3) % 8;
    let slot = slots.indexOf(linea); const hit = slot >= 0;
    if (!hit) { slot = rr; slots[slot] = linea; rr = (rr + 1) % 4; }
    const dur = hit ? T_HIT : T_MISS, c = hit ? HIT_C : MISS_C;
    ev.push({ linea, w, slot, hit, t0: t, dur, c0: cyc, c }); t += dur; cyc += c;
  }
  return (LINEAS[modo] = { ev, T: t, C: cyc });
}

PM.escena("mem-cache", {
  alto: 166, descripcion: "CPU, caché L1 de 16 kilobytes, bus SPI y flash externa. En lectura secuencial casi todos los accesos son aciertos de 1 o 2 ciclos; en lectura salteada cada acceso es un fallo: la CPU se detiene y espera unas decenas de ciclos a que la línea llegue por el bus SPI.",
  dibujar(m, t) {
    ST.cache.m = m; fondo(m);
    const { ev, T } = lineaTiempo(ST.cache.modo), tl = (t - ST.cache.t0) % (T + PAUSA);
    let k = ev.findIndex((e) => tl >= e.t0 && tl < e.t0 + e.dur); const fin = k < 0; if (fin) k = ev.length;
    const cur = fin ? null : ev[k], p = cur ? (tl - cur.t0) / cur.dur : 1;
    const miss = cur && !cur.hit, espera = miss && p < 0.9;
    // estado de la caché
    const lineAt = [-1, -1, -1, -1];
    for (let j = 0; j < k; j++) lineAt[ev[j].slot] = ev[j].linea;
    let llenas = 8;
    if (miss && p >= 0.55) { lineAt[cur.slot] = cur.linea; llenas = p >= 0.9 ? 8 : Math.floor(((p - 0.55) / 0.35) * 8); }
    // ciclos y contadores
    let hits = 0, misses = 0;
    for (let j = 0; j < k; j++) ev[j].hit ? hits++ : misses++;
    if (cur && cur.hit && p > 0.3) hits++;
    if (miss && p > 0.15) misses++;
    const cyc = fin ? ev[ev.length - 1].c0 + ev[ev.length - 1].c : cur.c0 + cur.c * p;
    const acc = k + (cur && p > 0.5 ? 1 : 0);

    e16(m, () => {
      // CPU
      m.caja(8, 14, 52, 78, { estilo: espera ? "apagado" : "activo" });
      if (espera) m.tramado(12, 44, 44, 40, "n3");
      m.rect(12, 62, 44, 10, "n0");
      // caché: 4 líneas de 8 palabras
      m.caja(92, 14, 104, 78, { estilo: "segundo" });
      for (let i = 0; i < 4; i++) {
        const y = 32 + i * 14;
        for (let c = 0; c < 8; c++) {
          const x = 100 + c * 11, lleno = lineAt[i] >= 0 && !(miss && i === cur.slot && p >= 0.55 && c >= llenas && p < 0.9);
          if (lleno) m.rect(x, y, 10, 11, cur && i === cur.slot && c === cur.w && (cur.hit ? p < 1 : p >= 0.9) ? "a3" : "b3");
          else m.tramado(x, y, 10, 11, "n2");
        }
      }
      // flash: filas = líneas (ráfagas) del programa/pesos
      m.caja(252, 14, 60, 78, { estilo: "tercero" });
      for (let r = 0; r < 6; r++) m.rect(258, 32 + r * 9, 48, 7, miss && p >= 0.45 && p < 0.6 && cur.linea % 6 === r ? "a4" : "c2");
      // enlaces
      m.linea(60, 50, 92, 50, "n4"); m.linea(196, 47, 252, 47, "n4"); m.linea(196, 53, 252, 53, "n4");
    });
    txt(m, "CPU", 34, 20, "n6", { alin: "centro" });
    txt(m, espera ? "STALL" : fin ? "LISTO" : "LEE", 34, 64, espera ? "d4" : "n6", { alin: "centro" });
    txt(m, "CACHÉ L1 16KB", 144, 19, "n6", { alin: "centro" });
    txt(m, "FLASH", 282, 19, "n6", { alin: "centro" });
    txt(m, "BUS SPI", 224, 33, "n5", { alin: "centro" }); txt(m, "LENTO", 224, 60, "n4", { alin: "centro" });
    // paquetes que viajan (detalle fino, capa 32)
    e32(m, () => {
      const pq = (x, y, tok) => m.rect(x - 2, y - 2, 4, 4, tok);
      if (cur && cur.hit) pq(p < 0.5 ? 60 + (p / 0.5) * 32 : 92 - ((p - 0.5) / 0.5) * 32, 50, "b4");
      if (miss) {
        if (p >= 0.05 && p < 0.5) pq(60 + ((p - 0.05) / 0.45) * 192, 50, "a4");           // petición CPU → flash
        if (p >= 0.55 && p < 0.9) for (let i = 0; i < 3; i++) pq(252 - (((p - 0.55) / 0.35 + i * 0.12) % 1) * 160, 47 + (i % 2) * 6, "a3"); // línea de vuelta
        if (p >= 0.9) pq(92 - ((p - 0.9) / 0.1) * 32, 50, "a3");
      }
    });
    // contadores y barras: ciclos reales vs ideales (todo acierto)
    const esc = MISS_C * N_ACC, ideal = HIT_C * Math.min(N_ACC, acc);
    txt(m, "HITS " + hits, 8, 102, "b3"); txt(m, "MISS " + misses, 110, 102, "a3"); txt(m, "CICLOS " + Math.round(cyc), 312, 102, "n6", { alin: "der" });
    e16(m, () => {
      m.rect(68, 116, 244, 9, "n1"); m.rect(68, 116, Math.round(244 * cyc / esc), 9, "a3"); m.marco(68, 116, 244, 9, "n3");
      m.rect(68, 130, 244, 9, "n1"); m.rect(68, 130, Math.round(244 * ideal / esc), 9, "b3"); m.marco(68, 130, 244, 9, "n3");
    });
    txt(m, "REAL", 8, 117, "a3"); txt(m, "IDEAL", 8, 131, "b3");
    let msg, tok = "n6";
    if (fin) { const R = ev[ev.length - 1].c0 + ev[ev.length - 1].c; msg = N_ACC + " ACCESOS: " + R + " CICLOS, " + (R / (HIT_C * N_ACC)).toFixed(1) + " VECES MÁS LENTO"; }
    else if (cur.hit) { msg = "HIT: ~1-2 CICLOS, LA LÍNEA YA ESTABA EN CACHÉ"; tok = "b3"; }
    else { msg = p < 0.9 ? "MISS: ~40 CICLOS, LA CPU ESPERA AL BUS SPI" : "LÍNEA CARGADA: LOS VECINOS SERÁN HITS"; tok = "d3"; }
    txt(m, msg, 8, 150, tok);
  },
});

// =====================================================================================
// pipe-energia · corriente vs tiempo en un ciclo de trabajo: el área bajo la curva es la energía
// =====================================================================================
// Órdenes de magnitud: reposo ~10 µA, CPU ~100 mA (arranque + cámara + inferencia ~1,2 s), Wi-Fi ~300 mA (~0,5 s).
const P_E = { TC: 1.2, IC: 100, TW: 0.5, IW: 300, IS: 0.01 };
PM.escena("pipe-energia", {
  alto: 204, descripcion: "Gráfica de corriente en el tiempo de un despertar: reposo de microamperes, luego unos 100 miliamperes de CPU y un pico de 300 miliamperes de Wi-Fi, y vuelta al reposo. El área bajo la curva es la energía; una línea punteada marca la corriente promedio, que cae al espaciar los despertares.",
  dibujar(m, t) {
    ST.energia.m = m; fondo(m);
    const { TC, IC, TW, IW, IS } = P_E, S = ST.energia.S, P = S + TC + TW;
    const Q = IC * TC + IW * TW, prom = (Q + IS * S) / P;
    const X = 8, Y = 18, W = 304, H = 96, IMAX = 320;
    const xt = (s) => X + (s / P) * W, yi = (i) => Y + H - (i / IMAX) * H;
    const segs = [[0, TC, IC, "a3"], [TC, TC + TW, IW, "d3"], [TC + TW, P, IS, null]];
    const ph = clamp(((t % 7.5) / 6), 0, 1), tp = ph * P;
    e16(m, () => m.osciloscopio({ x: X, y: Y, w: W, h: H, trazos: [], rotulos: false, rango: [0, IMAX] }));
    txt(m, "CORRIENTE EN UN DESPERTAR (mA)", 8, 5, "n5");
    e16(m, () => {
      segs.forEach(([a, b, I, tok]) => {
        const b2 = Math.min(b, tp); if (!tok || b2 <= a) return;
        m.tramado(Math.round(xt(a)), Math.round(yi(I)), Math.max(1, Math.round(xt(b2) - xt(a))), Math.round(Y + H - yi(I)), tok);
      });
      m.linea(xt(TC + TW), Y + H - 1, xt(Math.max(TC + TW, tp)), Y + H - 1, "b3");                 // reposo: ~0 a esta escala
      const yp = yi(prom); m.linea(X + 1, yp, X + W - 1, yp, "n6", { punteo: 3 });    // rectángulo de igual área
      m.linea(xt(tp), Y + 1, xt(tp), Y + H - 1, "n4", { punteo: 2 });
    });
    e32(m, () => {
      const pts = [];
      segs.forEach(([a, b, I]) => { if (a < tp) { pts.push([xt(a), yi(I)]); pts.push([xt(Math.min(b, tp)), yi(I)]); } });
      if (pts.length > 1) m.polilinea(pts, "n6", { grosor: 1 });   // contorno neutro: cada tramo ya lleva su color
    });
    txt(m, "PROMEDIO ~" + (prom < 10 ? prom.toFixed(1) : Math.round(prom)) + " mA", 308, clamp(yi(prom) - 10, Y + 3, Y + H - 12), "n6", { alin: "der" });
    // leyenda
    e16(m, () => {
      m.rect(8, 123, 7, 7, "b3"); m.tramado(110, 123, 7, 7, "a3"); m.marco(110, 123, 7, 7, "a3"); m.tramado(206, 123, 7, 7, "d3"); m.marco(206, 123, 7, 7, "d3");
    });
    txt(m, "REPOSO ~10µA", 20, 123, "b3"); txt(m, "CPU ~100mA", 122, 123, "a3"); txt(m, "WIFI ~300mA", 218, 123, "d3");
    // lectura
    txt(m, "EL ÁREA ES LA ENERGÍA: ~" + Math.round(Q) + " mA·s POR DESPERTAR", 8, 138, "a4");
    txt(m, "REPOSO " + S + " S, DESPIERTO " + (100 * (TC + TW) / P).toFixed(0) + "% DEL TIEMPO", 8, 152, "n6");
    txt(m, "VS ~100 mA SIEMPRE DESPIERTO: ~" + (IC / prom).toFixed(IC / prom < 10 ? 1 : 0) + " VECES MENOS", 8, 166, "n6");
    e16(m, () => {
      m.rect(68, 178, 244, 9, "n1"); m.rect(68, 178, Math.max(1, Math.round(244 * prom / 110)), 9, "a3"); m.marco(68, 178, 244, 9, "n3");
      m.rect(68, 192, 244, 9, "n1"); m.rect(68, 192, Math.round(244 * IC / 110), 9, "n4"); m.marco(68, 192, 244, 9, "n3");
    });
    txt(m, "PROMEDIO", 8, 179, "a3"); txt(m, "DESPIERTO", 8, 193, "n4");
  },
});

// =====================================================================================
// simd-stalls · 16 lanes de PIE: ideal (4 ciclos) vs real (cargas desde SRAM y desalineación)
// =====================================================================================
// Esquema didáctico de 64 MAC = 4 bloques de 16. Ciclos ilustrativos: el compilador real solapa cargas y cálculo.
PM.escena("simd-stalls", {
  alto: 184, descripcion: "Dos grillas de 16 lanes en el tiempo. Ideal: 4 ciclos, todos los lanes multiplicando. Real: antes de cada multiplicación hay ciclos de carga desde SRAM, y con datos desalineados se suman ciclos perdidos; los lanes quedan ociosos buena parte del tiempo.",
  dibujar(m, t) {
    ST.simd.m = m; fondo(m);
    const al = ST.simd.modo === "al", bloque = al ? ["C", "C", "M"] : ["C", "P", "C", "P", "M"];
    const real = [].concat(bloque, bloque, bloque, bloque), ideal = ["M", "M", "M", "M"];
    const c = ((t - ST.simd.t0) / 0.35) % (real.length + 4), X0 = 64, PIT = 12;
    const grilla = (y0, seq) => {
      seq.forEach((tp, i) => {
        if (c <= i) return;
        const x = X0 + i * PIT;
        e16(m, () => {
          if (tp === "M") m.rect(x, y0, 11, 63, "a3");
          else if (tp === "C") m.rect(x, y0, 11, 63, "b3");
          else m.tramado(x, y0, 11, 63, "d3");
          if (tp !== "P") for (let l = 1; l < 16; l++) m.linea(x, y0 + l * 4 - 1, x + 10, y0 + l * 4 - 1, "n0");
        });
        txt(m, tp, x + 3, y0 - 9, tp === "M" ? "a4" : tp === "C" ? "b3" : "d3");
      });
      e16(m, () => m.marco(X0 - 1, y0 - 1, seq.length * PIT + 1, 64, "n3"));
      e32(m, () => m.linea(X0 + Math.min(c, seq.length) * PIT, y0 - 2, X0 + Math.min(c, seq.length) * PIT, y0 + 64, "n5"));
    };
    grilla(17, ideal); grilla(100, real);
    txt(m, "IDEAL", 4, 34, "a4"); txt(m, "4 CICLOS", 4, 44, "n6"); txt(m, "ÚTIL 100%", 4, 54, "n5");
    txt(m, "REAL", 4, 117, "n6"); txt(m, real.length + " CICLOS", 4, 127, "n6"); txt(m, "ÚTIL " + Math.round(400 / real.length) + "%", 4, 137, "n5");
    txt(m, "16 LANES", 4, 66, "n4");
    e16(m, () => { m.rect(8, 172, 7, 7, "a3"); m.rect(110, 172, 7, 7, "b3"); m.tramado(222, 172, 7, 7, "d3"); m.marco(222, 172, 7, 7, "d3"); });
    txt(m, "M 16 MAC", 20, 172, "n5"); txt(m, "C CARGA SRAM", 122, 172, "n5"); txt(m, "P PERDIDO", 234, 172, "n5");
  },
});
})();
