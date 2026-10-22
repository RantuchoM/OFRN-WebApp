import nodemailer from "npm:nodemailer@6.9.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_PASS = Deno.env.get("GMAIL_PASS");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GMAIL_USER || !GMAIL_PASS) {
      return new Response(
        JSON.stringify({ error: "GMAIL_USER/GMAIL_PASS no configurados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const to = String(body?.to || "").trim();
    const subject = String(body?.subject || "Informe OFRN").trim();
    const html = String(body?.html || "<p>Adjunto.</p>");
    const filename = String(body?.filename || "informe.xlsx");
    const contentBase64 = String(body?.contentBase64 || "");
    const contentType =
      String(body?.contentType || "") ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if (!to || !contentBase64) {
      return new Response(
        JSON.stringify({ error: "Faltan to o contentBase64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    const info = await transporter.sendMail({
      from: `"Filarmónica SCRN" <${GMAIL_USER}>`,
      replyTo: "filarmonica.scrn@gmail.com",
      to,
      subject,
      html,
      attachments: [
        {
          filename,
          content: Uint8Array.from(atob(contentBase64), (c) => c.charCodeAt(0)),
          contentType,
        },
      ],
    });

    return new Response(
      JSON.stringify({ success: true, id: info.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String((error as Error)?.message || error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
