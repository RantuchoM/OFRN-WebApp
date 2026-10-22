/**
 * One-shot: reenvía mail de confirmación de reserva 1646 a ofrn.archivo@gmail.com
 */
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const PROJECT_URL = "https://muxrbuivopnawnxlcjxq.supabase.co";
const EMAIL = "ofrn.archivo@gmail.com";
const RESERVA_ID = 1646;
const QR_RESERVA = "ENTR-RSV-973f4e0223624ca38e13736ef0923b70";
const QR_ENTRADAS = [
  "ENTR-TCK-f94727de5b6846d699bde8eec7cff573",
  "ENTR-TCK-e7f0cd9757b84996ad77dc280c58950e",
  "ENTR-TCK-f9eaf5a956b245489c1639d91665f5b8",
  "ENTR-TCK-3cec874d85db4362b5b4a9a129434d3e",
];

const keysOut = spawnSync(
  "npx",
  ["supabase", "projects", "api-keys", "--project-ref", "muxrbuivopnawnxlcjxq"],
  { encoding: "utf8", shell: true },
);
const serviceMatch = keysOut.stdout.match(/service_role\s*\|\s*(eyJ[A-Za-z0-9._-]+)/);
const anonMatch = keysOut.stdout.match(/anon\s*\|\s*(eyJ[A-Za-z0-9._-]+)/);
if (!serviceMatch || !anonMatch) {
  console.error("No se pudieron obtener API keys");
  console.error(keysOut.stdout?.slice(0, 500));
  process.exit(1);
}
const serviceKey = serviceMatch[1];
const anonKey = anonMatch[1];

const admin = createClient(PROJECT_URL, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: EMAIL,
});
if (linkErr) {
  console.error("generateLink:", linkErr.message);
  process.exit(1);
}

const tokenHash = linkData?.properties?.hashed_token;
if (!tokenHash) {
  console.error("Sin hashed_token", linkData);
  process.exit(1);
}

const userClient = createClient(PROJECT_URL, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: otpData, error: otpErr } = await userClient.auth.verifyOtp({
  token_hash: tokenHash,
  type: "email",
});
if (otpErr || !otpData?.session?.access_token) {
  console.error("verifyOtp:", otpErr?.message || "sin session");
  process.exit(1);
}

const accessToken = otpData.session.access_token;
const res = await fetch(`${PROJECT_URL}/functions/v1/entradas-send-reserva-email`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    apikey: anonKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    action: "confirmacion",
    reservaId: RESERVA_ID,
    qrReservaToken: QR_RESERVA,
    qrEntradaTokens: QR_ENTRADAS,
    appUrl: "https://ofrn-web-app.vercel.app",
  }),
});

const text = await res.text();
console.log("HTTP", res.status);
console.log(text);
process.exit(res.ok ? 0 : 1);
