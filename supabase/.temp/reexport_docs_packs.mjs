import { execFileSync } from "node:child_process";

const PROJECT_REF = "muxrbuivopnawnxlcjxq";
const URL = `https://${PROJECT_REF}.supabase.co/functions/v1/manage-drive`;
const BATCH = 1;
const SKIP_AFTER = "2026-08-19T14:09:00.000Z";

function parseKeysJson(raw) {
  const start = raw.indexOf("[");
  if (start < 0) throw new Error("JSON de api-keys inválido");
  return JSON.parse(raw.slice(start));
}

function keyFromRows(json) {
  const row = json.find((k) => k.name === "service_role");
  const key = row?.api_key || row?.key || row?.secret;
  if (!key) throw new Error("No se encontró service_role");
  return key;
}

async function loadServiceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    if (raw.includes("[")) return keyFromRows(parseKeysJson(raw));
  }
  const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
  const raw = execFileSync(
    npxBin,
    ["supabase", "projects", "api-keys", "--project-ref", PROJECT_REF, "--output", "json"],
    { encoding: "utf8", shell: true },
  );
  return keyFromRows(parseKeysJson(raw));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function invoke(key, body) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text.slice(0, 400) };
    }
    if (res.ok) return data;
    const msg = data.error || data.message || text.slice(0, 400);
    const retryable = res.status === 546 || res.status === 503 || res.status === 429;
    if (!retryable || attempt === 6) {
      throw new Error(`HTTP ${res.status}: ${msg}`);
    }
    const wait = 15000 * attempt;
    console.log(`HTTP ${res.status}, reintento ${attempt}/6 en ${wait / 1000}s`);
    await sleep(wait);
  }
}

const key = await loadServiceRoleKey();
const dry = await invoke(key, {
  action: "reexport_docs_packs",
  dryRun: true,
  skipIfModifiedAfter: SKIP_AFTER,
});
let nextIds = dry.ids || [];
console.log(`Pendientes: ${nextIds.length} (omite reexportados desde ${SKIP_AFTER})`);

let ok = 0;
let fail = 0;
const errors = [];

while (nextIds.length) {
  const data = await invoke(key, {
    action: "reexport_docs_packs",
    musicianIds: nextIds,
    limit: BATCH,
    skipIfModifiedAfter: SKIP_AFTER,
  });
  ok += data.processed || 0;
  fail += data.failed || 0;
  if (Array.isArray(data.errors) && data.errors.length) {
    errors.push(...data.errors);
    for (const err of data.errors) {
      console.log(`Error id=${err.id}: ${err.error}`);
    }
  }
  console.log(
    `Lote: +${data.processed} ok, ${data.failed} error, restan ${data.remaining} (acum ${ok}/${ok + fail})`,
  );
  nextIds = Array.isArray(data.nextIds) ? data.nextIds : [];
  await sleep(1500);
}

console.log(JSON.stringify({ ok, fail, errors }, null, 2));
