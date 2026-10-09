// Escenas del laboratorio PixelMicro (temas/laboratorio-micro.html). Español, sin dependencias.
// Contenido basado en el ESP32-S3 (Tomo I). Cifras del manual técnico de Espressif.
//
// Reglas de capas v3: texto pixel bitmap sin antialias, gráficos 16-bit, detalle 32-bit solo zona/lupa.
// Estética plana: sin brillo, sin sombras de caja, sin degradados de luz.
const PM = PixelMicro;
const en = (m, b, fn) => (typeof m.en === "function" ? m.en(b, fn) : fn());
const lupa = (m, o, fn) => (typeof m.lupa === "function" ? m.lupa(o, fn) : fn());
const fondo = (m) => en(m, 8, () => m.limpiar("n0"));

// ================================================================
// a) Diagrama de bloques del ESP32-S3 con paquetes DMA
//    Cámara → LCD_CAM → GDMA → SRAM (sin CPU).
// ================================================================
PixelMotor.escena("micro-bloques", {
  alto: 210, tFijo: 1.5,
  descripcion: "Diagrama de bloques del ESP32-S3: los píxeles de la cámara entran por LCD_CAM, el GDMA los deposita en la SRAM sin que la CPU intervenga",
  dibujar(m, t) {
    fondo(m);
    PM.bloques(m, {
      titulo: "ESP32-S3",
      // Zona DMA: contorno punteado en acento (a3) + relleno plano suave (a1) en 16, SIN TRAMADO
      zonas: [
        {
          x: 106, y: 92, w: 202, h: 92,
          rotulo: "ZONA DE DMA", sub: "(SIN CPU)",
          rotuloX: 114, rotuloY: 146,
          tok: "a3", relleno: "a1",
        },
      ],
      cajas: [
        { id: "n0",    x: 8,   y: 22,  w: 90, h: 32, titulo: "Nucleo 0", sub: "LX7+PIE" },
        { id: "n1",    x: 106, y: 22,  w: 90, h: 32, titulo: "Nucleo 1", sub: "LX7+PIE" },
        { id: "cache", x: 8,   y: 62,  w: 188, h: 22, titulo: "Cache+MMU" },
        { id: "rom",   x: 8,   y: 98,  w: 86, h: 34, titulo: "ROM", sub: "384 KB" },
        { id: "peri",  x: 8,   y: 142, w: 86, h: 34, titulo: "Perifericos", sub: "I2S, USB" },
        { id: "sram",  x: 112, y: 98,  w: 82, h: 34, titulo: "SRAM", sub: "512 KB" },
        { id: "gdma",  x: 210, y: 98,  w: 82, h: 34, titulo: "GDMA", sub: "5 canales" },
        { id: "lcd",   x: 210, y: 142, w: 82, h: 34, titulo: "LCD_CAM", sub: "interfaz" },
        { id: "cam",   x: 210, y: 188, w: 82, h: 18, titulo: "Camara" },
        { id: "flash", x: 216, y: 22,  w: 78, h: 24, titulo: "Flash" },
        { id: "psram", x: 216, y: 52,  w: 78, h: 24, titulo: "PSRAM" },
      ],
      // Ruteo ortogonal limpio: verticales y horizontales directas sin cruces diagonales
      flechas: [
        { de: [53, 54],  a: [53, 62],  tok: "n4" },  // Nucleo 0 -> Cache
        { de: [151, 54], a: [151, 62], tok: "n4" },  // Nucleo 1 -> Cache
        { de: [51, 84],  a: [51, 98],  tok: "n4" },  // Cache -> ROM
        { de: [153, 84], a: [153, 98], tok: "n4" },  // Cache -> SRAM
        { de: [251, 188], a: [251, 176], tok: "a4" }, // Camara -> LCD_CAM
        { de: [251, 142], a: [251, 132], tok: "a4" }, // LCD_CAM -> GDMA
        { de: [210, 115], a: [194, 115], tok: "a4" }, // GDMA -> SRAM
      ],
    });

    // Buses SPI hacia Flash y PSRAM
    PM.bus(m, { puntos: [[196, 34], [216, 34]], ancho: 8, tok: "n4", rotulo: "SPI", rotuloPos: [206, 26] });
    PM.bus(m, { puntos: [[196, 64], [216, 64]], ancho: 8, tok: "n4", rotuloPos: [206, 56] });

    // Paquetes DMA viajando planos (sin rótulo superpuesto a LCD_CAM)
    const camino = [[251, 196], [251, 159], [251, 115], [153, 115]];
    PM.paqueteMulti(m, { id: "dma", camino, t, n: 3, periodo: 2.2, tok: "a4", tam: 5 });
  },
});

// ================================================================
// b) Cache hit vs miss: núcleo leyendo de la caché.
//    Acierto (1-2 ciclos) vs fallo que va a la PSRAM (espera).
// ================================================================
PixelMotor.escena("micro-cache", {
  alto: 200, tFijo: 2,
  descripcion: "Un núcleo lee de la caché: acierto en 1 ciclo, fallo que busca en la PSRAM en decenas de ciclos, con un contador",
  dibujar(m, t) {
    fondo(m);
    const ciclo = t % 4;
    const esHit = ciclo < 1.5;
    en(m, 8, () => m.texto("CACHÉ: HIT VS MISS", 160, 6, "n6", { alin: "centro" }));

    // Núcleo
    m.caja(18, 28, 80, 36, { titulo: "Nucleo 0", sub: "LX7", estilo: "normal" });
    // Cache: texto "Cache" y "16 KB" quedan dentro de la caja
    m.caja(130, 28, 80, 36, { titulo: "Cache", sub: "16 KB", estilo: esHit ? "activo" : "normal" });
    // SRAM
    m.caja(130, 86, 80, 30, { titulo: "SRAM", sub: "512 KB" });
    // PSRAM
    m.caja(240, 86, 72, 30, { titulo: "PSRAM", sub: "8 MB", estilo: !esHit ? "activo" : "normal" });

    // Flechas ortogonales
    m.flecha(98, 46, 130, 46, esHit ? "a3" : "n4");
    m.flecha(150, 64, 150, 86, "n4");
    m.flecha(210, 101, 240, 101, !esHit ? "a4" : "n3");

    // Barra de progreso separada del texto: dentro del borde inferior de Cache (y: 61, h: 2)
    // Cache va de y=28 a y=64. "16 KB" está en y=49..56. y=61 no toca el texto.
    if (esHit) {
      const fase = ciclo / 1.5;
      const ciclosN = Math.min(2, Math.floor(fase * 2 + 1));
      en(m, 16, () => {
        m.rect(132, 61, 76 * Math.min(1, fase * 1.5), 2, "a3");
      });
      // HIT colocado a la derecha de la flecha vertical, sin pisarla
      PM.textoConFondo(m, "HIT", 185, 72, "a3", { alin: "centro", fondo: "n0", pad: 1, tam: 5 });
      PM.contadorCiclos(m, { x: 160, y: 122, ciclos: ciclosN, tok: "a3", alin: "centro" });
      en(m, 16, () => {
        m.texto("DATO LISTO (1-2 CICLOS)", 160, 136, "a3", { alin: "centro", tam: 5 });
      });
    } else {
      const fase = (ciclo - 1.5) / 2.5;
      const ciclosN = Math.min(80, Math.floor(fase * 80 + 1));
      en(m, 16, () => {
        if (fase < 0.7) {
          const prog = fase / 0.7;
          m.rect(210 + prog * 28, 99, 4, 4, "a4");
        } else {
          const prog = (fase - 0.7) / 0.3;
          m.rect(132, 61, 76 * prog, 2, "a3");
        }
      });
      PM.textoConFondo(m, "MISS", 185, 72, "a4", { alin: "centro", fondo: "n0", pad: 1, tam: 5 });
      PM.contadorCiclos(m, { x: 160, y: 122, ciclos: ciclosN, tok: "a4", alin: "centro" });
      en(m, 16, () => {
        m.texto(fase < 0.7 ? "BUSCANDO EN PSRAM..." : "DATO TRAÍDO A CACHÉ", 160, 136, fase < 0.7 ? "a4" : "a3", { alin: "centro", tam: 5 });
      });
    }

    // Cajas comparativas de la leyenda
    m.caja(18, 154, 130, 36, { titulo: "HIT: 1-2 ciclos", sub: "acceso inmediato", estilo: "activo" });
    m.caja(172, 154, 130, 36, { titulo: "MISS: ~80 ciclos", sub: "espera a bus SPI", estilo: "normal" });
  },
});

// ================================================================
// c) Registro PIE de 128 bits partido en 16 × 8 bits haciendo 16 MAC
//    a la vez, con lupa 32 sobre los bits individuales.
// ================================================================
PixelMotor.escena("micro-pie", {
  alto: 210, tFijo: 0.8,
  descripcion: "Registro PIE de 128 bits partido en 16 valores de 8 bits; una instrucción SIMD hace 16 MAC en paralelo; lupa de 32 bits muestra los bits individuales",
  dibujar(m, t) {
    fondo(m);
    en(m, 8, () => m.texto("PIE: 16 MAC EN PARALELO", 160, 6, "n6", { alin: "centro" }));

    const fase = (t * 0.8) % 1;
    // Valores de 1 dígito para que el producto quepa perfecto en las celdas sin desbordar
    const pesos = [-3, 2, 5, 4, -6, 1, 3, -2, -1, 4, 2, -3, 0, 3, -4, 2];
    const entradas = [3, 4, 3, 2, 1, 0, 2, 3, 4, 1, 2, 3, 2, 1, 2, 3];
    const resultados = [];
    for (let i = 0; i < 16; i++) {
      resultados.push(pesos[i] * entradas[i]);
    }

    // Registros bien centrados (x: 52, w: 224 => 14 px por celda, finaliza en 276, '128b' cabe holgado)
    // Rótulos con nombres claros sin duplicación: Q0 pes, Q1 ent, ACC res
    PM.registro(m, { x: 60, y: 22, w: 224, h: 12, bits: 128, particion: 8, valores: pesos, nombre: "Q0 pes" });
    PM.registro(m, { x: 60, y: 38, w: 224, h: 12, bits: 128, particion: 8, valores: entradas, nombre: "Q1 ent" });

    // Operadores × entre Q0 y Q1
    en(m, 16, () => {
      for (let i = 0; i < 16; i++) {
        m.texto("×", 60 + i * 14 + 7, 51, fase > 0.5 ? "a4" : "n4", { alin: "centro", tam: 5 });
      }
    });

    // Acumulador ACC
    PM.registro(m, {
      x: 60, y: 58, w: 224, h: 12, bits: 128, particion: 8,
      valores: fase > 0.5 ? resultados : pesos.map((p, i) => p * entradas[i]),
      nombre: "ACC res",
    });

    // Lupa 32-bit sobre los primeros 4 bytes (Q0[0..3] y ACC[0..3])
    // de: [52, 57, 56, 16] (4 celdas × 14 px = 56 px ancho, 16 px alto)
    // a: [36, 96, 248, 64] (magnificado 4.4x con detalle real en 32 bits)
    lupa(m, { de: [60, 57, 56, 14], a: [60, 96, 224, 56], bits: 32 }, () => {
      // Dentro de la lupa se dibujan las celdas en 32-bit con sus valores e índices
      for (let i = 0; i < 4; i++) {
        const cx = 60 + i * 14;
        const val = resultados[i];
        m.rect(cx, 58, 14, 12, "a1");
        m.marco(cx, 58, 14, 12, "a3");
        // Rótulo del byte
        m.texto("B" + i, cx + 7, 59, "n4", { alin: "centro", tam: 14 });
        // Valor numérico
        m.texto(String(val), cx + 7, 64, "a4", { alin: "centro", tam: 14 });
      }
    });

    // Leyenda explicativa en 16 (pixel compacta)
    en(m, 16, () => {
      m.texto("128 BITS = 16 x 8 BITS (16 MAC POR CICLO)", 160, 168, "a3", { alin: "centro", tam: 5 });
      m.texto("TECHO: 240 MHz x 16 = 3840 MMAC/S", 160, 180, "n4", { alin: "centro", tam: 5 });
    });
  },
});

// ================================================================
// d) Diagrama de conexión OV2640 ↔ ESP32-S3:
//    D0–D7, PCLK, VSYNC, HREF, SCCB con rótulos limpios sin tachaduras.
// ================================================================
PixelMotor.escena("micro-pinout", {
  alto: 200, tFijo: 0,
  descripcion: "Diagrama de conexión entre la cámara OV2640 y el ESP32-S3: bus de datos D0 a D7, señales de sincronismo PCLK, VSYNC, HREF y bus SCCB para configuración",
  dibujar(m, t) {
    fondo(m);
    en(m, 8, () => m.texto("CONEXIÓN OV2640 A ESP32-S3", 160, 6, "n6", { alin: "centro" }));

    // OV2640 (chip izquierdo)
    const camPines = [
      { num: 1,  nombre: "D0",    lado: "der", pos: 0, color: "a3" },
      { num: 2,  nombre: "D1",    lado: "der", pos: 1, color: "a3" },
      { num: 3,  nombre: "D2",    lado: "der", pos: 2, color: "a3" },
      { num: 4,  nombre: "D3",    lado: "der", pos: 3, color: "a3" },
      { num: 5,  nombre: "D4",    lado: "der", pos: 4, color: "a3" },
      { num: 6,  nombre: "D5",    lado: "der", pos: 5, color: "a3" },
      { num: 7,  nombre: "D6",    lado: "der", pos: 6, color: "a3" },
      { num: 8,  nombre: "D7",    lado: "der", pos: 7, color: "a3" },
      { num: 9,  nombre: "PCLK",  lado: "der", pos: 8, color: "n5" },
      { num: 10, nombre: "VSYNC", lado: "der", pos: 9, color: "n5" },
      { num: 11, nombre: "HREF",  lado: "der", pos: 10, color: "n5" },
      { num: 12, nombre: "SDA",   lado: "der", pos: 11, color: "a4" },
      { num: 13, nombre: "SCL",   lado: "der", pos: 12, color: "a4" },
    ];
    PM.chip(m, { x: 10, y: 22, w: 58, h: 154, nombre: "OV2640", pines: camPines, pinL: 8, pinSep: 10 });

    // ESP32-S3 (chip derecho)
    const espPines = [
      { num: 40, nombre: "D0",    lado: "izq", pos: 0, color: "a3" },
      { num: 39, nombre: "D1",    lado: "izq", pos: 1, color: "a3" },
      { num: 38, nombre: "D2",    lado: "izq", pos: 2, color: "a3" },
      { num: 37, nombre: "D3",    lado: "izq", pos: 3, color: "a3" },
      { num: 36, nombre: "D4",    lado: "izq", pos: 4, color: "a3" },
      { num: 35, nombre: "D5",    lado: "izq", pos: 5, color: "a3" },
      { num: 34, nombre: "D6",    lado: "izq", pos: 6, color: "a3" },
      { num: 33, nombre: "D7",    lado: "izq", pos: 7, color: "a3" },
      { num: 20, nombre: "PCLK",  lado: "izq", pos: 8, color: "n5" },
      { num: 6,  nombre: "VSYNC", lado: "izq", pos: 9, color: "n5" },
      { num: 7,  nombre: "HREF",  lado: "izq", pos: 10, color: "n5" },
      { num: 4,  nombre: "SDA",   lado: "izq", pos: 11, color: "a4" },
      { num: 5,  nombre: "SCL",   lado: "izq", pos: 12, color: "a4" },
    ];
    PM.chip(m, { x: 236, y: 22, w: 80, h: 154, nombre: "ESP32-S3", sub: "WROOM", pines: espPines, pinL: 8, pinSep: 10 });

    // Cables entre los chips
    en(m, 16, () => {
      // D0–D7: líneas sólidas en acento
      const cab = (i, tok, op) => { const yy = 32 + i * 10, w = camPines[i].nombre.length * 6 + 3; m.linea(78 + w, yy, 227 - w, yy, tok, op); };
      for (let i = 0; i < 8; i++) cab(i, "a3");
      // PCLK, VSYNC, HREF: líneas punteadas neutras
      for (let i = 8; i < 11; i++) {
        cab(i, "n5", { punteo: 3 });
      }
      // SCCB (SDA, SCL): líneas punteadas en acento
      for (let i = 11; i < 13; i++) {
        cab(i, "a4", { punteo: 2 });
      }
    });

    // Rótulos con fondo plano n0 y texto pixel 16-bit para NO quedar tachados por los cables
    PM.textoConFondo(m, "BUS DATOS /8", 152, 23, "a3", { alin: "centro", fondo: "n0", pad: 2, tam: 5 });
    PM.textoConFondo(m, "SINCRONISMO", 152, 107, "n5", { alin: "centro", fondo: "n0", pad: 2, tam: 5 });
    PM.textoConFondo(m, "SCCB (I2C)", 152, 137, "a4", { alin: "centro", fondo: "n0", pad: 2, tam: 5 });

    // Leyenda inferior limpia
    en(m, 16, () => {
      m.texto("D0-D7: BUS PARALELO (LÍNEAS SÓLIDAS ACENTO)", 160, 180, "a3", { alin: "centro", tam: 5 });
      m.texto("SCCB: CONTROL SERIE (LÍNEAS PUNTEADAS)", 160, 190, "a4", { alin: "centro", tam: 5 });
    });
  },
});

// ================================================================
// e) Cronograma de la interfaz de cámara (PCLK, HREF, VSYNC, datos)
//    animado, tipo analizador lógico.
// ================================================================
PixelMotor.escena("micro-crono", {
  alto: 200, tFijo: 2,
  descripcion: "Cronograma de la interfaz de cámara: las señales PCLK, HREF, VSYNC y datos se ven como en un analizador lógico; PCLK marca el ritmo, HREF indica línea activa y VSYNC el inicio de cuadro",
  dibujar(m, t) {
    fondo(m);
    en(m, 8, () => m.texto("INTERFAZ DE CÁMARA", 160, 6, "n6", { alin: "centro" }));

    const pclkF   = 10;
    const hrefCiclo = 0.6;
    const hrefF   = 0.8;
    const vsyncF  = 0.15;

    // Cronograma con margen izquierdo amplio (x: 58) para no cortar nombres de señales
    PM.cronograma(m, {
      x: 58, y: 22, w: 250, h: 108,
      t, ventana: 3, velocidad: 1,
      señales: [
        {
          nombre: "VSYNC",
          tok: "n5",
          tipo: "digital",
          f: (tt) => (((tt * vsyncF) % 1 + 1) % 1) < 0.15 ? 1 : 0,
        },
        {
          nombre: "HREF",
          tok: "a3",
          tipo: "digital",
          f: (tt) => {
            const vsync = (((tt * vsyncF) % 1 + 1) % 1) < 0.15;
            if (vsync) return 0;
            return (((tt * hrefF) % 1 + 1) % 1) < hrefCiclo ? 1 : 0;
          },
        },
        {
          nombre: "PCLK",
          tok: "a4",
          tipo: "digital",
          f: (tt) => {
            const vsync = (((tt * vsyncF) % 1 + 1) % 1) < 0.15;
            const href = (((tt * hrefF) % 1 + 1) % 1) < hrefCiclo;
            if (vsync || !href) return 0;
            return (((tt * pclkF) % 1 + 1) % 1) < 0.5 ? 1 : 0;
          },
        },
        {
          nombre: "D0-D7",
          tok: "a3",
          tipo: "bus",
          f: (tt) => {
            const vsync = (((tt * vsyncF) % 1 + 1) % 1) < 0.15;
            const href = (((tt * hrefF) % 1 + 1) % 1) < hrefCiclo;
            if (vsync || !href) return 0;
            return (((tt * pclkF) % 1 + 1) % 1) < 0.5 ? 1 : 0;
          },
        },
      ],
    });

    // Leyenda en dos columnas bien espaciadas
    en(m, 16, () => {
      m.texto("VSYNC: INICIO DE CUADRO", 80, 142, "n5", { alin: "centro", tam: 5 });
      m.texto("HREF:  LÍNEA ACTIVA",     80, 154, "a3", { alin: "centro", tam: 5 });
      m.texto("PCLK:  RELOJ DE PIXEL",  230, 142, "a4", { alin: "centro", tam: 5 });
      m.texto("D0-D7: BUS DE 8 BITS",   230, 154, "a3", { alin: "centro", tam: 5 });
      m.texto("LCD_CAM CAPTURA EN FLANCO ASCENDENTE DE PCLK", 160, 174, "n4", { alin: "centro", tam: 5 });
    });
  },
});
