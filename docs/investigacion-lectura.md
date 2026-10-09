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

## 3. Propuestas de reglas (borrador para decidir)

Estas reglas son propuestas. Cada una se puede aceptar, cambiar o descartar.

1. **Medida:** columna de 66 caracteres como objetivo. Máximo 75 en escritorio. Calcular con `ch`, no con píxeles.
2. **Cuerpo:** mantener 18 px con interlineado de 28 px en escritorio y 17 px en móvil.
3. **Párrafos:** máximo 80 palabras. Una idea por párrafo.
4. **Oraciones:** objetivo de 20 palabras. Revisar las de más de 25.
5. **Estructura:** un h2 cada 400 palabras como máximo. Un h3 cuando una sección pase de 300 palabras.
6. **Longitud:** artículo de 2500 palabras como tope. Dividir los que pasen.
7. **Ajuste de líneas:** `text-wrap: pretty` en párrafos y `text-wrap: balance` en títulos.
8. **Avisos:** de 1 a 2 oraciones. Cuatro tipos con etiqueta de texto: nota, consejo, importante y advertencia.
9. **Contraste:** mínimo 4,5 en todo texto, también sobre fondos de acento. Margen de 0,3 como objetivo.
10. **Tema negro puro:** probar tinta de 90 % de blanco, o dejarlo como opción avanzada.
11. **Código:** 60 caracteres por línea. Explicación fuera del bloque. Fuente mono de 15 a 16 px.
12. **Tipo de página:** cada artículo declara si es tutorial, guía, referencia o explicación (Diátaxis).

## 4. Siguientes pasos

1. Decidir qué reglas de la sección 3 se aceptan.
2. Habilitar los dominios bloqueados para verificar las cifras con las fuentes originales.
3. Repetir la medición con las fuentes reales.
4. Escribir las reglas finales y aplicarlas al CSS.
5. Dividir o recortar los artículos que sobrepasen los límites.
