import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.7";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_PASS = Deno.env.get("GMAIL_PASS");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const fmt = (v: any) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v || 0);

// --- COLECCIÓN DE TEMPLATES ---
const templates = {
  // 1. Template de Viáticos (Individual)
  viaticos_simple: (nombre: string, gira: string, d: any) => {
    const montoAnticipo = parseFloat(d.subtotal_viatico || d.monto_viatico || 0);
    const combustible = parseFloat(d.gasto_combustible) || 0;
    const alojamiento = parseFloat(d.gasto_alojamiento) || 0;
    const otros = parseFloat(d.gasto_otros) || 0;
    const movilidad = parseFloat(d.gastos_movilidad) || 0;
    const movilidadOtros = parseFloat(d.gastos_movil_otros) || 0;
    const capacitacion = parseFloat(d.gastos_capacit) || 0;
    const totalRendibles = combustible + alojamiento + otros + movilidad + movilidadOtros + capacitacion;
    const totalPercibir = parseFloat(d.total_percibir) || (montoAnticipo + totalRendibles);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
          .money { font-weight: bold; color: #111; }
          .box { border-left: 4px solid #4f46e5; background-color: #f9fafb; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .alert { color: #b45309; font-weight: bold; }
          .success { color: #15803d; font-weight: bold; }
        </style>
      </head>
      <body>
        <p>Hola ${nombre}, ¿cómo estás?</p>
        <p>Te comparto cómo serán los viáticos para esta gira (<strong>${gira}</strong>):</p>
        <div style="font-size: 16px; margin: 20px 0;"><strong>Total: <span style="font-size: 18px; color: #4f46e5;">${fmt(totalPercibir)}</span></strong></div>
        <ul style="list-style-type: none; padding-left: 0;">
          <li>• Comidas: <span class="money">${fmt(montoAnticipo)}</span></li>
          ${combustible > 0 ? `<li>• Combustible: <span class="money">${fmt(combustible)}</span></li>` : ''}
          ${alojamiento > 0 ? `<li>• Alojamiento: <span class="money">${fmt(alojamiento)}</span></li>` : ''}
          ${movilidad > 0 ? `<li>• Movilidad: <span class="money">${fmt(movilidad)}</span></li>` : ''}
          ${movilidadOtros > 0 ? `<li>• Otros Movilidad: <span class="money">${fmt(movilidadOtros)}</span></li>` : ''}
          ${capacitacion > 0 ? `<li>• Capacitación: <span class="money">${fmt(capacitacion)}</span></li>` : ''}
          ${otros > 0 ? `<li>• Otros Gastos: <span class="money">${fmt(otros)}</span></li>` : ''}
        </ul>
        <h4 style="margin-top: 25px; margin-bottom: 10px;">Aclaraciones importantes:</h4>
        <div class="box">
          <p style="margin-top: 0;">El monto destinado a <span class="success">comidas</span> no se rinde, por lo cual no necesitas guardar los tickets.</p>
          ${totalRendibles > 0 ? `<p style="margin-bottom: 0; margin-top: 15px;">El monto destinado a <span class="alert">movilidad (pasajes)</span> sí se rinde, así que debes conservar los pasajes y enviarlos firmados a filarmonica.scrn@gmail.com.${totalRendibles - movilidad> 0 ? ` Para otros gastos, deberás conservar los comprobantes (facturas válidas de ARCA).` : ''} En caso de gastar menos que el monto estimado deberás devolver la diferencia; y si gastaras más, se reintegrará el excedente.</p>` : ''}
        </div>
        <p>Nos mantenemos en contacto.<br>¡Beso y buena semana!</p>
        <br>
        <p style="color: #555; font-size: 13px; border-top: 1px solid #eee; padding-top: 15px;">
          <strong>Carla Fernández</strong><br>Administración<br>Orquesta Filarmónica de Río Negro
        </p>
      </body>
      </html>
    `;
  },

  // 2. Template Confirmación Comidas (Genérico para BCC)
  confirmacion_comidas: (nombre: string, gira: string, d: any) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
        </style>
      </head>
      <body>
        <p>Hola,</p>
        
        <p>Está abierta la confirmación de comidas para la gira <strong>${d.nomenclador || ''} - ${gira}</strong>.</p>
        
        <p style="background-color: #fff7ed; padding: 10px; border-left: 4px solid #f97316; border-radius: 4px;">
          ⚠️ La misma se encontrará abierta hasta el <strong>${d.fechaLimiteTexto || 'fecha límite'}</strong>.
        </p>

        <p>Para saber cómo votar, consultá el tutorial en <a href="https://www.youtube.com/shorts/0YGRyOxIPqI">Youtube</a>.</p>
        
        <p><strong>La confirmación es fundamental</strong> para poder garantizar que se dispondrá de las comidas necesarias para cada participante de la gira.</p>

        <br>
        <p style="color: #555; font-size: 13px; border-top: 1px solid #eee; padding-top: 15px;">
          <strong>Carla Fernández</strong><br>
          Administración<br>
          Orquesta Filarmónica de Río Negro
        </p>
      </body>
      </html>
    `;
  },

  // 3. Template Nueva Obra (Trigger Automático) — con compositores, observaciones, comentarios, etc.
  nueva_obra: (nombreUser: string, gira: string, d: any) => {
    const titulo = d.titulo || '-';
    const compositores = d.compositores || null;
    const arregladores = d.arregladores || null;
    const duracion = d.duracion ? `${d.duracion} min` : '-';
    const instrumentacion = d.instrumentacion || '-';
    const estado = d.estado || null;
    const anio = d.anio || null;
    const linkDrive = d.link_drive || null;
    const linkYoutube = d.link_youtube || null;
    const observaciones = d.observaciones || null;
    const comentarios = d.comentarios || null;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 5px solid #4f46e5; }
          .data-table { width: 100%; border-collapse: collapse; }
          .data-table td { padding: 8px 0; border-bottom: 1px solid #eee; vertical-align: top; }
          .label { font-weight: bold; color: #555; width: 140px; }
          .value { color: #000; font-weight: 500; }
          .block { margin-top: 12px; padding: 10px; background: #f9fafb; border-radius: 4px; border-left: 3px solid #4f46e5; }
          .block-title { font-weight: bold; color: #555; margin-bottom: 6px; font-size: 12px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 style="color: #111; margin-top:0;">Nueva Obra en Repertorio</h2>
          
          <div class="header">
            <div><strong>Cargada por:</strong> ${nombreUser || 'Desconocido'}</div>
          </div>

          <table class="data-table">
            <tr><td class="label">Título:</td><td class="value">${titulo}</td></tr>
            <tr><td class="label">Compositores:</td><td class="value">${compositores || '-'}</td></tr>
            ${arregladores ? `<tr><td class="label">Arregladores:</td><td class="value">${arregladores}</td></tr>` : ''}
            <tr><td class="label">Duración:</td><td class="value">${duracion}</td></tr>
            <tr><td class="label">Instrumentación:</td><td class="value">${instrumentacion}</td></tr>
            ${estado ? `<tr><td class="label">Estado:</td><td class="value">${estado}</td></tr>` : ''}
            ${anio ? `<tr><td class="label">Año:</td><td class="value">${anio}</td></tr>` : ''}
            <tr>
              <td class="label">Link Drive:</td>
              <td class="value">
                ${linkDrive ? `<a href="${linkDrive}" style="color:#4f46e5; font-weight:bold;">Ver carpeta</a>` : 'No cargado'}
              </td>
            </tr>
            ${linkYoutube ? `<tr><td class="label">Link Audio/Video:</td><td class="value"><a href="${linkYoutube}" style="color:#4f46e5;">${linkYoutube}</a></td></tr>` : ''}
          </table>

          ${observaciones ? `
          <div class="block">
            <div class="block-title">Observaciones (públicas)</div>
            <div>${observaciones}</div>
          </div>
          ` : ''}

          ${comentarios ? `
          <div class="block">
            <div class="block-title">Comentarios (internos)</div>
            <div>${comentarios.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
          </div>
          ` : ''}

          <p style="font-size: 12px; color: #888; margin-top: 30px; text-align: center;">
            Notificación automática del Sistema de Gestión.
          </p>
        </div>
      </body>
      </html>
    `;
  }
};

// --- HANDLER PRINCIPAL ---
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, templateId, email, bcc, nombre, gira, detalle } = await req.json();

    if (!GMAIL_USER || !GMAIL_PASS) {
      throw new Error("Falta configurar credenciales de Gmail en Secrets.");
    }

    if (action === "enviar_mail") {
      if (!email && (!bcc || bcc.length === 0)) {
        throw new Error("Falta destinatario (email o bcc)");
      }

      const tid = templateId && templates[templateId] ? templateId : "viaticos_simple";
      const generateHTML = templates[tid];
      const nombreGira = gira || "";
      const htmlContent = generateHTML(nombre || "", nombreGira, detalle || {});

      let subject = `Aviso OFRN`;
      if (tid === 'viaticos_simple') {
        subject = `Viáticos OFRN | ${nombreGira}`;
      } else if (tid === 'confirmacion_comidas') {
        subject = `Confirmación de Comidas | ${nombreGira}`;
      } else if (tid === 'nueva_obra') {
        subject = `[Repertorio] Nueva Obra: ${detalle?.titulo || 'Sin título'}`;
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      });

      const mailOptions: any = {
        from: `"Filarmónica SCRN" <${GMAIL_USER}>`,
        replyTo: "filarmonica.scrn@gmail.com",
        subject: subject,
        html: htmlContent,
      };

      if (email) {
        mailOptions.to = email;
      }
      if (bcc && Array.isArray(bcc) && bcc.length > 0) {
        mailOptions.bcc = bcc;
        if (!email) {
          mailOptions.to = GMAIL_USER;
        }
      }

      console.log(`[LOG] Enviando mail (${tid}). TO: ${email || 'Self'}, BCC: ${bcc?.length || 0}`);
      const info = await transporter.sendMail(mailOptions);

      return new Response(JSON.stringify({ success: true, id: info.messageId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Acción no reconocida" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });

  } catch (error: any) {
    console.error("[CRITICAL ERROR]:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
