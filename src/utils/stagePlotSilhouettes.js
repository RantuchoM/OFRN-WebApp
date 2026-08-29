/**
 * Siluetas top-down propias (vista cenital) para Plano de escenario.
 * viewBox 0 0 64 64; paths originales OFRN (no assets de terceros).
 */

export const STAGE_PLOT_SILHOUETTE_VIEWBOX = 64;

/** @type {Record<string, string>} */
export const STAGE_PLOT_SILHOUETTES = {
  // --- Cuerdas (cuerpo + mástil, vista superior) ---
  violin:
    "M32 6c-1.2 0-2.2 1.2-2.2 3.2v8.2c-4.8 1.4-8.8 5.8-9.6 12.2-1 7.8 3.2 14.2 11.8 16.4v8.6c0 1.4.9 2.4 2 2.4s2-1 2-2.4v-8.6c8.6-2.2 12.8-8.6 11.8-16.4-.8-6.4-4.8-10.8-9.6-12.2V9.2C34.2 7.2 33.2 6 32 6zm0 16.5c3.8 0 6.8 4.2 6.8 9.2S35.8 41 32 41s-6.8-4.3-6.8-9.3 3-9.2 6.8-9.2z",
  viola:
    "M32 4c-1.3 0-2.4 1.3-2.4 3.5v8.5c-5.2 1.5-9.6 6.2-10.5 13.2-1.1 8.6 3.5 15.5 12.9 17.8v9.2c0 1.5 1 2.6 2.2 2.6s2.2-1.1 2.2-2.6v-9.2c9.4-2.3 14-9.2 12.9-17.8-.9-7-5.3-11.7-10.5-13.2V7.5C34.4 5.3 33.3 4 32 4zm0 17c4.2 0 7.5 4.6 7.5 10.2S36.2 41.4 32 41.4 24.5 36.8 24.5 31.2 27.8 21 32 21z",
  cello:
    "M32 2c-1.4 0-2.6 1.4-2.6 3.8v9c-5.8 1.6-10.8 6.8-11.8 14.6-1.3 9.8 3.8 17.6 14.4 20.2v10.6c0 1.6 1.1 2.8 2.4 2.8s2.4-1.2 2.4-2.8V49.6c10.6-2.6 15.7-10.4 14.4-20.2-1-7.8-6-13-11.8-14.6v-9C34.6 3.4 33.4 2 32 2zm0 18.2c4.8 0 8.5 5.2 8.5 11.6S36.8 43.4 32 43.4 23.5 38.2 23.5 31.8 27.2 20.2 32 20.2z",
  bass:
    "M32 1c-1.5 0-2.8 1.5-2.8 4.1v9.2c-6.4 1.7-12 7.4-13.1 16-1.5 11 4.2 19.6 15.9 22.5v9.4c0 1.7 1.2 3 2.6 3s2.6-1.3 2.6-3v-9.4c11.7-2.9 17.4-11.5 15.9-22.5-1.1-8.6-6.7-14.3-13.1-16V5.1C34.8 2.5 33.5 1 32 1zm0 18.8c5.4 0 9.6 5.8 9.6 13S37.4 45.8 32 45.8 22.4 40 22.4 32.8 26.6 19.8 32 19.8z",
  harp:
    "M18 58V10c0-2 1.2-3.5 3.2-3.5h6.4c8.8 0 18.4 8.2 22.8 20.6 3.2 9-1.4 22.6-11.6 28.4L36 58H18zm8-44.5v36.2h5.2c7.2-3.8 11.4-13.2 9.2-21.2C38.2 20.2 31.6 14.2 26 13.5zM28 18h2v32h-2V18zm5 4h2v26h-2V22zm5 5h2v18h-2V27z",

  // --- Maderas ---
  flute:
    "M4 30h52c2.2 0 4 1.3 4 3s-1.8 3-4 3H10l-4 4H4l2-4c-1.2-.4-2-1.4-2-2.6 0-1.7 1.8-3.4 4-3.4zm12 1.5v5h2.5v-5H16zm8 0v5h2.5v-5H24zm8 0v5h2.5v-5H32zm8 0v5h2.5v-5H40z",
  // Oboe: tubo cónico + campana (distinto de flauta cilíndrica)
  oboe:
    "M8 30.5h38l6 1.5v4l-6 1.5H16l-8 5H5.5l4-5H8c-1.4 0-2.5-1.3-2.5-2.8S6.6 30.5 8 30.5zm48 1.2 5-1.8v8.2l-5-1.8v-4.6zM18 32v4.5h1.8V32H18zm7 0v4.5h1.8V32H25zm7 0v4.5h1.8V32H32zm7 0v4.5h1.8V32H39z",
  clarinet:
    "M5 28.5h46c2 0 3.5 1.6 3.5 3.5v1.5c0 1.9-1.5 3.5-3.5 3.5H16l-7 6H6.5l3.5-6H5c-1.4 0-2.5-1.5-2.5-3.2S3.6 28.5 5 28.5zm49 2 6-1.5v9l-6-1.5v-6zM17 30v6h2v-6h-2zm8 0v6h2v-6h-2zm8 0v6h2v-6h-2zm8 0v6h2v-6h-2z",
  bassoon:
    "M8 26h40c2.5 0 4.5 2 4.5 4.5v4c0 2.5-2 4.5-4.5 4.5H22l-8 8H10l4-8H8c-2 0-3.5-2-3.5-4.2V30.5C4.5 28 6 26 8 26zm44.5 3.5 7-2v12l-7-2v-8zM18 28.5v8h2.5v-8H18zm9 0v8h2.5v-8H27zm9 0v8h2.5v-8H36z",

  // --- Metales ---
  horn:
    "M32 8c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 7c7.2 0 13 5.8 13 13s-5.8 13-13 13-13-5.8-13-13 5.8-13 13-13zm0 5.5c-4.1 0-7.5 3.4-7.5 7.5S27.9 35.5 32 35.5 39.5 32.1 39.5 28 36.1 20.5 32 20.5zM48 14l8-4v8l-4 2-4-6z",
  trumpet:
    "M2 28h28c1.5 0 2.5 1 2.5 2.2v5.6c0 1.2-1 2.2-2.5 2.2H8l-4 5H2l2.5-5H2c-1 0-1.8-1.2-1.8-2.5v-5c0-1.3.8-2.5 1.8-2.5zm30 1.5h8v8h-8v-8zm10 1h16l6-4.5v15L56 38H42v-7.5zM34 26.5v2.5h3v-2.5h-3zm0 10.5v2.5h3V37h-3z",
  trombone:
    "M2 29h36c1.2 0 2 .9 2 2v4c0 1.1-.8 2-2 2H10l-5 5H3l3-5H2c-.9 0-1.5-1-1.5-2.2v-3.6C.5 30 1.1 29 2 29zm40 1.5h8v7h-8v-7zm10 .5h14l4-3v13l-4-3H52v-7zM6 24h22v3H6v-3zm0 16h18v3H6v-3z",
  tuba:
    "M18 12c-2 0-4 2.2-4 6v8c-6 2-10 8-10 14 0 9 8 16 20 16h8c12 0 20-7 20-16 0-6-4-12-10-14v-8c0-3.8-2-6-4-6h-4c-1.5 4-4.5 6-8 6s-6.5-2-8-6h-0zM24 20h8v6h-8v-6zm-4 14c0-4 4-7 12-7s12 3 12 7-4 8-12 8-12-4-12-8z",

  // --- Percusión / teclado ---
  timpani:
    "M32 8c-14 0-26 8-26 20v4c0 2 1 3 3 3h46c2 0 3-1 3-3v-4c0-12-12-20-26-20zm0 6c9.5 0 18 5.2 18 12H14c0-6.8 8.5-12 18-12zM10 38h44v4c0 8-10 14-22 14S10 50 10 42v-4zm18 6h8v8h-8v-8z",
  perc:
    "M8 18h20v10H8V18zm28 0h20v10H36V18zM6 32h24l-2 22H8L6 32zm28 0h24l-2 22H36l-2-22zM18 12h4v6h-4v-6zm24 0h4v6h-4v-6zM14 36h8v4h-8v-4zm28 0h8v4h-8v-4z",
  marimba:
    "M6 20h52v24H6V20zm4 4h3.5v16H10V24zm6.5 0h3.5v16h-3.5V24zm6.5 0h3.5v16H23V24zm6.5 0h3.5v16h-3.5V24zm6.5 0h3.5v16H36V24zm6.5 0h3.5v16h-3.5V24zm6.5 0h3.5v16H49V24z",
  vibraphone:
    "M6 16h52v18H6V16zm4 3h3.5v12H10V19zm6.5 0h3.5v12h-3.5V19zm6.5 0h3.5v12H23V19zm6.5 0h3.5v12h-3.5V19zm6.5 0h3.5v12H36V19zm6.5 0h3.5v12h-3.5V19zm6.5 0h3.5v12H49V19zM12 40a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm10 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm10 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm10 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm10 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  bass_drum:
    "M32 6C17.6 6 6 17.6 6 32s11.6 26 26 26 26-11.6 26-26S46.4 6 32 6zm0 6c11 0 20 9 20 20s-9 20-20 20-20-9-20-20 9-20 20-20zm0 8c-6.6 0-12 5.4-12 12s5.4 12 12 12 12-5.4 12-12-5.4-12-12-12z",
  snare:
    "M32 10c-12.2 0-22 9.8-22 22s9.8 22 22 22 22-9.8 22-22-9.8-22-22-22zm0 5c9.4 0 17 7.6 17 17s-7.6 17-17 17-17-7.6-17-17 7.6-17 17-17zM14 30h36v4H14v-4zm4-10 4 4-2.8 2.8-4-4L18 20zm24 0 2.8 2.8-4 4L38 28l4-4zM18 44l2.8-2.8 4 4L22 48l-4-4zm24 0 4 4-2.8 2.8-4-4L42 44z",
  cymbals:
    "M22 12c-9.4 0-17 7.6-17 17s7.6 17 17 17c3.2 0 6.2-.9 8.8-2.4A17 17 0 0 0 42 52c9.4 0 17-7.6 17-17s-7.6-17-17-17c-3.2 0-6.2.9-8.8 2.4A17 17 0 0 0 22 12zm0 6c6.1 0 11 4.9 11 11s-4.9 11-11 11-11-4.9-11-11 4.9-11 11-11zm20 6c6.1 0 11 4.9 11 11s-4.9 11-11 11-11-4.9-11-11 4.9-11 11-11z",
  xylophone:
    "M10 18h44l-4 28H14L10 18zm6 5h3v18h-3V23zm7 2h3v16h-3V25zm7 2h3v14h-3V27zm7 2h3v12h-3V29zm7 2h3v10h-3V31z",
  tubular_bells:
    "M12 8h40v6H12V8zm4 10h4v38h-4V18zm8 4h4v34h-4V22zm8 0h4v34h-4V22zm8-2h4v36h-4V20zm8 6h4v30h-4V26zM10 56h44v4H10v-4z",
  piano:
    "M6 14c0-2 1.5-3.5 3.5-3.5H38c12 0 20 8 20 18.5S50 47.5 38 47.5H9.5C7.5 47.5 6 46 6 44V14zm8 4v26h24c8 0 13.5-5.5 13.5-13S46 18 38 18H14zm4 6h16v3H18v-3zm0 7h12v3H18v-3z",
  celesta:
    "M8 16h48c2 0 3.5 1.5 3.5 3.5v25c0 2-1.5 3.5-3.5 3.5H8c-2 0-3.5-1.5-3.5-3.5v-25C4.5 17.5 6 16 8 16zm4 6v22h40V22H12zm6 4h8v3h-8v-3zm12 0h8v3h-8v-3zm12 0h8v3h-8v-3zm-24 8h8v3h-8v-3zm12 0h8v3h-8v-3zm12 0h8v3h-8v-3z",

  // --- Escenario ---
  chair:
    "M16 14h32v6H16v-6zm4 8h24v22c0 2-1.5 3.5-3.5 3.5h-17c-2 0-3.5-1.5-3.5-3.5V22zm-6 4h4v24H14V26zm38 0h4v24h-4V26zM22 28h20v3H22v-3z",
  // Banqueta / stool (top-down): asiento redondo + patas
  banqueta:
    "M32 14c-9 0-16 7-16 16s7 16 16 16 16-7 16-16-7-16-16-16zm0 6c5.5 0 10 4.5 10 10s-4.5 10-10 10-10-4.5-10-10 4.5-10 10-10zM14 28h4v8h-4v-8zm32 0h4v8h-4v-8zM28 46h8v6h-8v-6z",
  // Atril: plato + 1 pata −Y (músico) + 2 patas +Y (director); alineado a music-stand.svg
  music_stand:
    "M8 10 H56 V17 H8 Z M31 14 H33 V5 H31 Z M32 15 L41 22 L39.5 23.5 Z M32 15 L23 22 L24.5 23.5 Z",
  conductor:
    "M28 6h8v6h-8V6zm-6 8h20c2 0 3.5 1.5 3.5 3.5V28H18.5V17.5c0-2 1.5-3.5 3.5-3.5zM14 30h36v6H40v20h-4V36H28v20h-4V36H14v-6zM24 18h4v6h-4v-6zm12 0h4v6h-4v-6z",
  /** Tarima rectangular (vista cenital): redondeada, aspect ~2:1 — distinta de oval. */
  tarima_rect:
    "M8 20h48a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6V26a6 6 0 0 1 6-6z",
  /** Tarima oval: elipse (rx=26, ry=16); arcos A, no rect redondeado. */
  tarima_oval: "M6 32a26 16 0 1 0 52 0a26 16 0 1 0-52 0",
  riser:
    "M4 40 16 16h32l12 24H4zm8-4h40l-6-12H18L12 36zm-4 6h48v8H8v-8z",

  // --- Audio ---
  mic:
    "M30 4h4c3 0 5.5 2.5 5.5 5.5v14c0 3-2.5 5.5-5.5 5.5h-4c-3 0-5.5-2.5-5.5-5.5v-14C24.5 6.5 27 4 30 4zm2 28c4.5 0 8-3 8.5-7h3c-.6 5.5-4.8 10-11.5 10.8V52h10v4H21v-4h10V35.8C24.3 35 20.1 30.5 19.5 25h3c.5 4 4 7 8.5 7z",
  mic_stand:
    "M31 4h2v36h-2V4zm-1 36h4v4h-4v-4zM18 52l14-8 14 8v4H18v-4zM12 58h40v3H12v-3z",
  di:
    "M10 20h44c2.5 0 4.5 2 4.5 4.5v15c0 2.5-2 4.5-4.5 4.5H10c-2.5 0-4.5-2-4.5-4.5v-15c0-2.5 2-4.5 4.5-4.5zm6 6v12h32V26H16zm6 3h6v6h-6v-6zm14 0h6v6h-6v-6z",
  wedge:
    "M8 44 20 16h24l12 28H8zm10-6h28l-5-12H23l-5 12zM14 46h36v6H14v-6z",
  speaker:
    "M18 6h28c2 0 3.5 1.5 3.5 3.5v45c0 2-1.5 3.5-3.5 3.5H18c-2 0-3.5-1.5-3.5-3.5v-45C14.5 7.5 16 6 18 6zm6 8c6 0 11 5 11 11s-5 11-11 11-11-5-11-11 5-11 11-11zm0 6c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 20c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9zm0 5c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z",

  // --- Marcas ---
  mark_x:
    "M18 14 32 28 46 14l4 4-14 14 14 14-4 4-14-14L18 50l-4-4 14-14L14 18l4-4z",
  // text: sin silueta — solo Konva Text / label en paleta (no glifo TT)
};

/**
 * @param {string} type
 * @returns {string|null}
 */
export function getStagePlotSilhouettePath(type) {
  return STAGE_PLOT_SILHOUETTES[type] || null;
}

/**
 * SVG inline para paleta / preview HTML.
 * @param {string} type
 * @param {string} color
 * @param {number} [size]
 */
export function stagePlotSilhouetteSvgMarkup(type, color, size = 28) {
  const fill = color || "#334155";
  // Elipse nativa: más clara que un path aproximado (paleta tarima_oval).
  if (type === "tarima_oval") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="32" rx="26" ry="16" fill="${fill}" stroke="#0f172a" stroke-width="1.2"/></svg>`;
  }
  if (type === "tarima_rect") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="20" width="52" height="24" rx="6" ry="6" fill="${fill}" stroke="#0f172a" stroke-width="1.2"/></svg>`;
  }
  const d = getStagePlotSilhouettePath(type);
  if (!d) return "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><path fill="${fill}" stroke="#0f172a" stroke-width="1.2" stroke-linejoin="round" d="${d}"/></svg>`;
}
