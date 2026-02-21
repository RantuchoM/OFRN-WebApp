import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import nodemailer from "npm:nodemailer@6.9.7"

const GMAIL_USER = Deno.env.get("GMAIL_USER")
const GMAIL_PASS = Deno.env.get("GMAIL_PASS")
const ADMIN_EMAIL = "ofrn.archivo@gmail.com"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

/** Extrae email del campo user_email (puede ser "Nombre (email@...)" o solo el email). */
function extractEmail(userEmail: string | null): string | null {
  if (!userEmail || typeof userEmail !== "string") return null
  const trimmed = userEmail.trim()
  const match = trimmed.match(/\(([^)]+)\)/)
  if (match && match[1]) return match[1].trim()
  if (trimmed.includes("@")) return trimmed
  return null
}

function esc(s: string) {
  return (s || "").replace(/</g, "&lt;")
}

async function sendGmailMail(to: string | string[], subject: string, html: string) {
  if (!GMAIL_USER || !GMAIL_PASS) {
    throw new Error("GMAIL_USER o GMAIL_PASS no configurados")
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  })
  const toList = Array.isArray(to) ? to : [to]
  await transporter.sendMail({
    from: `"OFRN Feedback" <${GMAIL_USER}>`,
    to: toList,
    subject,
    html,
  })
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders })
  }

  try {
    const raw = await req.json()
    const payload = typeof raw?.body === "object" ? raw.body : raw
    const record = payload?.record ?? payload
    const is_update = payload?.is_update === true || payload?.is_update === "true"
    const is_resolution = payload?.is_resolution === true || payload?.is_resolution === "true"
    const admin_comments = (payload?.admin_comments ?? record?.admin_comments ?? "") as string

    console.log("[send-feedback-email] payload:", {
      hasRecord: !!record,
      recordId: record?.id,
      is_update: payload?.is_update,
      is_resolution: payload?.is_resolution,
      resolved: { is_update, is_resolution },
    })

    if (!record || !record.id) {
      console.warn("[send-feedback-email] No record or record.id")
      return new Response(JSON.stringify({ ok: false, error: "No record provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // --- Invocación desde app: modificación de pedido (mail a admins) ---
    if (is_update) {
      console.log(`[send-feedback-email] MODIFICACIÓN DE PEDIDO ID: ${record.id} -> enviando a admins`)
      await sendGmailMail(
        ADMIN_EMAIL,
        `📝 MODIFICACIÓN DE PEDIDO: ${record.titulo || "Sin título"}`,
        `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #F59E0B;">Modificación de pedido existente</h2>
            <p><strong>ID:</strong> ${record.id}</p>
            <p><strong>Tipo:</strong> ${record.tipo}</p>
            <p><strong>Usuario:</strong> ${record.user_email || "Anónimo"}</p>
            <p><strong>Ruta:</strong> ${record.ruta_pantalla || "Desconocida"}</p>
            <h3>Título</h3>
            <p>${esc(record.titulo)}</p>
            <h3>Mensaje actualizado</h3>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              ${esc(record.mensaje)}
            </div>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <small>Enviado por Supabase Edge Functions (send-feedback-email)</small>
          </div>
        `
      )
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // --- Invocación desde app: resolución (mail al usuario) ---
    if (is_resolution) {
      const userEmail = extractEmail(record.user_email)
      console.log(`[send-feedback-email] RESOLUCIÓN ID: ${record.id}, user_email raw: "${record.user_email}", extraído: "${userEmail || ""}"`)
      if (!userEmail) {
        console.warn("[send-feedback-email] No se pudo extraer email de user_email:", record.user_email)
        return new Response(JSON.stringify({ ok: false, error: "No user email" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const tipo = (record.tipo || "Sugerencia") as string
      const tipoLower = tipo.toLowerCase()
      const tipoStyle =
        tipoLower === "error" || tipo === "BUG"
          ? "background-color: #fef2f2; color: #b91c1c; border-left: 4px solid #dc2626;"
          : tipoLower === "ayuda"
            ? "background-color: #fefce8; color: #a16207; border-left: 4px solid #eab308;"
            : "background-color: #f0fdf4; color: #15803d; border-left: 4px solid #22c55e;"
      const tituloEsc = esc(record.titulo || "Feedback")
      const mensajeEsc = esc(record.mensaje || "").replace(/\n/g, "<br/>")
      console.log(`[send-feedback-email] Enviando mail de resolución a ${userEmail}`)
      await sendGmailMail(
        userEmail,
        `✅ Tu pedido de feedback fue resuelto: ${record.titulo || "Feedback"}`,
        `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #059669;">Tu pedido fue resuelto</h2>
            <p><strong>Asunto:</strong> ${tituloEsc}</p>
            <div style="margin: 16px 0; padding: 12px 14px; border-radius: 8px; ${tipoStyle}">
              <strong>Tipo:</strong> ${esc(tipo)}
            </div>
            <p style="margin-top: 12px 0 6px 0;"><strong>Tu mensaje:</strong></p>
            <div style="background-color: #f8fafc; padding: 12px 14px; border-radius: 8px; margin: 0 0 20px 0; border: 1px solid #e2e8f0;">
              ${mensajeEsc || "—"}
            </div>
            <p>La administración ha dado respuesta a tu reporte.</p>
            <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
              <strong>Comentario de administración:</strong><br/>
              ${esc(admin_comments || "Sin comentario adicional.").replace(/\n/g, "<br/>")}
            </div>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <small>OFRN - Centro de Feedback</small>
          </div>
        `
      )
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // --- Trigger de BD: nuevo feedback (mail a admins) ---
    console.log(`[send-feedback-email] NUEVO FEEDBACK ID: ${record.id} -> enviando a admins`)
    await sendGmailMail(
      ADMIN_EMAIL,
      `📢 Nuevo Feedback: ${record.titulo || "Sin título"}`,
      `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4F46E5;">Nuevo Reporte Recibido</h2>
          <p><strong>Tipo:</strong> ${record.tipo}</p>
          <p><strong>Usuario:</strong> ${record.user_email || "Anónimo"}</p>
          <p><strong>Ruta:</strong> ${record.ruta_pantalla || "Desconocida"}</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Mensaje:</strong><br/>
            ${esc(record.mensaje)}
          </div>
          ${record.screenshot_path ? `<p>📸 <a href="${record.screenshot_path}">Ver Captura de Pantalla</a></p>` : ""}
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <small>ID: ${record.id} | Enviado automáticamente por Supabase Edge Functions</small>
        </div>
      `
    )

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    const err = error as Error
    console.error("[send-feedback-email] ERROR:", err.message, err.stack)
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
}

serve(handler)
