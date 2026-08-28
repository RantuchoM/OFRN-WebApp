# Atribución — iconos del Plano de escenario

## Cuerdas (violín / viola / cello / contrabajo) — FreeSVG.org (CC0 / dominio público)

| Archivo | Fuente | Uso en OFRN |
|---------|--------|-------------|
| violin.svg | [publicdomainq 0008893doscnq](https://freesvg.org/publicdomainq-0008893doscnq) (SVG ID 175059; OpenClipart / publicdomainq) | violin |
| viola.svg | [publicdomainq violin2](https://freesvg.org/publicdomainq-violin2) (SVG ID 179008; OpenClipart / publicdomainq; silueta de violín usada como viola) | viola |
| cello.svg | [Cello vector image](https://freesvg.org/cello-vector-image) (SVG ID 3882; papapishu / OpenClipart) | cello |
| bass.svg | [double bass 3253216](https://freesvg.org/double-bass-3253216) (SVG ID 183100; OpenClipart) | bass (contrabajo) |

Licencia del sitio: [Creative Commons 0 (dominio público)](https://freesvg.org/pages/public-domain-license).
**Colores de origen preservados** (sanitize-only; no se reescriben fills a `currentColor`).

## Excepción: guitarra (papapishu)

| Archivo | Fuente | Uso en OFRN |
|---------|--------|-------------|
| guitar.svg | **papapishu** — clipart de guitarra acústica (dreadnought); colores de origen preservados | guitar → `instrumentos.id` `21` (Guitarra) |

## Excepción: bandoneón (FreeSVG / OpenClipart CC0)

| Archivo | Fuente | Uso en OFRN |
|---------|--------|-------------|
| bandoneon.svg | [Bandoneón](https://freesvg.org/bandone%C3%A3%C2%B3n) FreeSVG SVG ID **50642** (OpenClipart **216369**, CC0 / dominio público); colores de origen preservados (`#000` / `#333` / `#4d4d4d` / `#ccc`) | bandoneon → `instrumentos.id` **`22b`** (Bandoneón) |

## Excepción: flauta y oboe (Gerald_G / Openclipart)

| Archivo | Fuente | Uso en OFRN |
|---------|--------|-------------|
| flute.svg | **Gerald_G** — [Flute](http://openclipart.org/detail/8614/flute-by-gerald_g-8614) (Openclipart, dominio público); colores de origen preservados | flute |
| oboe.svg | **Gerald_G** — [Oboe](https://openclipart.org/detail/699/oboe) (Openclipart, dominio público; silueta vertical con `currentColor` para tint de tema) | oboe |

El resto del pack en esta carpeta sigue siendo game-icons (abajo). No usar Delapouite
`flute`/`recorder` de game-icons mientras se evalúan estas siluetas Gerald_G.

## Game Icons (CC BY 3.0)

Los demás SVG en `public/stage-plot/icons/` (salvo `flute.svg`, guitarra papapishu, bandoneón FreeSVG, las **cuerdas FreeSVG** arriba y `music-stand.svg` OFRN) provienen de
[game-icons.net](https://game-icons.net)
([repositorio](https://github.com/game-icons/icons)), licencia
[Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/).

Se eliminó el fondo cuadrado negro del pack original y se usa `currentColor` para tintar
(vía `src/utils/stagePlotIconAssets.js`) — solo estos iconos mono y siluetas OFRN.

| Archivo | Autor (game-icons) | Uso en OFRN |
|---------|-------------------|-------------|
| harp.svg | Delapouite | harp |
| clarinet.svg | Caro Asercion | clarinet |
| bassoon.svg | Caro Asercion | bassoon |
| french-horn.svg | Caro Asercion | horn |
| trumpet.svg | Delapouite | trumpet |
| trombone.svg | Caro Asercion | trombone |
| tuba.svg | Delapouite | tuba |
| drum-kit.svg | Caro Asercion | timpani *(closest; no hay kettle drums en el pack)* |
| drum.svg | Delapouite | perc, snare *(compartido)* |
| djembe.svg | Delapouite | bass_drum *(closest)* |
| gong.svg | Delapouite | cymbals *(closest; no hay cymbals en el pack)* |
| xylophone.svg | Delapouite | xylophone |
| ringing-bell.svg | Lorc | tubular_bells *(closest)* |
| grand-piano.svg | Caro Asercion | piano |
| keyboard.svg | Delapouite (`musical-keyboard`) | celesta |
| microphone.svg | Delapouite | mic |
| speaker.svg | Delapouite | speaker, wedge |
| person.svg | Delapouite | conductor |
| desk.svg | Delapouite | chair |
| stairs.svg | Delapouite | riser |
| musical-notes.svg | Delapouite | (reserva; no usado — `text` es solo label tipográfico) |
| saxophone.svg | Delapouite | (reserva) |
| podium.svg | Delapouite | (reserva) |
| tambourine.svg | Delapouite | (reserva) |
| maracas.svg | Delapouite | (reserva) |

Formato de atribución sugerido por game-icons.net:

> Icons made by [author]. Available on https://game-icons.net

## OFRN original — atril / music stand

| Archivo | Fuente | Uso en OFRN |
|---------|--------|-------------|
| music-stand.svg | **OFRN original** (geometría propia; plato `#1e293b` + patas `#64748b`) — esquema mínimo: rectángulo horizontal + tres palitos a **120°** desde el centro (uno vertical arriba, dos diagonales abajo) | `music_stand` (paleta Escenario «Atril») |

No hay equivalente usable en game-icons; se dibujó a propósito para leerse a ~22 px en paleta y ~50×50 cm en lienzo. Colores fijos (no `currentColor`) para legibilidad en miniatura.

## Paths propios (fallback)

Piezas **sin** archivo en `STAGE_PLOT_ICON_FILES` (`mic_stand`, `di`, `mark_x`, `banqueta`, etc.)
usan siluetas vectoriales propias en `src/utils/stagePlotSilhouettes.js` (dominio OFRN).
`music_stand` tiene SVG primario (`music-stand.svg`); la silueta en `stagePlotSilhouettes.js`
queda como fallback alineado (mismo esquema plato + 3 palitos 120°).
El tipo `text` **no** usa icono ni silueta (ni `musical-notes.svg` ni glifo TT): solo el
label tipográfico en lienzo/PDF; la paleta muestra el nombre «Texto» sin pictograma.

No se usan siluetas OFRN inventadas como iconos primarios del pack cuando existe
equivalente (o closest) en game-icons o FreeSVG. **Viola:** freesvg no indexa
viola musical (solo flor *Viola*); se usa `publicdomainq-violin2` como sustituto.
`stagePlotSilhouettes.js` queda solo como fallback de tipos sin archivo SVG.
