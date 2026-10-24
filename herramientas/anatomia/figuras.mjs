// Figuras en despiece de las cabeceras de la portada: un objeto por hoja, sus partes separadas sobre un eje,
// con callouts numerados como los de la fig. 1. Dibujo plano del sitio (clases f*/s* y canales a–d), con la
// proyección isométrica del kit anatomy (.claude/skills/anatomy/kit/iso-kit.mjs).
// Escribe el SVG y la leyenda entre <!-- anatomia:<id>:inicio/fin --> de index.html y assets/anatomia-datos.js.
// Uso: node herramientas/anatomia/figuras.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const k = await import(join(RAIZ, ".claude", "skills", "anatomy", "kit", "iso-kit.mjs"));

const W = 420, H = 360;
const r1 = (v) => Math.round(v * 10) / 10;
const camino = (pts, P, cerrado = false) => k.pathOf(pts.map((p) => k.iso(p, P)), cerrado);

// un sólido del kit en dibujo plano: silueta en el tono del costado, tapa un paso más clara, borde de 1,5
const plano = (paths, { lado, tapa, borde }) =>
  `<path class="${lado}" d="${paths.fill}"/>` + (paths.top ? `<path class="${tapa}" d="${paths.top}"/>` : "") +
  `<path class="fn ${borde}" stroke-width="1.5" stroke-linejoin="round" d="${paths.outline}${paths.crease || ""}"/>`;
const caja = (plan, z, h, P, c) => plano(k.slabOf(plan, z, h, P, 2), c);
const cilindro = (x, y, r, z, h, P, c) => plano(k.cylinder(x, y, r, z, h, P, 40), c);
// cúpula: en la proyección ortográfica una esfera es un círculo; la media esfera es su mitad de arriba más
// la mitad de adelante de la elipse del borde
function cupula(x, y, r, z, P, { lado, borde }) {
  const c = k.iso([x, y, z], P), K = P.scale * Math.sqrt(1.6), arriba = [], frente = [];
  for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; arriba.push([c[0] + Math.cos(a) * r * K, c[1] + Math.sin(a) * r * K]); }
  for (let i = 0; i <= 32; i++) { const a = (i / 32) * Math.PI * 2; frente.push(k.iso([x + Math.cos(a) * r, y + Math.sin(a) * r, z], P)); }
  const abajo = frente.filter((p) => p[1] >= c[1] - 0.01).sort((p, q) => q[0] - p[0]);
  const d = k.pathOf([...arriba, ...abajo], true);
  return `<path class="${lado}" d="${d}"/><path class="fn ${borde}" stroke-width="1.5" d="${d}"/>`;
}
const CAL = (p, n, P) => {
  const [x, y] = k.iso(p, P);
  return `<g class="cal"><rect x="${r1(x)}" y="${r1(y - 9)}" width="18" height="18" class="f6"/>` +
    `<text x="${r1(x + 9)}" y="${r1(y + 5)}" text-anchor="middle" font-size="16" class="sv-tit f0">${n}</text></g>`;
};
const capa = (i, dz, cuerpo) => `<g data-capa="${i}" data-dz="${dz}">${cuerpo}</g>`;
const eje = (x, y, z0, z1, P) => `<path data-eje class="fn s3" stroke-width="1.5" stroke-dasharray="4 4" d="${camino([[x, y, z0], [x, y, z1]], P)}"/>`;

// ---------------------------------------------------------------- el chip por dentro (encapsulado QFN)
function figChip() {
  const DZ = [0, 18, 26, 46];   // marco, hilos, silicio, encapsulado
  const P = k.fitProjection([...k.boxCorners({ x: -28, y: -28, w: 56, d: 56 }, -2, DZ[3] + 6), [44, -28, DZ[3] + 6]], W, H, { pad: 18 });
  const out = [eje(0, 0, -2, DZ[3] + 8, P)];
  // 4 · marco de pines: pad expuesto y 7 pines por lado
  const metal = { lado: "f3", tapa: "f4", borde: "s5" };
  let m = caja({ x: -13, y: -13, w: 26, d: 26, r: 0.6 }, 0, 1.2, P, metal);
  const pines = [];
  for (let i = 0; i < 7; i++) {
    const t = -18 + i * 6;
    pines.push({ x: t - 1.4, y: -26, w: 2.8, d: 7 }, { x: t - 1.4, y: 19, w: 2.8, d: 7 }, { x: -26, y: t - 1.4, w: 7, d: 2.8 }, { x: 19, y: t - 1.4, w: 7, d: 2.8 });
  }
  pines.sort((a, b) => k.depthOf([a.x, a.y, 0], P) - k.depthOf([b.x, b.y, 0], P)).forEach((p) => (m += caja({ ...p, r: 0.3 }, 0, 1.2, P, metal)));
  out.push(capa(0, DZ[0], m + CAL([30, -30, 1.2], 4, P)));
  // 3 · hilos de unión: del borde del silicio a cada pin
  const hilos = [];
  for (let i = 0; i < 7; i++) {
    const t = -9 + i * 3, q = -18 + i * 6;
    for (const [a, b] of [[[t, -9], [q, -21]], [[t, 9], [q, 21]], [[-9, t], [-21, q]], [[9, t], [21, q]]]) {
      const pts = [];
      for (let j = 0; j <= 8; j++) { const u = j / 8; pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 2.8 - 1.6 * u + 5 * Math.sin(Math.PI * u) * (1 - u * 0.4)]); }
      hilos.push(camino(pts, P));
    }
  }
  out.push(capa(1, DZ[1], `<path class="fn sa3" stroke-width="1" d="${hilos.join("")}"/>` + CAL([30, -30, 4], 3, P)));
  // 2 · silicio: la pastilla, con la trama de la lógica
  let s = caja({ x: -10, y: -10, w: 20, d: 20, r: 0.2 }, 1.2, 1.6, P, { lado: "fa2", tapa: "fa3", borde: "sa4" });
  const trama = [];
  for (let i = 1; i < 5; i++) trama.push(camino([[-8, -8 + i * 3.2, 2.8], [8, -8 + i * 3.2, 2.8]], P), camino([[-8 + i * 3.2, -8, 2.8], [-8 + i * 3.2, 8, 2.8]], P));
  s += `<path class="fn sa1" stroke-width="1" d="${trama.join("")}"/>`;
  out.push(capa(2, DZ[2], s + CAL([14, -14, 2.8], 2, P)));
  // 1 · encapsulado: el plástico con el punto del pin 1 y el nombre
  let e = caja({ x: -27, y: -27, w: 54, d: 54, r: 1.2 }, 0, 6, P, { lado: "f1", tapa: "f2", borde: "s5" });
  e += `<path class="fn s4" stroke-width="1.5" d="${k.ring(-19, -19, 2.4, 6, P, 20)}"/>`;
  e += `<text transform="${k.topMatrix([0, 4], 6, P, "x")}" text-anchor="middle" font-size="9" class="sv-lbl f5">ESP32-S3</text>`;
  out.push(capa(3, DZ[3], e + CAL([31, -31, 6], 1, P)));
  return { P, svg: out.join(""), leyenda: ["encapsulado", "silicio (la pastilla)", "hilos de unión", "marco de pines"], titulo: "el chip por dentro" };
}

// ---------------------------------------------------------------- la cámara por dentro (módulo de cámara)
function figCamara() {
  const DZ = [0, 14, 28, 40, 64];   // placa, sensor, filtro, portalente, lente
  const P = k.fitProjection([...k.boxCorners({ x: -22, y: -32, w: 44, d: 64 }, -2, 0), [0, 0, DZ[4] + 22], [-12, -12, DZ[4] + 22], [12, 12, DZ[4] + 22], [26, -32, DZ[4] + 10]], W, H, { pad: 18 });
  const out = [eje(0, 0, 0, DZ[4] + 22, P)];
  const gris = { lado: "f3", tapa: "f4", borde: "s5" };
  // 5 · placa con su conector
  let p = caja({ x: -20, y: -30, w: 40, d: 60, r: 1.2 }, 0, 1.4, P, { lado: "fc1", tapa: "fc2", borde: "sc3" });
  p += caja({ x: -12, y: 22, w: 24, d: 6, r: 0.4 }, 1.4, 2, P, { lado: "f2", tapa: "f3", borde: "s5" });
  for (const [x, y] of [[-15, -24], [-11, -24], [13, -24], [13, 16]]) p += caja({ x, y, w: 2.4, d: 1.6, r: 0.2 }, 1.4, 1, P, gris);
  out.push(capa(0, DZ[0], p + CAL([22, -30, 1.4], 5, P)));
  // 4 · sensor de imagen con su mosaico de color (rojo, verde, azul)
  let s = caja({ x: -9, y: -9, w: 18, d: 18, r: 0.4 }, 1.4, 1.4, P, { lado: "f2", tapa: "f1", borde: "s5" });
  const celdas = { fa3: [], fc3: [], fb3: [] };
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
    const cl = i % 2 === 0 ? (j % 2 === 0 ? "fa3" : "fc3") : (j % 2 === 0 ? "fc3" : "fb3");
    const x = -6.6 + i * 2.2, y = -6.6 + j * 2.2;
    celdas[cl].push(camino([[x, y, 2.8], [x + 2, y, 2.8], [x + 2, y + 2, 2.8], [x, y + 2, 2.8]], P, true));
  }
  for (const [cl, ds] of Object.entries(celdas)) s += `<path class="${cl}" d="${ds.join("")}"/>`;
  out.push(capa(1, DZ[1], s + CAL([11, -11, 2.8], 4, P)));
  // 3 · filtro infrarrojo: un vidrio fino
  out.push(capa(2, DZ[2], caja({ x: -8, y: -8, w: 16, d: 16, r: 0.4 }, 6, 0.8, P, { lado: "fd2", tapa: "fd1", borde: "sd3" }) + CAL([10, -10, 6.8], 3, P)));
  // 2 · portalente: el cuadrado que sostiene la lente
  let h = caja({ x: -14, y: -14, w: 28, d: 28, r: 1 }, 1.4, 9, P, { lado: "f2", tapa: "f3", borde: "s5" });
  h += `<path class="f0 s5" stroke-width="1.5" d="${k.ring(0, 0, 8.6, 10.4, P, 40)}"/>`;
  out.push(capa(3, DZ[3], h + CAL([16, -16, 10.4], 2, P)));
  // 1 · lente: el barril, el anillo de enfoque y el vidrio
  let l = cilindro(0, 0, 8.4, 6, 12, P, { lado: "f2", tapa: "f3", borde: "s5" });
  l += cilindro(0, 0, 9.6, 14, 3, P, gris);
  l += `<path class="fb2 sb3" stroke-width="1.5" d="${k.ring(0, 0, 6, 17, P, 40)}"/>`;
  l += `<path class="fn sb4" stroke-width="1.5" d="${camino([[-2.6, -2.6, 17], [1, -4.2, 17]], P)}"/>`;
  out.push(capa(4, DZ[4], l + CAL([11, -11, 17], 1, P)));
  return { P, svg: out.join(""), leyenda: ["lente", "portalente", "filtro infrarrojo", "sensor de imagen", "placa y conector"], titulo: "la cámara por dentro" };
}

// ---------------------------------------------------------------- el LED por dentro (LED de 5 mm)
function figLed() {
  const DZ = [0, 0, 12, 12, 30];   // patas, copa, chip, hilo, cápsula
  const P = k.fitProjection([[-8, -8, -2], [8, 8, -2], [-8, -8, 62 + DZ[4]], [8, 8, 62 + DZ[4]], [20, -10, 60 + DZ[4]], [0, 0, 74 + DZ[4]]], W, H, { pad: 18 });
  const out = [eje(0, 0, 40, 64 + DZ[4], P)];
  const gris = { lado: "f3", tapa: "f4", borde: "s5" };
  // 5 · patas: la del ánodo (+) es la larga
  let p = caja({ x: 2.3, y: -0.7, w: 1.4, d: 1.4, r: 0.2 }, 0, 44, P, gris);
  p += caja({ x: -3.7, y: -0.7, w: 1.4, d: 1.4, r: 0.2 }, 6, 38, P, gris);
  p += caja({ x: 1.6, y: -1.2, w: 2.8, d: 2.4, r: 0.3 }, 42, 3, P, gris);
  out.push(capa(0, DZ[0], p + CAL([8, -6, 20], 5, P)));
  // 4 · copa reflectora sobre la pata del cátodo
  out.push(capa(1, DZ[1], cilindro(-3, 0, 3.2, 44, 2.6, P, gris) + `<path class="f2" d="${k.ring(-3, 0, 2, 46.6, P, 24)}"/>` + CAL([-14, -2, 46], 4, P)));
  // 2 · el chip: la unión p-n que emite
  out.push(capa(2, DZ[2], `<g class="led-chip">${caja({ x: -3.9, y: -0.9, w: 1.8, d: 1.8, r: 0.1 }, 46.6, 1.6, P, { lado: "fa2", tapa: "fa3", borde: "sa4" })}</g>` + CAL([-12, -6, 50], 2, P)));
  // 3 · hilo de unión del chip al poste del ánodo
  const hilo = [];
  for (let j = 0; j <= 10; j++) { const u = j / 10; hilo.push([-3 + 6 * u, 0, 48.2 - 3.2 * u + 5 * Math.sin(Math.PI * u)]); }
  out.push(capa(3, DZ[3], `<path class="fn sa3" stroke-width="1.2" d="${camino(hilo, P)}"/>` + CAL([6, -6, 54], 3, P)));
  // 1 · cápsula de epoxi: transparente, con su pestaña; deja ver lo de adentro
  const epoxi = { lado: "led-epoxi", tapa: "led-epoxi", borde: "s4" };
  let c = cilindro(0, 0, 6.8, 38, 1.6, P, epoxi) + cilindro(0, 0, 6, 39.6, 14, P, epoxi) + cupula(0, 0, 6, 53.6, P, epoxi);
  out.push(capa(4, DZ[4], c + CAL([10, -8, 56], 1, P)));
  return { P, svg: out.join(""), leyenda: ["cápsula de epoxi", "chip (la unión p-n)", "hilo de unión", "copa reflectora (cátodo)", "patas: la larga es el ánodo (+)"], titulo: "el LED por dentro" };
}

const FIGURAS = {
  micro: { f: figChip, n: 3, label: "Despiece de un chip encapsulado: el encapsulado de plástico, la pastilla de silicio, los hilos de unión y el marco de pines." },
  ia: { f: figCamara, n: 4, label: "Despiece de un módulo de cámara: lente, portalente, filtro infrarrojo, sensor de imagen con su mosaico de color y placa." },
  laboratorios: { f: figLed, n: 5, label: "Despiece de un LED de 5 mm: cápsula de epoxi, chip, hilo de unión, copa reflectora y patas." },
};

let html = readFileSync(join(RAIZ, "index.html"), "utf8");
const datos = {};
for (const [id, { f, n, label }] of Object.entries(FIGURAS)) {
  const { P, svg, leyenda, titulo } = f();
  const o = k.iso([0, 0, 0], P), z = k.iso([0, 0, 1], P);
  datos[id] = { arriba: [r1((z[0] - o[0]) * 1000) / 1000, r1((z[1] - o[1]) * 1000) / 1000] };
  const fig = `<svg class="despiece" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">${svg}</svg>` +
    `<p class="despiece-titulo"><b>fig. ${n}</b> ${titulo}</p>` +
    `<ol class="plano-leyenda despiece-leyenda">${leyenda.map((t, i) => `<li><span class="num">${i + 1}</span> ${t}</li>`).join("")}</ol>`;
  const re = new RegExp(`(<!-- anatomia:${id}:inicio -->)[\\s\\S]*?(<!-- anatomia:${id}:fin -->)`);
  if (!re.test(html)) throw new Error("falta el marcador anatomia:" + id);
  html = html.replace(re, `$1${fig}$2`);
}
writeFileSync(join(RAIZ, "index.html"), html);
writeFileSync(join(RAIZ, "assets", "anatomia-datos.js"),
  "// generado por herramientas/anatomia/figuras.mjs: vector de pantalla de una unidad hacia arriba, por figura\nconst ANATOMIA = " + JSON.stringify(datos) + ";\n");
console.log("figuras:", Object.keys(FIGURAS).join(", "));
