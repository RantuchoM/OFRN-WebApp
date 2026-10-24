import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawPath = process.argv[2];
const outPath = process.argv[3];
const t = fs.readFileSync(rawPath, "utf8");
const start = t.indexOf("{");
if (start < 0) throw new Error("no json");
// Strip CLI noise lines injected mid-stream
const cleaned = t
  .slice(start)
  .split(/\r?\n/)
  .filter(
    (line) =>
      !/A new version of Supabase|We recommend updating|https:\/\/supabase\.com/.test(
        line,
      ),
  )
  .join("\n");
const end = cleaned.lastIndexOf("}");
const obj = JSON.parse(cleaned.slice(0, end + 1));
fs.writeFileSync(outPath, JSON.stringify(obj.rows, null, 2));
console.log("wrote", outPath, "rows", obj.rows.length);
