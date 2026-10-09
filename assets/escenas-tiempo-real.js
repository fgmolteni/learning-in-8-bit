// Escenas del Tomo I, nivel 05 (tiempo real) sobre PixelMotor + PixelMicro.
// chip05-irq · chip05-gantt · chip05-cola · chip05-inversion. Español, estética plana (v3).
// Los tiempos son didácticos (no a escala real): las figuras muestran el orden y la forma, no mediciones.
(() => {
const PM = window.PixelMotor, PMi = window.PixelMicro;
const e16 = (m, fn) => m.en(16, fn), e32 = (m, fn) => m.en(32, fn);
const fondo = (m) => m.en(8, () => m.limpiar("n0"));
const txt = (m, s, x, y, tok, op) => m.texto(s, x, y, tok, op);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ST = { gantt: { modo: "c1", t0: 0 }, inv: { modo: "sin", t0: 0 } };

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
  "chip05-gantt": (el) => botones(el, ST.gantt, [["c1", "inferencia anclada al núcleo 1"], ["c0", "todo anclado al núcleo 0"]]),
  "chip05-inversion": (el) => botones(el, ST.inv, [["sin", "mutex sin herencia"], ["con", "mutex con herencia"]]),
};
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-ctl]").forEach((el) => CONTROLES[el.dataset.ctl]?.(el));
});

// =====================================================================================
// chip05-irq · tres caminos de una misma interrupción (línea de tiempo, no a escala)
// =====================================================================================
const IRQ_FILAS = [
  { y: 22, rot: "C, NIVEL 1-3, ISR EN IRAM", seg: [[8, 70, "tarea"], [70, 78, "hw"], [78, 116, "ctx"], [116, 146, "isr"], [146, 182, "ctx"], [182, 312, "tarea"]] },
  { y: 64, rot: "ENSAMBLADOR, NIVEL 4+", seg: [[8, 70, "tarea"], [70, 78, "hw"], [78, 108, "isr"], [108, 114, "ctx"], [114, 312, "tarea"]] },
  { y: 106, rot: "ISR EN FLASH, CACHÉ APAGADA", seg: [[8, 70, "tarea"], [70, 78, "hw"], [78, 312, "err"]] },
];
const IRQ_TOK = { tarea: "n3", hw: "c3", ctx: "b3", isr: "d3" };
PM.escena("chip05-irq", {
  alto: 166, tFijo: 8,
  descripcion: "Línea de tiempo de una interrupción en tres casos. Una tarea corre, llega la interrupción, el hardware salta al vector; en el caso de nivel 1 a 3 el sistema guarda el contexto, corre la rutina, lo restaura y la tarea sigue. En nivel 4 o más la rutina en ensamblador corre casi de inmediato. Si la rutina está en flash y la caché está apagada por una escritura de flash, hay un error de caché. Escala didáctica, no real.",
  dibujar(m, t) {
    fondo(m);
    const cur = 8 + clamp((t % 10) / 7.5, 0, 1) * 304;
    e16(m, () => {
      IRQ_FILAS.forEach((f) => {
        m.rect(8, f.y, 304, 14, "n1"); m.marco(8, f.y, 304, 14, "n3");
        f.seg.forEach(([a, b, k]) => {
          if (cur <= a) return;
          const w = Math.min(b, cur) - a;
          if (k === "err") { m.tramado(a, f.y + 1, w, 12, "d3"); }
          else m.rect(a, f.y + 1, w, 12, IRQ_TOK[k]);
        });
        m.linea(70, f.y - 1, 70, f.y + 15, "d4", { punteo: 2 });
      });
      // swatches de la leyenda
      [[8, "n3"], [60, "c3"], [128, "b3"], [202, "d3"]].forEach(([x, k]) => m.rect(x, 130, 7, 7, k));
      m.tramado(258, 130, 7, 7, "d3"); m.marco(258, 130, 7, 7, "d3");
    });
    txt(m, "IRQ", 70, 0, "d4", { alin: "centro" });
    IRQ_FILAS.forEach((f) => txt(m, f.rot, 8, f.y - 10, "n6"));
    [[19, "TAREA", "n5"], [71, "SALTO HW", "c3"], [139, "CONTEXTO", "b3"], [213, "RUTINA", "d3"], [269, "ERROR", "d3"]].forEach(([x, s, k]) => txt(m, s, x, 130, k));
    e32(m, () => IRQ_FILAS.forEach((f) => m.linea(cur, f.y - 1, cur, f.y + 15, "n6", { grosor: 1 })));
    const fase = cur < 70 ? "LA TAREA CORRE" : cur < 78 ? "LLEGA LA IRQ: EL HARDWARE SALTA AL VECTOR" : cur < 116 ? "SE GUARDA EL CONTEXTO EN LA PILA" : cur < 146 ? "CORRE LA RUTINA DE ATENCIÓN" : cur < 182 ? "SE RESTAURA EL CONTEXTO" : "LA TAREA SIGUE DONDE ESTABA";
    txt(m, fase, 8, 145, "a4");
    txt(m, cur > 84 ? "FILA 3: LA RUTINA NO SE PUEDE LEER, EXCEPCIÓN" : "ANCHOS DIDÁCTICOS, NO A ESCALA", 8, 156, "n5");
  },
});

// =====================================================================================
// chip05-gantt · dos núcleos, tareas con prioridad y tick de 10 ms
// =====================================================================================
const G_RAF = [["w", 8, 4], ["l", 13, 3], ["t", 18, 1], ["w", 24, 5], ["w", 40, 6], ["l", 46, 3], ["t", 52, 1], ["w", 57, 4], ["l", 62, 3], ["t", 66, 1], ["w", 72, 5], ["l", 78, 2]];
const G_TRAB = 54, G_MS = 100, G_CACHE = {};
function gantt(modo) {
  if (G_CACHE[modo]) return G_CACHE[modo];
  const c0 = Array(G_MS).fill("i"), c1 = Array(G_MS).fill("i");
  G_RAF.forEach(([k, a, d]) => { for (let i = a; i < a + d; i++) c0[i] = k; });
  let hecho = 0, fin = 0;
  if (modo === "c1") { for (let i = 0; i < G_TRAB; i++) c1[i] = "f"; fin = G_TRAB; }
  else for (let i = 0; i < G_MS && hecho < G_TRAB; i++) if (c0[i] === "i") { c0[i] = "f"; hecho++; fin = i + 1; }
  const rl = (c) => { const s = []; c.forEach((k, i) => { if (s.length && s[s.length - 1][2] === k) s[s.length - 1][1] = i + 1; else s.push([i, i + 1, k]); }); return s; };
  return (G_CACHE[modo] = { c0, c1, s0: rl(c0), s1: rl(c1), fin });
}
const G_TOK = { w: "d3", t: "b3", l: "c3", f: "a3" };
PM.escena("chip05-gantt", {
  alto: 158, tFijo: 8,
  descripcion: "Diagrama de Gantt de dos núcleos durante 100 milisegundos, con una marca de tick cada 10 milisegundos. El núcleo 0 atiende ráfagas de Wi-Fi, del temporizador y de la pila TCP/IP. Con la inferencia anclada al núcleo 1 termina a los 54 milisegundos sin interrupciones; con todo anclado al núcleo 0 la inferencia solo corre en los huecos y termina a los 92 milisegundos mientras el núcleo 1 queda ocioso.",
  dibujar(m, t) {
    ST.gantt.m = m; fondo(m);
    const g = gantt(ST.gantt.modo), X0 = 48, K = 2.64, xs = (ms) => X0 + ms * K;
    const msc = clamp(((t - ST.gantt.t0) % 10) / 8, 0, 1) * G_MS;
    const lanes = [[26, g.s0], [62, g.s1]];
    e16(m, () => {
      lanes.forEach(([y, segs]) => {
        m.rect(X0, y, 264, 22, "n1"); m.marco(X0, y, 264, 22, "n3");
        segs.forEach(([a, b, k]) => {
          if (k === "i" || msc <= a) return;
          m.rect(Math.round(xs(a)), y + 1, Math.max(1, Math.round(xs(Math.min(b, msc)) - xs(a))), 20, G_TOK[k]);
        });
      });
      for (let k = 0; k <= 10; k++) m.linea(xs(k * 10), 22, xs(k * 10), 88, "n4", { punteo: 2 });
      [[8, "d3"], [66, "b3"], [132, "c3"], [192, "a3"]].forEach(([x, k]) => m.rect(x, 104, 7, 7, k));
      m.tramado(272, 104, 7, 7, "n3"); m.marco(272, 104, 7, 7, "n3");
    });
    txt(m, "VENTANA DE 100 ms, TICK CADA 10 ms (100 Hz)", 8, 2, "n6");
    txt(m, "NUCL 0", 4, 34, "n6"); txt(m, "NUCL 1", 4, 70, "n6");
    for (let k = 0; k <= 10; k += 2) txt(m, String(k * 10), xs(k * 10), 92, "n4", { alin: k === 10 ? "der" : "centro" });
    [[19, "WIFI 23", "d3"], [77, "TIMER 22", "b3"], [143, "LWIP 18", "c3"], [203, "INFERENCIA", "a3"], [283, "IDLE", "n5"]].forEach(([x, s, k]) => txt(m, s, x, 104, k));
    e32(m, () => m.linea(xs(msc), 20, xs(msc), 88, "a4", { grosor: 1 }));
    const hecho = g.c0.concat(g.c1).reduce((n, k, i) => n + (k === "f" && (i % G_MS) < msc ? 1 : 0), 0);
    const listo = msc >= g.fin;
    txt(m, "TRABAJO DE LA IA: " + Math.min(G_TRAB, Math.round(hecho)) + " / " + G_TRAB + " ms" + (listo ? ", LISTO" : ""), 8, 120, "a4");
    if (ST.gantt.modo === "c1") {
      txt(m, "ANCLADA AL NÚCLEO 1: TERMINA A LOS 54 ms", 8, 132, "n6");
      txt(m, "SIN WIFI EN ESE NÚCLEO: TIEMPO CONSTANTE", 8, 144, "n5");
    } else {
      txt(m, "TODO EN EL NÚCLEO 0: TERMINA A LOS " + g.fin + " ms", 8, 132, "n6");
      txt(m, "WIFI LA DESALOJA Y EL NÚCLEO 1 QUEDA OCIOSO", 8, 144, "n5");
    }
  },
});

// =====================================================================================
// chip05-cola · doble buffer con dos colas de punteros (cámara → cola → inferencia → red)
// =====================================================================================
// Ciclo de 6 s. La cámara llena un buffer mientras la inferencia usa el otro; al cerrar el ciclo se cruzan.
const C_P = {
  camLl: [[40, 94], [40, 36], [132, 36]], llInf: [[132, 36], [280, 36], [280, 94]],
  infLib: [[280, 94], [256, 94], [256, 128], [132, 128]], libCam: [[132, 128], [40, 128], [40, 94]],
};
function en_ruta(ruta, f) {
  const seg = ruta.slice(1).map((p, i) => Math.hypot(p[0] - ruta[i][0], p[1] - ruta[i][1])), tot = seg.reduce((a, b) => a + b, 0);
  let r = clamp(f, 0, 1) * tot, i = 0;
  while (i < seg.length - 1 && r > seg[i]) { r -= seg[i]; i++; }
  const a = ruta[i], b = ruta[i + 1], k = seg[i] ? r / seg[i] : 0;
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}
const sub = (u, a, b) => clamp((u - a) / (b - a), 0, 1);
PM.escena("chip05-cola", {
  alto: 182, tFijo: 2,
  descripcion: "Doble buffer con colas. Una cámara con DMA llena un buffer mientras la inferencia procesa el otro. Al terminar, el buffer lleno pasa por la cola de llenos hacia la inferencia y el buffer usado vuelve por la cola de libres hacia la cámara. La inferencia envía un resultado chico a la tarea de red del núcleo 0. Solo circulan punteros: nadie copia la imagen.",
  dibujar(m, t) {
    fondo(m);
    const T = 6, c = Math.floor(t / T), u = (t % T) / T, X = c % 2 ? "B" : "A", Y = c % 2 ? "A" : "B";
    e16(m, () => PMi.bloques(m, { cajas: [
      { id: "cam", x: 8, y: 56, w: 64, h: 54 }, { id: "inf", x: 248, y: 56, w: 64, h: 54 },
      { id: "ll", x: 100, y: 22, w: 120, h: 28 }, { id: "lib", x: 100, y: 114, w: 120, h: 28 },
      { id: "red", x: 248, y: 150, w: 64, h: 28, titulo: "RED", sub: "NÚCLEO 0" },
    ] }));
    // flechas de anillo (polilíneas ortogonales)
    const flecha = (pts, tok) => { for (let i = 1; i < pts.length - 1; i++) m.linea(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], tok); const n = pts.length; m.flecha(pts[n - 2][0], pts[n - 2][1], pts[n - 1][0], pts[n - 1][1], tok); };
    e16(m, () => {
      flecha([[40, 56], [40, 36], [100, 36]], "c3"); flecha([[220, 36], [280, 36], [280, 56]], "c3");
      flecha([[256, 110], [256, 128], [220, 128]], "c3"); flecha([[100, 128], [40, 128], [40, 110]], "c3");
      flecha([[300, 110], [300, 150]], "a3");
      [124, 168].forEach((x) => { m.marco(x, 28, 16, 16, "n3", { punteo: 2 }); m.marco(x, 120, 16, 16, "n3", { punteo: 2 }); });
    });
    txt(m, "CÁMARA", 40, 61, "a3", { alin: "centro" }); txt(m, "SIN CPU", 40, 71, "n4", { alin: "centro" });
    txt(m, "INFERENCIA", 280, 61, "b3", { alin: "centro" }); txt(m, "NÚCLEO 1", 280, 71, "n4", { alin: "centro" });
    txt(m, "COLA LLENAS", 160, 12, "c3", { alin: "centro" }); txt(m, "COLA LIBRES", 160, 146, "c3", { alin: "centro" });
    txt(m, "RESULT", 262, 118, "n4");
    // buffers: [letra, centro, relleno]
    const bufs = [];
    if (u < 0.7) {
      bufs.push([X, [40, 94], sub(u, 0, 0.7)]);                                    // la cámara lo llena
      bufs.push([Y, [280, 94], 1, true]);                                          // la IA lo procesa
    } else if (u < 0.78) {
      bufs.push([X, en_ruta(C_P.camLl, sub(u, 0.7, 0.78)), 1]); bufs.push([Y, [280, 94], 1, true]);
    } else if (u < 0.86) {
      bufs.push([X, [132, 36], 1]); bufs.push([Y, en_ruta(C_P.infLib, sub(u, 0.78, 0.86)), 0]);
    } else if (u < 0.9) {
      bufs.push([X, [132, 36], 1]); bufs.push([Y, [132, 128], 0]);
    } else {
      bufs.push([X, en_ruta(C_P.llInf, sub(u, 0.9, 1)), 1]); bufs.push([Y, en_ruta(C_P.libCam, sub(u, 0.9, 1)), 0]);
    }
    bufs.forEach(([l, [cx, cy], p, proc]) => {
      e16(m, () => {
        m.rect(Math.round(cx - 8), Math.round(cy - 8), 16, 16, "n2");
        if (p > 0) m.rect(Math.round(cx - 8), Math.round(cy - 8), Math.max(1, Math.round(16 * p)), 16, proc ? "b3" : "a3");
        m.marco(Math.round(cx - 8), Math.round(cy - 8), 16, 16, proc ? "b3" : "a3");
      });
      txt(m, l, cx, cy - 3, p >= 1 ? "n0" : "n6", { alin: "centro" });
    });
    if (u >= 0.78) PMi.paquete(m, { id: "res", camino: [[300, 110], [300, 150]], t: sub(u, 0.78, 0.98), periodo: 1, tok: "a4", tam: 5 });
    const msg = u < 0.7 ? "LA CÁMARA LLENA " + X + " Y LA IA USA " + Y : u < 0.78 ? X + " LLENO: PASA A LA COLA (UN PUNTERO)" : u < 0.9 ? "LA IA TERMINA: DEVUELVE " + Y + " Y MANDA 1 RESULTADO" : "SE CRUZAN: LA IA TOMA " + X + ", LA CÁMARA " + Y;
    txt(m, msg, 8, 166, "a4");
  },
});

// =====================================================================================
// chip05-inversion · alta, media y baja prioridad con una llave (mutex)
// =====================================================================================
// Unidades de tiempo didácticas (0..22). L toma la llave en t=1; H despierta en t=3 y la pide en t=5; M despierta en t=6.
const I_X0 = 56, I_K = 11, I_PLAZO = 12;
const COL_FILA = { H: "a", M: "b", L: "c" };
const I_SEG = {
  sin: { H: [[3, 5, "r"], [5, 17, "b"], [17, 20, "r"]], M: [[6, 16, "r"]], L: [[0, 3, "r"], [3, 5, "l"], [5, 6, "r"], [6, 16, "l"], [16, 17, "r"]], K: [1, 17], fin: 20 },
  con: { H: [[3, 5, "r"], [5, 6, "b"], [6, 9, "r"]], M: [[6, 9, "l"], [9, 19, "r"]], L: [[0, 3, "r"], [3, 5, "l"], [5, 6, "e"]], K: [1, 6], fin: 9 },
};
PM.escena("chip05-inversion", {
  alto: 168, tFijo: 8,
  descripcion: "Tres tareas de prioridad alta, media y baja comparten una llave. Sin herencia de prioridad, la tarea baja tiene la llave, la media la desaloja y la alta espera hasta el instante 17, con lo que pierde su plazo en 12. Con herencia, la baja sube temporalmente a prioridad alta, termina su parte crítica en el instante 6 y la alta termina en el 9, antes del plazo.",
  dibujar(m, t) {
    ST.inv.m = m; fondo(m);
    const S = I_SEG[ST.inv.modo], tc = clamp(((t - ST.inv.t0) % 10) / 8, 0, 1) * 22, xs = (u) => I_X0 + u * I_K;
    const filas = [["H", 26, "ALTA"], ["M", 50, "MEDIA"], ["L", 74, "BAJA"]];
    e16(m, () => {
      filas.forEach(([k, y]) => {
        m.rect(I_X0, y, 242, 18, "n1"); m.marco(I_X0, y, 242, 18, "n3");
        const col = COL_FILA[k]; S[k].forEach(([a, b, e]) => {
          if (tc <= a) return;
          const x = Math.round(xs(a)), w = Math.max(1, Math.round(xs(Math.min(b, tc)) - xs(a)));
          if (e === "r") m.rect(x, y + 1, w, 16, col + "3");
          else if (e === "e") m.rect(x, y + 1, w, 16, col + "4");
          else if (e === "b") { m.tramado(x, y + 1, w, 16, col + "3"); }
          else m.tramado(x, y + 1, w, 16, "n3");
        });
      });
      m.rect(I_X0, 100, 242, 12, "n1"); m.marco(I_X0, 100, 242, 12, "n3");
      if (tc > S.K[0]) m.rect(Math.round(xs(S.K[0])), 101, Math.round(xs(Math.min(S.K[1], tc)) - xs(S.K[0])), 10, "d3");
      m.linea(xs(I_PLAZO), 20, xs(I_PLAZO), 114, "d4", { punteo: 2 });
      [[8, "n5"], [66, "c4"]].forEach(([x, k]) => m.rect(x, 154, 7, 7, k));
      m.tramado(122, 154, 7, 7, "n5"); m.marco(122, 154, 7, 7, "n5");
      m.tramado(196, 154, 7, 7, "n3"); m.marco(196, 154, 7, 7, "n3");
    });
    txt(m, ST.inv.modo === "sin" ? "SIN HERENCIA: LA MEDIA DESALOJA A LA BAJA" : "CON HERENCIA: LA BAJA SUBE DE PRIORIDAD", 8, 2, "n6");
    filas.forEach(([k, y, n]) => txt(m, n, 4, y + 5, COL_FILA[k] + "3")); txt(m, "LLAVE", 4, 102, "d3");
    txt(m, "PLAZO", xs(I_PLAZO), 13, "d4", { alin: "centro" });
    if (tc > S.K[0] + 1.5) txt(m, "TIENE L", xs(S.K[0]) + 3, 102, "n0");
    if (ST.inv.modo === "con" && tc > 5.2 && tc < 9) txt(m, "PRIO. HEREDADA", xs(6.2), 79, "c4");
    e32(m, () => m.linea(xs(tc), 20, xs(tc), 114, "n6", { grosor: 1 }));
    const fin = tc >= S.fin;
    txt(m, fin ? "H TERMINA EN t=" + S.fin + (S.fin > I_PLAZO ? ": PLAZO PERDIDO (12)" : ": PLAZO CUMPLIDO (12)") : "t = " + tc.toFixed(1), 8, 122, fin && S.fin > I_PLAZO ? "a4" : fin ? "a4" : "n5");
    txt(m, ST.inv.modo === "sin" ? "H ESPERA A L, Y L NO AVANZA POR CULPA DE M" : "L TERMINA RÁPIDO, SUELTA LA LLAVE Y H SIGUE", 8, 134, "n6");
    [[19, "EJECUTA"], [77, "ELEVADA"], [133, "BLOQUEADA"], [207, "LISTA"]].forEach(([x, s]) => txt(m, s, x, 154, "n5"));
  },
});
})();
