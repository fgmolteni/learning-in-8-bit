// Escenas del Tomo I, nivel 04 (periféricos) sobre PixelMotor + PixelMicro:
// matriz de GPIO, PWM (LEDC), conversión SAR del ADC y cronogramas UART / I2C / SPI.
// Estética plana (v3): texto bitmap, estructura en 16, trazas finas en 32. Cifras del datasheet del S3.
(() => {
const PM = window.PixelMotor, MI = window.PixelMicro;
const fondo = (m) => m.en(8, () => m.limpiar("n0"));
const txt = (m, s, x, y, tok, op) => m.texto(s, x, y, tok, op);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// estado de cada escena: lo comparten la escena (lee) y sus controles (escriben)
const ST = { pwm: { bits: 4, duty: 40 }, sar: { vin: 60 } };

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
};
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-ctl]").forEach((el) => CONTROLES[el.dataset.ctl]?.(el));
});

// =====================================================================================
// chip04-matriz · la matriz de GPIO lleva una señal de periférico a cualquier pin (PixelMicro)
// =====================================================================================
const SENALES = ["UART TX", "I2C SDA", "SPI MOSI", "LEDC PWM"];
const PINES = ["IO4", "IO5", "IO12", "IO18"];
const COLX = [88, 120, 152, 184], FILAY = [28, 52, 76, 100];
const RUTAS = [[0, 1], [1, 3], [2, 0], [3, 2], [1, 0], [0, 3]], T_RUTA = 3.2;

PM.escena("chip04-matriz", {
  alto: 176, tFijo: 1.6,
  descripcion: "Matriz de GPIO: cuatro señales de periférico (UART TX, I2C SDA, SPI MOSI, PWM de LEDC) a la izquierda, cuatro pines del ESP32-S3 abajo. Cada pocos segundos la matriz cierra un cruce distinto y la señal viaja hasta otro pin; el atajo IO MUX evita la matriz.",
  dibujar(m, t) {
    fondo(m);
    const k = Math.floor(t / T_RUTA) % RUTAS.length, [fi, co] = RUTAS[k];
    const ry = FILAY[fi], cx = COLX[co];
    txt(m, "MATRIZ DE GPIO", 132, 6, "n6", { alin: "centro" });
    // señales de periférico (filas)
    SENALES.forEach((s, i) => m.caja(6, FILAY[i] - 9, 62, 18, { estilo: i === fi ? "activo" : "normal", titulo: s }));
    // cables de la matriz: todos apagados, luego la ruta activa
    FILAY.forEach((y) => MI.cable(m, { de: [68, y], a: [196, y], tok: "n3" }));
    COLX.forEach((x) => MI.cable(m, { de: [x, 20], a: [x, 122], tok: "n3" }));
    MI.cable(m, { de: [[68, ry], [cx, ry], [cx, 122]], tok: "a3" });
    // cruces: puntos de conexión posibles y el cerrado
    m.en(16, () => {
      FILAY.forEach((y) => COLX.forEach((x) => m.rect(x - 2, y - 2, 4, 4, "n4")));
      m.rect(cx - 4, ry - 4, 8, 8, "a3");
    });
    // pines del chip
    MI.chip(m, { x: 56, y: 130, w: 160, h: 38, nombre: "ESP32-S3", pinSep: 32,
      pines: PINES.map((n, i) => ({ num: n, lado: "arr", pos: i, color: i === co ? "a3" : "n5" })) });
    MI.paquete(m, { camino: [[68, ry], [cx, ry], [cx, 122]], t, periodo: T_RUTA, tok: "a4", tam: 6 });
    // panel de lectura
    txt(m, "RUTA ACTUAL", 222, 16, "n4");
    txt(m, SENALES[fi], 222, 30, "a3");
    txt(m, "→ " + PINES[co], 222, 42, "a3");
    txt(m, "COSTO:", 222, 62, "n4");
    txt(m, "1-2 CICLOS", 222, 74, "n6");
    txt(m, "DE RELOJ APB", 222, 86, "n6");
    txt(m, "ATAJO:", 222, 106, "n4");
    txt(m, "IO MUX DIRECTO", 222, 118, "n6");
    txt(m, "SIN MATRIZ", 222, 130, "n6");
  },
});

// =====================================================================================
// chip04-pwm · contador + comparador = salida PWM; la resolución cuesta frecuencia (LEDC)
// =====================================================================================
PM.escena("chip04-pwm", {
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

    txt(m, "CONTADOR Y UMBRAL", X0, 4, "n6");
    txt(m, "SALIDA", X0, 80, "n6");
    m.en(16, () => {
      m.marco(X0, yA0, W, hA, "n3"); m.marco(X0, yB0, W, hB, "n3");
      const yt = yA0 + hA - 3 - (N / L) * (hA - 8);
      m.linea(X0, yt, X0 + W, yt, "a3", { punteo: 3 });
      // referencia de un período
      m.linea(X0 + PER, yB0 + hB + 4, X0 + PER, yB0 + hB + 10, "n4"); m.linea(X0, yB0 + hB + 7, X0 + PER, yB0 + hB + 7, "n4");
    });
    txt(m, "1 PERIODO", X0 + PER / 2, yB0 + hB + 12, "n4", { alin: "centro" });
    // trazas finas (32-bit): escalera del contador y forma de onda
    m.en(32, () => {
      let py = null;
      for (let x = 0; x < W; x += 0.5) {
        const u = (x % PER) / PER, y = yA0 + hA - 3 - cont(u) * (hA - 8);
        if (py !== null) m.linea(X0 + x - 0.5, py, X0 + x, y, "n6");
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
      m.rect(xc - 2, yA0 + hA - 3 - cont(u) * (hA - 8) - 2, 4, 4, "a4");
      m.rect(xc - 2, (Math.floor(u * L) < N ? yh : yl) - 2, 4, 4, "a4");
    });
    // lectura
    const X1 = 244;
    txt(m, "BITS", X1, 16, "n4"); txt(m, String(bits), X1, 26, "n6");
    txt(m, "NIVELES", X1, 42, "n4"); txt(m, String(L), X1, 52, "n6");
    txt(m, "PASO", X1, 68, "n4"); txt(m, pasoTxt, X1, 78, "n6");
    txt(m, "FRECUENCIA", X1, 94, "n4"); txt(m, fTxt, X1, 104, "a3");
    txt(m, "CICLO REAL", X1, 120, "n4"); txt(m, realTxt, X1, 130, "a3");
    txt(m, "RELOJ 80 MHz, SIN DIVISOR", 8, 158, "n4");
  },
});

// =====================================================================================
// chip04-sar · ADC de aproximaciones sucesivas: 12 comparaciones, un bit por paso
// =====================================================================================
const T_PASO = 0.7, N_BITS = 12, T_FIN = 2.4;
PM.escena("chip04-sar", {
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
        if (es) m.rect(X0 + j * CW + 1, Y1 - h, CW - 2, h, "a4");
        else if (p.keep) m.rect(X0 + j * CW + 1, Y1 - h, CW - 2, h, "a2");
        else m.tramado(X0 + j * CW + 1, Y1 - h, CW - 2, h, "n3");
      }
      m.linea(X0 - 2, yv(code), X0 + CW * N_BITS + 2, yv(code), "n6", { grosor: 2 });
    });
    txt(m, "VIN", X0 + CW * N_BITS - 16, yv(code) < 32 ? yv(code) + 5 : yv(code) - 10, "n6");
    txt(m, "MSB", X0 + 7, 134, "n4", { alin: "centro" }); txt(m, "LSB", X0 + CW * (N_BITS - 1) + 7, 134, "n4", { alin: "centro" });
    // registro de resultado
    txt(m, "REG", 4, 154, "n4");
    m.en(16, () => pasos.forEach((p, j) => {
      const x = X0 + j * CW, hecho = j < k || fin, activo = j === k && !fin;
      m.rect(x + 1, 148, CW - 2, 16, hecho ? (p.keep ? "a1" : "n1") : "n0");
      m.marco(x + 1, 148, CW - 2, 16, activo ? "a3" : hecho ? "n4" : "n2");
      if (!hecho && !activo) m.tramado(x + 2, 149, CW - 4, 14, "n2");
    }));
    pasos.forEach((p, j) => {
      const x = X0 + j * CW + CW / 2, hecho = j < k || fin;
      if (hecho) txt(m, p.keep ? "1" : "0", x, 153, p.keep ? "a3" : "n4", { alin: "centro" });
      else if (j === k) txt(m, "?", x, 153, "a3", { alin: "centro" });
    });
    // lectura
    const X1 = 220;
    txt(m, fin ? "LISTO" : "PASO " + (k + 1) + "/" + N_BITS, X1, 16, fin ? "a3" : "n6");
    txt(m, "VIN", X1, 32, "n4"); txt(m, String(code), X1, 42, "n6");
    if (cur) {
      txt(m, "DAC PRUEBA", X1, 58, "n4"); txt(m, String(cur.prueba), X1, 68, "a3");
      txt(m, "VIN>=DAC?", X1, 84, "n4"); txt(m, cur.keep ? "SI: BIT=1" : "NO: BIT=0", X1, 94, "n6");
    } else {
      txt(m, "RESULTADO", X1, 58, "n4"); txt(m, String(pasos[N_BITS - 1].acc), X1, 68, "a3");
      txt(m, "12 PASOS,", X1, 84, "n4"); txt(m, "1 POR BIT", X1, 94, "n4");
    }
    txt(m, "LSB = 1/4095", X1, 116, "n4"); txt(m, "DEL FONDO", X1, 126, "n4"); txt(m, "DE ESCALA", X1, 136, "n4");
  },
});

// =====================================================================================
// chip04-buses · cronogramas de UART, I2C y SPI mandando el mismo byte (PixelMicro)
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

PM.escena("chip04-buses", {
  alto: 208, tFijo: 5,
  descripcion: "Tres cronogramas que se dibujan de izquierda a derecha. UART: una línea, bit de inicio, ocho datos, bit de parada, sin reloj. I2C: reloj y datos compartidos, condición de inicio, dirección, confirmación, dato, confirmación, parada. SPI: reloj, dos líneas de datos y selección de chip, ocho pulsos de reloj.",
  dibujar(m, t) {
    fondo(m);
    const u = Math.min(1, (t % 7) / 5.2), X = 44, W = 262;
    const an = (s, n, i, y, tok = "n4") => txt(m, s, X + (i / n) * W, y, tok, { alin: "centro" });
    // UART
    txt(m, "UART: DOS HILOS, SIN RELOJ", 8, 4, "n6"); txt(m, "hasta 5 MBAUD", 312, 4, "n4", { alin: "der" });
    MI.cronograma(m, { x: X, y: 14, w: W, h: 20, ventana: 1, t: u, desde: 0, señales: [{ nombre: "TX", tok: "a3", f: uartTX }] });
    an("START", 12, 1.5, 37); an("8 DATOS, LSB PRIMERO", 12, 6, 37); an("STOP", 12, 10.5, 37);
    // I2C
    txt(m, "I2C: DOS HILOS, RELOJ COMPARTIDO", 8, 52, "n6"); txt(m, "100-400 kHz", 312, 52, "n4", { alin: "der" });
    MI.cronograma(m, { x: X, y: 62, w: W, h: 36, ventana: 1, t: u, desde: 0, señales: [
      { nombre: "SCL", tok: "a3", f: (v) => i2c(v)[0] }, { nombre: "SDA", tok: "n6", f: (v) => i2c(v)[1] }] });
    an("S", 22, 1.5, 101); an("DIR 7 BITS+W", 22, 6, 101); an("A", 22, 10.5, 101); an("DATO 8 BITS", 22, 15, 101); an("A", 22, 19.5, 101); an("P", 22, 20.5, 101);
    // SPI
    txt(m, "SPI: RELOJ, 2 DATOS Y CS", 8, 114, "n6"); txt(m, "hasta 80 MHz", 312, 114, "n4", { alin: "der" });
    MI.cronograma(m, { x: X, y: 124, w: W, h: 60, ventana: 1, t: u, desde: 0, señales: [
      { nombre: "CS", tok: "n6", f: (v) => spi(v).cs }, { nombre: "SCK", tok: "a3", f: (v) => spi(v).sck },
      { nombre: "MOSI", tok: "n6", f: (v) => spi(v).mosi }, { nombre: "MISO", tok: "n5", f: (v) => spi(v).miso }] });
    an("CS BAJA", 10, 1, 187); an("8 CICLOS DE SCK", 10, 5, 187); an("CS SUBE", 10, 9, 187);
    txt(m, "BYTE DE DATOS: 10100101", 8, 199, "n4");
  },
});
})();
