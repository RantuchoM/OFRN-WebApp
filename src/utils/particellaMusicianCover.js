import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const A4 = [595.28, 841.89];

/**
 * Portada/separador por músico para el binder «Toda la gira por músico».
 * @param {{
 *   musicianName: string,
 *   mesLetra?: string,
 *   nomenclador?: string,
 *   nombreGira?: string,
 *   ensambles?: string[],
 *   instrumento?: string,
 *   padBlankBack?: boolean,
 * }} opts
 * @returns {Promise<Uint8Array>}
 */
export async function buildMusicianCoverPdf({
  musicianName,
  mesLetra = "",
  nomenclador = "",
  nombreGira = "",
  ensambles = [],
  instrumento = "",
  padBlankBack = false,
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage(A4);
  const { width, height } = page.getSize();
  const margin = 56;
  let y = height - margin - 24;

  const draw = (text, size, f = font, color = rgb(0.12, 0.16, 0.22)) => {
    const line = String(text || "").trim();
    if (!line) return;
    page.drawText(line, {
      x: margin,
      y,
      size,
      font: f,
      color,
      maxWidth: width - margin * 2,
    });
    y -= size + 10;
  };

  draw("Particellas — gira por músico", 11, font, rgb(0.4, 0.45, 0.5));
  y -= 8;
  draw(musicianName || "Músico", 22, fontBold);
  y -= 6;

  const giraBits = [mesLetra, nomenclador].filter(Boolean).join(" · ");
  if (giraBits) draw(giraBits, 13, fontBold);
  if (nombreGira) draw(nombreGira, 12, font);

  y -= 8;
  if (instrumento) {
    draw(`Instrumento: ${instrumento}`, 11, font);
  }
  if (ensambles?.length) {
    draw(`Ensamble(s): ${ensambles.join(", ")}`, 11, font);
  }

  if (padBlankBack) {
    pdf.addPage(A4);
  }

  // Sin object streams: coherente con mergeSequential / marcadores.
  return pdf.save({ useObjectStreams: false });
}
