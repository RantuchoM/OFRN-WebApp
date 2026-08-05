import {
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
} from "pdf-lib";

/** Guardado sin object streams: el árbol /Outlines queda en claro.
 *  Visores ligeros (p. ej. editores online tipo Smallpdf) a menudo no
 *  resuelven Outlines comprimidos en object streams y muestran "No Bookmarks". */
const PDF_SAVE_OPTS = { useObjectStreams: false };

const detectType = (buffer) => {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)
    return "pdf";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  return "jpg";
};

/**
 * @typedef {{ title: string, pageIndex: number, children?: OutlineNode[] }} OutlineNode
 */

/**
 * Añade marcadores (outline) al documento. Índices de página 0-based.
 * @param {import('pdf-lib').PDFDocument} pdfDoc
 * @param {OutlineNode[]} nodes
 * @param {{ pageModeUseOutlines?: boolean }} [options]
 */
export const attachPdfBookmarks = (pdfDoc, nodes, options = {}) => {
  if (!nodes?.length) return;
  const pages = pdfDoc.getPages();
  if (!pages.length) return;

  const { pageModeUseOutlines = true } = options;
  const ctx = pdfDoc.context;

  const buildLevel = (nodeList, parentRef) => {
    const itemRefs = [];
    let openCount = 0;

    for (const node of nodeList) {
      const pageIdx = Math.min(
        Math.max(0, Number(node.pageIndex) || 0),
        pages.length - 1,
      );
      const page = pages[pageIdx];
      const children = Array.isArray(node.children) ? node.children : [];

      const itemDict = ctx.obj({});
      const itemRef = ctx.register(itemDict);
      itemRefs.push(itemRef);

      itemDict.set(
        PDFName.of("Title"),
        PDFHexString.fromText(String(node.title || "Sin título")),
      );
      itemDict.set(PDFName.of("Parent"), parentRef);
      // /Fit evita nulls en el array Dest (más compatible con parsers débiles).
      itemDict.set(
        PDFName.of("Dest"),
        ctx.obj([page.ref, PDFName.of("Fit")]),
      );

      if (children.length) {
        const childResult = buildLevel(children, itemRef);
        itemDict.set(PDFName.of("First"), childResult.firstRef);
        itemDict.set(PDFName.of("Last"), childResult.lastRef);
        // Count > 0 → expandido; valor = ítems visibles bajo este nodo.
        itemDict.set(PDFName.of("Count"), PDFNumber.of(childResult.count));
        openCount += 1 + childResult.count;
      } else {
        openCount += 1;
      }
    }

    for (let i = 0; i < itemRefs.length; i += 1) {
      const dict = ctx.lookup(itemRefs[i]);
      if (i > 0) dict.set(PDFName.of("Prev"), itemRefs[i - 1]);
      if (i < itemRefs.length - 1) dict.set(PDFName.of("Next"), itemRefs[i + 1]);
    }

    return {
      firstRef: itemRefs[0],
      lastRef: itemRefs[itemRefs.length - 1],
      count: openCount,
    };
  };

  const outlinesDict = ctx.obj({});
  const outlinesRef = ctx.register(outlinesDict);
  const { firstRef, lastRef, count } = buildLevel(nodes, outlinesRef);

  outlinesDict.set(PDFName.of("Type"), PDFName.of("Outlines"));
  outlinesDict.set(PDFName.of("First"), firstRef);
  outlinesDict.set(PDFName.of("Last"), lastRef);
  outlinesDict.set(PDFName.of("Count"), PDFNumber.of(count));
  pdfDoc.catalog.set(PDFName.of("Outlines"), outlinesRef);

  if (pageModeUseOutlines) {
    pdfDoc.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
  }
};

/**
 * Reasigna pageIndex de un árbol de outlines sumando un offset (absoluto en el PDF destino).
 * @param {OutlineNode} node
 * @param {number} pageOffset
 * @returns {OutlineNode}
 */
export const offsetOutlineNode = (node, pageOffset) => ({
  title: node.title,
  pageIndex: (Number(node.pageIndex) || 0) + pageOffset,
  ...(node.children?.length
    ? { children: node.children.map((c) => offsetOutlineNode(c, pageOffset)) }
    : {}),
});

/**
 * Une buffers en un PDF secuencial.
 * @param {Array<{
 *   buffer: Uint8Array,
 *   title?: string,
 *   outlineChildren?: OutlineNode[],
 * }>} items
 *   title: marcador en la primera página del ítem.
 *   outlineChildren: página relativa al inicio del ítem (0 = primera página del buffer).
 * @param {{
 *   padOddPages?: boolean,
 *   returnOutlines?: boolean,
 *   pageModeUseOutlines?: boolean,
 * }} [options]
 *   padOddPages (Doble Faz): si un ítem aporta páginas impares, agrega una hoja
 *   en blanco del mismo tamaño para que la siguiente particella empiece en anverso.
 *   returnOutlines: si true devuelve `{ bytes, outlines }` con índices absolutos.
 */
export const mergeSequential = async (items, options = {}) => {
  const {
    padOddPages = false,
    returnOutlines = false,
    pageModeUseOutlines = true,
  } = options;
  const mergedPdf = await PDFDocument.create();
  /** @type {OutlineNode[]} */
  const outlineNodes = [];

  for (const item of items) {
    if (!item?.buffer) continue;
    const startPage = mergedPdf.getPageCount();
    try {
      const type = detectType(item.buffer);
      if (type === "pdf") {
        const srcDoc = await PDFDocument.load(item.buffer);
        const pageCount = srcDoc.getPageCount();
        const copiedPages = await mergedPdf.copyPages(
          srcDoc,
          srcDoc.getPageIndices(),
        );
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        if (padOddPages && pageCount % 2 === 1) {
          const last = copiedPages[copiedPages.length - 1];
          const { width, height } = last.getSize();
          mergedPdf.addPage([width, height]);
        }
      } else {
        const page = mergedPdf.addPage();
        const image =
          type === "png"
            ? await mergedPdf.embedPng(item.buffer)
            : await mergedPdf.embedJpg(item.buffer);
        const { width, height } = image.scaleToFit(
          page.getWidth(),
          page.getHeight(),
        );
        page.drawImage(image, {
          x: page.getWidth() / 2 - width / 2,
          y: page.getHeight() / 2 - height / 2,
          width,
          height,
        });
        // Una imagen = 1 página → con Doble Faz siempre se rellena.
        if (padOddPages) {
          mergedPdf.addPage([page.getWidth(), page.getHeight()]);
        }
      }

      const remappedChildren = (item.outlineChildren || []).map((c) =>
        offsetOutlineNode(c, startPage),
      );

      if (item.title) {
        outlineNodes.push({
          title: item.title,
          pageIndex: startPage,
          ...(remappedChildren.length ? { children: remappedChildren } : {}),
        });
      } else if (remappedChildren.length) {
        outlineNodes.push(...remappedChildren);
      }
    } catch (e) {
      console.error("Error item secuencial:", e);
    }
  }

  if (outlineNodes.length && mergedPdf.getPageCount() > 0) {
    attachPdfBookmarks(mergedPdf, outlineNodes, { pageModeUseOutlines });
  }

  // useObjectStreams:false deja /Outlines y /Dest en el PDF "en claro" para
  // que editores online y algunos visores nativos detecten el outline.
  const bytes = await mergedPdf.save(PDF_SAVE_OPTS);
  if (returnOutlines) {
    return { bytes, outlines: outlineNodes };
  }
  return bytes;
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
      const pdfY = A4[1] - (item.y / 100) * A4[1] - pdfH;

      if (type === "pdf") {
        const srcDoc = await PDFDocument.load(item.buffer);
        // IMPORTANTE: El contexto srcDoc debe estar vivo aquí
        const [embeddedPage] = await pdfDoc.embedPages(srcDoc, [0]);
        page.drawPage(embeddedPage, {
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
        });
      } else {
        const image =
          type === "png"
            ? await pdfDoc.embedPng(item.buffer)
            : await pdfDoc.embedJpg(item.buffer);
        page.drawImage(image, {
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
        });
      }
    } catch (e) {
      console.error("Error incrustando item visual:", item.id, e);
    }
  }
  return await pdfDoc.save();
};
