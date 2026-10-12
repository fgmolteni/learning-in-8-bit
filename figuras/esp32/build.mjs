// Fig: una placa ESP32-DevKitC por fuera, enchufada en una protoboard (skill anatomy).
// node build.mjs [--light] escribe esp32.html (o esp32-light.html) al lado.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const SKILL = "/home/gabi/Documentos/Proyectos/learning_in_8_bit/.claude/skills/anatomy";
const k = await import(`${SKILL}/kit/iso-kit.mjs`);
const { kitScript } = await import(`${SKILL}/scripts/inline-kit.mjs`);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 600, HEIGHT = 380;

// ---- medidas reales, 1 mm = 4 unidades ----
const MM = 4, PITCH = 2.54 * MM;            // paso de 0,1 in
const PINS = 19, ROW_Y = (25.4 / 2) * MM;   // 2 × 19 pines; filas separadas 1 in
const BB = { x: -150, y: -92, w: 300, d: 184, r: 6 };   // protoboard
const BB_H = 9 * MM / 1.5;                  // alto dibujado de la protoboard (se ve el canto, no importa la cifra)
const SPACER = 2.5 * MM;                    // plástico del conector macho bajo la placa
const PCB = { x: -109, y: -56, w: 218, d: 112, r: 3 };
const PCB_Z = SPACER, PCB_T = 1.6 * MM, TOP = PCB_Z + PCB_T;
const MOD = { x: PCB.x, y: -9 * MM, w: 25.5 * MM, d: 18 * MM, r: 1.5 };   // ESP32-WROOM-32E: 18 × 25,5 mm
const MOD_T = 0.8 * MM;
const ANT_L = 6.6 * MM;                     // zona de antena, en el extremo lejano
const CAN = { x: MOD.x + ANT_L + 1.5, y: MOD.y + 1.6, w: MOD.w - ANT_L - 3.2, d: MOD.d - 3.2, r: 1.2 };
const CAN_Z = TOP + MOD_T, CAN_H = (3.1 - 0.8) * MM;   // módulo de 3,1 mm de alto en total

const P = k.fitProjection(
  [...k.boxCorners(BB, -BB_H, 0), ...k.boxCorners(PCB, 0, CAN_Z + CAN_H)],
  WIDTH, HEIGHT, { pad: 20, azimuth: 56, elevation: 34 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const depth = ([x, y, z]) => k.depthOf([x, y, z], P);
const pinXs = Array.from({ length: PINS }, (_, i) => (i - (PINS - 1) / 2) * PITCH);

// ---- protoboard ----
function breadboard() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BB, -BB_H, BB_H, P)}"/>`];
  out.push(S(k.slabOf(BB, -BB_H, BB_H, P, 6, 1.2), { tone: "mid", inner: L(k.sideSeam(BB, -BB_H + 3, P, 6), { tone: "faint" }) }));
  // canal central, de punta a punta de la zona de contactos
  const channel = { x: BB.x + 12, y: -3, w: BB.w - 24, d: 6, r: 2 };
  out.push(L(k.planOutline(channel, 0, P, 3), { tone: "lo" }));
  // agujeros: 5 por columna a cada lado del canal, más los rieles de alimentación
  const cols = Math.floor((BB.w - 30) / PITCH);
  const x0 = -((cols - 1) / 2) * PITCH;
  const holes = [];
  for (const yy of [8, 8 + PITCH, 8 + 2 * PITCH, 8 + 3 * PITCH, 8 + 4 * PITCH]) for (const s of [1, -1]) for (let i = 0; i < cols; i++) holes.push([x0 + i * PITCH, s * (yy + 6), 0]);
  for (const s of [1, -1]) for (const yy of [70, 70 + PITCH]) for (let i = 0; i < cols; i++) if (i % 6 !== 5) holes.push([x0 + i * PITCH, s * yy, 0]);
  out.push(D(holes.map(at), { size: 0.55, tone: "lo" }));
  // rieles: una franja por polaridad, de borde a borde de la zona de contactos
  for (const s of [1, -1]) {
    const strip = { x: x0 - 6, y: s > 0 ? 64 : -64 - 2, w: (cols - 1) * PITCH + 12, d: 2, r: 1 };
    out.push(L(k.planOutline(strip, 0, P, 2), { tone: s > 0 ? "red" : "blue" }));
    const strip2 = { x: x0 - 6, y: s > 0 ? 86 : -86 - 2, w: (cols - 1) * PITCH + 12, d: 2, r: 1 };
    out.push(L(k.planOutline(strip2, 0, P, 2), { tone: s > 0 ? "blue" : "red" }));
  }
  return out.join("");
}

// ---- conectores macho bajo la placa ----
function headers() {
  const out = [];
  for (const s of [-1, 1]) {
    const strip = { x: pinXs[0] - PITCH / 2, y: s * ROW_Y - PITCH / 2, w: PITCH * PINS, d: PITCH, r: 0.6 };
    out.push(S(k.slabOf(strip, 0, SPACER, P, 2, 0.3), { tone: "lo", inner: L(pinXs.slice(1).map((x) => k.segment([x - PITCH / 2, strip.y + strip.d, 0], [x - PITCH / 2, strip.y + strip.d, SPACER], P)).join(""), { tone: "faint" }) }));
  }
  return out.join("");
}

// ---- la placa ----
function pcb() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(PCB, 4), PCB_Z, 0.1, P)}" style="filter:blur(5px)"/>`];
  out.push(S(k.slabOf(PCB, PCB_Z, PCB_T, P, 4, 0.5), { tone: "mid" }));
  // serigrafía: un marco alrededor de cada fila de pines
  for (const s of [-1, 1]) out.push(L(k.planOutline({ x: pinXs[0] - PITCH / 2 - 1, y: s * ROW_Y - PITCH / 2 - 1, w: PITCH * PINS + 2, d: PITCH + 2, r: 1 }, TOP, P, 2), { tone: "faint" }));
  // pistas: unas líneas cortas entre componentes, cada una de pad a pad
  const tracks = [
    [[60, -24], [86, -24], [86, -12]], [[44, 14], [56, 14]], [[44, 22], [56, 22]], [[70, 32], [86, 32], [96, 24]],
    [[-2, 30], [36, 30]], [[-2, -30], [50, -30]],
  ];
  out.push(L(tracks.map((pts) => k.onTop(pts, TOP, P)).join(""), { tone: "lo" }));
  out.push(D(tracks.flatMap((pts) => [pts[0], pts[pts.length - 1]]).map(([x, y]) => at([x, y, TOP])), { size: 0.5, tone: "mid" }));
  return out.join("");
}

// ---- piezas que se resaltan: cada una en un <g data-part> ----
const PARTS = [];
const part = (name, centre, svg) => PARTS.push({ name, centre, svg });

// módulo: placa del módulo, almenado, blindaje y antena
part("modulo", [CAN.x + CAN.w / 2, 0, CAN_Z + CAN_H], (() => {
  const out = [];
  out.push(S(k.slabOf(MOD, TOP, MOD_T, P, 3, 0.3), { tone: "hi", crease: "lo" }));
  // almenado: 38 contactos del módulo en sus bordes (los de los lados largos)
  const cast = [];
  for (let i = 0; i < 14; i++) { const x = CAN.x + 3 + i * (CAN.w - 6) / 13; cast.push([x, MOD.y + MOD.d, TOP + MOD_T], [x, MOD.y, TOP + MOD_T]); }
  out.push(D(cast.map(at), { size: 0.45, tone: "mid" }));
  out.push(S(k.slabOf(CAN, CAN_Z, CAN_H, P, 3, 0.6), { tone: "hi", crease: "lo", inner: L(k.sideSeam(CAN, CAN_Z + 1.2, P, 3), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(CAN, 3.5), CAN_Z + CAN_H, P, 3), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([CAN.x + CAN.w / 2, CAN.y + CAN.d / 2 + 2], CAN_Z + CAN_H, P, "x"), "ESP32-WROOM-32E", { size: 4.2, tone: "mid", anchor: "middle" }));
  out.push(D([at([CAN.x + 6, CAN.y + 6, CAN_Z + CAN_H])], { size: 0.8, tone: "hi" }));
  return out.join("");
})());
part("antena", [MOD.x + ANT_L / 2, 0, TOP + MOD_T], (() => {
  // pista en meandro de la antena impresa, de un extremo al otro de su zona
  const x0 = MOD.x + 4, x1 = MOD.x + ANT_L - 2, pts = [];
  const ys = Array.from({ length: 9 }, (_, i) => MOD.y + 6 + i * (MOD.d - 12) / 8);
  ys.forEach((y, i) => { pts.push(i % 2 ? [x1, y] : [x0, y]); pts.push(i % 2 ? [x0, y] : [x1, y]); });
  const zone = { x: MOD.x + 1.5, y: MOD.y + 3, w: ANT_L - 1, d: MOD.d - 6, r: 1 };
  return S(k.slabOf(zone, TOP + MOD_T, 0.4, P, 2), { tone: "hi", crease: "none" }) +
    L(k.onTop(pts, TOP + MOD_T + 0.4, P), { tone: "hi" }) +
    D([at([...pts[0], TOP + MOD_T + 0.4]), at([...pts[pts.length - 1], TOP + MOD_T + 0.4])], { size: 0.55, tone: "hi" });
})());
// conector USB en el extremo cercano
const USB = { x: PCB.x + PCB.w - 20, y: -15, w: 24, d: 30, r: 1.2 };
part("usb", [USB.x + USB.w / 2, 0, TOP + 10], (() => {
  const out = [];
  for (const s of [-1, 1]) out.push(S(k.slabOf({ x: USB.x + 2, y: s > 0 ? USB.y + USB.d - 1 : USB.y - 3, w: 8, d: 4, r: 0.6 }, TOP, 1.2, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf(USB, TOP, 10, P, 3, 0.5), { tone: "hi", crease: "lo", inner: L(k.sideSeam(USB, TOP + 5, P, 3), { tone: "faint" }) }));
  // boca del conector en la cara de adelante (+x)
  const x = USB.x + USB.w, mouth = [[x, -11, TOP + 2.2], [x, 11, TOP + 2.2], [x, 9, TOP + 7.8], [x, -9, TOP + 7.8]];
  out.push(L(k.pathOf(mouth.map(at), true), { tone: "hi" }));
  out.push(L(k.segment([x, -7, TOP + 5], [x, 7, TOP + 5], P), { tone: "lo" }));
  return out.join("");
})());
// puente USB-serie: QFN de 5 × 5 mm
const QFN = { x: 50, y: 6, w: 20, d: 20, r: 1 };
part("puente", [QFN.x + 10, QFN.y + 10, TOP + 3], (() => {
  const out = [S(k.slabOf(QFN, TOP, 3.6, P, 2, 0.4), { tone: "hi", crease: "lo" })];
  out.push(D([at([QFN.x + 3, QFN.y + 3, TOP + 3.6])], { size: 0.7, tone: "mid" }));
  const pads = [];
  for (let i = 0; i < 5; i++) { const t = QFN.x + 3 + i * 3.5; pads.push([t, QFN.y + QFN.d + 1, TOP], [QFN.x + QFN.w + 1, QFN.y + 3 + i * 3.5, TOP]); }
  out.push(D(pads.map(at), { size: 0.5, tone: "mid" }));
  return out.join("");
})());
// regulador LDO en SOT-223
const LDO = { x: 50, y: -40, w: 26, d: 14, r: 0.8 };
part("regulador", [LDO.x + 13, LDO.y + 7, TOP + 6], (() => {
  const out = [];
  out.push(S(k.slabOf({ x: LDO.x + 4, y: LDO.y + LDO.d, w: 18, d: 6, r: 0.4 }, TOP, 0.8, P, 2), { tone: "mid" }));   // aleta
  for (const dx of [5, 12, 19]) out.push(S(k.slabOf({ x: LDO.x + dx, y: LDO.y - 5, w: 3, d: 5, r: 0.3 }, TOP, 1.2, P, 2), { tone: "mid" }));   // patas
  out.push(S(k.slabOf(LDO, TOP + 0.6, 6.4, P, 2, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(LDO, 2.4), TOP + 7, P, 2), { tone: "faint" }));
  return out.join("");
})());
// botones EN y BOOT, a los lados del USB
function button(cx, cy) {
  const base = { x: cx - 10, y: cy - 7, w: 20, d: 14, r: 1 };
  return S(k.slabOf(base, TOP, 5, P, 3, 0.5), { tone: "hi", crease: "lo" }) +
    D(k.corners(base, 2.2).map(([x, y]) => at([x, y, TOP + 5])), { size: 0.45, tone: "mid" }) +
    S(k.cylinder(cx, cy, 4.2, TOP + 5, 2.2, P, 24, 0.4), { tone: "hi", crease: "lo" });
}
part("en", [84, 40, TOP + 7], button(84, 40));
part("boot", [84, -40, TOP + 7], button(84, -40));
// LED de alimentación
part("led", [28, 40, TOP + 3], (() => {
  const body = { x: 22, y: 36, w: 12, d: 7, r: 0.6 };
  return S(k.slabOf(body, TOP, 2.2, P, 2), { tone: "hi", crease: "lo" }) +
    S(k.slabOf(k.insetPlan(body, 1.6), TOP + 2.2, 1.2, P, 2), { tone: "hi", crease: "lo" });
})());
// pines: soldaduras y puntas de los 2 × 19 contactos; la fila de atrás se pinta antes que el módulo
function pinRow(sign) {
  const out = [];
  const row = pinXs.map((x) => [x, sign * ROW_Y]).sort((a, b) => depth([...a, 0]) - depth([...b, 0]));
  for (const [x, y] of row) {
    out.push(L(k.ring(x, y, 3.4, TOP, P, 16), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 2.4, TOP, 1.4, P, 14), { tone: "hi", crease: "lo" }));   // filete de soldadura
    out.push(S(k.slabOf({ x: x - 1, y: y - 1, w: 2, d: 2, r: 0.3 }, TOP + 1.4, 3, P, 2), { tone: "hi", crease: "none" }));   // punta del pin
  }
  return out.join("");
}
part("pines", [0, ROW_Y, TOP], pinRow(1));

// pasivos 0603 sueltos (no se resaltan): resistencias y capacitores junto al puente y al regulador
function passives() {
  const spots = [[40, 8, 0], [40, 20, 0], [76, 6, 1], [36, -18, 0], [62, -16, 1], [44, -30, 1], [14, 40, 0], [-2, 36, 1], [-2, -36, 1], [96, 12, 1]];
  return spots.sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0])).map(([x, y, turn]) => {
    const w = turn ? 3.2 : 6.4, d = turn ? 6.4 : 3.2;
    const body = { x: x - w / 2, y: y - d / 2, w, d, r: 0.3 };
    const capA = turn ? { x: body.x, y: body.y, w, d: 1.4, r: 0.2 } : { x: body.x, y: body.y, w: 1.4, d, r: 0.2 };
    const capB = turn ? { ...capA, y: body.y + d - 1.4 } : { ...capA, x: body.x + w - 1.4 };
    return S(k.slabOf(body, TOP, 2.4, P, 2), { tone: "mid" }) +
      S(k.slabOf(capA, TOP, 2.6, P, 2), { tone: "mid", crease: "none" }) + S(k.slabOf(capB, TOP, 2.6, P, 2), { tone: "mid", crease: "none" });
  }).join("");
}

// orden de pintado: base, conectores, placa, pasivos y piezas por profundidad
const sorted = [...PARTS].sort((a, b) => depth(a.centre) - depth(b.centre));
// la antena está impresa sobre la placa del módulo: va justo después de él
sorted.splice(sorted.findIndex((p) => p.name === "antena"), 1);
sorted.splice(sorted.findIndex((p) => p.name === "modulo") + 1, 0, PARTS.find((p) => p.name === "antena"));
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Placa ESP32-DevKitC enchufada en una protoboard: el módulo ESP32-WROOM-32E con su blindaje y su antena de PCB en el extremo lejano, el conector USB en el cercano, el puente USB-serie, el regulador de 3,3 V, los botones EN y BOOT, el LED de alimentación y las dos tiras de 19 pines.",
  body: [breadboard(), headers(), pcb(), `<g data-part="pines">${pinRow(-1)}</g>`, passives(), ...sorted.map((p) => `<g data-part="${p.name}">${p.svg}</g>`)],
});

const INFO = {
  modulo: "módulo WROOM-32E: micro, cristal y flash",
  antena: "antena de PCB, 2,4 GHz",
  usb: "USB: 5 V y programación",
  puente: "puente USB-serie a la UART0",
  regulador: "regulador LDO: de 5 V a 3,3 V",
  en: "EN: reinicia el micro",
  boot: "BOOT: modo descarga",
  led: "LED de alimentación",
  pines: "2 × 19 pines a 2,54 mm",
};
const TOUR = ["modulo", "antena", "usb", "puente", "regulador", "en", "boot", "led", "pines"];
const CENTRES = Object.fromEntries(PARTS.map((p) => [p.name, at(p.centre)]));

const live = `
const INFO = ${JSON.stringify(INFO)}, TOUR = ${JSON.stringify(TOUR)}, CENTRES = ${JSON.stringify(CENTRES)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
let current = "", index = 0, touring = !still.matches, timer = 0, idle = 0;
function pick(name) {
  if (name === current) return;
  if (current) svg.querySelectorAll('[data-part="' + current + '"] .iso-solid').forEach((s) => s.removeAttribute("data-lit"));
  current = name;
  svg.querySelectorAll('[data-part="' + name + '"] .iso-solid').forEach((s) => s.setAttribute("data-lit", ""));
  readout.textContent = INFO[name];
  stage.setAttribute("aria-valuenow", String(TOUR.indexOf(name)));
  stage.setAttribute("aria-valuetext", INFO[name]);
}
const step = () => { if (touring) { index = (index + 1) % TOUR.length; pick(TOUR[index]); } };
new IntersectionObserver((es) => {
  const on = es[es.length - 1].isIntersecting;
  clearInterval(timer);
  if (on && !still.matches) timer = setInterval(step, 2600);
}).observe(stage);
const hold = () => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; }, 5000); };
stage.addEventListener("pointermove", (e) => {
  const m = svg.getScreenCTM().inverse(), p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
  let best = TOUR[0], dist = Infinity;
  for (const name of TOUR) { const [x, y] = CENTRES[name], d = (x - p.x) ** 2 + (y - p.y) ** 2; if (d < dist) { dist = d; best = name; } }
  hold(); index = TOUR.indexOf(best); pick(best);
});
stage.addEventListener("keydown", (e) => {
  const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (!d) return;
  e.preventDefault(); hold(); index = (index + d + TOUR.length) % TOUR.length; pick(TOUR[index]);
});
pick(TOUR[0]);
`;

const body = k.plateHtml({
  fig: "Fig 1.2",
  title: "ESP32-DevKitC",
  hint: "puntero: pieza",
  readout: INFO.modulo,
  keys: [
    { mark: "lit", label: "La pieza señalada" },
    { mark: "raised", label: "Módulo, USB, puente USB-serie, regulador, botones, LED y pines" },
  ],
  caption: "Una placa de desarrollo ESP32-DevKitC enchufada en una protoboard, a escala (1 mm = 4 px). El micro no se ve: está dentro del módulo ESP32-WROOM-32E, de 18 × 25,5 mm, bajo el blindaje metálico, junto con el cristal de 40 MHz y la flash SPI. La antena impresa queda en el extremo, fuera del blindaje. El puente USB-serie une el USB con la UART0 para programarlo; el regulador LDO baja los 5 V del USB a 3,3 V; EN reinicia y BOOT, apretado al reiniciar, entra en modo descarga. Las dos tiras de 19 pines a 2,54 mm entran en la protoboard.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Placa ESP32: las flechas recorren las piezas" aria-valuemin="0" aria-valuemax="${TOUR.length - 1}" aria-valuenow="0">${svg}</div>`,
});
const file = theme === "light" ? "esp32-light.html" : "esp32.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "ESP32-DevKitC", theme, body, script: kitScript() + live }));
console.log("wrote", file);
