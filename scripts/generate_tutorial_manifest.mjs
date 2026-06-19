// Generates public/tutorials/manifest.json from apps app tutorials .md files
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPS_ROOT = path.join(ROOT, "apps");
const OUT_DIR = path.join(ROOT, "public", "tutorials");
const OUT_FILE = path.join(OUT_DIR, "manifest.json");

function walkMarkdownFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      files.push(...walkMarkdownFiles(full, base));
    } else if (ent.isFile() && ent.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function parseTitle(content, fallback) {
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith("# ")) return t.slice(2).trim();
  }
  return fallback;
}

function parseDescription(content) {
  const lines = content.split(/\r?\n/);
  let pastTitle = false;
  for (const line of lines) {
    const t = line.trim();
    if (!pastTitle) {
      if (t.startsWith("# ")) pastTitle = true;
      continue;
    }
    if (!t || t.startsWith("#")) continue;
    return t.slice(0, 200);
  }
  return "";
}

function slugFromFilename(name) {
  return name.replace(/\.md$/i, "");
}

function orderFromFilename(name) {
  const m = name.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 9999;
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function buildManifest() {
  if (!fs.existsSync(APPS_ROOT)) {
    console.warn(`[tutorials] No apps folder at ${APPS_ROOT}; empty manifest.`);
    return { generatedAt: new Date().toISOString(), tutorials: [] };
  }

  const allMd = walkMarkdownFiles(APPS_ROOT).filter((f) => {
    const rel = path.relative(APPS_ROOT, f);
    return rel.split(path.sep).includes("tutorials");
  });

  const tutorials = allMd
    .map((absPath) => {
      const relFromApps = path.relative(APPS_ROOT, absPath);
      const parts = relFromApps.split(path.sep);
      const appId = parts[0] || "app";
      const fileName = path.basename(absPath);
      const slug = slugFromFilename(fileName);
      const content = fs.readFileSync(absPath, "utf8");
      const title = parseTitle(content, slug.replace(/-/g, " "));
      const description = parseDescription(content);
      const mdRel = toPosix(path.join("apps", relFromApps));
      const baseUrl = `/tutorials-src/${appId}/${slug}`;
      const markdownUrl = `/${mdRel}`;

      return {
        id: `${appId}/${slug}`,
        appId,
        slug,
        title,
        description,
        order: orderFromFilename(fileName),
        markdownPath: mdRel,
        markdownUrl,
        baseUrl,
        routePath: `/tutorials/${appId}/${slug}`,
      };
    })
    .sort((a, b) => {
      if (a.appId !== b.appId) return a.appId.localeCompare(b.appId);
      if (a.order !== b.order) return a.order - b.order;
      return a.title.localeCompare(b.title, "es");
    });

  return { generatedAt: new Date().toISOString(), tutorials };
}

function main() {
  const manifest = buildManifest();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Wrote ${manifest.tutorials.length} tutorial(s) -> ${OUT_FILE}`);
}

main();
