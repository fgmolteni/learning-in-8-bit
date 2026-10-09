# Estructura de los artículos

Guía para escribir y convertir los artículos del curso. Se aplica junto con las reglas de lectura de
`docs/investigacion-lectura.md`. Piloto: `temas/procesador/01-procesador.html`.

## Enfoque del curso

- El tema es el concepto general (procesador, memoria, bus, periférico).
  El ESP32 y el ESP32-S3 son el ejemplo y la herramienta.
- El recorrido va de afuera hacia adentro: chip, pines, buses, sistema, memoria y procesador.
- El sitio no muestra código. La implementación en firmware irá en un bloque aparte, más adelante.
  Cada artículo deja este comentario antes de las fuentes:
  `<!-- firmware: aquí irá el bloque que enlaza a la implementación en código de cada sección -->`

## Orden de cada artículo

El centro de cada artículo es el **mecanismo**: cómo funciona cada elemento y cómo se relaciona con los demás.
Los cálculos apoyan la explicación; no la reemplazan.

| # | Parte | Qué contiene |
|---|---|---|
| 1 | Pregunta guía | Un problema concreto con el ejemplo conductor y la respuesta corta en 2 o 3 oraciones. |
| 2 | Vista desde afuera | El elemento como caja negra: qué entra, qué sale y con qué se conecta. Definición formal. |
| 3 | Adentro: elementos y conexiones | Cada pieza, qué hace y con quién se comunica. Diagrama de bloques con las conexiones. |
| 4 | Recorrido paso a paso | Una operación del ejemplo conductor sigue su camino por los elementos, en orden. Es la parte más larga. |
| 5 | Cómo se encadenan | Repetición, solapamiento o paralelismo: cómo trabajan juntos los elementos en el tiempo. |
| 6 | Implementación | Cómo lo construye el hardware del ESP32 y del ESP32-S3, y en qué se diferencian. Sin código. |
| 7 | Relación con el resto del chip | Qué capas de afuera lo alimentan o lo interrumpen, con enlaces a esos niveles. |
| 8 | Los números que importan | De 2 a 3 cálculos que ayudan a entender el mecanismo o a decidir. |
| 9 | Límites | Lo que el modelo no cubre y los datos por confirmar. |
| 10 | Cierre | Caja «para llevar» y un repaso: al menos una pregunta sobre el mecanismo. |

Los títulos `h2` son descriptivos. No llevan el nombre de la parte («Definición: …»).

## Redacción

- Español neutro técnico. Sin voseo. Se usa «tú» solo cuando hace falta dirigirse al lector.
- Un solo ejemplo conductor recorre todo el artículo y vuelve en cada parte.
- Patrón de párrafo: qué hace el elemento, de quién recibe, a quién entrega y qué cambia después.
- Cada elemento nuevo se presenta por su relación con los que ya se explicaron.
- Oraciones de 15 a 22 palabras, con conectores («porque», «por eso», «entonces»). Máximo 80 palabras por párrafo.
- Magnitudes siempre con unidad. Valores aproximados con «del orden de».
- Supuestos declarados como supuestos: «si un fallo de caché cuesta 40 ciclos (supuesto)…».
- Datos sin fuente verificada: «por confirmar», en el texto y en la lista de límites.
- Analogías del campo del lector (electrónica): línea de producción con tiempos, máquina de estados, filtro.

## Caja de cálculo

```html
<div class="caja calculo">
  <h4>cálculo: tiempo por muestra</h4>
  <p class="formula"><var>t</var> = <var>N</var> · <var>CPI</var> · <var>T</var></p>
  <dl>
    <dt>N</dt><dd>276 instrucciones por muestra (supuesto)</dd>
    <dt>CPI</dt><dd>1,46 ciclos por instrucción</dd>
    <dt>T</dt><dd>4,17 ns (240 MHz)</dd>
  </dl>
  <p class="resultado">N · CPI = 276 · 1,464 ≈ 404 ciclos; t = 404 · 4,17 ns ≈ 1,68 µs</p>
  <p>Interpretación en una o dos oraciones.</p>
</div>
```

- Una caja por cálculo. Entre 2 y 3 cajas por artículo. Si un número no ayuda a entender o a decidir, va en una frase o no va.
- Coma decimal y punto medio (·) para multiplicar. Unidades del SI.
- Cada resultado lleva su unidad. No se mezclan ciclos y tiempo en una misma igualdad.
- Las comparaciones usan la misma base: el lazo completo frente al lazo completo, no una parte frente al todo.
- Cada número de un cálculo se puede rastrear: dato del sitio, dato de la hoja de datos o supuesto declarado.
