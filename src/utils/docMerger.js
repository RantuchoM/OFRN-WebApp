import { PDFDocument } from 'pdf-lib';

const detectType = (buffer) => {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'pdf';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'png';
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'jpg';
  return 'jpg';
};

export const mergeSequential = async (items) => {
  const mergedPdf = await PDFDocument.create();
  for (const item of items) {
    if (!item.buffer) continue;
    try {
      const type = detectType(item.buffer);
      if (type === 'pdf') {
        const srcDoc = await PDFDocument.load(item.buffer);
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } else {
        const page = mergedPdf.addPage();
        const image = type === 'png' ? await mergedPdf.embedPng(item.buffer) : await mergedPdf.embedJpg(item.buffer);
        const { width, height } = image.scaleToFit(page.getWidth(), page.getHeight());
        page.drawImage(image, {
          x: page.getWidth() / 2 - width / 2,
          y: page.getHeight() / 2 - height / 2,
          width, height
        });
      }
    } catch (e) { console.error("Error item secuencial:", e); }
  }
  return await mergedPdf.save();
};

export const createMosaicFromCanvas = async (items) => {
  const pdfDoc = await PDFDocument.create();
  const A4 = [595.28, 841.89];
  const page = pdfDoc.addPage(A4);

  for (const item of items) {
    if (!item.buffer) continue;
    try {
      const type = detectType(item.buffer);
      const pdfW = (item.width / 100) * A4[0];
      const pdfH = (item.height / 100) * A4[1];
      const pdfX = (item.x / 100) * A4[0];
      const pdfY = A4[1] - ((item.y / 100) * A4[1]) - pdfH;

      if (type === 'pdf') {
        const srcDoc = await PDFDocument.load(item.buffer);
        // IMPORTANTE: El contexto srcDoc debe estar vivo aquí
        const [embeddedPage] = await pdfDoc.embedPages(srcDoc, [0]);
        page.drawPage(embeddedPage, { x: pdfX, y: pdfY, width: pdfW, height: pdfH });
      } else {
        const image = type === 'png' ? 
          await pdfDoc.embedPng(item.buffer) : 
          await pdfDoc.embedJpg(item.buffer);
        page.drawImage(image, { x: pdfX, y: pdfY, width: pdfW, height: pdfH });
      }
    } catch (e) {
      console.error("Error incrustando item visual:", item.id, e);
    }
  }
  return await pdfDoc.save();
};