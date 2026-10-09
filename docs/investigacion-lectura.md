# Investigación: diseño de lectura de artículos

Fecha: 2026-10-09. Rama: `lectura-tipografia`.

Este documento compara guías de lectura con nuestros 27 artículos.
No cambia código. Las reglas de diseño salen de aquí en el paso siguiente.

## Límites de esta investigación

- El entorno bloquea la mayoría de los sitios de las guías originales.
  No pude abrir Butterick, NN/g, WCAG (w3.org), MDN, Material ni GOV.UK.
- Las cifras de las guías vienen de resúmenes de terceros. Cada una lleva su nivel de confianza.
- Las fuentes web (Geist, Instrument Serif) tampoco cargaron en la medición.
  El navegador usó fuentes de reemplazo. Los caracteres por línea son aproximados.
  Hay que repetir esa medición con las fuentes reales.

Niveles de confianza: **alta** = norma publicada o cifra repetida en varias fuentes.
**media** = una sola fuente secundaria. **baja** = anécdota o estudio pequeño.

## 1. Lo que dicen las guías

| Tema | Regla | Confianza | Fuente |
|---|---|---|---|
| Línea | 45 a 90 caracteres. Zona cómoda: 60 a 75. | media | [PimpMyType](https://pimpmytype.com/line-length-line-height/), cita de Butterick |
| Línea | Máximo 80 caracteres (nivel AAA). | alta | [WCAG 1.4.8](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation) |
| Línea | Líneas más cortas se retienen mejor. Líneas largas se leen más rápido. | media | [IBM, Beymer y Russell](https://researcher.watson.ibm.com/publications/the-long-and-the-short-of-learning) |
| Cuerpo | 16 a 20 px. Mínimo 16 px en móvil. | media | [PimpMyType](https://pimpmytype.com/line-length-line-height/) |
| Cuerpo | GOV.UK usa 19 px. Su mínimo es 16 px. | media | [GOV.UK](https://design-system.service.gov.uk/styles/type-scale) |
| Cuerpo | iOS usa 17 pt. Material usa 16 sp. | baja | resúmenes de terceros |
| Interlineado | Mínimo 1,5 veces el tamaño. | alta | [WCAG 1.4.12](https://dequeuniversity.com/resources/wcag2.1/1.4.12-text-spacing) |
| Interlineado | De 1,5 a 1,7. Líneas más cortas admiten menos. | media | [PimpMyType](https://pimpmytype.com/line-length-line-height/) |
| Espaciado | El usuario debe poder subir a 2 veces entre párrafos, 0,12 entre letras y 0,16 entre palabras. Sin perder contenido. | alta | [WCAG 1.4.12](https://dequeuniversity.com/resources/wcag2.1/1.4.12-text-spacing) |
| Alineación | No justificar el texto. | alta | [GOV.UK](https://design-system.service.gov.uk/styles/paragraphs), WCAG 1.4.8 |
| Fuente | Serif y sans serif se leen igual de rápido. | media | [Beymer, Russell y Orton](https://www.scienceopen.com/document_file/671b2d53-73ce-4a91-946d-fde0b7db381a/ScienceOpen/015_Beymer.pdf) |
| Escaneo | El 79 % de los usuarios escanea. El 16 % lee palabra por palabra. | media | NN/g (1997), vía [Newcastle](https://www.ncl.ac.uk/design-system/ux/editorial/readability/) |
| Escaneo | Títulos descriptivos. Una idea por párrafo. Oraciones de 20 palabras o menos. | media | [Newcastle](https://www.ncl.ac.uk/design-system/ux/editorial/readability/) |
| Escaneo | El patrón en F es una tendencia, no una regla. | media | [Newcastle](https://www.ncl.ac.uk/design-system/ux/editorial/readability/) |
| Tema oscuro | Para lectura larga, el tema claro rinde igual o mejor. En oscuro, mejor gris oscuro que negro puro. | baja | [estudio croata](https://hrcak.srce.hr/341630) y blogs |
| Documentación | Cuatro tipos de página: tutorial, guía práctica, referencia y explicación. No mezclarlos. | media | [Diátaxis](https://canonical.com/blog/diataxis-a-new-foundation-for-canonical-documentation) |
| Avisos | De 1 a 2 oraciones. Un tipo por aviso. El color no es la única señal. | media | [Document360](https://docs.document360.com/docs/formatting-guidelines), [Percona](https://percona-style-guide.onrender.com/callouts.html) |
| Código | Unos 60 caracteres por línea. La explicación va fuera del bloque. | media | guía de estilo de GitHub |
| Tablas | Hasta 5 columnas para móvil. | baja | [Doclea](https://glama.ai/mcp/servers/@docleaai/doclea-mcp/blob/8e7eefb8183a79e9a21f4284377851f4c802b618/docs/.reference/VISUAL_STYLE_GUIDE.md) |

No encontré análisis independientes de Medium, Substack o Kindle con cifras útiles.
El informe de Dubberly sobre Kindle existe, pero no pude abrirlo.

## 2. Cómo están nuestros artículos

Muestra: 22 artículos y 5 páginas índice. Mediciones con Chromium, ancho 1440 px y 390 px.

### Lo que cumple

| Medida | Valor | Regla | Estado |
|---|---|---|---|
| Cuerpo en escritorio | 18 px sobre 28 px (1,56) | 16 a 20 px; 1,5 o más | cumple |
| Cuerpo en móvil | 17 px sobre 26,4 px (1,56) | 16 px o más | cumple |
| Alineación | izquierda, sin justificar | no justificar | cumple |
| Longitud media de oración | 19 palabras | 20 o menos | cumple |
| Contraste del texto de cuerpo | 7,5 a 17,4 en los 16 temas | 4,5 (AA); 7 (AAA) | cumple AAA |
| Contraste del texto suave | 5,3 a 7,8 | 4,5 (AA) | cumple AA |
| Desbordamiento horizontal | ninguno en 27 páginas | sin scroll lateral | cumple |
| Enlaces | subrayados | no solo por color | cumple |
| Foco de teclado | contorno de 2 px | visible | cumple |
| Movimiento reducido | hay regla `prefers-reduced-motion` | respetar | cumple |

### Lo que se desvía

| Hallazgo | Dato medido | Riesgo |
|---|---|---|
| Línea larga en escritorio | Mediana de 77 caracteres. Máximo 86. 8 de 27 páginas pasan de 80. | Supera el máximo AAA de 80. Zona cómoda: 60 a 75. Medición con fuente de reemplazo. |
| Línea corta en móvil | Mediana de 39 caracteres. Mínimo 29. | Bajo el rango de 45. Riesgo bajo: es común en móvil. |
| Artículos largos | `05-tiempo-real`: 4387 palabras (22 min). `06-energia`: 3400 palabras (17 min). La mediana es 1609. | Fatiga. Candidatos a dividir. |
| Párrafos largos | 15 de 489 pasan de 80 palabras. El mayor tiene 101 (`02-temporizadores-pwm`). | Rompen "una idea por párrafo". |
| Oraciones largas | 19 % pasan de 25 palabras. En `04-dma`: 30 %. | Más esfuerzo de lectura. |
| Artículos sin subtítulos h3 | `datos/05-pie` y `mundo/03-adc`: más de 1500 palabras y 0 h3. | Menos puntos de anclaje al escanear. |
| Tramo sin ancla visual | Mediana de 120 palabras entre títulos, figuras, cajas o listas. Máximo 217 en `05-tiempo-real`. | Aceptable. Vigilar los máximos. |
| Ajuste de líneas | 0 usos de `text-wrap`. | Líneas finales con una sola palabra, y títulos mal repartidos. |
| Contraste sobre fondo de acento | Texto de acento sobre `--a1`: 4,50 en `gruvbox-noche`. 4,55 en `nord-noche`. | Margen cero sobre el mínimo AA. |
| Tema `puro-noche` | Tinta blanca pura (21) sobre negro puro. | Posible halo y fatiga. Evidencia débil. |
| Código en artículos | 0 bloques `<pre>` o `<code>`. | Las reglas de código aún no aplican. Hay que definirlas antes del primer bloque. |

### Pruebas pendientes

- Probar con el usuario el espaciado de WCAG 1.4.12. Aplicar 2 veces entre párrafos, 0,12 entre letras y 0,16 entre palabras.
  Confirmar que no hay recortes. Hoy el espaciado entre párrafos es 16 px, menos de 1 vez el tamaño de letra.
- Medir caracteres por línea con las fuentes reales.
- Revisar la lectura de las 32 tablas en móvil.

## 3. Reglas aceptadas

El 2026-10-09 se aceptaron las 12 reglas. Esta tabla dice dónde vive cada una.

| # | Regla | Dónde | Estado |
|---|---|---|---|
| 1 | Medida: objetivo de 66 caracteres, máximo de 75 | CSS: `--ancho-lectura: 54ch` | aplicada |
| 2 | Cuerpo de 18/28 px en escritorio y 17 px en móvil | CSS: ya estaba | sin cambio |
| 3 | Párrafo de 80 palabras como máximo | contenido | pendiente |
| 4 | Oración de 20 palabras como objetivo | contenido | pendiente |
| 5 | Un h2 cada 400 palabras. Un h3 cada 300 palabras de sección | contenido | pendiente |
| 6 | Artículo de 2500 palabras como tope | contenido | pendiente |
| 7 | `text-wrap: pretty` en texto y `balance` en títulos | CSS | aplicada |
| 8 | Avisos de 1 a 2 oraciones, con 4 tipos y etiqueta de texto | contenido y HTML | pendiente |
| 9 | Contraste de 4,5 o más, con 0,3 de margen | CSS: `--relleno` y acento de `apuntes-dia` | aplicada |
| 10 | Tinta de `puro-noche` al 90 % de blanco | CSS | aplicada |
| 11 | Código: 60 caracteres por línea, mono de 15 px | CSS: `--ancho-codigo`, `pre`, `code` | aplicada |
| 12 | Cada artículo declara su tipo (Diátaxis) | HTML | pendiente |

### Cambios en `assets/style.css`

- **Medida.** La columna pasó de 760 px a `54ch` (644 px). Con Geist real, la mediana es 68 caracteres por línea.
  El percentil 90 es 75. El máximo es 80. Antes: mediana 77, percentil 90 en 87, máximo 94.
  Se mide en `ch` para que siga al tamaño de letra. Una `ch` de Geist a 18 px mide unos 12 px.
  Las figuras de 640 px caben en la columna sin cambios.
- **Móvil.** La medida en móvil sube de 39 a 41 caracteres de mediana, por el nuevo ajuste de líneas. No se tocó el tamaño de letra.
- **Ajuste de líneas.** `text-wrap: pretty` en párrafos, listas y pies de figura. `text-wrap: balance` en títulos y bajada.
- **Contraste.** Token nuevo `--relleno`: `--a1` mezclado al 60 % con el fondo.
  Lo usan la sidebar activa, la caja `.ojo` y la respuesta correcta del quiz.
  El acento de `apuntes-dia` se oscureció un poco (`#b84b14` a `#b54a14`, `#0e813e` a `#0d7b3b`, `#956704` a `#8f6304`).
  Resultado: 720 pares de texto (16 temas por 5 acentos) con 4,8 o más. Antes había 30 con menos de 4,8.
- **`puro-noche`.** Tinta de `#ffffff` a `#e6e6e6`. El texto de cuerpo baja de `#e6e6e6` a `#cfcfcf` para conservar la jerarquía. Contraste del cuerpo: unos 13,9.
- **Código.** Estilos nuevos para `code` y `pre`. Aún no hay bloques en los artículos.

### Verificación

Medido con Chromium y las fuentes reales (Geist, Geist Mono, Instrument Serif):

- Sin scroll horizontal en las 27 páginas, a 1440 px y a 390 px.
- Prueba de WCAG 1.4.12 (interlineado 1,5, párrafos a 2 veces, letras a 0,12 y palabras a 0,16): sin recortes y sin scroll horizontal.
- Las 108 figuras miden 640 px en escritorio y 560 px en móvil. No se deforman.

## 4. Siguientes pasos

1. Revisar el contenido contra las reglas 3 a 6. Hay 15 párrafos de más de 80 palabras. `05-tiempo-real` (4387 palabras) y `06-energia` (3400) pasan del tope.
   `datos/05-pie` y `mundo/03-adc` no tienen h3.
2. Decidir los 4 tipos de aviso (regla 8). Hoy hay 5 clases: analogía, dato, ojo, clave y objetivos.
3. Decidir cómo se declara el tipo de artículo (regla 12).
4. Habilitar los dominios bloqueados para verificar las cifras con las fuentes originales.
