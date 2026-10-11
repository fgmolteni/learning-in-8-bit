// Apuntes en bits — comportamiento común (tema, barra, navegación, progreso, quiz)

// Tomos agrupados por sección: la navegación "siguiente tomo" no cruza de una sección a otra.
// versión del sitio: sube con cada cambio publicado (0.1.N) y se muestra en el pie de todas las páginas
const VERSION = "0.1.23";

const CURSOS = {
  micro: {
    titulo: "El microcontrolador por dentro", seccion: "micro",
    niveles: [
      { f: "01-familia-esp.html", t: "La familia ESP", d: "Qué es un microcontrolador y quién es quién entre ESP8266, ESP32, S3, C6 y P4." },
      { f: "02-anatomia-esp32.html", t: "Anatomía del ESP32", d: "El clásico: dos LX6, 520 KB de SRAM, memoria por QSPI y los periféricos que solo él tiene." },
      { f: "03-anatomia-esp32s3.html", t: "Anatomía del ESP32-S3", d: "Dos LX7, buses, memoria octal, cámara por DMA y la extensión vectorial PIE." },
      { f: "04-memoria.html", t: "La memoria manda", d: "SRAM, PSRAM, flash y caché: dónde vive cada byte de una red neuronal." },
      { f: "05-tiempo-real.html", t: "Tiempo real", d: "Interrupciones, tareas y colas: cómo el micro hace varias cosas a tiempo." },
      { f: "06-energia.html", t: "Energía y ciclo de vida", d: "Relojes, modos de sueño y cómo se actualiza el firmware sin romperlo." },
    ],
  },
  mundo: {
    titulo: "Tocar el mundo", seccion: "micro",
    niveles: [
      { f: "01-pin.html", t: "El pin por dentro", d: "La celda de E/S, push-pull y open-drain, la matriz de GPIO y los pines de arranque." },
      { f: "02-temporizadores-pwm.html", t: "Temporizadores y PWM", d: "Contador, prescaler y comparador: PWM, tiempo muerto y puentes en H." },
      { f: "03-adc.html", t: "El ADC", d: "Aproximaciones sucesivas por dentro, errores, atenuación y calibración." },
      { f: "04-dac-touch.html", t: "DAC y sensor táctil", d: "Redes resistivas, sigma-delta y el oscilador de relajación que siente un dedo." },
      { f: "05-rmt-pcnt.html", t: "Generar y contar pulsos", d: "RMT para trenes de pulsos e infrarrojo; PCNT para encoders en cuadratura." },
    ],
  },
  datos: {
    titulo: "Mover y procesar datos", seccion: "micro",
    niveles: [
      { f: "01-uart.html", t: "UART", d: "La trama, el sobremuestreo, el error de baud rate y las FIFO." },
      { f: "02-spi-i2c.html", t: "SPI e I2C", d: "El registro de desplazamiento contra el open-drain: velocidad, pull-ups y arbitraje." },
      { f: "03-i2s.html", t: "I2S", d: "Audio digital: relojes de bit y de palabra, TDM y micrófonos PDM." },
      { f: "04-dma.html", t: "DMA", d: "Descriptores enlazados, ráfagas y coherencia de caché: mover datos sin la CPU." },
      { f: "05-pie.html", t: "El acelerador vectorial PIE", d: "SIMD de 128 bits, acumuladores anchos y saturación: cómo multiplica de a 16." },
    ],
  },
  procesador: {
    titulo: "El procesador por dentro", seccion: "micro",
    niveles: [
      { f: "01-procesador.html", t: "El procesador", d: "Qué es un procesador y cómo se relacionan sus piezas, siguiendo una MAC de un filtro FIR. Compara Xtensa, RISC-V y Arm." },
      { f: "02-pipeline.html", t: "El pipeline en la práctica", d: "Riesgos de datos y de control, adelantamiento y burbujas: por qué una instrucción por ciclo no es gratis." },
      { f: "03-lazos-ventanas.html", t: "Lazos sin sobrecarga y ventanas de registros", d: "Cómo el Xtensa repite un lazo sin saltar y pasa argumentos sin tocar la RAM." },
      { f: "04-excepciones.html", t: "Excepciones e interrupciones en el núcleo", d: "Qué hace el procesador cuando algo lo interrumpe: niveles, registros de estado, vectores y retorno." },
    ],
  },
  buses: {
    titulo: "Memoria y buses por dentro", seccion: "micro",
    niveles: [
      { f: "01-mapa-memoria.html", t: "El mapa de memoria", d: "Bus de instrucciones y bus de datos: por qué la misma SRAM tiene dos direcciones." },
      { f: "02-mmio.html", t: "Los periféricos son memoria", d: "Registros mapeados en memoria, AHB y APB: qué cuesta leer y escribir un periférico." },
      { f: "03-cache.html", t: "La caché por dentro", d: "Líneas, etiquetas, vías y la MMU de 64 KB que trae la flash y la PSRAM." },
    ],
  },
  redes: {
    titulo: "Redes que ven", seccion: "ia",
    niveles: [
      { f: "01-cnn.html", t: "¿Qué es una CNN?", d: "Convolución, filtros, pooling y cuántas cuentas hace cada capa." },
      { f: "02-cuantizacion.html", t: "Encoger la red", d: "Cuantización int8, pruning y otros trucos para que quepa y corra." },
    ],
  },
  borde: {
    titulo: "Inteligencia en el borde", seccion: "ia",
    niveles: [
      { f: "01-del-modelo-al-micro.html", t: "Del modelo al micro", d: "Intérprete o grafo compilado: cómo un modelo llega a la flash y quién ejecuta cada capa." },
      { f: "02-memoria.html", t: "El presupuesto de memoria", d: "Pesos en flash, activaciones en la arena y cuándo hace falta la PSRAM." },
      { f: "03-convolucion-pie.html", t: "La convolución en el PIE", d: "Cargas de 16 bytes, MAC vectoriales y saturación a int8: dónde se van los 47 ms." },
      { f: "04-medir.html", t: "Medir cada capa", d: "Contadores de ciclos, perfil por capa y energía por inferencia." },
      { f: "05-camara-al-tensor.html", t: "De la cámara al tensor", d: "LCD_CAM, DMA, formatos de píxel y doble buffer entre dos núcleos." },
      { f: "06-decidir.html", t: "Decidir con la salida", d: "Umbral, histéresis, votos y NMS; precisión y recall con datos del lugar." },
      { f: "07-energia.html", t: "Energía y autonomía", d: "Dormir, despertar, inferir y transmitir: carga por ciclo y meses de batería." },
      { f: "08-palabra-clave.html", t: "Oír una palabra", d: "Micrófono, tramas, espectrograma Mel y WakeNet en el ESP32-S3." },
      { f: "09-sensores.html", t: "Sentir vibraciones", d: "Señales 1D, rasgos y autoencoders para detectar anomalías." },
    ],
  },
};

const LS = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ---- ajustes de color: tema (como en una terminal), modo día/noche y acento ----
// En <html>: data-theme="<tema>-<dia|noche>" y data-acento. Los hex viven solo en style.css ("apuntes" a mano,
// el resto sale de herramientas/temas.py). Cada tema llena los cinco casilleros de acento (ascii.js usa sus ids)
// con colores propios: acá van sus nombres y el acento por defecto. El acento elegido se recuerda por tema.
const TEMAS = {
  apuntes: { acento: "naranja", nombres: "naranja verde azul ámbar magenta" },
  dracula: { acento: "azul", nombres: "naranja verde púrpura amarillo rosa" },
  gruvbox: { acento: "naranja", nombres: "naranja verde azul amarillo púrpura" },
  nord: { acento: "azul", nombres: "naranja verde escarcha amarillo púrpura" },
  solarized: { acento: "azul", nombres: "naranja verde azul amarillo magenta" },
  catppuccin: { acento: "magenta", nombres: "durazno verde azul amarillo malva" },
  tokyo: { nombre: "tokyo night", acento: "azul", nombres: "naranja verde azul amarillo magenta" },
  puro: { nombre: { noche: "negro puro", dia: "blanco puro" }, acento: "verde", nombres: "naranja verde azul ámbar magenta" },
};
const CASILLEROS = ["naranja", "verde", "azul", "ambar", "magenta"];
const html = document.documentElement;

// se guardan en la cookie "ajustes" (un año, todo el sitio); en file:// el navegador no guarda cookies y
// quedan en localStorage
function leerAjustes() {
  const m = document.cookie.match(/(?:^|; )ajustes=([^;]*)/);
  let v = null;
  try { v = m ? JSON.parse(decodeURIComponent(m[1])) : LS.get("ajustes", null); } catch {}
  return v && typeof v === "object" ? v : null;
}
function guardarAjustes() {
  const v = encodeURIComponent(JSON.stringify(AJ));
  document.cookie = `ajustes=${v}; path=/; max-age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  if (!document.cookie.includes("ajustes=")) LS.set("ajustes", AJ);
}
// sin ajustes guardados: los valores viejos de localStorage ("tema" dark/light y "acento") o prefers-color-scheme
const AJ = leerAjustes() ?? {
  tema: "apuntes",
  modo: { light: "dia", dark: "noche" }[LS.get("tema", null)] ?? (matchMedia("(prefers-color-scheme: light)").matches ? "dia" : "noche"),
  acentos: { apuntes: LS.get("acento", null) },
};
const acentoDe = (t) => (CASILLEROS.includes(AJ.acentos?.[t]) ? AJ.acentos[t] : TEMAS[t].acento);
const nombreDe = (t) => TEMAS[t].nombre?.[AJ.modo] ?? TEMAS[t].nombre ?? t;

function aplicarAjustes() {
  if (!TEMAS[AJ.tema]) AJ.tema = "apuntes";
  if (AJ.modo !== "dia") AJ.modo = "noche";
  if (!AJ.acentos || typeof AJ.acentos !== "object") AJ.acentos = {};
  AJ.mono = AJ.mono === true;
  html.dataset.theme = `${AJ.tema}-${AJ.modo}`;
  html.dataset.acento = acentoDe(AJ.tema);
  html.toggleAttribute("data-mono", AJ.mono);
}
aplicarAjustes();

function cambiarAjuste(campo, valor) {
  if (campo === "acento") AJ.acentos[AJ.tema] = valor;
  else AJ[campo] = valor;
  aplicarAjustes();
  guardarAjustes();
  pintarAjustes();
  document.dispatchEvent(new Event("tema"));
}

// panel: cabecera con [x], modo (+ monocromo), tema y acento; las marcas [ ] / [✓] las dibuja style.css
function htmlAjustes() {
  const opcion = (g, v, txt = "", tipo = "radio") =>
    `<label><input type="${tipo}" name="aj-${g}" value="${v}"><span>${txt}</span></label>`;
  return `
    <div class="aj-cab"><span>ajustes</span><button type="button" popovertarget="ajustes" popovertargetaction="hide" aria-label="Cerrar">[x]</button></div>
    <fieldset><legend>modo</legend>${opcion("modo", "noche", "noche")}${opcion("modo", "dia", "día")}${opcion("mono", "si", "monocromo", "checkbox")}</fieldset>
    <fieldset><legend>tema</legend>${Object.keys(TEMAS).map((t) => opcion("tema", t)).join("")}</fieldset>
    <fieldset class="aj-acentos"><legend>acento</legend>${CASILLEROS.map((a) => opcion("acento", a)).join("")}</fieldset>`;
}
// nombres que dependen del tema y del modo, y el color de cada acento: prueba cada [data-acento] en <html> y lee
// --a3 (sincrónico, sin repintar), sin monocromo para que se vea el color; luego restaura
function pintarAjustes() {
  const p = document.getElementById("ajustes");
  if (!p) return;
  const cs = getComputedStyle(html), nombres = TEMAS[AJ.tema].nombres.split(" ");
  p.querySelectorAll('[name="aj-tema"]').forEach((i) => (i.nextElementSibling.textContent = nombreDe(i.value)));
  html.removeAttribute("data-mono");
  p.querySelectorAll('[name="aj-acento"]').forEach((i, k) => {
    html.dataset.acento = i.value;
    i.nextElementSibling.innerHTML = `<i style="--c:${cs.getPropertyValue("--a3").trim()}"></i>${nombres[k]}`;
  });
  aplicarAjustes();
  p.querySelector(".aj-acentos").disabled = AJ.mono;   // en monocromo el acento no se usa
  p.querySelector('[name="aj-mono"]').checked = AJ.mono;
  for (const [g, val] of [["modo", AJ.modo], ["tema", AJ.tema], ["acento", html.dataset.acento]])
    p.querySelector(`[name="aj-${g}"][value="${val}"]`).checked = true;
}

// ---- barra superior ----
function montarBarra() {
  const b = document.body.dataset;
  const raiz = b.raiz || "./";
  const curso = CURSOS[b.curso];
  const sep = '<span class="sep">/</span>';
  let migas = `<a href="${raiz}index.html">~/biblioteca</a>`;
  if (curso) migas += `${sep}<a href="index.html">${b.curso}</a>`;
  if (b.nivel) migas += `${sep}nivel-${b.nivel}`;
  const barra = document.createElement("nav");
  barra.className = "topbar";
  barra.setAttribute("aria-label", "Navegación");
  barra.innerHTML = `
    <a class="logo" href="${raiz}index.html">▚ <span>apuntes.bin</span></a>
    <div class="migas">${migas}</div>
    <button class="btn-ajustes" type="button" popovertarget="ajustes" aria-label="Ajustes de color">⚙︎<span> ajustes</span></button>
    <div class="ajustes" id="ajustes" popover role="dialog" aria-label="Ajustes de color">${htmlAjustes()}</div>
    <div class="progreso-lectura" aria-hidden="true"></div>`;
  document.body.prepend(barra);
  const principal = document.querySelector("main");
  if (principal) {
    principal.id ||= "principal";
    const saltar = document.createElement("a");
    saltar.className = "saltar";
    saltar.href = "#" + principal.id;
    saltar.textContent = "Saltar al contenido";
    document.body.prepend(saltar);
  }
  const panel = barra.querySelector(".ajustes");
  // los colores de los acentos se calculan al abrir: probar cada uno recalcula estilos de toda la página
  panel.addEventListener("beforetoggle", (e) => e.newState === "open" && pintarAjustes());
  panel.addEventListener("change", (e) =>
    cambiarAjuste(e.target.name.slice(3), e.target.type === "checkbox" ? e.target.checked : e.target.value));

  const prog = barra.querySelector(".progreso-lectura");
  const act = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    prog.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
  };
  addEventListener("scroll", act, { passive: true });
  act();
}

// ---- progreso del curso ----
const clave = (c) => "hechos:" + c;
// el tomo "chip" pasó a "micro" (archivos renombrados); se migra una vez
{
  const viejo = LS.get(clave("chip"), null);
  if (viejo) {
    const ren = { "02-arquitectura.html": "03-anatomia-esp32s3.html", "03-memoria.html": "04-memoria.html" };
    const act = LS.get(clave("micro"), []);
    viejo.map((f) => ren[f] || f).forEach((f) => act.includes(f) || act.push(f));
    LS.set(clave("micro"), act);
    try { localStorage.removeItem(clave("chip")); } catch {}
  }
}

function montarTemario() {
  const ol = document.querySelector("[data-temario]");
  if (!ol) return;
  const id = ol.dataset.temario;
  const hechos = LS.get(clave(id), []);
  ol.innerHTML = CURSOS[id].niveles.map((n, i) => `
    <li class="nivel${hechos.includes(n.f) ? " hecho" : ""}">
      <div class="num">${String(i + 1).padStart(2, "0")}</div>
      <a class="panel" href="${n.f}">
        <h3>${n.t}</h3>
        <p>${n.d}</p>
        <span class="meta">${hechos.includes(n.f) ? "[✓] completado" : "[ ] pendiente"}</span>
      </a>
    </li>`).join("");
  const total = document.querySelector("[data-avance]");
  const n = CURSOS[id].niveles.filter((x) => hechos.includes(x.f)).length;
  if (total) total.textContent = `${n} / ${CURSOS[id].niveles.length}`;
}

// ---- portada: avance de cada tomo en su tarjeta (solo si ya hay niveles completados) ----
function montarAvancePortada() {
  document.querySelectorAll("a.libro[href^='temas/']").forEach((a) => {
    const id = a.getAttribute("href").split("/")[1], curso = CURSOS[id];
    if (!curso) return;
    const hechos = LS.get(clave(id), []), n = curso.niveles.filter((x) => hechos.includes(x.f)).length;
    if (!n) return;
    a.insertAdjacentHTML("beforeend", `<span class="avance"><span aria-hidden="true">${curso.niveles.map((x) =>
      `<i${hechos.includes(x.f) ? ' class="si"' : ""}></i>`).join("")}</span>${n} / ${curso.niveles.length} completados</span>`);
  });
}

// ---- sidebar de los niveles: niveles del tomo; el nivel abierto despliega sus secciones y marca la que se lee ----
const SECCIONES = { micro: "Microcontroladores", ia: "IA en el borde" };
function montarSidebar() {
  const b = document.body.dataset, curso = CURSOS[b.curso];
  if (!curso || !b.nivel) return;
  const ids = Object.keys(CURSOS).filter((k) => CURSOS[k].seccion === curso.seccion), t = ids.indexOf(b.curso);
  const hechos = LS.get(clave(b.curso), []), actual = Number(b.nivel) - 1;
  const hs = [...document.querySelectorAll(".leccion > h2")];   // las fuentes quedan afuera (van dentro de su section)
  hs.forEach((h) => {
    if (h.id) return;
    let id = h.textContent.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    while (document.getElementById(id)) id += "-2";
    h.id = id;
  });
  const aside = document.createElement("aside");
  aside.className = "sidebar"; aside.id = "sidebar"; aside.setAttribute("aria-label", "Contenido del tomo");
  aside.innerHTML = `
    <p class="sb-eyebrow">${SECCIONES[curso.seccion]}, Tomo ${t + 1}</p>
    <a class="sb-tomo" href="index.html">${curso.titulo}</a>
    <ol class="sb-niveles">${curso.niveles.map((n, k) => `
      <li${k === actual ? ' class="actual"' : ""}><a href="${n.f}"${k === actual ? ' aria-current="page"' : ""}><span>${String(k + 1).padStart(2, "0")}</span>${n.t}${hechos.includes(n.f) ? '<i title="completado">✓</i>' : ""}</a>${k === actual ? '<ol class="sb-secciones"></ol>' : ""}</li>`).join("")}
    </ol>
    <p class="sb-tomos">${t > 0 ? `<a href="../${ids[t - 1]}/index.html">← Tomo ${t}</a>` : "<span></span>"}${t < ids.length - 1 ? `<a href="../${ids[t + 1]}/index.html">Tomo ${t + 2} →</a>` : ""}</p>`;
  const ol = aside.querySelector(".sb-secciones");
  const links = ol ? hs.map((h) => {   // sin ol (data-nivel fuera de CURSOS) la sidebar sale sin secciones, sin romper el resto
    const a = document.createElement("a");
    a.href = "#" + h.id; a.textContent = h.textContent;
    ol.appendChild(document.createElement("li")).appendChild(a);
    return a;
  }) : [];
  document.querySelector(".topbar").after(aside);
  document.body.classList.add("con-sidebar");
  // en pantallas angostas la sidebar es un panel que abre un botón de la barra
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "btn-sidebar"; btn.textContent = "índice";
  btn.setAttribute("aria-controls", "sidebar"); btn.setAttribute("aria-expanded", "false");
  document.querySelector(".topbar .logo").after(btn);
  const abrir = (si) => { aside.classList.toggle("abierta", si); btn.setAttribute("aria-expanded", si); };
  btn.onclick = () => abrir(!aside.classList.contains("abierta"));
  document.addEventListener("click", (e) => { if (e.target.closest("#sidebar a") || (!aside.contains(e.target) && e.target !== btn)) abrir(false); });
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (aside.contains(document.activeElement)) btn.focus();   // el foco no puede quedar en un panel oculto
    abrir(false);
  });
  // sección que se está leyendo: el último h2 que ya pasó por debajo de la barra
  let previa = -2;
  const marcar = () => {
    let k = -1;
    hs.forEach((h, j) => { if (h.getBoundingClientRect().top < 120) k = j; });
    if (k === previa) return;   // sin cambio de sección no se toca el DOM
    previa = k;
    links.forEach((a, j) => (j === k ? a.setAttribute("aria-current", "location") : a.removeAttribute("aria-current")));
  };
  addEventListener("scroll", marcar, { passive: true });
  marcar();
}

function montarNavLeccion() {
  const b = document.body.dataset;
  const curso = CURSOS[b.curso];
  const cont = document.querySelector("[data-nav-niveles]");
  if (!curso || !cont) return;
  const i = Number(b.nivel) - 1;
  if (!curso.niveles[i]) return;   // data-nivel fuera de CURSOS: que no corte el quiz ni lo que sigue
  const ant = curso.niveles[i - 1], sig = curso.niveles[i + 1];
  const f = curso.niveles[i].f;
  const hechos = LS.get(clave(b.curso), []);
  // último nivel: ofrece el primer nivel del tomo siguiente (misma profundidad de carpetas)
  const ids = Object.keys(CURSOS), idProx = ids[ids.indexOf(b.curso) + 1];
  const prox = CURSOS[idProx]?.seccion === curso.seccion ? CURSOS[idProx] : null;
  const finTomo = prox
    ? `<a href="../${idProx}/${prox.niveles[0].f}"><small>siguiente tomo →</small><span>${prox.titulo}</span></a>`
    : `<a href="index.html"><small>fin del tomo →</small><span>Temario</span></a>`;

  cont.innerHTML = `
    <div class="completar">
      <button class="btn" type="button" data-completar>${hechos.includes(f) ? "[✓] nivel completado" : "[ ] marcar nivel como completado"}</button>
    </div>
    <nav class="nav-niveles" aria-label="Niveles">
      ${ant ? `<a href="${ant.f}"><small>← anterior</small><span>${ant.t}</span></a>` : `<a href="index.html"><small>← volver</small><span>Temario</span></a>`}
      ${sig ? `<a href="${sig.f}"><small>siguiente →</small><span>${sig.t}</span></a>` : finTomo}
    </nav>`;
  cont.querySelector("[data-completar]").onclick = (e) => {
    let h = LS.get(clave(b.curso), []);
    const hecho = !h.includes(f);
    h = hecho ? [...h, f] : h.filter((x) => x !== f);
    LS.set(clave(b.curso), h);
    e.target.textContent = hecho ? "[✓] nivel completado" : "[ ] marcar nivel como completado";
    const sb = document.querySelector("#sidebar .sb-niveles li.actual > a");   // el ✓ de la sidebar sigue al botón
    if (sb) { sb.querySelector("i")?.remove(); if (hecho) sb.insertAdjacentHTML("beforeend", '<i title="completado">✓</i>'); }
  };
}

// ---- quiz: <div class="quiz" data-ok="1"> con botones; data-por-que en cada botón ----
function montarQuiz() {
  document.querySelectorAll(".quiz").forEach((q) => {
    const ok = Number(q.dataset.ok);
    const fb = q.querySelector(".feedback");
    q.querySelectorAll(".opciones button").forEach((btn, i) => {
      btn.onclick = () => {
        q.querySelectorAll(".opciones button").forEach((x) => x.classList.remove("ok", "mal"));
        btn.classList.add(i === ok ? "ok" : "mal");
        fb.textContent = (i === ok ? "¡Correcto! " : "Casi. ") + (btn.dataset.porQue || "");
      };
    });
  });
}

// ---- utilidades para diagramas animados ----
// Reproduce/pausa animaciones SMIL de un svg según visibilidad (ahorra CPU).
// Con prefers-reduced-motion quedan quietas en su primer cuadro (el CSS no detiene SMIL).
function pausarFueraDePantalla() {
  const svgs = document.querySelectorAll("figure.diagrama svg");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    svgs.forEach((s) => { s.pauseAnimations?.(); s.setCurrentTime?.(0); });
    return;
  }
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const s = e.target;
    if (s.pauseAnimations) e.isIntersecting ? s.unpauseAnimations() : s.pauseAnimations();
  }));
  svgs.forEach((s) => io.observe(s));
}

function montarVersion() {
  const pie = document.querySelector("footer.pie");
  if (pie) (pie.querySelector(".pie-base span") || pie).append(`, v${VERSION}`);
}

document.addEventListener("DOMContentLoaded", () => {
  montarVersion();
  montarBarra();
  montarTemario();
  montarAvancePortada();
  montarSidebar();
  montarNavLeccion();
  montarQuiz();
  pausarFueraDePantalla();
});
