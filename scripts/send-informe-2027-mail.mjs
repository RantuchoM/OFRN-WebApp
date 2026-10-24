import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const files = process.argv.slice(2).filter((p) => p && fs.existsSync(p));
if (!files.length) {
  console.error(
    "Usage: node scripts/send-informe-2027-mail.mjs <path.pdf> [path.xlsx ...]",
  );
  process.exit(1);
}

const keysOut = spawnSync(
  "npx",
  ["supabase", "projects", "api-keys", "--project-ref", "muxrbuivopnawnxlcjxq"],
  { encoding: "utf8", shell: true },
);
const serviceMatch = keysOut.stdout.match(
  /service_role\s*\|\s*(eyJ[A-Za-z0-9._-]+)/,
);
if (!serviceMatch) {
  console.error("No service_role key found");
  process.exit(1);
}
const serviceKey = serviceMatch[1];

function contentTypeFor(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  return "application/octet-stream";
}

async function sendOne(filePath) {
  const filename = path.basename(filePath);
  const contentBase64 = fs.readFileSync(filePath).toString("base64");
  const isPdf = filename.toLowerCase().endsWith(".pdf");
  const body = {
    to: "ofrn.archivo@gmail.com",
    subject: isPdf
      ? "Informe ensambles 2027 — PDF (1 hoja por ensamble)"
      : "Informe ensambles 2027 — Excel (giras / PCV / Ens. netos)",
    html: isPdf
      ? `
    <p>Hola,</p>
    <p>Adjunto el <b>PDF del informe de planificación 2027</b>: resumen + <b>una hoja por ensamble</b>.</p>
    <ul>
      <li>Giras en casa / fuera (pesos por tramo)</li>
      <li>Cipolletti → Villa Regina: solo el último día en Regina (giras ajustadas)</li>
      <li>PCV + Ens. netos + Feriados (1 serv. por feriado/no laborable en gira) + Prest. tot.</li>
    </ul>
    <p>Generado automáticamente desde OFRN WebApp.</p>
  `
      : `
    <p>Hola,</p>
    <p>Adjunto el <b>Excel</b> actualizado del informe 2027 (detalle de ensayos, franjas PCV y tramos).</p>
  `,
    filename,
    contentBase64,
    contentType: contentTypeFor(filename),
  };

  const res = await fetch(
    "https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/send-informe-adjunto",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const text = await res.text();
  console.log(filename, "status", res.status);
  console.log(text);
  if (!res.ok) process.exit(1);
}

for (const f of files) {
  await sendOne(f);
}
