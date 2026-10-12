// Fig: el temporizador por dentro, como un contador mecánico de banco (skill anatomy).
// node build.mjs [--light] escribe temporizador.html (o temporizador-light.html) al lado.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const SKILL = "/home/gabi/Documentos/Proyectos/learning_in_8_bit/.claude/skills/anatomy";
const k = await import(`${SKILL}/kit/iso-kit.mjs`);
const G = await import(`${SKILL}/kit/lathe.mjs`);
const { kitScript } = await import(`${SKILL}/scripts/inline-kit.mjs`);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 600, HEIGHT = 360;

// ---- modelo (lo que la figura dice que pasa) ----
// Reloj de 80 MHz, prescaler ÷80 (dos etapas de engranajes 8:1 y 10:1) → un tick por vuelta del eje de salida = 1 µs.
// Contador de 4 bits: 16 posiciones del dial. Con recarga automática el contador vuelve a 0 en el mismo ciclo en que
// llega a la alarma, así que el período es ALARMA ticks.
const MODEL = { clockMHz: 80, stage1: [8, 64], stage2: [8, 80], bits: 4, alarm: 9 };
const DIV = (MODEL.stage1[1] / MODEL.stage1[0]) * (MODEL.stage2[1] / MODEL.stage2[0]); // 80
const STEPS = 2 ** MODEL.bits; // 16

// ---- mundo (unidades ≈ px; x, y en el piso, z arriba) ----
const PLATE = { x: -152, y: -42, w: 272, d: 80, r: 8 };
const PLATE_H = 12, FOOT_H = 5;
const S0 = [-122, -8];               // motor, volante y piñón de entrada
const GA = { r: 24, z: 26, h: 3 };    // engranaje 64 dientes (8:1)
const S1 = [S0[0] + 3 + GA.r, S0[1]];
const GB = { r: 30, z: 31, h: 3 };    // engranaje 80 dientes (10:1)
const S2 = [S1[0] + 3 + GB.r, S1[1]];
const PIN_R = 25;                     // perno del eje de salida
const DIAL = [24, -8];
const DIAL_R = 30, DIAL_Z = 31, DIAL_H = 9, DIAL_TOP = DIAL_Z + DIAL_H;
const PAWL = { x0: -37, x1: DIAL[0] - DIAL_R - 2.2, y: -2.5, z: 36, h: 2.5 };  // trinquete en reposo
const BELL = [86, -10];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [S0[0], S0[1], 34], [DIAL[0], DIAL[1], DIAL_TOP + 3], [BELL[0], BELL[1], 28]],
  WIDTH, HEIGHT, { pad: 22, azimuth: 62 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// ---- partes que giran: funciones puras que también corren en la página (reciben el kit como K) ----
function spinTop(K, P, c, r, z, angle, holes) {
  // marcas de un engranaje que gira: rayo, cubo y agujeros de alivianado, rehechos en cada cuadro
  const out = [];
  const p = (a, rr) => [c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr];
  out.push(K.lineSvg(K.lineOnTop(p(angle, 3.2), p(angle, r - 2.4), z, P), { tone: "hi" }));
  for (let i = 0; i < holes; i++) {
    const [x, y] = p(angle + Math.PI / holes + (i * 2 * Math.PI) / holes, r * 0.55);
    out.push(K.lineSvg(K.ring(x, y, r * 0.16, z, P, 20), { tone: "lo" }));
  }
  return out.join("");
}
function pinAt(K, P, c, rr, z, angle) {
  const x = c[0] + Math.cos(angle) * rr, y = c[1] + Math.sin(angle) * rr;
  return K.solidSvg(K.cylinder(x, y, 1.7, z, 4, P, 16, 0.3), { tone: "hi", crease: "lo" }) +
    K.dotsSvg([K.iso([x, y, z + 4], P)], { size: 0.45, tone: "lo" });
}
function needleAt(K, P, c, r, z, step, steps) {
  const a = (step / steps) * Math.PI * 2;
  const dir = [Math.sin(a), -Math.cos(a)];   // 0 arriba (−y), sentido horario visto desde arriba, como radialTicks
  return K.lineOnTop([c[0] - dir[0] * 4, c[1] - dir[1] * 4], [c[0] + dir[0] * (r - 5), c[1] + dir[1] * (r - 5)], z + 0.2, P);
}
function tabAt(K, P, c, r, z, step, steps) {
  // pestaña de la alarma: un bloquecito sobre el aro del dial, en la posición de la alarma
  const a = (step / steps) * Math.PI * 2;
  const u = [Math.sin(a), -Math.cos(a)], v = [-u[1], u[0]];
  const q = (s, t) => [c[0] + u[0] * s + v[0] * t, c[1] + u[1] * s + v[1] * t];
  const ring = [q(r - 6.5, -2.2), q(r - 1.2, -2.2), q(r - 1.2, 2.2), q(r - 6.5, 2.2)];
  return K.solidSvg(K.extrude(ring, z, 2.2, P, { bevel: 0.3 }), { tone: "hi", crease: "lo" }) +
    K.dotsSvg([K.iso([...q(r - 3.8, 0), z + 2.2], P)], { size: 0.45, tone: "lo" });
}

// ---- base ----
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // regla en el borde delantero
  const strip = { x: -128, y: PLATE.y + PLATE.d - 13, w: 196, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // placa de rótulo: la única leyenda grabada, la relación del prescaler
  const label = { x: 78, y: PLATE.y + PLATE.d - 17, w: 32, d: 12, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 4, label.y + 7.6], 0.8, P, "x"), "÷80", { size: 5.2, tone: "mid" }));
  out.push(L(k.lineOnTop([label.x + 18, label.y + 4.2], [label.x + 28, label.y + 4.2], 0.8, P), { tone: "lo", free: true }));
  out.push(L(k.lineOnTop([label.x + 18, label.y + 6.4], [label.x + 26, label.y + 6.4], 0.8, P), { tone: "lo", free: true }));
  out.push(L(k.lineOnTop([label.x + 18, label.y + 8.6], [label.x + 27, label.y + 8.6], 0.8, P), { tone: "lo", free: true }));
  return out.join("");
}

// ---- reloj: motor con volante ----
function motor() {
  const [x, y] = S0, out = [];
  const foot = { x: x - 19, y: y - 19, w: 38, d: 38, r: 4 };
  out.push(S(k.slabOf(foot, 0, 3, P, 4, 0.6), { tone: "mid" }));
  out.push(D(k.corners(foot, 4).map(([a, b]) => at([a, b, 3])), { size: 0.5 }));
  out.push(S(k.cylinder(x, y, 15, 3, 15, P, 48, 0.6), { tone: "mid", inner: L(k.sideArc(x, y, 15, 7, P, 32), { tone: "faint" }) }));
  out.push(L(k.knurl(x, y, 15, 7, 18, 30, P, 0.5), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 15.6, 18, 2, P, 48), { tone: "mid" }));
  // bornes del motor, del lado de adelante
  for (const a of [0.55, 1.05]) {
    const bx = x + Math.cos(a) * 17, by = y + Math.sin(a) * 17;
    out.push(S(k.cylinder(bx, by, 1.6, 3, 3, P, 14), { tone: "mid" }));
    out.push(D([at([bx, by, 6])], { size: 0.5, tone: "hi" }));
  }
  // volante (gira a la velocidad del reloj: se ve como un borrón)
  out.push(S(k.cylinder(x, y, 13, 20, 4, P, 56, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(x, y, 9.5, 24, P, 48), { tone: "faint" }));
  out.push(k.fadedSvg(Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { d: k.lineOnTop([x + Math.cos(a) * 3, y + Math.sin(a) * 3], [x + Math.cos(a) * 9.5, y + Math.sin(a) * 9.5], 24, P), alpha: 0.25 + 0.5 * (i % 3 === 0) };
  }), { tone: "lo" }));
  // piñón de entrada, 8 dientes
  out.push(S(k.cylinder(x, y, 3, 24, 6, P, 20), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, 3, 24.3, 29.7, 8, P, 0.2), { tone: "lo" }));
  out.push(D([at([x, y, 30])], { size: 0.55, tone: "hi" }));
  return out.join("");
}

// ---- columnas de los ejes ----
function pillar(c, top) {
  const [x, y] = c, out = [];
  out.push(S(k.cylinder(x, y, 6.5, 0, 2, P, 28), { tone: "lo" }));
  out.push(D(Array.from({ length: 3 }, (_, i) => { const a = 0.4 + i * 2.1; return at([x + Math.cos(a) * 5, y + Math.sin(a) * 5, 2]); }), { size: 0.4 }));
  out.push(S(k.cylinder(x, y, 3.6, 2, top - 2, P, 24), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 3.6, top - 6, P, 16), { tone: "faint" }) }));
  return out.join("");
}

function gearStatic(c, g, teeth) {
  // cuerpo del engranaje: lo que no cambia al girar (los dientes se ven como el moleteado del canto)
  const [x, y] = c, top = g.z + g.h;
  return S(k.cylinder(x, y, g.r, g.z, g.h, P, 72, 0.5), { tone: "hi", crease: "lo" }) +
    L(k.knurl(x, y, g.r, g.z + 0.3, top - 0.3, teeth, P, 0.15), { tone: "lo" }) +
    L(k.ring(x, y, g.r - 2.4, top, P, 64), { tone: "faint" }) +
    L(k.ring(x, y, 3.2, top, P, 20), { tone: "lo" });
}

function pinion1() {
  const [x, y] = S1, z = GA.z + GA.h;
  return S(k.cylinder(x, y, 3, z, 6, P, 20), { tone: "hi", crease: "lo" }) +
    L(k.knurl(x, y, 3, z + 0.3, z + 5.7, 8, P, 0.2), { tone: "lo" }) +
    D([at([x, y, z + 6])], { size: 0.55, tone: "hi" });
}

// ---- trinquete: guía, resorte de retorno y la barra que empuja el dial ----
function guide() {
  const out = [];
  const block = { x: -31, y: PAWL.y - 7, w: 9, d: 9, r: 1.2 };
  out.push(S(k.slabOf({ x: block.x - 3, y: block.y - 3, w: block.w + 6, d: block.d + 6, r: 2 }, 0, 2, P, 3, 0.4), { tone: "lo" }));
  out.push(S(k.slabOf(block, 2, PAWL.z - 2, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(block, 12, P, 3), { tone: "faint" }) }));
  out.push(D([at([block.x + 2.5, block.y + 2, PAWL.z]), at([block.x + block.w - 2.5, block.y + 2, PAWL.z])], { size: 0.45 }));
  return out.join("");
}
const COIL = { from: -22, to: -12.6, cy: PAWL.y - 2.5, cz: PAWL.z + PAWL.h / 2 };
function pawl() {
  // la barra se arma en reposo y se corre con translateAlong
  const out = [];
  const bar = { x: PAWL.x0 + 2, y: PAWL.y - 4, w: PAWL.x1 - PAWL.x0 - 2, d: 3, r: 1 };
  out.push(S(k.slabOf(bar, PAWL.z, PAWL.h, P, 3, 0.4), { tone: "mid" }));
  // paleta donde golpea el perno
  const paddle = { x: PAWL.x0, y: PAWL.y - 14, w: 2.4, d: 23, r: 0.8 };
  out.push(S(k.slabOf(paddle, PAWL.z - 1, PAWL.h + 1.5, P, 3, 0.4), { tone: "mid" }));
  // collar donde apoya el resorte y punta que entra en el dentado
  out.push(S(k.slabOf({ x: COIL.to, y: PAWL.y - 5, w: 2.4, d: 5, r: 0.6 }, PAWL.z - 0.6, PAWL.h + 1.2, P, 3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: PAWL.x1 - 1.4, y: PAWL.y - 3.6, w: 2.4, d: 2.2, r: 0.4 }, PAWL.z, PAWL.h, P, 2), { tone: "hi", crease: "lo" }));
  return out.join("");
}

// ---- dial: contador de 16 posiciones (4 bits) ----
function dialBase() {
  const [x, y] = DIAL;
  return S(k.cylinder(x, y, 10, 0, 2, P, 32), { tone: "lo" }) +
    D(Array.from({ length: 4 }, (_, i) => { const a = 0.3 + i * Math.PI / 2; return at([x + Math.cos(a) * 8, y + Math.sin(a) * 8, 2]); }), { size: 0.45 }) +
    S(k.cylinder(x, y, 6, 2, DIAL_Z - 2, P, 28), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 6, 14, P, 20), { tone: "faint" }) });
}
function dial() {
  const [x, y] = DIAL, out = [];
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 72, 0.8), { tone: "hi", crease: "lo", inner: L(k.sideArc(x, y, DIAL_R, DIAL_Z + 4, P, 48), { tone: "faint" }) }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_Z + 0.4, DIAL_Z + 4, STEPS * 2, P, 0.3), { tone: "lo" }));  // dentado del trinquete
  out.push(L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 72), { tone: "lo" }));
  const t = k.radialTicks(x, y, DIAL_R - 2.2, STEPS, 4, DIAL_TOP, [1.6, 3.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 9, DIAL_TOP, P, 40), { tone: "faint" }));
  // copa del eje
  out.push(S(k.cylinder(x, y, 2.6, DIAL_TOP, 1.2, P, 18), { tone: "mid" }));
  return out.join("");
}

// ---- campana: el evento ----
function bellBase() {
  const [x, y] = BELL, out = [];
  out.push(S(k.cylinder(x, y, 15, 0, 3, P, 56, 0.6), { tone: "mid", inner: L(k.sideArc(x, y, 15, 1.5, P, 32), { tone: "faint" }) }));
  out.push(D(Array.from({ length: 3 }, (_, i) => { const a = 0.9 + i * 2.1; return at([x + Math.cos(a) * 12.5, y + Math.sin(a) * 12.5, 3]); }), { size: 0.45 }));
  return out.join("");
}
function bell() {
  const [x, y] = BELL;
  const F = G.frameOf([x, y, 3], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const dome = G.solidOf([[0, 13], [1.2, 13, 1], [5, 11.6, 1], [10, 8.4, 1], [13.4, 4.4, 1], [15, 0]], F, P);
  return S(dome, { tone: "hi", crease: "lo", inner: L(G.arcOf(F, 1.2, 13, P), { tone: "faint" }) });
}
function plunger() {
  const [x, y] = BELL;
  return S(k.cylinder(x, y, 1.3, 17.5, 4, P, 14), { tone: "mid", crease: "none" }) +
    S(k.cylinder(x, y, 3.4, 21.5, 2, P, 24, 0.4), { tone: "mid" });
}

// ---- cable del contacto de la alarma: de la base del dial a la de la campana, por el piso ----
const wire = k.wireSvg(at([DIAL[0] + 8.5, DIAL[1] + 5, 1]), at([BELL[0] - 13, BELL[1] + 7, 1.5]), { via: [at([DIAL[0] + 22, DIAL[1] + 22, 0]), at([BELL[0] - 20, DIAL[1] + 22, 0])], tone: "lo", size: 0.9 });

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Contador mecánico de banco: un motor con volante (el reloj) mueve un reductor de dos etapas, 8:1 y 10:1, que divide por 80 (el prescaler). El eje de salida da una vuelta por tick; su perno empuja un trinquete que avanza un paso el dial de 16 posiciones (el contador de 4 bits). Cuando la aguja llega a la pestaña de la alarma (el comparador), suena la campana y la aguja vuelve a cero en el mismo paso (la recarga automática).",
  body: [
    plate(),
    wire,
    motor(),
    pillar(S1, GA.z),
    pillar(S2, GB.z),
    gearStatic(S1, GA, 64),
    `<g data-part="topA">${spinTop(k, P, S1, GA.r, GA.z + GA.h, 0, 4)}</g>`,
    pinion1(),
    gearStatic(S2, GB, 80),
    `<g data-part="topB">${spinTop(k, P, S2, GB.r, GB.z + GB.h, 0, 5)}</g>`,
    `<g data-part="pin">${pinAt(k, P, S2, PIN_R, GB.z + GB.h, Math.PI)}</g>`,
    guide(),
    L(k.coil(COIL.from, COIL.to, [COIL.cy, COIL.cz], 1.8, 5, "x", P).back, { tone: "lo" }),
    `<g data-part="pawl">${pawl()}</g>`,
    `<path data-part="coil" class="iso-line" data-tone="mid" d="${k.coil(COIL.from, COIL.to, [COIL.cy, COIL.cz], 1.8, 5, "x", P).front}"/>`,
    dialBase(),
    dial(),
    `<g data-part="tab">${tabAt(k, P, DIAL, DIAL_R, DIAL_TOP, MODEL.alarm, STEPS)}</g>`,
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needleAt(k, P, DIAL, DIAL_R, DIAL_TOP + 1.2, 0, STEPS)}" style="stroke-width:1.2"/>`,
    D([at([DIAL[0], DIAL[1], DIAL_TOP + 1.4])], { size: 0.7, tone: "hi" }),
    bellBase(),
    bell(),
    `<g data-part="plunger">${plunger()}</g>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const K = { lineSvg, lineOnTop, ring, solidSvg, cylinder, dotsSvg, iso, extrude };
const spinTop = ${spinTop.toString()};
const pinAt = ${pinAt.toString()};
const needleAt = ${needleAt.toString()};
const tabAt = ${tabAt.toString()};
const S1 = ${JSON.stringify(S1)}, S2 = ${JSON.stringify(S2)}, DIAL = ${JSON.stringify(DIAL)};
const GA = ${JSON.stringify(GA)}, GB = ${JSON.stringify(GB)};
const PIN_R = ${PIN_R}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP}, STEPS = ${STEPS}, DIV = ${DIV};
const PAWL_X0 = ${PAWL.x0}, COIL = ${JSON.stringify(COIL)};
const TICK_S = 1.4;            // segundos de pantalla por tick (en el micro, 1 µs)
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (n) => svg.querySelector('[data-part="' + n + '"]');
const topA = $("topA"), topB = $("topB"), pin = $("pin"), pawl = $("pawl"), coilEl = $("coil"), tab = $("tab"), needle = $("needle"), plunger = $("plunger");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const bits = (n) => n.toString(2).padStart(4, "0");
let alarm = ${MODEL.alarm}, tabShown = alarm, count = 0, shown = 0, turns = 0;
let phase = 0.5, bellAt = -9, hitUntil = -9, frame = 0, last = 0, visible = false, touring = true, idle = 0, tourClock = 0;
function say() {
  const text = "cuenta " + bits(count) + " · alarma " + alarm + " · período " + alarm + " µs";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(alarm));
  stage.setAttribute("aria-valuetext", text);
}
function draw(t) {
  const angleB = phase * Math.PI * 2;                 // eje de salida: una vuelta por tick, perno en 0 = empuja
  topB.innerHTML = spinTop(K, P, S2, GB.r, GB.z + GB.h, angleB, 5);
  pin.innerHTML = pinAt(K, P, S2, PIN_R, GB.z + GB.h, angleB);
  topA.innerHTML = spinTop(K, P, S1, GA.r, GA.z + GA.h, -angleB * 10, 4);   // 10 vueltas por tick, sentido contrario
  const push = Math.max(0, Math.cos(angleB) * PIN_R + 1.7 + S2[0] - PAWL_X0) * (Math.abs(Math.sin(angleB) * PIN_R) < 13 ? 1 : 0);
  pawl.setAttribute("transform", translateAlong(P, [push, 0, 0]));
  coilEl.setAttribute("d", coil(COIL.from, COIL.to + push, [COIL.cy, COIL.cz], 1.8, 5, "x", P).front);
  needle.setAttribute("d", needleAt(K, P, DIAL, DIAL_R, DIAL_TOP + 1.2, shown, STEPS));
  tab.innerHTML = tabAt(K, P, DIAL, DIAL_R, DIAL_TOP, tabShown, STEPS);
  const ding = Math.max(0, 1 - (t - bellAt) / 0.35);
  plunger.setAttribute("transform", translateAlong(P, [0, 0, -2.2 * Math.sin(Math.PI * Math.min(1, (t - bellAt) / 0.35)) * (ding > 0 ? 1 : 0)]));
  say();
}
function tick(now) {
  const t = now / 1000;
  const dt = last ? Math.min(t - last, 1 / 20) : 1 / 60;
  last = t;
  if (touring) { tourClock += dt; const want = 4 + (Math.floor(tourClock / 16) % 3) * 4; if (want !== alarm) { alarm = want; } }
  const before = phase;
  phase = (phase + dt / TICK_S) % 1;
  if (phase < before) {                                 // el perno pasó por el trinquete: un tick
    turns++;
    count = count + 1;
    if (count >= alarm) { count = 0; bellAt = t; hitUntil = t + 0.3; }      // comparador: llegó a la alarma → evento y recarga en el mismo paso
  }
  // la aguja toca la pestaña (el instante en que el comparador dispara) y la recarga la vuelve rápido a cero
  const target = t < hitUntil ? alarm : count;
  if (target === 0 && shown > 1) shown = Math.max(0, shown - dt * STEPS * 3);
  else shown += (target - shown) * (1 - Math.exp(-dt / 0.07));
  if (Math.abs(target - shown) < 0.002) shown = target;
  tabShown += (alarm - tabShown) * (1 - Math.exp(-dt / 0.18));
  if (Math.abs(alarm - tabShown) < 0.002) tabShown = alarm;
  draw(t);
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false;
  alarm = Math.min(STEPS - 1, Math.max(2, next));
  if (count >= alarm) count = 0;
  clearTimeout(idle); idle = setTimeout(() => { touring = true; tourClock = 0; }, 5000);
  if (still.matches) { tabShown = alarm; shown = count; draw(0); }
  run();
};
new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (e) => {
  const box = svg.getBoundingClientRect();
  steer(Math.round(2 + Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)) * (STEPS - 3)));
});
stage.addEventListener("keydown", (e) => {
  const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
  if (!d) return;
  e.preventDefault(); steer(alarm + d);
});
if (still.matches) { count = 5; shown = 5; touring = false; }
draw(0);
`;

const body = k.plateHtml({
  fig: "Fig 2.1b",
  title: "El temporizador por dentro",
  hint: "puntero o flechas: alarma",
  readout: `cuenta 0000 · alarma ${MODEL.alarm} · período ${MODEL.alarm} µs`,
  keys: [
    { mark: "lit", label: "Aguja: el valor del contador" },
    { mark: "raised", label: "Reloj, prescaler ÷80, contador de 16 pasos, alarma y campana" },
  ],
  caption: `Un motor con volante hace de reloj (en el micro, ${MODEL.clockMHz} MHz). Dos etapas de engranajes, 8:1 y 10:1, dividen por ${DIV}: el eje de salida da una vuelta por tick, que a ${MODEL.clockMHz} MHz dura 1 µs. Cada vuelta, su perno empuja el trinquete y el dial avanza un paso; con 16 pasos es un contador de 4 bits (en el ESP32-S3, de 54). Cuando la aguja llega a la pestaña de la alarma suena la campana y vuelve a cero en el mismo paso: el período es el valor de la alarma en ticks.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Contador mecánico: las flechas corren la alarma" aria-valuemin="2" aria-valuemax="15" aria-valuenow="${MODEL.alarm}">${svg}</div>`,
});

const file = theme === "light" ? "temporizador-light.html" : "temporizador.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "Temporizador por dentro", theme, body, script: kitScript() + live }));
console.log("wrote", file);
