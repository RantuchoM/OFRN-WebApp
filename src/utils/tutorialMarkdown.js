/**
 * Shared Markdown helpers for OFRN tutorials (browser).
 * Python mirror: scripts/tutorial_markdown.py
 */

export function normalizeTutorialMarkdown(raw) {
  if (!raw || typeof raw !== "string") return "";

  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");
  const out = [];

  for (const line of lines) {
    if (/^(\s*)-\s+(\S)/.test(line)) {
      out.push(line.replace(/^(\s*)-\s+/, "$1- "));
      continue;
    }
    if (/^(\s*)(\d+)\.\s+(\S)/.test(line)) {
      out.push(line.replace(/^(\s*)(\d+)\.\s+/, "$1$2.  "));
      continue;
    }
    out.push(line);
  }

  return out.join("\n");
}

export function resolveTutorialImageUrl(baseUrl, imageRef) {
  if (!imageRef || typeof imageRef !== "string") return null;
  const trimmed = imageRef.trim();
  if (/^(https?:|data:)/i.test(trimmed)) return trimmed;

  const normalizedBase = (baseUrl || "").replace(/\/$/, "");
  const ref = trimmed.replace(/^\.\//, "");

  if (ref.toLowerCase().startsWith("images/")) {
    return `${normalizedBase}/${ref}`;
  }
  const name = ref.split("/").pop();
  return `${normalizedBase}/images/${name}`;
}

export function rewriteTutorialMarkdownImageRefs(raw, baseUrl) {
  if (!raw) return "";
  return raw.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, target) => {
    const t = target.trim();
    if (/^(https?:|data:)/i.test(t)) return match;
    const url = resolveTutorialImageUrl(baseUrl, t);
    return url ? `![${alt}](${url})` : match;
  });
}

export async function fetchTutorialMarkdown(markdownUrl) {
  const res = await fetch(markdownUrl, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`No se pudo cargar el tutorial (${res.status})`);
  }
  return res.text();
}

export async function loadTutorialHtmlFromMarkdown(markdownUrl, baseUrl, renderMarkdown) {
  const raw = await fetchTutorialMarkdown(markdownUrl);
  const withImages = rewriteTutorialMarkdownImageRefs(raw, baseUrl);
  const normalized = normalizeTutorialMarkdown(withImages);
  return renderMarkdown(normalized);
}
