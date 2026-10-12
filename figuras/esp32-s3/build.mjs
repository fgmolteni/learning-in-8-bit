// Fig: una placa ESP32-S3-DevKitC-1 por fuera, enchufada en una protoboard (skill anatomy).
// node build.mjs [--light] escribe esp32-s3.html (o esp32-s3-light.html) al lado.
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
const PINS = 22, ROW_Y = (25.4 / 2) * MM;   // 2 × 22 pines; filas separadas 1 in (por confirmar)
const BB = { x: -168, y: -92, w: 336, d: 184, r: 6 };   // protoboard
const BB_H = 9 * MM / 1.5;                  // alto dibujado de la protoboard (se ve el canto, no importa la cifra)
const SPACER = 2.5 * MM;                    // plástico del conector macho bajo la placa
const PCB = { x: -126, y: -56, w: 260, d: 112, r: 3 };   // del orden de 65 × 28 mm (por confirmar)
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
    [[30, 16], [40, 16]], [[60, 2], [66, 2], [66, -14]], [[24, -24], [30, -24]], [[-10, -24], [-10, 0], [0, 0]], [[62, -4], [104, -4]],
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
  out.push(k.faceTextSvg(k.topMatrix([CAN.x + CAN.w / 2, CAN.y + CAN.d / 2 + 2], CAN_Z + CAN_H, P, "x"), "ESP32-S3-WROOM-1", { size: 4.2, tone: "mid", anchor: "middle" }));
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
// dos conectores USB-C en el extremo cercano: uno al puente USB-serie, otro al USB propio del S3
function usbC(cy) {
  const shell = { x: PCB.x + PCB.w - 25, y: cy - 18, w: 29, d: 36, r: 6 };   // del orden de 8,9 × 7,3 mm y 3,2 mm de alto
  const out = [];
  for (const s of [-1, 1]) out.push(S(k.slabOf({ x: shell.x + 3, y: s > 0 ? shell.y + shell.d - 1 : shell.y - 3, w: 8, d: 4, r: 0.6 }, TOP, 1.2, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf(shell, TOP, 13, P, 6, 0.5), { tone: "hi", crease: "lo", inner: L(k.sideSeam(shell, TOP + 6.5, P, 6), { tone: "faint" }) }));
  // boca: un estadio en la cara de adelante (+x), con la lengüeta adentro
  const x = shell.x + shell.w, r = 4.2, pts = [];
  for (let a = 0; a <= 12; a++) { const t = -Math.PI / 2 + (a / 12) * Math.PI; pts.push([x, cy + 11 + Math.cos(t) * r, TOP + 6.5 + Math.sin(t) * r]); }
  for (let a = 0; a <= 12; a++) { const t = Math.PI / 2 + (a / 12) * Math.PI; pts.push([x, cy - 11 + Math.cos(t) * r, TOP + 6.5 + Math.sin(t) * r]); }
  out.push(L(k.pathOf(pts.map(at), true), { tone: "hi" }));
  out.push(L(k.pathOf([[x, cy - 8, TOP + 5.8], [x, cy + 8, TOP + 5.8], [x, cy + 8, TOP + 7.2], [x, cy - 8, TOP + 7.2]].map(at), true), { tone: "lo" }));
  return out.join("");
}
part("usb-uart", [PCB.x + PCB.w - 10, -27, TOP + 13], usbC(-27));
part("usb-otg", [PCB.x + PCB.w - 10, 27, TOP + 13], usbC(27));
// puente USB-serie: QFN de 5 × 5 mm
const QFN = { x: 40, y: -8, w: 20, d: 20, r: 1 };
part("puente", [QFN.x + 10, QFN.y + 10, TOP + 3], (() => {
  const out = [S(k.slabOf(QFN, TOP, 3.6, P, 2, 0.4), { tone: "hi", crease: "lo" })];
  out.push(D([at([QFN.x + 3, QFN.y + 3, TOP + 3.6])], { size: 0.7, tone: "mid" }));
  const pads = [];
  for (let i = 0; i < 5; i++) { const t = QFN.x + 3 + i * 3.5; pads.push([t, QFN.y + QFN.d + 1, TOP], [QFN.x + QFN.w + 1, QFN.y + 3 + i * 3.5, TOP]); }
  out.push(D(pads.map(at), { size: 0.5, tone: "mid" }));
  return out.join("");
})());
// regulador LDO en SOT-223
const LDO = { x: 30, y: -38, w: 26, d: 14, r: 0.8 };
part("regulador", [LDO.x + 13, LDO.y + 7, TOP + 6], (() => {
  const out = [];
  out.push(S(k.slabOf({ x: LDO.x + 4, y: LDO.y + LDO.d, w: 18, d: 6, r: 0.4 }, TOP, 0.8, P, 2), { tone: "mid" }));   // aleta
  for (const dx of [5, 12, 19]) out.push(S(k.slabOf({ x: LDO.x + dx, y: LDO.y - 5, w: 3, d: 5, r: 0.3 }, TOP, 1.2, P, 2), { tone: "mid" }));   // patas
  out.push(S(k.slabOf(LDO, TOP + 0.6, 6.4, P, 2, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(LDO, 2.4), TOP + 7, P, 2), { tone: "faint" }));
  return out.join("");
})());
// botones BOOT y RST, detrás de los USB-C
function button(cx, cy) {
  const base = { x: cx - 10, y: cy - 7, w: 20, d: 14, r: 1 };
  return S(k.slabOf(base, TOP, 5, P, 3, 0.5), { tone: "hi", crease: "lo" }) +
    D(k.corners(base, 2.2).map(([x, y]) => at([x, y, TOP + 5])), { size: 0.45, tone: "mid" }) +
    S(k.cylinder(cx, cy, 4.2, TOP + 5, 2.2, P, 24, 0.4), { tone: "hi", crease: "lo" });
}
part("rst", [84, 30, TOP + 7], button(84, 30));
part("boot", [84, -30, TOP + 7], button(84, -30));
// LED RGB direccionable, 5 × 5 mm, con su lente redonda
part("rgb", [4, 28, TOP + 4], (() => {
  const body = { x: -6, y: 18, w: 20, d: 20, r: 1 };
  return S(k.slabOf(body, TOP, 3.2, P, 2, 0.4), { tone: "hi", crease: "lo" }) +
    D([at([body.x + 2.5, body.y + 2.5, TOP + 3.2])], { size: 0.6, tone: "mid" }) +
    S(k.cylinder(4, 28, 6.4, TOP + 3.2, 1, P, 32, 0.4), { tone: "hi", crease: "lo" }) +
    L(k.ring(4, 28, 3.2, TOP + 4.2, P, 24), { tone: "faint" });
})());
// pines: soldaduras y puntas de los 2 × 22 contactos; la fila de atrás se pinta antes que el módulo
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
  const spots = [[30, 10, 0], [30, 22, 0], [66, 0, 1], [24, -18, 0], [62, -20, 1], [64, -32, 1], [-10, -30, 1], [100, 4, 1], [30, 36, 0]];
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
  label: "Placa ESP32-S3-DevKitC-1 enchufada en una protoboard: el módulo ESP32-S3-WROOM-1 con su blindaje y su antena de PCB en el extremo lejano, dos conectores USB-C en el cercano (uno al puente USB-serie y otro al USB propio del S3), el regulador de 3,3 V, los botones BOOT y RST, el LED RGB direccionable y las dos tiras de 22 pines.",
  body: [breadboard(), headers(), pcb(), `<g data-part="pines">${pinRow(-1)}</g>`, passives(), ...sorted.map((p) => `<g data-part="${p.name}">${p.svg}</g>`)],
});

const INFO = {
  modulo: "módulo S3-WROOM-1: micro, cristal y flash",
  antena: "antena de PCB, 2,4 GHz",
  "usb-uart": "USB-C «UART»: por el puente USB-serie",
  "usb-otg": "USB-C «USB»: el USB propio del S3",
  puente: "puente USB-serie a la UART0",
  regulador: "regulador LDO: de 5 V a 3,3 V",
  rst: "RST: reinicia el micro",
  boot: "BOOT: modo descarga",
  rgb: "LED RGB direccionable",
  pines: "2 × 22 pines a 2,54 mm",
};
const TOUR = ["modulo", "antena", "usb-uart", "usb-otg", "puente", "regulador", "rst", "boot", "rgb", "pines"];
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
  fig: "Fig 1.3",
  title: "ESP32-S3-DevKitC-1",
  hint: "puntero: pieza",
  readout: INFO.modulo,
  keys: [
    { mark: "lit", label: "La pieza señalada" },
    { mark: "raised", label: "Módulo, USB, puente USB-serie, regulador, botones, LED y pines" },
  ],
  caption: "Una placa ESP32-S3-DevKitC-1 en una protoboard, a escala (1 mm = 4 px). Como en la ESP32-DevKitC, el micro está dentro del módulo, aquí el ESP32-S3-WROOM-1 de 18 × 25,5 mm, bajo el blindaje y junto con el cristal de 40 MHz y la flash. Lo nuevo: dos USB-C. El marcado «UART» pasa por el puente USB-serie a la UART0; el marcado «USB» va directo al USB propio del S3, que puede programarlo sin puente. El LED RGB es direccionable, de un solo cable de datos. RST reinicia; BOOT, apretado al reiniciar, entra en modo descarga. Las dos tiras son de 22 pines a 2,54 mm.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Placa ESP32-S3: las flechas recorren las piezas" aria-valuemin="0" aria-valuemax="${TOUR.length - 1}" aria-valuenow="0">${svg}</div>`,
});
const file = theme === "light" ? "esp32-s3-light.html" : "esp32-s3.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "ESP32-S3-DevKitC-1", theme, body, script: kitScript() + live }));
console.log("wrote", file);
