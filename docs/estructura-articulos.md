# Estructura de los artículos

Guía para escribir y convertir los artículos del curso (contrato v2). Se aplica junto con `GUIA.md` (diseño y
figuras) y las reglas de lectura de `docs/investigacion-lectura.md`. Pilotos: `temas/mundo/03-adc.html` y
`temas/mundo/04-dac.html`, con sus páginas de componentes. Los tomos que todavía siguen la estructura anterior
(10 partes, cajas de cálculo al final) se convierten tomo por tomo; este contrato reemplaza a esa estructura.

## Enfoque del curso

- El propósito es formar un ingeniero de firmware y de computación en el borde: entender cómo funciona la máquina,
  poder desarrollar un elemento propio el día de mañana y diagnosticar la falla de un componente. Abarca electrónica
  digital, sistemas digitales, firmware, computación y redes neuronales.
- El tema es el **concepto**, no el chip ni un problema a resolver. Un artículo puede explicar qué es un DAC o un
  procesador sin plantear una situación práctica. Por qué funciona un elemento, y por qué falla, importa más que
  cómo se configura.
- Los micros de Espressif son los que se usan a diario y guían los ejemplos, pero el sitio no se limita a una marca.
  Otros micros (RP2040, STM32, AVR, RISC-V) entran como casos normales cuando aclaran el concepto. Las comparaciones
  van entre arquitecturas, no solo entre chips de la misma familia.
- Cuando existe un estándar, se nombra y se explica qué fija.
- Las páginas no muestran código ni nombres de funciones de API o de registros. El tomo *Inteligencia en el borde*
  (`temas/borde/`) tiene una excepción: cada nivel cierra con una caja `div.caja.firmware`, con código de referencia (C)
  plegado en `<details>`, ligado a los pasos del recorrido, con líneas de hasta 60 caracteres y probado con los números
  de las figuras. El comentario de HTML que anunciaba un bloque de firmware para los otros tomos queda en pausa hasta
  que se decida ese bloque; las páginas v2 no lo llevan.

## Dos páginas por tema

| | Concepto | Componentes |
|---|---|---|
| Archivo | `NN-slug.html`, una entrada en `CURSOS` | `NNb-slug.html`, campo `c` de esa entrada |
| `data-nivel` | `NN` | `NNb` |
| Enseña | el sistema en general, válido para cualquier micro | cómo lo hacen micros concretos: ESP32, ESP32-S3 y, como contraste, otro de otra familia |
| Fuentes base | libros, cursos y notas académicas | datasheets y manuales, con su versión y las condiciones de medición |
| Progreso | se marca como completado | no se marca |

- El concepto enlaza a la página de componentes en un párrafo antes de las fuentes. Los componentes enlazan al
  concepto en la bajada. El pie lo arma `site.js` (`<div data-nav-niveles>`): vuelve al concepto y sigue con el nivel
  siguiente. La barra lateral marca el nivel y agrega «↳ componentes».
- Un tema sin un componente específico no necesita página de componentes.
- Una página de componentes no explica el concepto de nuevo. Lo cita y muestra qué cifras y límites reales aparecen:
  qué trae cada micro, cuánto vale un LSB, qué dice el manual y qué no dice.

## Estructura de la página de concepto

El orden lo pide el concepto, no una plantilla. Siempre hay:

1. `nivel-chip`, `h1` y bajada. La bajada es una o dos oraciones con la idea del tema.
2. Una caja `objetivos` con lo que el lector va a poder hacer, en verbos de capacidad.
3. Un **tema central** y subtemas muy ligados a él, como `h2` (la barra lateral los lista). Dentro de un subtema,
   `h3` para anclar la lectura.
4. En cada subtema: qué es, por qué funciona, qué lo limita y cómo se ve cuando falla. Cada concepto se profundiza
   antes de pasar al siguiente. Si un subtema no se conecta con el central, no va.
5. Repasos (`caja quiz`, de 1 a 3 por página) después de los subtemas que lo merecen.
6. Una caja `clave` «para llevar», las fuentes y el pie.

Cajas: `dato` (un hecho con su fuente), `ojo` (un error común o un límite documentado), `clave` y `quiz`. `analogia` solo
si aclara algo concreto que el texto no puede. El largo lo pide el tema; como orientación, de 3000 a 5000 palabras
el concepto y de 1500 a 3500 los componentes.

## Cálculos

Los cálculos van **dentro de la explicación**. Cada uno:

1. Parte de una pregunta del propio texto («¿hasta qué frecuencia aguanta un ADC sin retención?»).
2. Dice qué se calcula y para qué sirve antes de mostrar la fórmula.
3. Muestra la fórmula con `<p class="formula">` y el resultado con su unidad.
4. Cierra con una frase que dice qué cambia para el diseño o para el diagnóstico.

Reglas:

- Si un número no cambia lo que entiende el lector, no va.
- Se prefiere deducir antes que enunciar (el ruido de cuantización sale de integrar un diente de sierra).
- Coma decimal, punto medio (·) para multiplicar, unidades del SI. No se mezclan ciclos y tiempo en una igualdad.
- Las comparaciones usan la misma base: el lazo completo frente al lazo completo.
- Cada número es rastreable: una fuente, una cifra de otra página del sitio o un supuesto. Los supuestos se marcan en
  el texto («valores supuestos», «(supuesto)») y en la nota final de las fuentes.
- La caja `calculo` (título `h4` y lista `dl`) sigue en el CSS por compatibilidad con otros tomos. En las páginas v2 se
  prefiere `p.formula` en el flujo del texto.

## Fuentes y verificación

- Jerarquía: 1) libros, cursos y notas de enseñanza o de aplicación de uso académico (por ejemplo Taub-Schilling,
  Valvano, Weste-Harris, las notas MT de Kester), 2) normas, 3) datasheets y manuales del fabricante, solo para las
  cifras de un chip, 4) notas de aplicación de un fabricante cuando enseñan un principio, diciendo qué chip describen.
- Cada afirmación técnica se contrasta con la fuente antes de entrar a la página. Un libro escaneado se lee con OCR y
  se verifica contra la imagen de la página citada.
- La copia local está en `docs/bibliografia/` (ignorada por git: derechos de autor, solo consulta). En la página va el
  título, el capítulo y, si existe, la URL.
- Lo que sale de la propia cuenta se declara: «deducción propia», «lectura propia», «supuesto». Esas declaraciones van
  en el párrafo `p.nota` de la sección de fuentes.
- Lo que no se pudo confirmar va como «por confirmar» o se deja afuera. No se completa con conocimiento general.
- Si un informe de un agente o de una búsqueda trae una cifra, se verifica contra la fuente antes de usarla.

## Redacción

- Español rioplatense técnico, con voseo («vos», «podés»).
- Tono de colega que explica: ritmo variable, sin frases armadas y sin fórmulas de apertura. Una idea por párrafo, de
  hasta unas 4 líneas. La negrita marca el término clave en su definición.
- Cada término se define la primera vez que aparece, sin suponer que el lector pasó por otro nivel. Si se retoma,
  se enlaza al nivel.
- Cada paso de una explicación dice por qué hace falta y cómo sigue del anterior.
- Magnitudes siempre con unidad. «Del orden de» para valores aproximados.
- No se llama «chip» al micro: «micro» o «variante». «Chip» queda para circuitos integrados físicos.
- Referencias: «nivel N» dentro del tomo, «Tomo X, nivel N» dentro de la sección, «Microcontroladores, Tomo X, nivel N»
  o «IA en el borde, Tomo X, nivel N» entre secciones, siempre como enlace relativo.

## Figuras

Las reglas de diseño están en `GUIA.md`. Una figura por idea, con números que se entiendan sin el texto. Cuando hay
muchas coordenadas (curvas, espectros, formas de onda) se generan con un script y se revisan en tema claro y oscuro.
No llevan nombres de registros ni de funciones.

## Lista de control antes de dar por terminada una página

1. Cifras contrastadas con su fuente; supuestos marcados.
2. Términos definidos al primer uso y el porqué de cada paso.
3. Sin errores de consola, sin scroll horizontal a 390 px, tema claro y oscuro.
4. Enlaces internos y URLs de fuentes vivos.
5. Sección de fuentes con la nota de lo propio y lo supuesto.
6. Notas al margen según las reglas de abajo.
7. Versión nueva en `site.js` y commit en `develop`.

## Notas al margen

Definen al paso lo que el texto nombra sin explicar, para que el lector entienda la referencia sin salir del párrafo.

Páginas con notas: `temas/mundo/02-temporizadores-pwm.html` (piloto), `03`, `03b`, `04`, `04b` y `05` del mismo tomo. Cada página que se convierte a v2 las lleva.

Marcado: el término lleva `class="ref"` y `data-nota`; la nota es un `span` al final de la misma oración, dentro del
mismo `p` o `li`, con `id="nota-<clave>"` y el atributo `popover`. El rótulo va en minúsculas; para un acrónimo, la expansión en inglés.

```html
<p>El <span class="ref" data-nota="pll">PLL</span> que lleva … propio.<span class="nota-margen" popover id="nota-pll"><b>pll · phase-locked loop</b>Lazo de enganche de fase…</span></p>
```

Se ve así: desde 1300 px de ancho, la nota flota en el margen derecho a la altura de su oración y aparece con un
fundido cuando entra en pantalla al hacer scroll; después queda fija. La columna de esas páginas se corre a la
izquierda para dejar el margen libre. Si varias notas caen juntas se apilan, y la de abajo se aleja de su línea: por
eso, notas cortas. Cada nota tiene una X que la cierra hasta recargar la página. En pantallas más angostas (tablet, celular), tocar el término —o pasar el mouse por encima— abre la nota como tarjeta abajo de
la pantalla; se cierra tocando afuera, saliendo con el mouse o con Esc (popover nativo, `montarNotas()` en `site.js`).

Cuándo se usan: **siempre** que el cuerpo del artículo nombre por primera vez uno de estos elementos.

| Tipo | Ejemplos | Qué dice la nota |
|---|---|---|
| Sigla o acrónimo | PLL, DAC, CPU, PWM, VDD | Expansión en inglés en el rótulo y qué es, en castellano. |
| Concepto rápido | flip-flop, jitter, puente en H, filtro RC | Qué es y para qué sirve, sin profundizar. |
| Marca o fabricante | Espressif, Arm, LEDC (nombre propio de un periférico) | Quién es o de quién es el nombre, y qué hace. |
| Estándar o norma | IEEE 1139, I2C, USB | Quién lo publica y qué define. |

Reglas:

- Una nota por término y por página, en la primera mención dentro de un `p` o un `li` del cuerpo. No van en el
  título, la bajada, los objetivos, los `h2`/`h3`, las figuras, las tablas ni las fuentes. Si el término aparece
  primero en uno de esos lugares, la nota va en su primera mención en un párrafo.
- Si la misma oración ya da la expansión y el significado («partes por millón (ppm)»), no lleva nota.
- Si el párrafo explica el concepto pero no la sigla (el PWM), la nota da la expansión y una línea de qué es.
- De 1 a 3 oraciones, unas 40 palabras como máximo. Qué es y para qué sirve, no cómo se calcula.
- Cifras solo verificadas, con «del orden de» si son aproximadas. Una nota no reemplaza una fuente.
- Si el término se explica más adelante en la página, la nota lo dice («se define más abajo, en …»).
- `.nota-margen` y no `.nota`: `.nota` ya existe en `section.fuentes`.
