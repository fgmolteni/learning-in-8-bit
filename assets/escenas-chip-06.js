// Escenas del Tomo I, nivel 06 (energía, relojes y ciclo de vida) sobre PixelMotor.
// Español, sin dependencias, estética plana (v3). Cifras del datasheet del ESP32-S3 v2.2 (3,3 V, 25 °C, típicas).
// Las duraciones de las fases son didácticas: no son especificación de Espressif.
(() => {
const PM = window.PixelMotor;
const e16 = (m, fn) => m.en(16, fn), e32 = (m, fn) => m.en(32, fn);
const fondo = (m) => m.en(8, () => m.limpiar("n0"));
const txt = (m, s, x, y, tok, op) => m.texto(s, x, y, tok, op);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (x, d) => x.toFixed(d).replace(".", ",");
const ST = { ciclo: { ta: 2 } };

// ---- controles de la escena del ciclo de trabajo ----
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('[data-ctl="chip06-ciclo"]').forEach((el) => {
    const op = [[2, "2 s despierto"], [10, "10 s despierto"]];
    el.innerHTML = op.map(([k, n]) => `<button type="button" data-k="${k}" aria-pressed="${k === ST.ciclo.ta}">${n}</button>`).join("");
    el.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      ST.ciclo.ta = +b.dataset.k;
      el.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      ST.ciclo.m && ST.ciclo.m.redibujar();
    });
  });
});

// =====================================================================================
// chip06-escalera · modos de sueño: qué queda encendido y cuánto corriente, en escala logarítmica
// =====================================================================================
// Columnas: RF, CPU, PLL (cristal + PLL), DIG (núcleo digital y SRAM), RTC (PMU + periféricos RTC).
const MODOS = [
  { n: "ACTIVO TX", I: 340, v: "340 mA", on: [1, 1, 1, 1, 1], msg: "TODO ENCENDIDO. LA RADIO TRANSMITE: PICOS DE ~340 mA" },
  { n: "MODEM-SLEEP", I: 66.2, v: "66 mA A 240 MHz", on: [0, 1, 1, 1, 1], msg: "LA CPU SIGUE; SOLO DUERME LA RADIO ENTRE TURNOS" },
  { n: "LIGHT-SLEEP", I: 0.24, v: "240 µA", on: [0, 0, 0, 1, 1], msg: "CPU EN PAUSA, CONTEXTO CONSERVADO: SIGUE DONDE QUEDO" },
  { n: "DEEP-SLEEP", I: 0.008, v: "8 µA", on: [0, 0, 0, 0, 1], msg: "SOLO RTC Y SU MEMORIA: AL DESPERTAR ARRANCA DE NUEVO" },
  { n: "APAGADO", I: 0.001, v: "1 µA", on: [0, 0, 0, 0, 0], msg: "CHIP_PU EN BAJO: NO CORRE NADA" },
];
const COLS = ["RF", "CPU", "PLL", "DIG", "RTC"];
const I0 = 0.0005, IMX = 340, BX = 198, BW = 114;
const xl = (I) => BX + (Math.log10(I / I0) / Math.log10(IMX / I0)) * BW;
const dosCifras = (x) => { const p = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.round(x / p) * p; };

PM.escena("chip06-escalera", {
  alto: 184, tFijo: 9,
  descripcion: "Cinco escalones: activo transmitiendo (340 miliamperes), modem-sleep (66 mA), light-sleep (240 microamperes), deep-sleep (8 microamperes) y apagado (1 microampere). Una matriz muestra qué bloques quedan encendidos en cada modo: radio, CPU, cristal y PLL, núcleo digital y dominio RTC. Las barras usan escala logarítmica.",
  dibujar(m, t) {
    fondo(m);
    const PASO = 2, ciclo = t % (MODOS.length * PASO + 1.5), cur = Math.min(MODOS.length - 1, Math.floor(ciclo / PASO));
    const pc = ciclo >= MODOS.length * PASO ? 1 : clamp((ciclo % PASO) / 0.8, 0, 1);
    COLS.forEach((c, i) => txt(m, c, 82 + i * 22 + 10, 4, "n5", { alin: "centro" }));
    // eje logarítmico: una línea por década
    e16(m, () => { for (let d = -3; d <= 2; d++) { const x = Math.round(xl(Math.pow(10, d))); m.linea(x, 15, x, 146, "n2", { punteo: 2 }); } });
    [[0.001, "1µA"], [1, "1mA"], [100, "100mA"]].forEach(([I, s]) => txt(m, s, xl(I), 4, "n5", { alin: "centro" }));
    MODOS.forEach((md, i) => {
      const y = 16 + i * 26, act = i === cur, vis = i <= cur;
      if (act) e16(m, () => { m.rect(4, y, 312, 24, "a1"); m.marco(4, y, 312, 24, "a3"); });
      txt(m, md.n, 8, y + 8, act ? "n6" : vis ? "n5" : "n3");
      e16(m, () => md.on.forEach((on, c) => {
        const bx = 82 + c * 22;
        if (!vis) { m.tramado(bx, y + 4, 20, 14, "n2"); return; }
        if (on) m.rect(bx, y + 4, 20, 14, act ? "a3" : "n4");
        else { m.rect(bx, y + 4, 20, 14, "n1"); m.marco(bx, y + 4, 20, 14, "n2"); }
      }));
      if (vis) {
        const len = Math.max(2, Math.round((xl(md.I) - BX) * (act ? pc : 1)));
        e16(m, () => m.rect(BX, y + 4, len, 8, act ? "a3" : "n4"));
        txt(m, md.v, BX, y + 14, act ? "n6" : "n5");
      }
    });
    const md = MODOS[cur], r = IMX / md.I;
    txt(m, md.msg, 8, 152, "a4");
    txt(m, cur === 0 ? "ESCALA LOG: CADA LINEA = x10" : "~" + Math.round(dosCifras(r)) + " VECES MENOS QUE TRANSMITIENDO", 8, 166, "n6");
  },
});

// =====================================================================================
// chip06-ciclo · dormir / despertar: corriente en el tiempo y energía como área
// =====================================================================================
// Ejemplo del informe: ciclo de 600 s, activo a 66,2 mA (240 MHz, dos núcleos), dormido a 8 µA. Eje horizontal cortado.
const T_C = 600, IA = 66.2, IS = 0.008, QMAX = 700;
PM.escena("chip06-ciclo", {
  alto: 200, tFijo: 8.5,
  descripcion: "Gráfica de corriente contra tiempo de un ciclo de 10 minutos: un bloque alto de unos 66 miliamperes durante 2 o 10 segundos y una línea casi invisible de 8 microamperes el resto del tiempo, con el eje cortado. El área es la carga consumida: el bloque activo domina aunque dure muy poco. Abajo se muestra el promedio y la autonomía con una batería de 1000 mAh.",
  dibujar(m, t) {
    ST.ciclo.m = m; fondo(m);
    const ta = ST.ciclo.ta, ts = T_C - ta, Qa = IA * ta, Qs = IS * ts, prom = (Qa + Qs) / T_C;
    const X0 = 32, Y = 22, H = 88, base = Y + H, wa = 20 + 6 * ta, xb = X0 + wa, xs = xb + 22, xe = 308;
    const hA = Math.round((IA / 70) * H);
    // fase del cursor: activo (0-3 s), corte (3-4 s), dormido (4-8 s), pausa
    const tt = t % 9;
    const xp = tt < 3 ? X0 + (tt / 3) * wa : tt < 4 ? xb + ((tt - 3) / 1) * (xs - xb) : tt < 8 ? xs + ((tt - 4) / 4) * (xe - xs) : xe;
    e16(m, () => {
      m.linea(X0 - 4, Y, X0 - 4, base, "n3");                       // eje de corriente
      m.linea(X0 - 4, base, xe, base, "n3");                        // eje de tiempo
      m.linea(X0 - 4, Y + Math.round(H * (1 - IA / 70)), xe, Y + Math.round(H * (1 - IA / 70)), "n2", { punteo: 2 });
      const wf = Math.max(0, Math.min(xp, xb) - X0);
      if (wf > 0) { m.tramado(X0, base - hA, wf, hA, "a3"); }
      m.marco(X0, base - hA, wa, hA, tt >= 0 ? "a3" : "n3");
      // corte del eje
      m.linea(xb + 6, base - 6, xb + 10, base + 6, "n5"); m.linea(xb + 12, base - 6, xb + 16, base + 6, "n5");
      m.linea(xs, base - 1, Math.max(xs, xp), base - 1, "a4");        // 8 µA: casi pegado al eje
      m.linea(xp, Y + 1, xp, base - 1, "n4", { punteo: 2 });
    });
    e32(m, () => { if (xp > X0) m.polilinea([[X0, base - hA], [Math.min(xp, xb), base - hA]], "a4", { grosor: 1 }); });
    txt(m, "66 mA", X0 + 2, base - hA - 9, "n6");
    txt(m, "8 µA", xs + 6, base - 11, "n5");
    txt(m, "ACTIVO " + ta + " s", X0, base + 8, "n6");
    txt(m, "DORMIDO " + ts + " s", xe, base + 8, "n6", { alin: "der" });
    txt(m, "CORRIENTE (mA)", 8, 5, "n5");
    // carga = área
    txt(m, "ACTIVO", 8, 133, "n6"); txt(m, "DORMIDO", 8, 147, "n5");
    const bar = (y, q, tok) => {
      const w = Math.max(1, Math.round((q / QMAX) * 172));
      e16(m, () => { m.rect(56, y, 172, 9, "n1"); m.rect(56, y, w, 9, tok); m.marco(56, y, 172, 9, "n3"); });
    };
    bar(131, Qa, "a3"); bar(145, Qs, "n4");
    txt(m, fmt(Qa, 0) + " mA·s", 234, 133, "n6"); txt(m, fmt(Qs, 1) + " mA·s", 234, 147, "n5");
    txt(m, "DORMIDO: " + fmt(100 * ts / T_C, 1) + "% DEL TIEMPO, " + fmt(100 * Qs / (Qa + Qs), 1) + "% DE LA CARGA", 8, 164, "a4");
    txt(m, "PROMEDIO ~" + fmt(prom, 2) + " mA", 8, 178, "n6");
    txt(m, "CON 1000 mAh: ~" + Math.round(1000 / prom / 24) + " DIAS (SIN PERDIDAS)", 8, 190, "n6");
  },
});

// =====================================================================================
// chip06-ota · mapa de flash con dos ranuras de aplicación: actualización, prueba y rollback
// =====================================================================================
const PASO_O = 2.4, PASOS = 5;
const OTA_MSG = [
  ["CORRE LA VERSION A. LA RANURA B ESTA LIBRE.", "OTADATA APUNTA A A."],
  ["LA IMAGEN NUEVA SE BAJA A B.", "LA VERSION QUE CORRE (A) NUNCA SE PISA."],
  ["B QUEDA MARCADA COMO NUEVA Y OTADATA", "PASA A APUNTAR A B. REINICIO."],
  ["ARRANCA B A PRUEBA: TIENE UNA SOLA CHANCE", "DE CONFIRMARSE COMO VALIDA."],
];
PM.escena("chip06-ota", {
  alto: 172, tFijo: 10.5,
  descripcion: "Mapa de flash con bootloader, tabla de particiones, NVS, otadata y dos ranuras de aplicación A y B. Se baja una imagen nueva a la ranura libre, otadata pasa a apuntar a ella y arranca a prueba. En un caso la aplicación se confirma como válida; en el otro no se confirma, el chip se reinicia y el bootloader vuelve a la versión anterior.",
  dibujar(m, t) {
    fondo(m);
    const T = PASO_O * PASOS, run = Math.floor(t / T) % 2, tl = t % T, s = Math.min(PASOS - 1, Math.floor(tl / PASO_O)), p = (tl % PASO_O) / PASO_O;
    const ok = run === 0;
    txt(m, "FLASH (SIN ESCALA)", 8, 4, "n5");
    txt(m, ok ? "CASO 1: LA APP SE CONFIRMA" : "CASO 2: LA APP NO SE CONFIRMA", 312, 4, "a4", { alin: "der" });
    // ranuras
    const B = [["BOOT", 8, 30], ["TABLA", 40, 34], ["NVS", 76, 26], ["OTADATA", 104, 46]];
    const A_ = { x: 152, w: 78 }, B_ = { x: 232, w: 80 }, y = 18, h = 44;
    e16(m, () => B.forEach(([n, x, w]) => { m.caja(x, y, w, h, { estilo: "apagado" }); }));
    B.forEach(([n, x, w]) => txt(m, n, x + w / 2, y + 18, "n5", { alin: "centro" }));
    // estado de cada ranura
    const estA = s < 4 ? "VALIDA" : ok ? "ANTERIOR" : "VALIDA";
    const estB = s === 0 ? "LIBRE" : s === 1 ? "BAJANDO" : s === 2 ? "NUEVA" : s === 3 ? "A PRUEBA" : ok ? "VALIDA" : "ABORTADA";
    const corre = s === 0 || s === 1 ? "A" : s === 2 ? (p < 0.5 ? "A" : "B") : s === 3 ? "B" : ok ? "B" : "A";
    const dibujaSlot = (S, nom, est, corriendo) => {
      e16(m, () => m.caja(S.x, y, S.w, h, { estilo: corriendo ? "activo" : "normal" }));
      if (nom === "OTA_1" && s === 1) e16(m, () => m.tramado(S.x + 2, y + 2, Math.round((S.w - 4) * clamp(p / 0.85, 0, 1)), h - 4, "a3"));
      txt(m, nom, S.x + S.w / 2, y + 10, "n6", { alin: "centro" });
      txt(m, est, S.x + S.w / 2, y + 26, est === "ABORTADA" ? "n4" : corriendo ? "n6" : "n5", { alin: "centro" });
    };
    dibujaSlot(A_, "OTA_0 · A", estA, corre === "A");
    dibujaSlot(B_, "OTA_1 · B", estB, corre === "B");
    // puntero de otadata hacia la ranura que arranca
    const dest = s < 2 || (s === 2 && p < 0.5) ? A_ : s === 4 && !ok ? A_ : B_;
    const xd = dest.x + dest.w / 2;
    e16(m, () => {
      m.linea(127, y + h, 127, y + h + 14, "a3"); m.linea(127, y + h + 14, xd, y + h + 14, "a3"); m.flecha(xd, y + h + 14, xd, y + h + 1, "a3");
    });
    txt(m, "ARRANCA", xd, y + h + 18, "a4", { alin: "centro" });
    // máquina de estados de la imagen nueva
    const hi = s === 2 ? 0 : s === 3 ? 1 : s === 4 ? (ok ? 2 : 3) : -1;
    const E = [["NUEVA", 8, 108, 52], ["A PRUEBA", 76, 108, 66], ["VALIDA", 176, 98, 56], ["ABORTADA", 176, 120, 66]];
    e16(m, () => {
      E.forEach(([n, x, yy, w], i) => { m.caja(x, yy, w, 16, { estilo: hi === i ? "activo" : "normal" }); });
      m.flecha(60, 116, 75, 116, "n4"); m.flecha(142, 114, 175, 106, "n4"); m.flecha(142, 118, 175, 128, "n4");
    });
    E.forEach(([n, x, yy, w], i) => txt(m, n, x + w / 2, yy + 5, hi === i ? "n6" : "n5", { alin: "centro" }));
    txt(m, "CONFIRMA", 238, 102, "n4"); txt(m, "NO CONFIRMA", 248, 125, "n4");
    // mensaje del paso
    const msg = s < 4 ? OTA_MSG[s] : ok ? ["LA APP SE MARCA VALIDA A SI MISMA:", "LA ACTUALIZACION QUEDA. B ES LA NUEVA A."] : ["EL CHIP SE REINICIA SIN CONFIRMAR: ROLLBACK.", "B QUEDA ABORTADA Y VUELVE A ARRANCAR A."];
    txt(m, msg[0], 8, 148, "n6"); txt(m, msg[1], 8, 160, "n5");
  },
});
})();
