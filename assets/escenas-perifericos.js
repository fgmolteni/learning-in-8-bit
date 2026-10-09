// Escenas de periféricos (Tomos 2 y 3 de Microcontroladores) sobre PixelMotor + PixelMicro:
// matriz de GPIO, PWM (LEDC), conversión SAR del ADC, cronogramas UART / I2C / SPI, sensor táctil,
// encoder en cuadratura (PCNT), error de reloj en UART, trama I2S y descriptores de DMA.
// Estética plana (v3): texto bitmap, estructura en 16, trazas finas en 32. Cifras de los datasheets del ESP32 y del S3.
(() => {
const PM = window.PixelMotor, MI = window.PixelMicro;
const fondo = (m) => m.en(8, () => m.limpiar("n0"));
const txt = (m, s, x, y, tok, op) => m.texto(s, x, y, tok, op);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// estado de cada escena: lo comparten la escena (lee) y sus controles (escriben)
const ST = { pwm: { bits: 4, duty: 40 }, sar: { vin: 60 }, uart: { e: 3 } };

function deslizador(el, id, etiqueta, st, clave, min, max, unidad, escena) {
  el.insertAdjacentHTML("beforeend",
    `<label for="${id}">${etiqueta}</label><input id="${id}" type="range" min="${min}" max="${max}" step="1" value="${st[clave]}"><output>${st[clave]} ${unidad}</output>`);
  const inp = el.querySelector("#" + id), out = inp.nextElementSibling;
  inp.addEventListener("input", () => {
    st[clave] = +inp.value; out.textContent = inp.value + " " + unidad;
    escena.m && escena.m.redibujar();
  });
}
const CONTROLES = {
  "pwm": (el) => {
    deslizador(el, "pw-d", "ciclo de trabajo", ST.pwm, "duty", 0, 100, "%", ST.pwm);
    deslizador(el, "pw-b", "bits de resolución", ST.pwm, "bits", 2, 14, "bits", ST.pwm);
  },
  "sar": (el) => deslizador(el, "sr-v", "tensión de entrada", ST.sar, "vin", 0, 100, "% del fondo de escala", ST.sar),
  "uart": (el) => deslizador(el, "ua-e", "reloj del receptor más lento", ST.uart, "e", 0, 8, "%", ST.uart),
};
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-ctl]").forEach((el) => CONTROLES[el.dataset.ctl]?.(el));
});

// =====================================================================================
// per-matriz · la matriz de GPIO lleva una señal de periférico a cualquier pin (PixelMicro)
// =====================================================================================
const SENALES = ["UART TX", "I2C SDA", "SPI MOSI", "LEDC PWM"];
const PINES = ["IO4", "IO5", "IO12", "IO18"];
const COLX = [88, 120, 152, 184], FILAY = [28, 52, 76, 100];
const RUTAS = [[0, 1], [1, 3], [2, 0], [3, 2], [1, 0], [0, 3]], T_RUTA = 3.2;
const TK_SENAL = ["a", "b", "c", "d"];

PM.escena("per-matriz", {
  alto: 176, tFijo: 1.6,
  descripcion: "Matriz de GPIO: cuatro señales de periférico (UART TX, I2C SDA, SPI MOSI, PWM de LEDC) a la izquierda, cuatro pines del ESP32-S3 abajo. Cada pocos segundos la matriz cierra un cruce distinto y la señal viaja hasta otro pin; el atajo IO MUX evita la matriz.",
  dibujar(m, t) {
    fondo(m);
    const k = Math.floor(t / T_RUTA) % RUTAS.length, [fi, co] = RUTAS[k];
    const ry = FILAY[fi], cx = COLX[co];
    txt(m, "MATRIZ DE GPIO", 132, 6, "n6", { alin: "centro" });
    // señales de periférico (filas)
    SENALES.forEach((s, i) => m.caja(6, FILAY[i] - 9, 62, 18, { estilo: ["activo", "segundo", "tercero", "cuarto"][i], titulo: s }));
    // cables de la matriz: todos apagados, luego la ruta activa
    FILAY.forEach((y) => MI.cable(m, { de: [68, y], a: [196, y], tok: "n3" }));
    COLX.forEach((x) => MI.cable(m, { de: [x, 20], a: [x, 122], tok: "n3" }));
    MI.cable(m, { de: [[68, ry], [cx, ry], [cx, 122]], tok: TK_SENAL[fi] + "3" });
    // cruces: puntos de conexión posibles y el cerrado
    m.en(16, () => {
      FILAY.forEach((y) => COLX.forEach((x) => m.rect(x - 2, y - 2, 4, 4, "n4")));
      m.rect(cx - 4, ry - 4, 8, 8, TK_SENAL[fi] + "3");
    });
    // pines del chip
    MI.chip(m, { x: 56, y: 130, w: 160, h: 38, nombre: "ESP32-S3", pinSep: 32,
      pines: PINES.map((n, i) => ({ num: n, lado: "arr", pos: i, color: i === co ? TK_SENAL[fi] + "3" : "n5" })) });
    MI.paquete(m, { camino: [[68, ry], [cx, ry], [cx, 122]], t, periodo: T_RUTA, tok: TK_SENAL[fi] + "4", tam: 6 });
    // panel de lectura
    txt(m, "RUTA ACTUAL", 222, 16, "n4");
    txt(m, SENALES[fi], 222, 30, TK_SENAL[fi] + "3");
    txt(m, "→ " + PINES[co], 222, 42, TK_SENAL[fi] + "3");
    txt(m, "COSTO:", 222, 62, "n4");
    txt(m, "1-2 CICLOS", 222, 74, "n6");
    txt(m, "DE RELOJ APB", 222, 86, "n6");
    txt(m, "ATAJO:", 222, 106, "n4");
    txt(m, "IO MUX DIRECTO", 222, 118, "n6");
    txt(m, "SIN MATRIZ", 222, 130, "n6");
  },
});

// =====================================================================================
// per-pwm · contador + comparador = salida PWM; la resolución cuesta frecuencia (LEDC)
// =====================================================================================
PM.escena("per-pwm", {
  alto: 172, tFijo: 1.2,
  descripcion: "PWM por contador: arriba un contador en diente de sierra con un umbral que fija el ciclo de trabajo; abajo la salida, alta mientras el contador está por debajo del umbral. Con pocos bits el ciclo se redondea a un escalón; con más bits la frecuencia baja.",
  dibujar(m, t) {
    ST.pwm.m = m; fondo(m);
    const bits = ST.pwm.bits, L = 2 ** bits, N = clamp(Math.round((ST.pwm.duty / 100) * L), 0, L);
    const X0 = 8, W = 224, PER = W / 2;               // dos períodos en pantalla
    const yA0 = 16, hA = 50, yB0 = 92, hB = 42;
    const cont = (u) => Math.floor(u * L) / L;        // valor del contador, 0 .. (L-1)/L
    const f = 80e6 / L;                                // 80 MHz / (DIV=1 · 2^bits)
    const fTxt = f >= 1e6 ? (f / 1e6).toFixed(1).replace(".", ",") + " MHz" : f >= 1e3 ? (f / 1e3).toFixed(f >= 1e4 ? 0 : 1).replace(".", ",") + " kHz" : Math.round(f) + " Hz";
    const paso = 100 / L, pasoTxt = (paso >= 1 ? paso.toFixed(paso >= 10 ? 0 : 1) : paso.toFixed(paso >= 0.1 ? 2 : 3)).replace(".", ",") + "%";
    const real = ((N / L) * 100), realTxt = (Number.isInteger(real) ? String(real) : real.toFixed(real < 1 ? 2 : 1)).replace(".", ",") + "%";

    txt(m, "CONTADOR", X0, 4, "b3"); txt(m, "Y UMBRAL", X0 + 6 * "CONTADOR ".length, 4, "c3");   // 6 u por carácter
    txt(m, "SALIDA", X0, 80, "a3");
    m.en(16, () => {
      m.marco(X0, yA0, W, hA, "n3"); m.marco(X0, yB0, W, hB, "n3");
      const yt = yA0 + hA - 3 - (N / L) * (hA - 8);
      m.linea(X0, yt, X0 + W, yt, "c3", { punteo: 3 });
      // referencia de un período
      m.linea(X0 + PER, yB0 + hB + 4, X0 + PER, yB0 + hB + 10, "n4"); m.linea(X0, yB0 + hB + 7, X0 + PER, yB0 + hB + 7, "n4");
    });
    txt(m, "1 PERÍODO", X0 + PER / 2, yB0 + hB + 12, "n4", { alin: "centro" });
    // trazas finas (32-bit): escalera del contador y forma de onda
    m.en(32, () => {
      let py = null;
      for (let x = 0; x < W; x += 0.5) {
        const u = (x % PER) / PER, y = yA0 + hA - 3 - cont(u) * (hA - 8);
        if (py !== null) m.linea(X0 + x - 0.5, py, X0 + x, y, "b3");
        py = y;
      }
      const yh = yB0 + 5, yl = yB0 + hB - 5;
      let pv = null;
      for (let x = 0; x < W; x += 0.5) {
        const u = (x % PER) / PER, y = Math.floor(u * L) < N ? yh : yl;
        if (pv !== null) m.linea(X0 + x - 0.5, pv, X0 + x, y, "a3");
        pv = y;
      }
      // cursor de tiempo
      const xc = X0 + ((t / 4) % 1) * W, u = (((xc - X0) % PER) / PER);
      m.linea(xc, yA0, xc, yB0 + hB, "n4", { punteo: 2 });
      m.rect(xc - 2, yA0 + hA - 3 - cont(u) * (hA - 8) - 2, 4, 4, "b4");
      m.rect(xc - 2, (Math.floor(u * L) < N ? yh : yl) - 2, 4, 4, "a4");
    });
    // lectura
    const X1 = 244;
    txt(m, "BITS", X1, 16, "n4"); txt(m, String(bits), X1, 26, "n6");
    txt(m, "NIVELES", X1, 42, "n4"); txt(m, String(L), X1, 52, "n6");
    txt(m, "PASO", X1, 68, "n4"); txt(m, pasoTxt, X1, 78, "n6");
    txt(m, "FRECUENCIA", X1, 94, "n4"); txt(m, fTxt, X1, 104, "b3");
    txt(m, "CICLO REAL", X1, 120, "n4"); txt(m, realTxt, X1, 130, "c3");
    txt(m, "RELOJ 80 MHz, SIN DIVISOR", 8, 158, "n4");
  },
});

// =====================================================================================
// per-sar · ADC de aproximaciones sucesivas: 12 comparaciones, un bit por paso
// =====================================================================================
const T_PASO = 0.7, N_BITS = 12, T_FIN = 2.4;
PM.escena("per-sar", {
  alto: 176, tFijo: 4,
  descripcion: "Conversión SAR de 12 bits: en cada paso el ADC prueba un valor en su DAC interno, lo compara con la tensión de entrada y conserva o descarta el bit, del más significativo al menos significativo. Los 12 pasos arman el resultado en el registro.",
  dibujar(m, t) {
    ST.sar.m = m; fondo(m);
    const code = Math.min(4095, Math.round((ST.sar.vin / 100) * 4095));
    // búsqueda binaria completa
    const pasos = []; let acc = 0;
    for (let b = N_BITS - 1; b >= 0; b--) { const prueba = acc | (1 << b), keep = code >= prueba; if (keep) acc = prueba; pasos.push({ b, prueba, keep, acc }); }
    const tl = t % (N_BITS * T_PASO + T_FIN), fin = tl >= N_BITS * T_PASO, k = fin ? N_BITS : Math.floor(tl / T_PASO);
    const cur = fin ? null : pasos[k];
    const X0 = 34, CW = 14, Y1 = 128, H = 108, yv = (v) => Y1 - (v / 4095) * H;
    // ejes y barras de prueba
    txt(m, "4095", 4, 16, "n4"); txt(m, "2048", 4, yv(2048) - 3, "n4"); txt(m, "0", 4, Y1 - 6, "n4");
    m.en(16, () => {
      m.marco(X0 - 2, 18, CW * N_BITS + 4, H + 12, "n3");
      for (let j = 0; j < Math.min(k + (cur ? 1 : 0), N_BITS); j++) {
        const p = pasos[j], es = j === k;
        const h = Math.max(1, Math.round((p.prueba / 4095) * H));
        if (es) m.rect(X0 + j * CW + 1, Y1 - h, CW - 2, h, "c4");
        else if (p.keep) m.rect(X0 + j * CW + 1, Y1 - h, CW - 2, h, "a2");
        else m.tramado(X0 + j * CW + 1, Y1 - h, CW - 2, h, "n3");
      }
      m.linea(X0 - 2, yv(code), X0 + CW * N_BITS + 2, yv(code), "a3", { grosor: 2 });
    });
    txt(m, "VIN", X0 + CW * N_BITS - 16, yv(code) < 32 ? yv(code) + 5 : yv(code) - 10, "a3");
    txt(m, "MSB", X0 + 7, 134, "n4", { alin: "centro" }); txt(m, "LSB", X0 + CW * (N_BITS - 1) + 7, 134, "n4", { alin: "centro" });
    // registro de resultado
    txt(m, "REG", 4, 154, "n4");
    m.en(16, () => pasos.forEach((p, j) => {
      const x = X0 + j * CW, hecho = j < k || fin, activo = j === k && !fin;
      m.rect(x + 1, 148, CW - 2, 16, hecho ? (p.keep ? "a1" : "n1") : "n0");
      m.marco(x + 1, 148, CW - 2, 16, activo ? "c3" : hecho ? "n4" : "n2");
      if (!hecho && !activo) m.tramado(x + 2, 149, CW - 4, 14, "n2");
    }));
    pasos.forEach((p, j) => {
      const x = X0 + j * CW + CW / 2, hecho = j < k || fin;
      if (hecho) txt(m, p.keep ? "1" : "0", x, 153, p.keep ? "a3" : "n4", { alin: "centro" });
      else if (j === k) txt(m, "?", x, 153, "c3", { alin: "centro" });
    });
    // lectura
    const X1 = 220;
    txt(m, fin ? "LISTO" : "PASO " + (k + 1) + "/" + N_BITS, X1, 16, fin ? "a3" : "n6");
    txt(m, "VIN", X1, 32, "n4"); txt(m, String(code), X1, 42, "a3");
    if (cur) {
      txt(m, "DAC PRUEBA", X1, 58, "n4"); txt(m, String(cur.prueba), X1, 68, "c3");
      txt(m, "VIN>=DAC?", X1, 84, "n4"); txt(m, cur.keep ? "SÍ: BIT=1" : "NO: BIT=0", X1, 94, "d3");
    } else {
      txt(m, "RESULTADO", X1, 58, "n4"); txt(m, String(pasos[N_BITS - 1].acc), X1, 68, "a3");
      txt(m, "12 PASOS,", X1, 84, "n4"); txt(m, "1 POR BIT", X1, 94, "n4");
    }
    txt(m, "LSB = 1/4095", X1, 116, "n4"); txt(m, "DEL FONDO", X1, 126, "n4"); txt(m, "DE ESCALA", X1, 136, "n4");
  },
});

// =====================================================================================
// per-buses · cronogramas de UART, I2C y SPI mandando el mismo byte (PixelMicro)
// =====================================================================================
const BITS = (v, n, msb) => Array.from({ length: n }, (_, i) => (msb ? (v >> (n - 1 - i)) : (v >> i)) & 1);
const B_DATO = BITS(0xA5, 8, true), B_DATO_LSB = BITS(0xA5, 8, false), B_DIR = [...BITS(0x3C, 7, true), 0], B_MISO = BITS(0x3C, 8, true);
const slot = (u, n) => { const x = Math.min(u, 0.99999) * n; return [Math.floor(x), x - Math.floor(x), u >= 1]; };
const uartTX = (u) => { const [s] = slot(u, 12); return s === 0 || s >= 10 ? 1 : s === 1 ? 0 : B_DATO_LSB[s - 2]; };
function i2c(u) {                                    // 22 ranuras: reposo, START, 9, 9, STOP, reposo
  const [s, p, f] = slot(u, 22);
  if (f || s === 0 || s === 21) return [1, 1];
  if (s === 1) return [1, p < 0.5 ? 1 : 0];
  if (s === 20) return [p < 0.25 ? 0 : 1, p < 0.5 ? 0 : 1];
  const scl = p >= 0.25 && p < 0.75 ? 1 : 0;
  const sda = s === 10 || s === 19 ? 0 : s < 10 ? B_DIR[s - 2] : B_DATO[s - 11];
  return [scl, sda];
}
function spi(u) {                                    // 10 ranuras: CS alto, 8 bits, CS alto
  const [s, p, f] = slot(u, 10);
  if (f || s === 0 || s === 9) return { cs: 1, sck: 0, mosi: 0, miso: 0 };
  return { cs: 0, sck: p >= 0.5 ? 1 : 0, mosi: B_DATO[s - 1], miso: B_MISO[s - 1] };
}

PM.escena("per-buses", {
  alto: 208, tFijo: 5,
  descripcion: "Tres cronogramas que se dibujan de izquierda a derecha. UART: una línea, bit de inicio, ocho datos, bit de parada, sin reloj. I2C: reloj y datos compartidos, condición de inicio, dirección, confirmación, dato, confirmación, parada. SPI: reloj, dos líneas de datos y selección de chip, ocho pulsos de reloj.",
  dibujar(m, t) {
    fondo(m);
    const u = Math.min(1, (t % 7) / 5.2), X = 44, W = 262;
    const an = (s, n, i, y, tok = "n4") => txt(m, s, X + (i / n) * W, y, tok, { alin: "centro" });
    // UART
    txt(m, "UART: DOS HILOS, SIN RELOJ", 8, 4, "n6"); txt(m, "hasta 5 MBAUD", 312, 4, "n4", { alin: "der" });
    MI.cronograma(m, { x: X, y: 14, w: W, h: 20, ventana: 1, t: u, desde: 0, señales: [{ nombre: "TX", tok: "a3", f: uartTX }] });
    an("START", 12, 1.5, 37, "d3"); an("8 DATOS, LSB PRIMERO", 12, 6, 37, "a3"); an("STOP", 12, 10.5, 37, "d3");
    // I2C
    txt(m, "I2C: DOS HILOS, RELOJ COMPARTIDO", 8, 52, "n6"); txt(m, "100-400 kHz", 312, 52, "n4", { alin: "der" });
    MI.cronograma(m, { x: X, y: 62, w: W, h: 36, ventana: 1, t: u, desde: 0, señales: [
      { nombre: "SCL", tok: "b3", f: (v) => i2c(v)[0] }, { nombre: "SDA", tok: "a3", f: (v) => i2c(v)[1] }] });
    an("S", 22, 1.5, 101, "d3"); an("DIR 7 BITS+W", 22, 6, 101, "a3"); an("A", 22, 10.5, 101, "c3"); an("DATO 8 BITS", 22, 15, 101, "a3"); an("A", 22, 19.5, 101, "c3"); an("P", 22, 20.5, 101, "d3");
    // SPI
    txt(m, "SPI: RELOJ, 2 DATOS Y CS", 8, 114, "n6"); txt(m, "hasta 80 MHz", 312, 114, "n4", { alin: "der" });
    MI.cronograma(m, { x: X, y: 124, w: W, h: 60, ventana: 1, t: u, desde: 0, señales: [
      { nombre: "CS", tok: "c3", f: (v) => spi(v).cs }, { nombre: "SCK", tok: "b3", f: (v) => spi(v).sck },
      { nombre: "MOSI", tok: "a3", f: (v) => spi(v).mosi }, { nombre: "MISO", tok: "d3", f: (v) => spi(v).miso }] });
    an("CS BAJA", 10, 1, 187, "c3"); an("8 CICLOS DE SCK", 10, 5, 187, "b3"); an("CS SUBE", 10, 9, 187, "c3");
    txt(m, "BYTE DE DATOS: 10100101", 8, 199, "a3");
  },
});

const frac = (x) => x - Math.floor(x);

// =====================================================================================
// per-tactil · oscilador de relajación: el dedo suma capacidad y la rampa se hace más lenta
// =====================================================================================
// Pad de 10 pF y dedo de 4 pF (dentro de los rangos del nivel). Frecuencias de dibujo: la real es mucho más alta.
const TC = { T: 8, F0: 4, F1: (4 * 10) / 14, VENT: 2, N: 4 };   // ciclo sin/con dedo (s), Hz sin y con dedo, ventana del ESP32 (s), ciclos del S3
const TC_P = (TC.T / 2) * (TC.F0 + TC.F1);                      // oscilaciones en un ciclo sin/con dedo
// fase acumulada en oscilaciones y su inversa: la frecuencia cambia por tramos
function tcFase(t) {
  const q = Math.floor(t / TC.T), r = t - q * TC.T, h = TC.T / 2;
  return q * TC_P + (r < h ? r * TC.F0 : h * TC.F0 + (r - h) * TC.F1);
}
function tcTiempo(f) {
  const q = Math.floor(f / TC_P), r = f - q * TC_P, h = TC.T / 2;
  return q * TC.T + (r < h * TC.F0 ? r / TC.F0 : h + (r - h * TC.F0) / TC.F1);
}
const tcDedo = (t) => frac(t / TC.T) >= 0.5;
const tcV = (t) => { const p = frac(tcFase(t)); return p < 0.5 ? 2 * p : 2 - 2 * p; };   // 0 = umbral bajo, 1 = umbral alto

PM.escena("per-tactil", {
  alto: 184, tFijo: 5.3,
  descripcion: "Oscilador de relajación de un botón táctil. Un pad de 10 pF se carga y se descarga con corriente constante entre dos umbrales, y su tensión dibuja un triángulo. Cada cuatro segundos se acerca un dedo que suma 4 pF y la rampa se hace más lenta. Abajo, el ESP32 cuenta oscilaciones en una ventana fija (al tocar, la cuenta baja) y el ESP32-S3 mide cuánto tarda en completar cuatro oscilaciones (al tocar, el tiempo sube).",
  dibujar(m, t) {
    fondo(m);
    const dedo = tcDedo(t);
    txt(m, "OSCILADOR DE RELAJACIÓN", 8, 4, "n6");
    txt(m, dedo ? "CON DEDO" : "SIN DEDO", 312, 4, dedo ? "d3" : "n4", { alin: "der" });
    // dedo, cubierta y pad
    m.en(16, () => {
      const yd = dedo ? 26 : 16;                            // al tocar, la yema llega a la cubierta
      m.rect(28, 14, 20, yd + 4, "n4"); m.rect(30, yd + 18, 16, 2, "n4"); m.rect(32, yd + 20, 12, 2, "n4");
      m.linea(12, 50, 64, 50, "n3", { grosor: 2 });
      m.rect(18, 54, 40, 6, dedo ? "d3" : "n4");
    });
    txt(m, "PAD", 38, 64, "n4", { alin: "centro" });
    txt(m, dedo ? "14 pF" : "10 pF", 38, 74, dedo ? "d3" : "n6", { alin: "centro" });
    // tensión del pad entre los dos umbrales; tramado donde está el dedo
    const X = 92, Y = 16, W = 220, H = 72, VEN = 1.5, lo = -0.15, hi = 1.15;
    const yv = (v) => Y + H - ((v - lo) / (hi - lo)) * H, xt = (tt) => X + ((tt - (t - VEN)) / VEN) * W;
    m.osciloscopio({ x: X, y: Y, w: W, h: H, t, ventana: VEN, rango: [lo, hi], divs: [6, 1], ejes: false, rotulos: false, trazos: [{ f: tcV, tok: "a3" }] });
    m.en(16, () => {
      for (let k = Math.floor((t - VEN) / TC.T); k * TC.T <= t; k++) {
        const a = Math.max(t - VEN, k * TC.T + TC.T / 2), z = Math.min(t, (k + 1) * TC.T);
        if (z > a) m.tramado(xt(a), Y + 1, xt(z) - xt(a), H - 2, "a1");
      }
      m.linea(X, yv(1), X + W, yv(1), "n4", { punteo: 2 }); m.linea(X, yv(0), X + W, yv(0), "n4", { punteo: 2 });
    });
    txt(m, "VH", 88, yv(1) - 3, "n4", { alin: "der" }); txt(m, "VL", 88, yv(0) - 3, "n4", { alin: "der" });
    // ESP32: oscilaciones completas dentro de una ventana fija
    const t0 = Math.floor(t / TC.VENT) * TC.VENT, f0 = Math.floor(tcFase(t0));
    const cuenta = Math.floor(tcFase(t)) - f0, ultima = f0 - Math.floor(tcFase(t0 - TC.VENT));
    txt(m, "ESP32: VENTANA FIJA", 8, 100, "b3");
    m.en(16, () => {
      m.marco(8, 112, 148, 10, "n3");
      m.rect(9, 113, Math.max(1, Math.round(((t - t0) / TC.VENT) * 146)), 8, "n2");
      for (let j = f0 + 1; j <= f0 + cuenta; j++) m.rect(8 + ((tcTiempo(j) - t0) / TC.VENT) * 148 - 1, 112, 2, 10, "b3");
    });
    txt(m, "CUENTA " + cuenta, 8, 128, "n6");
    txt(m, "ÚLTIMA LECTURA " + ultima, 8, 140, "b3");
    txt(m, "AL TOCAR, BAJA", 8, 152, "n4");
    // ESP32-S3: tiempo que tardan 4 oscilaciones (en centésimas)
    const fa = tcFase(t), j0 = Math.floor(fa / TC.N) * TC.N, ts = tcTiempo(j0), hechas = Math.floor(fa) - j0;
    txt(m, "ESP32-S3: 4 CICLOS FIJOS", 164, 100, "a3");
    m.en(16, () => {
      for (let i = 0; i < TC.N; i++) {
        const x = 164 + i * 37, lleno = i < hechas ? 1 : i === hechas ? fa - j0 - hechas : 0;
        m.marco(x, 112, 35, 10, "n3");
        if (lleno > 0) m.rect(x + 1, 113, Math.max(1, Math.round(lleno * 33)), 8, i < hechas ? "a3" : "n2");
      }
    });
    txt(m, "TIEMPO " + Math.round((t - ts) * 100), 164, 128, "n6");
    txt(m, "ÚLTIMA LECTURA " + Math.round((ts - tcTiempo(j0 - TC.N)) * 100), 164, 140, "a3");
    txt(m, "AL TOCAR, SUBE", 164, 152, "n4");
    txt(m, "10 pF + 4 pF DEL DEDO: CADA RAMPA TARDA 40 % MÁS", 8, 170, "n4");
  },
});

// =====================================================================================
// per-encoder · disco ranurado, dos sensores en cuadratura y el contador del PCNT (x4)
// =====================================================================================
const EN = { NR: 12, V: 1.5, T: 8 };   // ranuras del disco, ranuras por segundo, ida y vuelta (s)
const enPos = (t) => { const r = frac(t / EN.T) * EN.T, h = EN.T / 2; return EN.V * (r < h ? r : EN.T - r); };   // posición en ranuras
const enA = (t) => (frac(enPos(t)) < 0.5 ? 1 : 0);
const enB = (t) => (frac(enPos(t) - 0.25) < 0.5 ? 1 : 0);   // un cuarto de ranura después
const enCuenta = (t) => Math.floor(4 * enPos(t));           // un paso por flanco de A o de B

PM.escena("per-encoder", {
  alto: 180, tFijo: 2.2,
  descripcion: "Encoder incremental leído por el contador de pulsos. A la izquierda, un disco de 12 ranuras gira cuatro segundos en un sentido y cuatro en el otro, frente a dos sensores, A y B, separados de manera que sus señales quedan desfasadas un cuarto de ciclo. A la derecha, las dos cuadradas y la cuenta: sube cuando A sube con B en 0 y baja cuando A sube con B en 1, cuatro cuentas por ranura.",
  dibujar(m, t) {
    fondo(m);
    const s = enPos(t), suma = frac(t / EN.T) < 0.5, CX = 56, CY = 96, R = 40, PASO = (2 * Math.PI) / EN.NR;
    txt(m, "PCNT: ENCODER EN CUADRATURA", 8, 4, "n6");
    // disco: cada ranura ocupa media posición; el ángulo se mide en sentido horario desde arriba
    m.en(16, () => {
      m.circulo(CX, CY, R, "n2", true); m.circulo(CX, CY, R, "n4"); m.circulo(CX, CY, 5, "n4", true);
      for (let i = 0; i < EN.NR; i++) for (let k = 0; k <= 8; k++) {
        const ang = (i - s) * PASO + (k / 8) * (PASO / 2);
        for (let r = 28; r <= 35; r++) m.rect(Math.round(CX + Math.sin(ang) * r) - 1, Math.round(CY - Math.cos(ang) * r) - 1, 2, 2, "n0");
      }
    });
    // sensor: ventana sobre el anillo de ranuras; en el color de su señal (A segundo, B acento) cuando ve luz (señal en 1)
    const sensor = (phi, v, nombre, tok) => {
      const x = Math.round(CX + Math.sin(phi) * 32), y = Math.round(CY - Math.cos(phi) * 32);
      m.en(16, () => { m.marco(x - 6, y - 6, 12, 12, v ? tok : "n6"); m.marco(x - 7, y - 7, 14, 14, v ? tok : "n6"); });
      const xl = Math.round(CX + Math.sin(phi) * (R + 10)), yl = Math.round(CY - Math.cos(phi) * (R + 10));
      txt(m, nombre, xl, yl - 3, v ? tok : "n5", { alin: "centro" });
    };
    sensor(0, enA(t), "A", "a3"); sensor(2.75 * PASO, enB(t), "B", "b3");
    txt(m, suma ? "GIRA ANTIHORARIO" : "GIRA HORARIO", CX, 146, "n6", { alin: "centro" });
    txt(m, "12 RANURAS", CX, 156, "n4", { alin: "centro" });
    // señales y cuenta
    MI.cronograma(m, { x: 150, y: 16, w: 162, h: 36, ventana: 3, t, señales: [
      { nombre: "A", tok: "a3", f: enA }, { nombre: "B", tok: "b3", f: enB }] });
    m.osciloscopio({ x: 150, y: 60, w: 162, h: 56, t, ventana: 3, rango: [-2, 26], divs: [6, 4], ejes: false, rotulos: false, trazos: [{ f: enCuenta, tok: "d3" }] });
    txt(m, "CUENTA", 146, 62, "n4", { alin: "der" });
    txt(m, "CUENTA", 150, 124, "n4"); txt(m, String(enCuenta(t)), 150, 134, "d3", { tam: 14 });
    txt(m, "SENTIDO", 220, 124, "n4"); txt(m, suma ? "SUMA +1" : "RESTA -1", 220, 134, "c3");
    txt(m, suma ? "A SUBE CON B=0" : "A SUBE CON B=1", 220, 146, "n5");
    txt(m, "4 CUENTAS POR RANURA, SIN INSTRUCCIONES DE LA CPU", 8, 170, "n4");
  },
});

// =====================================================================================
// per-uart-error · el receptor muestrea con su propio reloj: el error se acumula bit a bit
// =====================================================================================
const UA_TX = [0, ...BITS(0x48, 8, false), 1];   // inicio, b0..b7 (LSB primero), parada
PM.escena("per-uart-error", {
  alto: 172, tFijo: 5,
  descripcion: "Una trama UART de 10 bits (inicio, ocho datos con el menos significativo primero, parada) y los puntos donde el receptor la muestrea. Con un reloj más lento que el del transmisor, cada muestra cae un poco más tarde que la anterior. Un deslizador fija el error entre 0 y 8 %: debajo se ven el corrimiento acumulado en el bit de parada, el byte enviado y el byte leído.",
  dibujar(m, t) {
    ST.uart.m = m; fondo(m);
    const e = ST.uart.e / 100, X = 16, CW = 26, Y = 26, H = 24, xs = (p) => X + p * CW;
    const nivel = (p) => (p < 0 || p >= 10 ? 1 : UA_TX[Math.floor(p)]);
    const mu = UA_TX.map((_, k) => { const p = (k + 0.5) * (1 + e); return { k, p, bit: nivel(p), ok: Math.floor(p) === k }; });
    const u = Math.min(1, (frac(t / 6) * 6) / 4.5), xc = xs(u * 11), fin = u >= 1;
    txt(m, "EL RECEPTOR MUESTREA CON SU RELOJ", 8, 4, "n6");
    txt(m, "RX " + ST.uart.e + " % LENTO", 312, 4, e ? "b3" : "n4", { alin: "der" });
    ["INI", "B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "FIN"].forEach((s, i) => txt(m, s, xs(i + 0.5), 16, "n4", { alin: "centro" }));
    m.en(16, () => {
      const yv = (b) => (b ? Y + 4 : Y + H - 4);
      const pts = [[X - 12, yv(1)]]; let prev = 1;
      UA_TX.forEach((b, i) => { pts.push([xs(i), yv(prev)], [xs(i), yv(b)]); prev = b; });
      pts.push([xs(10) + 14, yv(1)]);
      for (let i = 0; i < 10; i++) { m.marco(xs(i), Y, CW, H, "n3"); m.linea(xs(i + 0.5), Y + H, xs(i + 0.5), Y + H + 4, "n4"); }
      m.polilinea(pts, "a3");
      mu.forEach((s) => {
        const x = xs(s.p), x0 = xs(s.k + 0.5);
        if (x > xc) return;
        m.linea(x, Y - 2, x, Y + H + 10, s.ok ? "b2" : "d3", { punteo: 2 });
        if (x - x0 >= 1) m.linea(x0, Y + H + 6, x, Y + H + 6, "d3", { grosor: 2 });   // corrimiento acumulado
        m.rect(x - 2, Y + H + 10, 4, 4, s.ok ? "b3" : "d3");
      });
      if (!fin) m.linea(xc, Y - 4, xc, Y + H + 14, "b4");
    });
    mu.forEach((s) => { if (xs(s.p) <= xc) txt(m, String(s.bit), xs(s.p), Y + H + 17, s.ok ? "b3" : "d3", { alin: "centro" }); });
    // corrimiento en el bit de parada, contra el límite práctico (0,4 bit) y el borde de la celda (0,5 bit)
    const d9 = Math.round(9.5 * ST.uart.e) / 100, BX = 16, BW = 288, BY = 104;
    const malos = mu.filter((s) => !s.ok && s.k >= 1 && s.k <= 8).length, leido = mu.slice(1, 9).reduce((v, s, i) => v | (s.bit << i), 0);
    txt(m, "CORRIMIENTO EN EL BIT DE PARADA", BX, 82, "n4");
    txt(m, "9,5 × " + ST.uart.e + " % = " + d9.toFixed(2).replace(".", ",") + " BIT", BX, 92, d9 >= 0.4 ? "d3" : "n6");
    m.en(16, () => {
      m.marco(BX, BY, BW, 8, "n3");
      if (d9 > 0) m.rect(BX + 1, BY + 1, Math.min(BW - 2, d9 * BW), 6, d9 < 0.4 ? "d2" : "d3");
      m.linea(BX + 0.4 * BW, BY - 3, BX + 0.4 * BW, BY + 11, "n6");
      m.linea(BX + 0.5 * BW, BY - 3, BX + 0.5 * BW, BY + 11, "n6", { punteo: 2 });
    });
    txt(m, "0", BX, BY + 13, "n4"); txt(m, "LÍMITE 0,4", BX + 0.4 * BW - 2, BY + 13, "n5", { alin: "der" });
    txt(m, "BORDE 0,5", BX + 0.5 * BW + 3, BY + 13, "n5"); txt(m, "1 BIT", BX + BW, BY + 13, "n4", { alin: "der" });
    const bin = (v) => v.toString(2).padStart(8, "0"), env = bin(0x48);
    txt(m, "ENVIADO", BX, 132, "n4"); txt(m, env, 76, 132, "a3");
    txt(m, "LEÍDO", BX, 144, "n4");
    if (fin) [...bin(leido)].forEach((c, i) => txt(m, c, 76 + i * 6, 144, c === env[i] ? "n6" : "d3"));
    else txt(m, "--------", 76, 144, "n3");
    txt(m, "BIT DE PARADA", 180, 132, "n4"); txt(m, fin ? (mu[9].bit ? "LEÍDO 1: OK" : "LEÍDO 0: ERROR") : "--", 180, 144, "n6");
    txt(m, !fin ? "MUESTREANDO..." : malos ? "LEE BITS EQUIVOCADOS Y NADIE AVISA" : d9 >= 0.4 ? "AL BORDE: SIN MARGEN PARA EL RUIDO" : "DENTRO DEL MARGEN",
      BX, 160, fin && (malos || d9 >= 0.4) ? "d3" : "n6");
  },
});

// =====================================================================================
// per-i2s · una trama estéreo de 16 bits en formato Philips: WS cambia un ciclo antes del MSB
// =====================================================================================
const IS = { T: 6, BARRIDO: 5, N: 33 };   // s por trama, s de barrido, ranuras de BCLK dibujadas
const isMuestra = (n) => [Math.round(20000 * Math.sin(n * 0.9 + 0.7)), Math.round(-12000 * Math.sin(n * 0.6 + 1))];
const bits16 = (v) => BITS(v & 0xffff, 16, true);
PM.escena("per-i2s", {
  alto: 160, tFijo: 3.2,
  descripcion: "Una trama I2S estéreo de 16 bits por canal que se dibuja de izquierda a derecha. Arriba, las muestras izquierda y derecha en binario, en complemento a dos. Abajo, el reloj de bit que nunca se detiene, la selección de palabra que cambia un ciclo antes del primer bit de cada muestra y la línea de datos, que saca cada muestra del bit más significativo al menos significativo.",
  dibujar(m, t) {
    fondo(m);
    const n = Math.floor(t / IS.T), [l, r] = isMuestra(n), bl = bits16(l), br = bits16(r), prev = bits16(isMuestra(n - 1)[1]);
    const sd = (s) => (s === 0 ? prev[15] : s <= 16 ? bl[s - 1] : br[s - 17]);
    const ws = (s) => (s >= 16 && s < 32 ? 1 : 0);
    const ranura = (v) => Math.min(IS.N - 1, Math.floor(Math.min(v, 0.99999) * IS.N));
    const u = Math.min(1, (frac(t / IS.T) * IS.T) / IS.BARRIDO), fin = u >= 1, cur = ranura(u);
    txt(m, "I2S: TRAMA ESTÉREO DE 16 BITS", 8, 4, "n6");
    const fila = (nombre, bs, y, s0, valor) => {
      const est = (i) => { const s = s0 + i; return !fin && s === cur ? "act" : fin || s < cur ? "hecho" : "falta"; };
      const [c1, c3] = s0 === 1 ? ["a1", "a3"] : ["d1", "d3"];
      txt(m, nombre, 8, y + 2, c3);
      m.en(16, () => bs.forEach((_, i) => {
        const x = 32 + i * 9, e = est(i);
        m.rect(x, y, 8, 11, e === "act" ? c1 : e === "hecho" ? "n1" : "n0"); m.marco(x, y, 8, 11, e === "act" ? c3 : "n3");
      }));
      bs.forEach((b, i) => { const e = est(i); txt(m, String(b), 32 + i * 9 + 4, y + 2, e === "act" ? c3 : e === "hecho" ? "n4" : "n6", { alin: "centro" }); });
      txt(m, (valor > 0 ? "+" : "") + valor, 182, y + 2, "n6");
    };
    fila("IZQ", bl, 16, 1, l); fila("DER", br, 30, 17, r);
    txt(m, "BCLK A 48 kHz", 228, 14, "b3"); txt(m, "32 × 48 kHz", 228, 24, "n6"); txt(m, "= 1,536 MHz", 228, 34, "b3");
    // cronograma de una trama: 33 ranuras (la última de la trama anterior + 16 + 16)
    const X = 40, W = IS.N * 8;
    MI.cronograma(m, { x: X, y: 50, w: W, h: 60, ventana: 1, t: u, desde: 0, señales: [
      { nombre: "BCLK", tok: "b3", f: (v) => (frac(v * IS.N) >= 0.5 ? 1 : 0) },
      { nombre: "WS", tok: "c3", f: (v) => ws(ranura(v)) },
      { nombre: "SD", tok: "a3", f: (v) => sd(ranura(v)) }] });
    m.en(16, () => [1, 17].forEach((s) => m.linea(X + s * 8, 48, X + s * 8, 112, "n4", { punteo: 2 })));
    txt(m, "IZQUIERDO, WS=0", X + 9 * 8, 115, "a3", { alin: "centro" }); txt(m, "DERECHO, WS=1", X + 25 * 8, 115, "d3", { alin: "centro" });
    txt(m, "MSB", X + 8 + 1, 125, "a3"); txt(m, "LSB", X + 17 * 8 - 3, 125, "a3", { alin: "der" });
    txt(m, "MSB", X + 17 * 8 + 3, 125, "d3"); txt(m, "LSB", X + W, 125, "d3", { alin: "der" });
    txt(m, "WS CAMBIA 1 CICLO ANTES DEL MSB", X, 137, "c3");
    const k = (cur - 1) % 16;
    txt(m, fin ? "TRAMA COMPLETA: 32 BITS" : cur === 0 ? "SALE EL ÚLTIMO BIT DE LA TRAMA ANTERIOR"
      : "SALE " + (cur <= 16 ? "IZQ" : "DER") + " BIT " + (15 - k) + (k === 0 ? " (MSB)" : k === 15 ? " (LSB)" : ""), X, 149, cur > 16 && !fin ? "d3" : "a3");
  },
});

// =====================================================================================
// per-dma · tres descriptores en anillo: el DMA llena, el bit de dueño le pasa el búfer a la CPU
// =====================================================================================
const DM = { N: 8, TW: 0.25, ND: 3, TPROC: 0.6 };   // palabras por búfer, s por palabra, descriptores, s de proceso de la CPU
const DM_TB = DM.N * DM.TW;                          // s por búfer
PM.escena("per-dma", {
  alto: 184, tFijo: 2.3,
  descripcion: "Un canal de recepción del GDMA con tres descriptores cerrados en anillo. Las palabras llegan de la FIFO del I2S y el DMA llena el búfer del descriptor activo, cuyo bit de dueño vale 1. Al completarlo, lo pone en 0, levanta una interrupción y pasa al siguiente; la CPU lee ese búfer y lo devuelve. Abajo, una línea de tiempo: el DMA mueve palabras todo el tiempo y la CPU solo trabaja un rato después de cada interrupción.",
  dibujar(m, t) {
    fondo(m);
    const b = Math.floor(t / DM_TB), tb = t - b * DM_TB, jc = ((b % DM.ND) + DM.ND) % DM.ND, w = tb / DM.TW, llenas = Math.floor(w);
    const jp = (jc + DM.ND - 1) % DM.ND, enCpu = b >= 1 && tb < DM.TPROC;   // la CPU lee el búfer que se acaba de llenar
    const CX = [8, 112, 216], CY = 58, CW = 96, CH = 60;
    txt(m, "GDMA: DESCRIPTORES EN ANILLO", 8, 4, "n6");
    m.caja(8, 16, 68, 24, { estilo: "tercero", titulo: "I2S RX", sub: "FIFO" });
    m.caja(124, 16, 72, 24, { estilo: "activo", titulo: "GDMA", sub: "CANAL RX" });
    m.flecha(76, 28, 124, 28, "n4");
    m.en(16, () => {
      m.linea(160, 40, 160, 50, "n3"); m.linea(56, 50, 264, 50, "n3");
      CX.forEach((x) => m.linea(x + CW / 2, 50, x + CW / 2, CY, "n3"));
      m.polilinea([[264, CY + CH], [264, CY + CH + 6], [3, CY + CH + 6], [3, CY + 30]], "n4");
    });
    m.flecha(104, CY + 30, 112, CY + 30, "n4"); m.flecha(208, CY + 30, 216, CY + 30, "n4"); m.flecha(3, CY + 30, 8, CY + 30, "n4");
    for (let j = 0; j < DM.ND; j++) {
      const x = CX[j], llena = j === jc, cpu = enCpu && j === jp;
      const ocupadas = llena ? llenas : cpu ? Math.ceil(DM.N * (1 - tb / DM.TPROC)) : 0;
      m.caja(x, CY, CW, CH, { estilo: llena ? "activo" : cpu ? "normal" : "apagado" });
      txt(m, "DESC " + j, x + 6, CY + 5, llena || cpu ? "n6" : "n4");
      txt(m, cpu ? "BIT 0: CPU" : "BIT 1: DMA", x + 6, CY + 16, llena ? "a3" : cpu ? "b3" : "n5");
      m.en(16, () => { for (let i = 0; i < DM.N; i++) { const cx = x + 8 + i * 10; m.rect(cx, CY + 30, 9, 12, i < ocupadas ? (llena ? "a3" : "b3") : "n0"); m.marco(cx, CY + 30, 9, 12, "n3"); } });
      txt(m, llena ? "EL DMA LLENA" : cpu ? "LA CPU LEE" : "LIBRE", x + 6, CY + 47, llena ? "a3" : cpu ? "b3" : "n4");
    }
    // la palabra en viaje: primero de la FIFO al GDMA, después al búfer activo
    const fv = w - llenas, dx = CX[jc] + 12 + llenas * 10;
    if (fv < 0.4) MI.paquete(m, { camino: [[76, 28], [124, 28]], t: fv / 0.4, periodo: 1, tok: "a4", tam: 4 });
    else MI.paquete(m, { camino: [[160, 40], [160, 50], [dx, 50], [dx, CY - 2]], t: (fv - 0.4) / 0.6, periodo: 1, tok: "a4", tam: 4 });
    // línea de tiempo de los últimos 8 s
    const TX = 40, TW = 272, VEN = 8, xt = (tt) => TX + TW - ((t - tt) / VEN) * TW;
    txt(m, "DMA", 34, 138, "a3", { alin: "der" }); txt(m, "CPU", 34, 154, "b3", { alin: "der" });
    m.en(16, () => {
      m.marco(TX, 136, TW, 10, "n3"); m.marco(TX, 152, TW, 10, "n3");
      for (let k = Math.ceil((t - VEN) / DM.TW); k * DM.TW <= t; k++) m.rect(xt(k * DM.TW), 138, 2, 6, "a3");
      for (let k = Math.max(1, Math.floor((t - VEN) / DM_TB)); k * DM_TB <= t; k++) {
        const a = Math.max(t - VEN, k * DM_TB), z = Math.min(t, k * DM_TB + DM.TPROC);
        if (z > a) m.rect(xt(a), 153, Math.max(1, xt(z) - xt(a)), 8, "b3");
        if (k * DM_TB >= t - VEN) m.linea(xt(k * DM_TB), 149, xt(k * DM_TB), 164, "d4");
      }
    });
    txt(m, "LA CPU SOLO TRABAJA DESPUÉS DE CADA INTERRUPCIÓN", 8, 172, "n4");
  },
});
})();
