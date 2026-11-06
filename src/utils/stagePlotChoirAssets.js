/** Fotos de corista, de perfil. No son ítems del plano. */
export const STAGE_PLOT_CHOIR_WOMAN_SRC = "/stage-plot/choir/coreuta-mujer.png";
export const STAGE_PLOT_CHOIR_MAN_SRC = "/stage-plot/choir/coreuta-hombre.png";

/** @type {Promise<{ woman: HTMLImageElement|null, man: HTMLImageElement|null }>|null} */
let choirImagesPromise = null;

function loadHtmlImage(src) {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function loadChoirFigureImages() {
  if (!choirImagesPromise) {
    choirImagesPromise = Promise.all([
      loadHtmlImage(STAGE_PLOT_CHOIR_WOMAN_SRC),
      loadHtmlImage(STAGE_PLOT_CHOIR_MAN_SRC),
    ]).then(([woman, man]) => ({ woman, man }));
  }
  return choirImagesPromise;
}
