// Escenas del laboratorio PixelMotor (temas/laboratorio.html). Español, sin dependencias.
// Resolución mixta: capas 8/16/32 con m.en / m.zona / m.lupa. Si el motor aún no las tiene, se dibuja directo.
const { sen, rc } = PixelMotor;
const en = (m, b, fn) => (m.en ? m.en(b, fn) : fn());
// sin recorte no se puede "zonar": si falta m.zona se omite (la capa base ya dibuja todo)
const zona = (m, r, b, fn) => (m.zona ? m.zona(r, b, fn) : null);
const lupa = (m, o, fn) => (m.lupa ? m.lupa(o, fn) : fn());
// fondo plano en 8-bit; texto SIEMPRE en 8-bit (v3); estructura en 16; detalle en 32 solo en zona/lupa
// en 8 forzado cada carácter mide 12 unidades: rótulos cortos
const L = (m, largo) => largo; // el motor dibuja el texto en grilla de 16 aun en 8 forzado
const fondo = (m) => en(m, 8, () => m.limpiar("n0"));
// (el motor pone el texto en su grilla que entra: 8 con {grande:true} para títulos, 16 para rótulos)
const txt = (m, s, x, y, tok, op) => m.texto(s, x, y, tok, op);
const e16 = (m, fn) => en(m, 16, fn);
// osciloscopio v3: marco y grilla en 16-bit, trazas finas (detalle) en 32-bit, leyenda en 8-bit
function osc(m, O, trazos, leyenda = true) {
  e16(m, () => m.osciloscopio({ ...O, trazos: [], rotulos: false }));
  en(m, 32, () => trazos.forEach((z) => traza(m, { ...O, ...z })));
  if (leyenda) trazos.forEach((z, i) => z.rotulo && txt(m, z.rotulo, O.x + 4, O.y + 4 + i * 10, z.tok));
}
// marco punteado que delimita una zona de mayor resolución
const marcoZona = (m, r) => en(m, 32, () => m.marco(r.x, r.y, r.w, r.h, "a3", { punteo: 3 }));
// traza suave (32-bit) de f(tiempo) dentro de un recuadro; el marco y la grilla los pone el osciloscopio en 8-bit
function traza(m, { x, y, w, h, f, tok, rango, ventana, t, desde = null }) {
  const [lo, hi] = rango, t0 = desde === null ? t - ventana : desde, n = Math.round(w * 2);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const tt = t0 + (i / n) * ventana; if (desde !== null && tt > t) break;
    pts.push([x + (i / n) * w, y + h - ((Math.max(lo, Math.min(hi, f(tt))) - lo) / (hi - lo)) * h]);
  }
  m.polilinea(pts, tok, { grosor: 1 });
}

// a) Carga de un capacitor: la llave cierra a los 0,5 s; vC sube e i decae con tau = R*C.
//    Lupa 32 sobre el capacitor: se ven las cargas acumulándose en las placas.
PixelMotor.escena("lab-rc", {
  alto: 210, descripcion: "Circuito con fuente de 9 volt, llave, resistor y capacitor; una lupa muestra las cargas acumulándose en las placas; osciloscopio con la tensión del capacitor y la corriente",
  dibujar(m, t) {
    fondo(m);
    const cerrada = t > 0.5, tp = t - 0.5, R = 1000, TAU = 1; // 1k, 1 mF
    const vC = rc.vCarga(tp, 9, TAU), I = cerrada ? rc.iCarga(tp, 9, R, TAU) : 0;
    const cap = () => m.componente("C", [284, 30], [284, 110], {});
    e16(m, () => {
      m.componente("V", [36, 30], [36, 110], {});
      m.componente("SW", [36, 30], [160, 30], { encendido: cerrada ? 1 : 0 });
      m.componente("R", [160, 30], [284, 30], {});
      cap();
      m.linea(284, 110, 36, 110, "n4");
      m.corriente("rc", [[36, 30], [160, 30], [284, 30], [284, 110], [36, 110], [36, 30]], I, { escala: 3000, ref: 0.009 });
    });
    txt(m, L(m, "9V DC", "9V"), 52, 62, "n5"); txt(m, "LLAVE", 98, 6, "n5", { alin: "centro" });
    txt(m, "R 1K", 222, 6, "n5", { alin: "centro" }); txt(m, L(m, "C 1000µF", "C"), 284, 6, "n4", { alin: "centro" });
    txt(m, cerrada ? L(m, "CARGANDO VC=", "VC=") + vC.toFixed(1) + "V" : L(m, "LLAVE ABIERTA", "ABIERTA"), 160, 114, "n5", { alin: "centro" });
    // lupa sobre el capacitor: placas y cargas (+ arriba, - abajo), proporcionales a vC
    lupa(m, { de: [254, 52, 60, 36], a: [100, 42, 90, 54], bits: 32 }, () => {
      cap();
      const n = Math.round((vC / 9) * 7);
      for (let i = 0; i < n; i++) { const x = 277.5 + i * 2.1; m.punto(x, 65, "a3", 2.4); m.punto(x, 75, "n5", 2.4); }
    });
    osc(m, { x: 8, y: 126, w: 304, h: 76, ventana: 5, t, rango: [0, 10] }, [
      { f: (tt) => rc.vCarga(tt - 0.5, 9, TAU), tok: "a3", rotulo: "VC" },
      { f: (tt) => rc.iCarga(tt - 0.5, 9, R, TAU) * 1000, tok: "a4", rotulo: "I" },
    ]);
  },
});

// b) Alterna por R y LED: la corriente cambia de sentido; el LED brilla un semiciclo.
//    Zona 32 alrededor del LED: ahí vale la pena el detalle.
PixelMotor.escena("lab-ac", {
  alto: 210, descripcion: "Fuente de alterna con resistor y LED; la corriente alterna cambia de sentido y el LED se enciende medio ciclo; alrededor del LED la imagen sube de resolución",
  dibujar(m, t) {
    fondo(m);
    const F = 0.5, s = sen.seno(t, F), I = 0.02 * s; // 20 mA pico
    const on = Math.max(0, s);
    const Z = { x: 254, y: 46, w: 60, h: 66 };
    const led = () => m.componente("LED", [284, 30], [284, 110], { encendido: on });
    e16(m, () => {
      m.componente("AC", [36, 30], [36, 110], {});
      m.componente("R", [36, 30], [284, 30], {});
      m.linea(284, 110, 36, 110, "n4");
      led();
    });
    // zona 32: se limpia el LED de baja resolución y se lo redibuja con más resolución
    zona(m, Z, 32, () => { m.rect(Z.x, Z.y, Z.w, Z.h, "n0"); m.linea(284, 110, Z.x, 110, "n4"); led(); });
    marcoZona(m, Z);
    e16(m, () => m.corriente("ac", [[36, 30], [284, 30], [284, 110], [36, 110], [36, 30]], I, { escala: 1500, ref: 0.02 }));
    txt(m, L(m, "AC 6V 0.5Hz", "AC"), 56, 62, "n5"); txt(m, "R 330", 160, 6, "n5", { alin: "centro" });
    txt(m, "LED", 240, 66, "n5", { alin: "der" });     txt(m, on > 0.05 ? L(m, "LED ENCENDIDO", "ON") : L(m, "LED APAGADO", "OFF"), 160, 114, on > 0.05 ? "a4" : "n4", { alin: "centro" });
    osc(m, { x: 8, y: 126, w: 304, h: 76, ventana: 2, t, rango: [-1, 1] }, [{ f: (tt) => sen.seno(tt, F), tok: "a3", rotulo: "i" }]);
  },
});

// c) Campo eléctrico de un dipolo: flechas de 16-bit lejos, 32-bit alrededor de cada carga (flechas densas).
PixelMotor.escena("lab-campo", {
  alto: 190, descripcion: "Campo eléctrico de dos cargas, una positiva y una negativa: las flechas salen de la positiva y entran en la negativa; cerca de cada carga el campo se dibuja con más detalle",
  dibujar(m) {
    fondo(m);
    const cargas = [{ x: 110, y: 103, q: 1 }, { x: 210, y: 103, q: -1 }];
    const A = { x: 8, y: 24, w: 304, h: 158 };
    e16(m, () => m.campo({ ...A, cargas, paso: 20 }));
    cargas.forEach((c) => {
      const Z = { x: c.x - 30, y: c.y - 30, w: 60, h: 60 };
      zona(m, Z, 32, () => { m.rect(Z.x, Z.y, Z.w, Z.h, "n0"); m.campo({ ...A, cargas, paso: 10 }); });
      marcoZona(m, Z);
    });
    txt(m, "DIPOLO ELECTRICO", 160, 4, "n5", { alin: "centro", grande: true });
    txt(m, L(m, "16 LEJOS, 32 CERCA", "8 BIT"), 160, 170, "n4", { alin: "centro" });
  },
});

// d) Señales en el osciloscopio: marco y grilla en 16-bit, trazas finas en 32-bit.
PixelMotor.escena("lab-senales", {
  alto: 200, descripcion: "Osciloscopio con barrido que muestra una senoide, una onda cuadrada y una señal PWM; la grilla es de resolución media y las trazas de alta",
  dibujar(m, t) {
    fondo(m);
    const T = 4, tt = t % T; // barrido: cada 4 s vuelve a empezar
    txt(m, L(m, "SENO 1Hz", "SENO"), 8, 8, "a3"); txt(m, L(m, "CUAD 0.5Hz", "CUAD"), 118, 8, "a4"); txt(m, L(m, "PWM 2Hz", "PWM"), 238, 8, "n5");
    osc(m, { x: 8, y: 24, w: 304, h: 168, ventana: T, t: tt, desde: 0, rango: [-1.2, 1.2] }, [
      { f: (q) => sen.seno(q, 1), tok: "a3" },
      { f: (q) => sen.cuadrada(q, 0.5), tok: "a4" },
      { f: (q) => sen.pwm(q, 2, 0.25), tok: "n5" },
    ], false);
  },
});

// e) Tres épocas en un mismo circuito: texto en 8, estructura en 16, detalle del LED (zona) en 32.
PixelMotor.escena("lab-epocas", {
  alto: 200, descripcion: "Un solo circuito con fuente, resistor y LED donde cada parte vive en una resolución distinta: el texto en 8 bit, los cables y componentes en 16 bit y el LED en una zona de 32 bit",
  dibujar(m, t) {
    fondo(m);
    const on = 0.5 + 0.5 * sen.seno(t, 0.5), I = 0.02;
    const Z = { x: 254, y: 63, w: 60, h: 54 };
    const led = () => m.componente("LED", [284, 50], [284, 130], { encendido: on });
    e16(m, () => {
      m.polilinea([[36, 50], [284, 50]], "n4");
      m.polilinea([[36, 130], [110, 130]], "n4"); m.polilinea([[196, 130], [284, 130]], "n4");
      m.componente("V", [36, 50], [36, 130], {});
      m.componente("R", [110, 130], [196, 130], {});
      led();
    });
    zona(m, Z, 32, () => { m.rect(Z.x, Z.y, Z.w, Z.h, "n0"); led(); });
    marcoZona(m, Z);
    e16(m, () => m.corriente("ep", [[36, 50], [284, 50], [284, 130], [36, 130], [36, 50]], I, { escala: 1200, ref: 0.02 }));
    txt(m, "TRES EPOCAS", 160, 6, "n5", { alin: "centro", grande: true });
    txt(m, "9V", 50, 86, "n5"); txt(m, L(m, "R 330", "R"), 153, 112, "n5", { alin: "centro" }); txt(m, "LED", 240, 70, "n5", { alin: "der" });
    // rótulos con flecha hacia lo que dibuja cada época
    const cajas = [[8, "8 BIT", "TEXTO", 56, 138], [112, "16 BIT", "CABLES Y PIEZAS", 160, 142], [216, "32 BIT", "DETALLE EN ZONA", 264, 124]];
    cajas.forEach(([x, tt, sub, fx, fy], i) => {
      e16(m, () => { m.caja(x, 150, 96, 40, { estilo: i === 2 ? "activo" : "normal" }); m.flecha(x + 48, 150, fx, fy + (i === 2 ? 2 : -2), "n5"); });
      txt(m, tt, x + 48, 158, "n6", { alin: "centro" }); txt(m, sub, x + 48, 172, "n4", { alin: "centro" });
    });
  },
});
