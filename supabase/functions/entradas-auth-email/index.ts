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

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildOtpHtml({ code, appLabel }: { code: string; appLabel: string }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Helvetica, Arial, sans-serif; color: #334155; }
    .box { border-left: 4px solid #2563eb; background: #eff6ff; padding: 16px; border-radius: 6px; }
    .code { font-family: monospace; font-size: 30px; font-weight: 700; letter-spacing: 0.2em; color: #0f172a; }
  </style>
</head>
<body>
  <p>Hola,</p>
  <p>Este es tu código de acceso para <strong>${appLabel}</strong>:</p>
  <div class="box">
    <div class="code">${code}</div>
    <p style="margin: 10px 0 0 0;">Vence en ${OTP_TTL_MINUTES} minutos.</p>
  </div>
  <p style="font-size: 12px; color: #64748b;">Si no solicitaste este código, podés ignorar este mensaje.</p>
</body>
</html>`;
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

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Email inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

      const { error: insertErr } = await admin.from("entrada_auth_email_otp").insert({
        email,
        code_hash: otpHash,
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
        html: buildOtpHtml({ code: otp, appLabel }),
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

      let userId: string | null = null;
      const { data: mappedUser, error: mappedErr } = await admin
        .from("entrada_auth_email_user")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();
      if (mappedErr) throw mappedErr;
      if (mappedUser?.user_id) userId = mappedUser.user_id;

      const tempPassword = crypto.randomUUID().replace(/-/g, "");

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
        const { error: mapInsertErr } = await admin
          .from("entrada_auth_email_user")
          .upsert({ email, user_id: userId }, { onConflict: "email" });
        if (mapInsertErr) throw mapInsertErr;
      } else {
        const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
          password: tempPassword,
          email_confirm: true,
        });
        if (updateErr) throw updateErr;
      }

      return new Response(
        JSON.stringify({ success: true, email, password: tempPassword }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
