import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import nodemailer from "npm:nodemailer@6.9.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GMAIL_USER = Deno.env.get("ENTRADAS_GMAIL_USER") || Deno.env.get("GMAIL_USER") || "";
const GMAIL_PASS = Deno.env.get("ENTRADAS_GMAIL_PASS") || Deno.env.get("GMAIL_PASS") || "";
const OTP_PEPPER = Deno.env.get("ENTRADAS_OTP_PEPPER") || "change-me";

const OTP_TTL_MINUTES = 10;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_HOUR_PER_EMAIL = 6;
const OTP_MAX_PER_HOUR_PER_IP = 25;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function randomCode8Digits(): string {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

function randomMagicToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMagicLinkUrl(token: string, app: string): string {
  const baseEntradas = (Deno.env.get("ENTRADAS_PUBLIC_URL") ?? "https://entradas.ofrn.gob.ar").replace(/\/$/, "");
  const baseScrn = (Deno.env.get("SCRN_PUBLIC_URL") ?? baseEntradas).replace(/\/$/, "");
  const isScrn = app === "scrn";
  const base = isScrn ? baseScrn : baseEntradas;
  const path = isScrn ? "/transporte-scrn" : "/entradas";
  return `${base}${path}?magic=${encodeURIComponent(token)}`;
}

function buildOtpHtml({
  code,
  appLabel,
  magicLinkUrl,
}: {
  code: string;
  appLabel: string;
  magicLinkUrl: string;
}) {
  const safeCode = escHtml(code);
  const safeLabel = escHtml(appLabel);
  const safeMagicUrl = escHtml(magicLinkUrl);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Helvetica, Arial, sans-serif; color: #334155; line-height: 1.5; }
    .box { border-left: 4px solid #2563eb; background: #eff6ff; padding: 16px; border-radius: 6px; }
    .code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 30px; font-weight: 700; letter-spacing: 0.2em; color: #0f172a;
      user-select: all; -webkit-user-select: all;
    }
  </style>
</head>
<body>
  <p>Hola,</p>
  <p>Este es tu código de acceso para <strong>${safeLabel}</strong>:</p>
  <div class="box">
    <div class="code">${safeCode}</div>
    <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Vence en ${OTP_TTL_MINUTES} minutos.</p>
    <p style="margin: 18px 0 0 0;">
      <a href="${safeMagicUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;">Accedé sin contraseña</a>
    </p>
    <p style="margin: 10px 0 0 0; font-size: 12px; color: #475569;">O ingresá el código de 8 dígitos en el sitio.</p>
  </div>
  <p style="font-size: 12px; color: #64748b;">Si no solicitaste este acceso, podés ignorar este mensaje.</p>
</body>
</html>`;
}

type AdminClient = ReturnType<typeof createClient>;

async function completeEmailAuth(
  admin: AdminClient,
  email: string,
): Promise<{ email: string; password: string }> {
  const tempPassword = crypto.randomUUID().replace(/-/g, "");

  const { data: mappedUser, error: mappedErr } = await admin
    .from("entrada_auth_email_user")
    .select("user_id, auth_password_plain")
    .eq("email", email)
    .maybeSingle();
  if (mappedErr) throw mappedErr;

  let userId: string | null = mappedUser?.user_id || null;
  let signInPassword: string;

  if (!userId) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });
    if (createErr) {
      throw new Error(`No se pudo crear usuario auth para ${email}: ${createErr.message}`);
    }
    userId = created.user?.id || null;
    if (!userId) throw new Error("No se pudo obtener ID de usuario auth.");
    signInPassword = tempPassword;
    const { error: mapInsertErr } = await admin
      .from("entrada_auth_email_user")
      .upsert(
        { email, user_id: userId, auth_password_plain: signInPassword },
        { onConflict: "email" },
      );
    if (mapInsertErr) throw mapInsertErr;
  } else {
    const existingPlain = mappedUser?.auth_password_plain;
    if (existingPlain && String(existingPlain).length > 0) {
      signInPassword = String(existingPlain);
    } else {
      signInPassword = tempPassword;
      const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
        password: signInPassword,
        email_confirm: true,
      });
      if (updateErr) throw updateErr;
      const { error: persistErr } = await admin
        .from("entrada_auth_email_user")
        .update({ auth_password_plain: signInPassword })
        .eq("email", email);
      if (persistErr) throw persistErr;
    }
  }

  return { email, password: signInPassword };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    }
    if (!GMAIL_USER || !GMAIL_PASS) {
      throw new Error("Falta ENTRADAS_GMAIL_USER/ENTRADAS_GMAIL_PASS o GMAIL_USER/GMAIL_PASS.");
    }

    const body = await req.json();
    const action = String(body?.action || "");
    const email = normalizeEmail(body?.email);
    const code = String(body?.code || "").trim();
    const app = String(body?.app || "entradas").trim().toLowerCase();
    const isScrn = app === "scrn";
    const fromLabel = isScrn ? "Transporte SCRN" : "Entradas OFRN";
    const appLabel = isScrn ? "Transporte SCRN" : "Entradas OFRN";
    const subject = isScrn
      ? "Tu código de acceso - Transporte SCRN"
      : "Tu código de acceso - Entradas OFRN";
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === "verify_magic_link") {
      const token = String(body?.token || "").trim().toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(token)) {
        return new Response(JSON.stringify({ error: "Enlace inválido." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokenHash = await sha256Hex(`${token}:${OTP_PEPPER}`);
      const { data: linkRow, error: linkErr } = await admin
        .from("entrada_auth_email_otp")
        .select("id, email, expires_at")
        .eq("magic_token_hash", tokenHash)
        .is("consumed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (linkErr) throw linkErr;
      if (!linkRow) {
        return new Response(JSON.stringify({ error: "El enlace no es válido o ya fue usado." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (new Date(linkRow.expires_at).getTime() < Date.now()) {
        await admin.from("entrada_auth_email_otp").update({ consumed_at: new Date().toISOString() }).eq("id", linkRow.id);
        return new Response(JSON.stringify({ error: "El enlace venció. Pedí un código nuevo." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin.from("entrada_auth_email_otp").update({ consumed_at: new Date().toISOString() }).eq("id", linkRow.id);

      const linkEmail = normalizeEmail(linkRow.email);
      const authPayload = await completeEmailAuth(admin, linkEmail);
      return new Response(JSON.stringify({ success: true, ...authPayload }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Email inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "request_code") {
      const oneMinuteAgo = new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000).toISOString();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: cooldownRows, error: cooldownErr } = await admin
        .from("entrada_auth_email_otp")
        .select("id")
        .eq("email", email)
        .gte("created_at", oneMinuteAgo)
        .limit(1);
      if (cooldownErr) throw cooldownErr;
      if ((cooldownRows || []).length > 0) {
        return new Response(
          JSON.stringify({ error: `Esperá ${OTP_COOLDOWN_SECONDS}s antes de pedir otro código.` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const [{ count: emailHourCount, error: emailHourErr }, { count: ipHourCount, error: ipHourErr }] = await Promise.all([
        admin
          .from("entrada_auth_email_otp")
          .select("id", { count: "exact", head: true })
          .eq("email", email)
          .gte("created_at", oneHourAgo),
        admin
          .from("entrada_auth_email_otp")
          .select("id", { count: "exact", head: true })
          .eq("requested_ip", ip)
          .gte("created_at", oneHourAgo),
      ]);
      if (emailHourErr) throw emailHourErr;
      if (ipHourErr) throw ipHourErr;

      if ((emailHourCount || 0) >= OTP_MAX_PER_HOUR_PER_EMAIL || (ipHourCount || 0) >= OTP_MAX_PER_HOUR_PER_IP) {
        return new Response(
          JSON.stringify({ error: "Se alcanzó el límite de códigos por hora. Intentá más tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const otp = randomCode8Digits();
      const otpHash = await sha256Hex(`${otp}:${OTP_PEPPER}`);
      const magicToken = randomMagicToken();
      const magicHash = await sha256Hex(`${magicToken}:${OTP_PEPPER}`);
      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

      const { error: insertErr } = await admin.from("entrada_auth_email_otp").insert({
        email,
        code_hash: otpHash,
        magic_token_hash: magicHash,
        expires_at: expiresAt,
        requested_ip: ip,
        user_agent: userAgent,
      });
      if (insertErr) throw insertErr;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      });
      await transporter.sendMail({
        from: `"${fromLabel}" <${GMAIL_USER}>`,
        replyTo: GMAIL_USER,
        to: email,
        subject,
        html: buildOtpHtml({
          code: otp,
          appLabel,
          magicLinkUrl: buildMagicLinkUrl(magicToken, app),
        }),
      });

      return new Response(JSON.stringify({ success: true, cooldownSeconds: OTP_COOLDOWN_SECONDS }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify_code") {
      if (!/^\d{8}$/.test(code)) {
        return new Response(JSON.stringify({ error: "El código debe tener 8 dígitos." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: otpRow, error: otpErr } = await admin
        .from("entrada_auth_email_otp")
        .select("id, code_hash, expires_at, attempts")
        .eq("email", email)
        .is("consumed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (otpErr) throw otpErr;
      if (!otpRow) {
        return new Response(JSON.stringify({ error: "No hay un código activo para este email." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (new Date(otpRow.expires_at).getTime() < Date.now()) {
        await admin.from("entrada_auth_email_otp").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);
        return new Response(JSON.stringify({ error: "El código venció. Pedí uno nuevo." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const incomingHash = await sha256Hex(`${code}:${OTP_PEPPER}`);
      if (incomingHash !== otpRow.code_hash) {
        const nextAttempts = Number(otpRow.attempts || 0) + 1;
        await admin
          .from("entrada_auth_email_otp")
          .update({
            attempts: nextAttempts,
            ...(nextAttempts >= OTP_MAX_ATTEMPTS ? { consumed_at: new Date().toISOString() } : {}),
          })
          .eq("id", otpRow.id);
        return new Response(JSON.stringify({ error: "Código inválido." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin.from("entrada_auth_email_otp").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);

      const authPayload = await completeEmailAuth(admin, email);
      return new Response(JSON.stringify({ success: true, ...authPayload }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Acción inválida." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[entradas-auth-email] ERROR:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
