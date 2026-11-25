/**
 * Upload PNG rasters for 13j–13q and set stage_plot_raster_url.
 * Env: SUPABASE_URL + SUPABASE_ANON_KEY (or VITE_*).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { randomUUID } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvFile(filePath) {
  try {
    const text = readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (!m) continue;
      if (!process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* optional */
  }
}
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const url =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "";
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

if (!url || !key) {
  console.error("Missing SUPABASE_URL / anon key");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ITEMS = [
  { id: "13j", slug: "glockenspiel" },
  { id: "13k", slug: "congas" },
  { id: "13l", slug: "guiro" },
  { id: "13m", slug: "crystal-glasses" },
  { id: "13n", slug: "metal-chimes" },
  { id: "13o", slug: "tam-tam" },
  { id: "13p", slug: "maracas" },
  { id: "13q", slug: "bongo" },
];

const iconsDir = path.join(root, "public", "stage-plot", "icons");

for (const item of ITEMS) {
  const filePath = path.join(iconsDir, `${item.slug}.png`);
  const bytes = readFileSync(filePath);
  if (bytes.length > 1_048_576) {
    throw new Error(`${item.slug} exceeds 1 MB`);
  }
  const objectPath = `instrumentos/${item.id}/${randomUUID()}.png`;
  const { error: upErr } = await supabase.storage
    .from("stage-plot-icons")
    .upload(objectPath, bytes, {
      contentType: "image/png",
      upsert: false,
      cacheControl: "31536000",
    });
  if (upErr) throw new Error(`upload ${item.id}: ${upErr.message}`);

  const { data: pub } = supabase.storage
    .from("stage-plot-icons")
    .getPublicUrl(objectPath);
  const publicUrl = pub?.publicUrl;
  if (!publicUrl) throw new Error(`no public url for ${item.id}`);

  const { data: prev } = await supabase
    .from("instrumentos")
    .select("stage_plot_raster_url")
    .eq("id", item.id)
    .maybeSingle();

  const { error: updErr } = await supabase
    .from("instrumentos")
    .update({ stage_plot_raster_url: publicUrl })
    .eq("id", item.id);
  if (updErr) throw new Error(`update ${item.id}: ${updErr.message}`);

  console.log("OK", item.id, item.slug, publicUrl.slice(0, 80) + "…");
  void prev;
  void readdirSync;
}

console.log("done", ITEMS.length);
