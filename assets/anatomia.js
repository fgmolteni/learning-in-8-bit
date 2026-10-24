// Apuntes en bits — figuras en despiece de la portada (generadas por herramientas/anatomia/figuras.mjs).
// Cada figura se arma y se desarma sola: las capas suben por su eje hasta el despiece y vuelven. Con el mouse
// encima queda abierta. Corre solo en pantalla; con movimiento reducido queda en despiece, quieta.
(() => {
  if (typeof ANATOMIA === "undefined") return;
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const suave = (u) => u * u * (3 - 2 * u);
  const LECTURA = {
    micro: ["armado: el encapsulado tapa el silicio", "en despiece: el silicio se une a los pines con hilos"],
    ia: ["armado: la lente enfoca sobre el sensor", "en despiece: la luz pasa por el filtro y llega al mosaico de color"],
    laboratorios: ["armado: la corriente cruza la unión p-n y el chip emite", "en despiece: el chip se apoya en el cátodo y un hilo lo une al ánodo"],
  };
  for (const [id, { arriba }] of Object.entries(ANATOMIA)) {
    const caja = document.querySelector(`[data-lectura="${id}"]`)?.parentElement, svg = caja?.querySelector("svg.despiece");
    if (!svg) continue;
    const capas = [...svg.querySelectorAll("[data-capa]")].map((g) => ({ g, dz: +g.dataset.dz }));
    const lectura = caja.querySelector("[data-lectura]");
    let abierto = 1, quiere = 1, encima = false, visible = false, cuadro = 0, t0 = 0, antes = 0;
    const dibujar = () => {
      const e = suave(abierto);
      capas.forEach(({ g, dz }) => g.setAttribute("transform", `translate(${(arriba[0] * dz * e).toFixed(2)} ${(arriba[1] * dz * e).toFixed(2)})`));
      // los callouts y el eje solo tienen sentido abierto: armado se apilarían sobre la pieza
      svg.querySelectorAll(".cal, [data-eje]").forEach((el) => (el.style.opacity = e.toFixed(2)));
      svg.classList.toggle("prendido", abierto < 0.05);
      const texto = LECTURA[id][abierto > 0.5 ? 1 : 0];
      if (lectura.textContent !== texto) lectura.textContent = texto;
    };
    if (quieto) { dibujar(); continue; }
    const paso = (ahora) => {
      t0 ||= ahora;
      const t = (ahora - t0) / 1000, dt = Math.min(0.05, (ahora - (antes || ahora)) / 1000);
      antes = ahora;
      quiere = encima ? 1 : Math.floor(t / 3.2) % 2 ? 0 : 1;   // 3,2 s abierto, 3,2 s armado
      abierto += Math.sign(quiere - abierto) * Math.min(Math.abs(quiere - abierto), dt / 0.9);
      dibujar();
      cuadro = visible ? requestAnimationFrame(paso) : 0;
    };
    new IntersectionObserver((es) => {
      visible = es.at(-1).isIntersecting;
      if (visible && !cuadro) { antes = 0; cuadro = requestAnimationFrame(paso); }
    }, { rootMargin: "80px 0px" }).observe(svg);
    caja.addEventListener("pointerenter", () => (encima = true));
    caja.addEventListener("pointerleave", () => (encima = false));
    dibujar();
  }
})();
