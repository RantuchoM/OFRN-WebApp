# Atribución — iconos del Plano de escenario

## Cuerdas medias/graves — FreeSVG.org (CC0 / dominio público)

| Archivo | Fuente | Uso en OFRN |
|---------|--------|-------------|
| viola.svg | [Detailed Violin Silhouette](https://freesvg.org/detailed-violin-silhouette) (SVG ID 166128; no hay viola musical en freesvg → silueta de violín, 1 path lateral) | viola |
| cello.svg | [Cello musical instrument](https://freesvg.org/cello-musical-instrument) (SVG ID 150815; silueta lateral; publicdomainvectors.org) | cello |
| bass.svg | [double bass 3253216](https://freesvg.org/double-bass-3253216) (SVG ID 183100; Openclipart; contrabajo lateral) | bass (contrabajo) |

Licencia del sitio: [Creative Commons 0 (dominio público)](https://freesvg.org/pages/public-domain-license).
Adaptados a `currentColor` en OFRN (vía `src/utils/stagePlotIconAssets.js`).

## Excepción: flauta y oboe (Gerald_G / Openclipart)

| Archivo | Fuente | Uso en OFRN |
|---------|--------|-------------|
| flute.svg | **Gerald_G** — [Flute](http://openclipart.org/detail/8614/flute-by-gerald_g-8614) (Openclipart, dominio público); adaptado a `currentColor` | flute |
| oboe.svg | **Gerald_G** — [Oboe](https://openclipart.org/detail/699/oboe) (Openclipart, dominio público; silueta vertical); adaptado a `currentColor` | oboe |

El resto del pack en esta carpeta sigue siendo game-icons (abajo). No usar Delapouite
`flute`/`recorder` de game-icons mientras se evalúan estas siluetas Gerald_G.

## Game Icons (CC BY 3.0)

Los demás SVG en `public/stage-plot/icons/` (salvo `flute.svg`/`oboe.svg` y las cuerdas FreeSVG arriba) provienen de
[game-icons.net](https://game-icons.net)
([repositorio](https://github.com/game-icons/icons)), licencia
[Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/).

Se eliminó el fondo cuadrado negro del pack original y se usa `currentColor` para tintar
(vía `src/utils/stagePlotIconAssets.js`).

| Archivo | Autor (game-icons) | Uso en OFRN |
|---------|-------------------|-------------|
| violin.svg | Zajkonur | violin |
| harp.svg | Delapouite | harp |
| clarinet.svg | Caro Asercion | clarinet |
| bassoon.svg | Caro Asercion | bassoon |
| french-horn.svg | Caro Asercion | horn |
| trumpet.svg | Delapouite | trumpet |
| trombone.svg | Caro Asercion | trombone |
| tuba.svg | Caro Asercion | tuba |
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
| guitar.svg | Lorc | (reserva) |
| podium.svg | Delapouite | (reserva) |
| tambourine.svg | Delapouite | (reserva) |
| maracas.svg | Delapouite | (reserva) |

Formato de atribución sugerido por game-icons.net:

> Icons made by [author]. Available on https://game-icons.net

## Paths propios (fallback)

Piezas **sin** archivo en `STAGE_PLOT_ICON_FILES` (`music_stand`, `mic_stand`, `di`, `mark_x`, etc.)
usan siluetas vectoriales propias en `src/utils/stagePlotSilhouettes.js` (dominio OFRN).
El atril (`music_stand`) queda en silhouette upright (desk arriba, trípode abajo).
El tipo `text` **no** usa icono ni silueta (ni `musical-notes.svg` ni glifo TT): solo el
label tipográfico en lienzo/PDF; la paleta muestra el nombre «Texto» sin pictograma.

No se usan siluetas OFRN inventadas como iconos primarios del pack cuando existe
equivalente (o closest) en game-icons o FreeSVG. **Viola:** freesvg no indexa
viola musical (solo flor *Viola*); se usa silueta de violín (166128) como sustituto.
`stagePlotSilhouettes.js` queda solo como fallback de tipos sin archivo SVG.