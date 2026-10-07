// Learning in 8-bit — comportamiento común (tema, barra, navegación, progreso, quiz)

// Tomos agrupados por sección: la navegación "siguiente tomo" no cruza de una sección a otra.
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
      { f: "01-frameworks.html", t: "Del modelo al micro", d: "TFLite Micro, ESP-NN, ESP-DL y el viaje de un modelo hasta la flash." },
      { f: "02-pipeline.html", t: "Todo junto", d: "Cámara → inferencia → decisión: casos reales, tiempos y cómo elegir micro." },
    ],
  },
};

const LS = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ---- tema claro/oscuro: lo guardado; si no hay, prefers-color-scheme ----
const html = document.documentElement;
html.dataset.theme = LS.get("tema", null) ?? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

// ---- acento: los hex viven solo en style.css ([data-acento]); acá el id, el nombre y la pastilla (lee --a4) ----
const ACENTOS = { naranja: "naranja", verde: "verde", azul: "azul", ambar: "ámbar", magenta: "magenta" };
{
  const a = LS.get("acento", null);
  html.dataset.acento = ACENTOS[a] ? a : "naranja";
}
// pastilla de cada acento: prueba cada [data-acento] y lee --a4 (sincrónico, sin repintar), luego restaura
function pintarPastillas() {
  const actual = html.dataset.acento;
  document.querySelectorAll(".colores button").forEach((b) => {
    html.dataset.acento = b.dataset.color;
    b.style.setProperty("--c", getComputedStyle(html).getPropertyValue("--a4").trim());
  });
  html.dataset.acento = actual;
}
function elegirColor(id) {
  html.dataset.acento = id;
  LS.set("acento", id);
  document.querySelectorAll(".colores button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.color === id));
  document.dispatchEvent(new Event("tema"));
}

function alternarTema() {
  const nuevo = html.dataset.theme === "light" ? "dark" : "light";
  html.dataset.theme = nuevo;
  LS.set("tema", nuevo);
  document.dispatchEvent(new Event("tema"));
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
    <a class="logo" href="${raiz}index.html">▚ <span>learning-in-8-bit</span></a>
    <div class="migas">${migas}</div>
    <div class="colores" role="group" aria-label="Color de acento">${Object.entries(ACENTOS).map(([id, n]) =>
      `<button type="button" data-color="${id}" aria-label="Acento ${n}" title="${n}" aria-pressed="${html.dataset.acento === id}"></button>`).join("")}</div>
    <button class="btn-tema" type="button" aria-label="Cambiar tema claro/oscuro">tema</button>
    <div class="progreso-lectura" aria-hidden="true"></div>`;
  document.body.prepend(barra);
  barra.querySelector(".btn-tema").onclick = alternarTema;
  barra.querySelectorAll(".colores button").forEach((b) => (b.onclick = () => elegirColor(b.dataset.color)));
  pintarPastillas();
  document.addEventListener("tema", pintarPastillas); // --a4 cambia con el tema claro/oscuro

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

function montarNavLeccion() {
  const b = document.body.dataset;
  const curso = CURSOS[b.curso];
  const cont = document.querySelector("[data-nav-niveles]");
  if (!curso || !cont) return;
  const i = Number(b.nivel) - 1;
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

document.addEventListener("DOMContentLoaded", () => {
  montarBarra();
  montarTemario();
  montarNavLeccion();
  montarQuiz();
  pausarFueraDePantalla();
});
