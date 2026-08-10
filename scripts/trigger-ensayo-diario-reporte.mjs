/**
 * One-shot: invoke ensayo-diario-reporte for a single recipient.
 * Usage: node scripts/trigger-ensayo-diario-reporte.mjs [email] [yyyy-mm-dd]
 */
import { execSync } from "node:child_process";

const to = process.argv[2] || "ofrn.archivo@gmail.com";
const fecha = process.argv[3] || null;

const raw = execSync(
  "npx supabase db query --linked \"select name, decrypted_secret from vault.decrypted_secrets where name in ('db_backup_cron_secret','db_backup_service_role')\"",
  { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);
const start = raw.indexOf("{");
const end = raw.lastIndexOf("}");
const j = JSON.parse(raw.slice(start, end + 1));
const map = Object.fromEntries((j.rows || []).map((r) => [r.name, r.decrypted_secret]));
const secret = map.db_backup_cron_secret;
const bearer = map.db_backup_service_role;
if (!secret || !bearer) {
  console.error("missing vault secrets", Object.keys(map));
  process.exit(1);
}

const body = { to };
if (fecha) body.fecha = fecha;

const url =
  "https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/ensayo-diario-reporte";
const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${bearer}`,
    apikey: bearer,
    "x-ensayo-diario-cron-secret": secret,
  },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(120_000),
});
const text = await res.text();
console.log("HTTP", res.status);
console.log(text.slice(0, 3000));
process.exit(res.ok ? 0 : 1);
