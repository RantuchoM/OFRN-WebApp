import PizZip from "pizzip";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const TWIP_TO_MM = 25.4 / 1440;
const DEFAULT_PAGE_MARGIN_MM = 25.4;

function readPgMarTwip(pgMarAttrs, side) {
  const match = pgMarAttrs.match(new RegExp(`w:${side}="(\\d+)"`, "i"));
  return match ? Number(match[1]) : null;
}

/**
 * Lee márgenes de página (mm) del último w:sectPr del documento host.
 * @param {ArrayBuffer|Uint8Array} hostBuffer
 */
export function parseDocxPageMarginsMm(hostBuffer) {
  const hostZip = new PizZip(hostBuffer);
  const hostDocFile = hostZip.file("word/document.xml");
  if (!hostDocFile) {
    return {
      top: DEFAULT_PAGE_MARGIN_MM,
      right: DEFAULT_PAGE_MARGIN_MM,
      bottom: DEFAULT_PAGE_MARGIN_MM,
      left: DEFAULT_PAGE_MARGIN_MM,
    };
  }

  const hostDocXml = hostDocFile.asText();
  const sectPrMatch = hostDocXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/gi);
  const sectPr = sectPrMatch?.[sectPrMatch.length - 1] || "";
  const pgMarMatch = sectPr.match(/<w:pgMar[^>]*\/?>/i);
  const pgMarAttrs = pgMarMatch?.[0] || "";

  const twipToMm = (twip) =>
    Number.isFinite(twip) ? twip * TWIP_TO_MM : DEFAULT_PAGE_MARGIN_MM;

  return {
    top: twipToMm(readPgMarTwip(pgMarAttrs, "top")),
    right: twipToMm(
      readPgMarTwip(pgMarAttrs, "right") ?? readPgMarTwip(pgMarAttrs, "end"),
    ),
    bottom: twipToMm(readPgMarTwip(pgMarAttrs, "bottom")),
    left: twipToMm(
      readPgMarTwip(pgMarAttrs, "left") ?? readPgMarTwip(pgMarAttrs, "start"),
    ),
  };
}

function extractBodyContent(documentXml) {
  const bodyMatch = documentXml.match(/<w:body[^>]*>([\s\S]*)<\/w:body>/i);
  if (!bodyMatch) {
    throw new Error("El archivo Word no tiene un cuerpo de documento válido.");
  }
  return bodyMatch[1].replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/i, "").trim();
}

function buildMergeSpacer({ blankLines = 2 } = {}) {
  let xml = "";
  for (let index = 0; index < blankLines; index += 1) {
    xml += "<w:p/>";
  }
  return xml;
}

function findBodyContentInsertIndex(hostDocXml) {
  const bodyClose = hostDocXml.lastIndexOf("</w:body>");
  if (bodyClose < 0) return -1;

  const beforeBodyClose = hostDocXml.slice(0, bodyClose);
  const sectPrStart = beforeBodyClose.lastIndexOf("<w:sectPr");
  if (sectPrStart >= 0) return sectPrStart;
  return bodyClose;
}

function parseRelationshipAttributes(attrs) {
  const pick = (name) => attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1];
  return {
    id: pick("Id"),
    type: pick("Type"),
    target: pick("Target"),
  };
}

const IMAGE_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";

const MEDIA_CONTENT_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
};

function mediaExtensionFromTarget(target) {
  const clean = String(target || "").split("/").pop() || "";
  const dot = clean.lastIndexOf(".");
  return dot > 0 ? clean.slice(dot + 1).toLowerCase() : "";
}

function ensureContentTypeDefaults(hostZip, extensions) {
  const path = "[Content_Types].xml";
  const file = hostZip.file(path);
  if (!file) return;

  let xml = file.asText();
  for (const ext of extensions) {
    const normalized = String(ext || "").toLowerCase();
    const contentType = MEDIA_CONTENT_TYPES[normalized];
    if (!contentType) continue;
    if (new RegExp(`Extension="${normalized}"`, "i").test(xml)) continue;
    xml = xml.replace(
      "</Types>",
      `<Default Extension="${normalized}" ContentType="${contentType}"/></Types>`,
    );
  }
  hostZip.file(path, xml);
}

function replaceRelationshipId(content, oldId, newId) {
  const escaped = String(oldId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content.replace(
    new RegExp(`r:(embed|id)="${escaped}"`, "g"),
    (_match, attr) => `r:${attr}="${newId}"`,
  );
}

function parseRelationshipElements(relsXml) {
  const matches = [
    ...relsXml.matchAll(/<Relationship\s+([^>]+?)\s*\/>/g),
    ...relsXml.matchAll(/<Relationship\s+([^>]+?)><\/Relationship>/g),
  ];
  return matches.map((match) => parseRelationshipAttributes(match[1]));
}

function uniqueMediaName(hostZip, fileName) {
  const clean = fileName.split("/").pop() || "image.png";
  if (!hostZip.file(`word/media/${clean}`)) return clean;
  const dot = clean.lastIndexOf(".");
  const base = dot > 0 ? clean.slice(0, dot) : clean;
  const ext = dot > 0 ? clean.slice(dot + 1) : "png";
  let counter = 2;
  let candidate = `${base}_cf${counter}.${ext}`;
  while (hostZip.file(`word/media/${candidate}`)) {
    counter += 1;
    candidate = `${base}_cf${counter}.${ext}`;
  }
  return candidate;
}

function remapAppendixRelationships(hostZip, appendixZip, appendixContent) {
  const relsPath = "word/_rels/document.xml.rels";
  const hostRelsFile = hostZip.file(relsPath);
  const appendixRelsFile = appendixZip.file(relsPath);
  if (!hostRelsFile || !appendixRelsFile) {
    return { content: appendixContent, hostRelsXml: hostRelsFile?.asText() || "" };
  }

  let hostRelsXml = hostRelsFile.asText();
  const appendixRelsXml = appendixRelsFile.asText();
  let content = appendixContent;
  const addedMediaExtensions = new Set();

  const hostIdNums = [...hostRelsXml.matchAll(/Id="rId(\d+)"/g)].map((match) =>
    Number(match[1]),
  );
  let nextId = (hostIdNums.length ? Math.max(...hostIdNums) : 0) + 1;
  let appendedRels = "";

  const imageRelationships = parseRelationshipElements(appendixRelsXml)
    .filter(
      (rel) =>
        rel.type === IMAGE_REL_TYPE ||
        String(rel.target || "").startsWith("media/"),
    )
    .sort((a, b) => String(b.id || "").length - String(a.id || "").length);

  for (const { id: oldId, type, target } of imageRelationships) {
    if (!oldId || !target || !type) continue;

    const newId = `rId${nextId}`;
    nextId += 1;
    let targetOut = target;

    if (target.startsWith("media/")) {
      const sourcePath = `word/${target}`;
      const mediaFile = appendixZip.file(sourcePath);
      if (!mediaFile) {
        console.warn("Cuadro de firmas: media del anexo no encontrada", target);
        continue;
      }
      const destName = uniqueMediaName(hostZip, target);
      hostZip.file(`word/media/${destName}`, mediaFile.asUint8Array());
      targetOut = `media/${destName}`;
      const ext = mediaExtensionFromTarget(destName);
      if (ext) addedMediaExtensions.add(ext);
    }

    appendedRels += `<Relationship Id="${newId}" Type="${type}" Target="${targetOut}"/>`;
    content = replaceRelationshipId(content, oldId, newId);
  }

  if (appendedRels) {
    hostRelsXml = hostRelsXml.replace("</Relationships>", `${appendedRels}</Relationships>`);
    hostZip.file(relsPath, hostRelsXml);
  }

  if (addedMediaExtensions.size > 0) {
    ensureContentTypeDefaults(hostZip, addedMediaExtensions);
  }

  return { content, hostRelsXml };
}

/**
 * Agrega el contenido de un DOCX (grilla de firmas) al final del body de otro DOCX.
 * @param {ArrayBuffer|Uint8Array} hostBuffer
 * @param {ArrayBuffer|Uint8Array} appendixBuffer
 * @param {{ blankLines?: number }} opts
 */
export function mergeDocxAppend(hostBuffer, appendixBuffer, opts = {}) {
  const hostZip = new PizZip(hostBuffer);
  const appendixZip = new PizZip(appendixBuffer);

  const hostDocFile = hostZip.file("word/document.xml");
  const appendixDocFile = appendixZip.file("word/document.xml");
  if (!hostDocFile || !appendixDocFile) {
    throw new Error("El archivo Word subido no es un .docx válido.");
  }

  const hostDocXml = hostDocFile.asText();
  const appendixContent = extractBodyContent(appendixDocFile.asText());
  const { content: remappedContent } = remapAppendixRelationships(
    hostZip,
    appendixZip,
    appendixContent,
  );

  const spacerXml = buildMergeSpacer({
    blankLines: opts.blankLines ?? 2,
  });
  const insertAt = findBodyContentInsertIndex(hostDocXml);
  if (insertAt < 0) {
    throw new Error("No se pudo ubicar el final del documento Word.");
  }

  const mergedDocXml =
    hostDocXml.slice(0, insertAt) +
    spacerXml +
    remappedContent +
    hostDocXml.slice(insertAt);
  hostZip.file("word/document.xml", mergedDocXml);

  return hostZip.generate({
    type: "blob",
    mimeType: DOCX_MIME,
  });
}

export function buildMergedCuadroFirmasFilename(hostFile) {
  const raw = String(hostFile?.name || "Nota").trim();
  const stem = raw.replace(/\.docx$/i, "") || "Nota";
  return `${stem}_firmas.docx`;
}

export function parseCuadroFirmasExportOptions(formatOrOptions) {
  if (typeof formatOrOptions === "string") {
    return {
      format: formatOrOptions,
      hostDocxFile: null,
    };
  }
  return {
    format: formatOrOptions?.format || "pdf",
    hostDocxFile: formatOrOptions?.hostDocxFile || null,
  };
}
