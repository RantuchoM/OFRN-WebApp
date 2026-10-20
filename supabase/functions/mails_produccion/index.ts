    import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
    import nodemailer from "npm:nodemailer@6.9.7";
    import { MAIL_ICON_PNGS } from "./mailIcons.ts";

    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_PASS = Deno.env.get("GMAIL_PASS");

    function b64ToBytes(b64: string): Uint8Array {
      const bin = atob(b64);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
      return out;
    }

    /** Adjuntos CID para el mail de acceso personal (Gmail no muestra SVG inline). */
    function convocatoriaAccesoPersonalAttachments() {
      return [
        { filename: "icon-agenda.png", cid: "mail-icon-agenda", content: b64ToBytes(MAIL_ICON_PNGS["icon-agenda"]), contentType: "image/png" },
        { filename: "icon-repertorio.png", cid: "mail-icon-repertorio", content: b64ToBytes(MAIL_ICON_PNGS["icon-repertorio"]), contentType: "image/png" },
        { filename: "icon-comidas.png", cid: "mail-icon-comidas", content: b64ToBytes(MAIL_ICON_PNGS["icon-comidas"]), contentType: "image/png" },
        { filename: "giras-tabs.png", cid: "mail-giras-tabs", content: b64ToBytes(MAIL_ICON_PNGS["giras-tabs"]), contentType: "image/png" },
      ];
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    const fmt = (v: any) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v || 0);

    /**
     * Convocatoria por BCC: el cuerpo usa un único saludo; si viene nombre y apellido del primer integrante
     * en detalle, armar "Nombre Apellido". Si no, usar payload.nombre (p. ej. "Apellido, Nombre" o un solo nombre).
     */
    const BALANCE_ORQUESTAL_MAIL_FOOTNOTE =
      "Desde la dirección artística se hicieron ajustes en el seating, por lo tanto se te informa que quedás desafectado de tu fila en esta gira. No obstante, si llegáramos a requerir de sus servicios (por enfermedad de algún/a colega u otra razón) te la haremos saber a la mayor brevedad posible.";

    function isBalanceOrquestalDetalle(d: any, reason: string): boolean {
      const motivoId = String(d?.motivo_baja_id || "").trim().toLowerCase();
      if (motivoId === "balance_orquestal") return true;
      return /balance\s*orquestal/i.test(String(reason || ""));
    }

    function resolveReasonFootnote(d: any, reason: string): string {
      const explicit = String(d?.reason_footnote || "").trim();
      if (explicit) return explicit;
      if (isBalanceOrquestalDetalle(d, reason)) return BALANCE_ORQUESTAL_MAIL_FOOTNOTE;
      return "";
    }

    function escapeHtmlMail(s: string): string {
      return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    const SEATING_SIN_ASIGNACION_LABEL = "sin asignación";

    /** Alta sin atril previo: `{etiqueta} (NUEVA)`. Con previo: `A → B`. */
    function formatSeatingMailAssignmentChange(fromRaw: unknown, toRaw: unknown): string {
      const from = String(fromRaw ?? "").trim();
      const to = String(toRaw ?? "").trim() || SEATING_SIN_ASIGNACION_LABEL;
      if (!from || from === SEATING_SIN_ASIGNACION_LABEL) {
        return `${to} (NUEVA)`;
      }
      return `${from} → ${to}`;
    }

    function nombreSaludoConvocatoria(payloadNombre: string, d: any): string {
      const nRaw = d?.primer_integrante_nombre ?? d?.nombre_primero;
      const aRaw = d?.primer_integrante_apellido ?? d?.apellido_primero;
      const n = nRaw != null ? String(nRaw).trim() : "";
      const a = aRaw != null ? String(aRaw).trim() : "";
      if (n && a) return `${n} ${a}`;
      if (n) return n;
      if (a) return a;
      return (payloadNombre || "").trim();
    }

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
      },

      // 4. Cambio de fechas de gira (traslado)
      cambio_fechas_gira: (nombre: string, gira: string, d: any) => {
        const fechasViejas = d?.fechas_viejas || "";
        const fechasNuevas = d?.fechas_nuevas || "";
        const zona = (d?.zona && String(d.zona).trim()) ? String(d.zona).trim() : "—";
        const conciertos = Array.isArray(d?.conciertos) ? d.conciertos : [];
        const linkGira = d?.link_gira || "";
        const listaConciertos = conciertos.length > 0
          ? `<p style="margin: 16px 0 6px 0;">Los conciertos programados con la nueva disposición, son los siguientes:</p>
            <ul style="margin: 0 0 16px 0; padding-left: 20px;">
              ${conciertos.map((c: string) => `<li style="margin: 4px 0;">${String(c)}</li>`).join("")}
            </ul>`
          : "";
        const linkBlock = linkGira
          ? `<p style="margin: 12px 0;"><a href="${linkGira}" style="color: #2563eb; font-weight: bold;">Haz click aquí para acceder a la gira.</a></p>`
          : "";
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
              .box { border-left: 4px solid #f97316; background-color: #fff7ed; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <p>Hola,</p>
            <p>Te informamos que la gira <strong>${gira}</strong> ha sido <strong>trasladada</strong> de fechas.</p>
            <div class="box">
              <p style="margin: 0 0 8px 0;"><strong>Zona:</strong> ${zona}</p>
              <p style="margin: 0 0 8px 0;"><strong>Fechas anteriores:</strong> ${fechasViejas || "—"}</p>
              <p style="margin: 0;"><strong>Nuevas fechas:</strong> ${fechasNuevas || "—"}</p>
            </div>
            ${listaConciertos}
            ${linkBlock}
            <p>Cualquier consulta, respondé a este correo.</p>
            <br>
            <p style="color: #555; font-size: 13px; border-top: 1px solid #eee; padding-top: 15px;">
              Orquesta Filarmónica de Río Negro – Sistema de Gestión
            </p>
          </body>
          </html>
        `;
      },

      // 5. Encargo de arreglo (obra pasa a "Para arreglar" — notifica a Archivista y Arreglador)
      encargo_arreglo: (nombreUser: string, _gira: string, d: any) => {
        const titulo = d.titulo || '-';
        const arreglador = d.arreglador || '-';
        const linkDrive = d.link_drive || null;
        const observaciones = d.observaciones || null;
        const idObra = d.id_obra || null;
        const fechaEstimada = d.fecha_esperada || null;
        const dificultad = d.dificultad || null;
        const organico = d.instrumentacion || null;
        const solicitadoPor = d.solicitado_por || null;

        const fechaEstimadaLabel = fechaEstimada
          ? new Date(fechaEstimada + "T12:00:00").toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : null;

        return `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 5px solid #f59e0b; }
              .data-table { width: 100%; border-collapse: collapse; }
              .data-table td { padding: 8px 0; border-bottom: 1px solid #eee; vertical-align: top; }
              .label { font-weight: bold; color: #555; width: 140px; }
              .value { color: #000; font-weight: 500; }
              .block { margin-top: 12px; padding: 10px; background: #f9fafb; border-radius: 4px; border-left: 3px solid #f59e0b; }
              .block-title { font-weight: bold; color: #555; margin-bottom: 6px; font-size: 12px; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 style="color: #111; margin-top:0;">Encargo de arreglo</h2>
              
              <div class="header">
                <div><strong>Asignado por:</strong> ${nombreUser || 'Sistema'}</div>
              </div>

              <p>Una obra del repertorio ha pasado a estado <strong>Para arreglar</strong>.</p>

              <table class="data-table">
                <tr><td class="label">Título:</td><td class="value">${titulo}</td></tr>
                <tr><td class="label">Solicitado por:</td><td class="value">${solicitadoPor || "—"}</td></tr>
                <tr><td class="label">Arreglador asignado:</td><td class="value">${arreglador}</td></tr>
                ${idObra ? `<tr><td class="label">ID obra:</td><td class="value">${idObra}</td></tr>` : ''}
                <tr><td class="label">Fecha estimada:</td><td class="value">${fechaEstimadaLabel || "—"}</td></tr>
                <tr><td class="label">Dificultad:</td><td class="value">${dificultad || "—"}</td></tr>
                <tr><td class="label">Orgánico:</td><td class="value">${organico || "—"}</td></tr>
                <tr>
                  <td class="label">Link Drive:</td>
                  <td class="value">
                    ${linkDrive ? `<a href="${linkDrive}" style="color:#4f46e5; font-weight:bold;">Ver carpeta</a>` : 'No cargado'}
                  </td>
                </tr>
              </table>

              ${observaciones ? `
              <div class="block">
                <div class="block-title">Observaciones</div>
                <div>${observaciones}</div>
              </div>
              ` : ''}

              <p style="font-size: 12px; color: #888; margin-top: 30px; text-align: center;">
                Notificación automática – Sistema de Gestión OFRN
              </p>
            </div>
          </body>
          </html>
        `;
      },

      // 5b. Versionado de arreglo (REEMPLAZO o NUEVO ARREGLO → ofrn.archivo@gmail.com)
      versionado_arreglo: (nombreUser: string, _gira: string, d: any) => {
        const tipo = d.tipo === "NUEVO_ARREGLO" ? "NUEVO ARREGLO (Clon)" : "REEMPLAZO de versión";
        const titulo = d.titulo || "-";
        const linkDrive = d.link_drive || null;
        const observacion = d.observacion || "";

        return `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #e0e7ff; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 5px solid #4f46e5; }
              .block { margin-top: 12px; padding: 10px; background: #f9fafb; border-radius: 4px; border-left: 3px solid #94a3b8; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 style="color: #111; margin-top:0;">Versionado de arreglo</h2>
              <div class="header">
                <p style="margin: 0;"><strong>Tipo:</strong> ${tipo}</p>
              </div>
              <p><strong>Título:</strong> ${titulo}</p>
              ${linkDrive ? `<p><a href="${linkDrive}" style="color:#4f46e5; font-weight:bold;">Ver carpeta en Drive</a></p>` : ""}
              ${observacion ? `<div class="block"><strong>Observación del arreglador:</strong><br/>${observacion}</div>` : ""}
              <p style="font-size: 12px; color: #888; margin-top: 30px; text-align: center;">Notificación automática – Sistema de Gestión OFRN</p>
            </div>
          </body>
          </html>
        `;
      },

      // 5c. Encargo de ajuste menor (ticket obras_ajustes pendiente)
      encargo_ajuste: (nombreUser: string, _gira: string, d: any) => {
        const titulo = d.titulo || "-";
        const arreglador = d.arreglador || "-";
        const tipo = d.tipo || "cambio_menor";
        const brief = d.brief || d.observaciones || null;
        const partes = d.partes_afectadas || null;
        const idObra = d.id_obra || null;
        const idAjuste = d.id_ajuste || null;
        const fechaEstimada = d.fecha_esperada || null;
        const solicitadoPor = d.solicitado_por || null;
        const linkDrive = d.link_drive || null;
        const fechaEstimadaLabel = fechaEstimada
          ? new Date(fechaEstimada + "T12:00:00").toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : null;
        const tipoLabel =
          tipo === "correccion"
            ? "Corrección"
            : tipo === "parte_alternativa"
              ? "Parte alternativa"
              : "Cambio menor";

        return `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 5px solid #f59e0b; }
              .data-table { width: 100%; border-collapse: collapse; }
              .data-table td { padding: 8px 0; border-bottom: 1px solid #eee; vertical-align: top; }
              .label { font-weight: bold; color: #555; width: 140px; }
              .value { color: #000; font-weight: 500; }
              .block { margin-top: 12px; padding: 10px; background: #f9fafb; border-radius: 4px; border-left: 3px solid #f59e0b; }
              .block-title { font-weight: bold; color: #555; margin-bottom: 6px; font-size: 12px; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 style="color: #111; margin-top:0;">Encargo de ajuste</h2>
              <div class="header">
                <div><strong>Asignado por:</strong> ${nombreUser || "Sistema"}</div>
              </div>
              <p>Se solicitó un <strong>ajuste menor</strong> sobre una obra ya entregada/oficial (no es un arreglo nuevo).</p>
              <table class="data-table">
                <tr><td class="label">Título:</td><td class="value">${titulo}</td></tr>
                <tr><td class="label">Tipo:</td><td class="value">${tipoLabel}</td></tr>
                <tr><td class="label">Solicitado por:</td><td class="value">${solicitadoPor || "—"}</td></tr>
                <tr><td class="label">Arreglador:</td><td class="value">${arreglador}</td></tr>
                ${idObra ? `<tr><td class="label">ID obra:</td><td class="value">${idObra}</td></tr>` : ""}
                ${idAjuste ? `<tr><td class="label">ID ajuste:</td><td class="value">${idAjuste}</td></tr>` : ""}
                <tr><td class="label">Fecha estimada:</td><td class="value">${fechaEstimadaLabel || "—"}</td></tr>
                <tr>
                  <td class="label">Carpeta obra:</td>
                  <td class="value">
                    ${linkDrive ? `<a href="${linkDrive}" style="color:#4f46e5; font-weight:bold;">Abrir Drive</a>` : "Sin carpeta"}
                  </td>
                </tr>
              </table>
              ${brief ? `<div class="block"><div class="block-title">Brief</div><div>${brief}</div></div>` : ""}
              ${partes ? `<div class="block"><div class="block-title">Partes afectadas</div><div>${partes}</div></div>` : ""}
              <p style="font-size: 12px; color: #888; margin-top: 30px; text-align: center;">
                Notificación automática – Sistema de Gestión OFRN
              </p>
            </div>
          </body>
          </html>
        `;
      },

      // 5d. Ajuste entregado (Archivo + arreglador)
      ajuste_entregado: (_nombreUser: string, _gira: string, d: any) => {
        const titulo = d.titulo || "-";
        const linkDrive = d.link_drive || null;
        const observacion = d.observacion || "";
        const idObra = d.id_obra || null;
        const idAjuste = d.id_ajuste || null;
        const archivos = Array.isArray(d.archivos) ? d.archivos : [];
        const lista = archivos
          .map((a: any) => {
            const nombre = a?.nombre || a?.name || "archivo";
            const url = a?.url || "";
            return url
              ? `<li><a href="${url}" style="color:#4f46e5;">${nombre}</a></li>`
              : `<li>${nombre}</li>`;
          })
          .join("");

        return `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #dcfce7; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 5px solid #16a34a; }
              .block { margin-top: 12px; padding: 10px; background: #f9fafb; border-radius: 4px; border-left: 3px solid #94a3b8; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 style="color: #111; margin-top:0;">Ajuste entregado</h2>
              <div class="header">
                <p style="margin: 0;">Se agregaron <strong>partes nuevas versionadas</strong> a la carpeta de la obra (sin reemplazar las anteriores).</p>
              </div>
              <p><strong>Título:</strong> ${titulo}</p>
              ${idObra ? `<p><strong>ID obra:</strong> ${idObra}</p>` : ""}
              ${idAjuste ? `<p><strong>ID ajuste:</strong> ${idAjuste}</p>` : ""}
              ${linkDrive ? `<p><a href="${linkDrive}" style="color:#16a34a; font-weight:bold;">Ver carpeta de la obra</a></p>` : ""}
              ${lista ? `<div class="block"><strong>Archivos creados:</strong><ul>${lista}</ul></div>` : ""}
              ${observacion ? `<div class="block"><strong>Nota:</strong><br/>${observacion}</div>` : ""}
              <p style="font-size: 12px; color: #888; margin-top: 30px; text-align: center;">Notificación automática – Sistema de Gestión OFRN</p>
            </div>
          </body>
          </html>
        `;
      },

      // 6. Obra entregada (notificación al Archivista)
      obra_entregada: (nombreUser: string, _gira: string, d: any) => {
        const titulo = d.titulo || '-';
        const linkDrive = d.link_drive || null;
        const idObra = d.id_obra || null;

        return `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #dbeafe; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 5px solid #2563eb; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 style="color: #111; margin-top:0;">Obra entregada</h2>
              <div class="header">
                <p style="margin: 0;">Una obra ha sido marcada como <strong>Entregado</strong> y su material fue copiado a la carpeta del Archivo.</p>
              </div>
              <p><strong>Título:</strong> ${titulo}</p>
              ${idObra ? `<p><strong>ID obra:</strong> ${idObra}</p>` : ''}
              ${linkDrive ? `<p><a href="${linkDrive}" style="color:#2563eb; font-weight:bold;">Ver carpeta en el Archivo</a></p>` : ''}
              <p style="font-size: 12px; color: #888; margin-top: 30px; text-align: center;">Notificación automática – Sistema de Gestión OFRN</p>
            </div>
          </body>
          </html>
        `;
      },

      // 7. Convocatoria de gira (inicial o individual: Alta, Baja, Ausente, GIRA_ELIMINADA)
      convocatoria_gira: (nombre: string, gira: string, d: any) => {
        const variant = (d?.variant || "INITIAL_BROADCAST").toUpperCase();
        const saludo = String(nombre || "").trim() ? `Hola ${String(nombre || "").trim()},` : "Hola,";
        const linkRepertorio = d?.link_repertorio || "";
        const nomenclador = d?.nomenclador || gira;
        const reason = d?.reason || "";
        const reasonFootnote = resolveReasonFootnote(d, reason);
        const rawDesde = d?.fecha_desde || "";
        const rawHasta = d?.fecha_hasta || "";
        const zona = d?.zona || "";
        const fmtDate = (s: string) => {
          if (!s) return "";
          const match = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
          return match ? `${match[3]}/${match[2]}/${match[1]}` : s;
        };
        const fechaDesde = fmtDate(rawDesde);
        const fechaHasta = fmtDate(rawHasta);
        const fechasZonaBlock =
          fechaDesde || fechaHasta || zona
            ? `<p style="margin: 12px 0; padding: 10px; background: #f8fafc; border-radius: 4px; font-size: 13px;"><strong>Fechas:</strong> ${fechaDesde && fechaHasta ? `${fechaDesde} – ${fechaHasta}` : fechaDesde || fechaHasta || "—"}${zona ? ` &nbsp;|&nbsp; <strong>Zona:</strong> ${zona}` : ""}</p>`
            : "";
        const reasonBlock = reason
          ? `<p style="margin: 10px 0; padding: 10px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; font-size: 13px;"><strong>Motivo:</strong> ${reason}</p>`
          : "";
        const reasonFootnoteBlock = reasonFootnote
          ? `<p style="margin: 10px 0; padding: 10px; background: #f8fafc; border-left: 4px solid #94a3b8; border-radius: 4px; font-size: 13px; color: #334155;">${String(reasonFootnote).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
          : "";

        let titulo = "Convocatoria OFRN";
        let parrafo = "";

        if (variant === "INITIAL_BROADCAST") {
          titulo = "Convocatoria a gira";
          parrafo = `
            <p>${saludo}</p>
            <p>Te convocamos a la gira <strong>${gira}</strong> (${nomenclador}).</p>
            ${fechasZonaBlock}
            <p>Podés consultar el repertorio y material en el siguiente enlace:</p>
            <p><a href="${linkRepertorio || "#"}" style="color:#4f46e5; font-weight:bold;">Ver repertorio y material de la gira</a></p>
            <p>Cualquier consulta, respondé a este correo.</p>
          `;
        } else if (variant === "ALTA") {
          titulo = "Alta en gira";
          parrafo = `
            <p>${saludo}</p>
            <p>Fuiste dado/a de <strong>alta</strong> en la gira <strong>${gira}</strong> (${nomenclador}).</p>
            ${reasonBlock}
            ${fechasZonaBlock}
            ${linkRepertorio ? `<p><a href="${linkRepertorio}" style="color:#4f46e5; font-weight:bold;">Ver repertorio y material</a></p>` : ""}
            <p>Saludos.</p>
          `;
        } else if (variant === "ALTA_ACCESO_PERSONAL") {
          // Alta de no estable / refuerzo / invitado: convocatoria + link /share/:token + guía de vistas
          const linkAcceso = String(d?.link_acceso_personal || d?.link_acceso || "").trim();
          const safeLink = escapeHtmlMail(linkAcceso);
          const linkAppGeneral = String(
            d?.link_app_general || "https://ofrn-web-app.vercel.app/login",
          ).trim();
          const safeAppLink = escapeHtmlMail(linkAppGeneral);
          const fechasSolo =
            fechaDesde && fechaHasta
              ? `${fechaDesde} – ${fechaHasta}`
              : fechaDesde || fechaHasta || "";
          const bannerModelo = d?.es_modelo
            ? `<p style="margin:0 0 14px 0; padding:10px 12px; background:#fef3c7; border:1px solid #f59e0b; border-radius:6px; font-size:12px; color:#92400e;"><strong>MODELO PARA REVISIÓN</strong> — borrador del mail que recibirían refuerzos / invitados al ser agregados al roster. No es una convocatoria real.</p>`
            : "";
          // PNG vía CID (adjuntos); Gmail elimina SVG inline
          const iconAgenda = `<img src="cid:mail-icon-agenda" width="18" height="18" alt="" style="vertical-align:-3px;display:inline-block;border:0;" />`;
          const iconRepertorio = `<img src="cid:mail-icon-repertorio" width="18" height="18" alt="" style="vertical-align:-3px;display:inline-block;border:0;" />`;
          const iconComidas = `<img src="cid:mail-icon-comidas" width="18" height="18" alt="" style="vertical-align:-3px;display:inline-block;border:0;" />`;
          const ctaAcceso = linkAcceso
            ? `
              <div style="margin:18px 0; padding:16px; background:#eef2ff; border:1px solid #c7d2fe; border-radius:8px; text-align:center;">
                <p style="margin:0 0 10px 0; font-size:13px; color:#312e81;">Tu acceso personal a esta gira (no hace falta usuario ni contraseña):</p>
                <a href="${safeLink}" style="display:inline-block; background:#4f46e5; color:#ffffff; text-decoration:none; font-weight:bold; font-size:14px; padding:12px 22px; border-radius:6px;">Abrir app</a>
                <p style="margin:12px 0 0 0; font-size:11px; color:#64748b; word-break:break-all;">Si el botón no funciona, copiá este enlace:<br><a href="${safeLink}" style="color:#4f46e5;">${safeLink}</a></p>
              </div>
            `
            : "";
          const guiaVistas = `
            <p style="margin:16px 0 8px 0; font-weight:bold; color:#111;">Qué vas a encontrar al entrar</p>
            <p style="margin:0 0 14px 0; text-align:center;">
              <img src="cid:mail-giras-tabs" width="480" height="56" alt="Agenda · Repertorio · Mis Comidas" style="max-width:100%;height:auto;border:0;border-radius:10px;" />
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; font-size:13px;">
              <tr>
                <td style="padding:10px 12px; border:1px solid #e2e8f0; background:#ffffff; vertical-align:top;">
                  <p style="margin:0 0 4px 0; color:#4f46e5; font-weight:bold;">${iconAgenda}&nbsp;Agenda</p>
                  <p style="margin:0; color:#475569; line-height:1.45;">Cronograma de la gira filtrado para vos: ensayos, conciertos, <em>tu</em> transporte y <em>tus</em> comidas (sin la logística general del resto).</p>
                </td>
              </tr>
              <tr><td style="height:8px; font-size:0; line-height:0;">&nbsp;</td></tr>
              <tr>
                <td style="padding:10px 12px; border:1px solid #e2e8f0; background:#ffffff; vertical-align:top;">
                  <p style="margin:0 0 4px 0; color:#4f46e5; font-weight:bold;">${iconRepertorio}&nbsp;Repertorio</p>
                  <p style="margin:0; color:#475569; line-height:1.45;">Obras del programa, materiales y (cuando estén cargados) links a particellas / audio. Dentro de Repertorio también está <strong>Mis partes</strong>, para descargar más fácilmente los PDFs de las partes que te fueron asignadas.</p>
                </td>
              </tr>
              <tr><td style="height:8px; font-size:0; line-height:0;">&nbsp;</td></tr>
              <tr>
                <td style="padding:10px 12px; border:1px solid #e2e8f0; background:#ffffff; vertical-align:top;">
                  <p style="margin:0 0 4px 0; color:#4f46e5; font-weight:bold;">${iconComidas}&nbsp;Mis Comidas</p>
                  <p style="margin:0; color:#475569; line-height:1.45;">Confirmá asistencia a cada comida y revisá tu preferencia alimentaria para la gira.</p>
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0 0; font-size:12px; color:#64748b;">Arriba vas a ver esas pestañas. Guardá el enlace personal: te lleva directo a esta gira.</p>
          `;
          const bloquePerfil = `
            <div style="margin:18px 0; padding:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; color:#334155; line-height:1.5;">
              <p style="margin:0 0 8px 0;"><strong>Mi perfil</strong> (arriba a la derecha)</p>
              <p style="margin:0 0 8px 0;">Desde ahí podés verificar y editar tus datos si lo deseás. También podés <strong>generar</strong> una contraseña (si todavía no tenés) o <strong>recuperarla por correo</strong> a tu email de acceso, para entrar de forma directa a la aplicación y ver <em>todas</em> las giras en las que hayas sido convocado/a.</p>
              <p style="margin:0;">App general (login con email + contraseña):<br><a href="${safeAppLink}" style="color:#4f46e5; font-weight:bold; word-break:break-all;">${safeAppLink}</a></p>
            </div>
          `;
          titulo = "Convocado/a a la gira";
          parrafo = `
            ${bannerModelo}
            <p>${saludo}</p>
            <p>Te convocamos a la gira <strong>${escapeHtmlMail(gira)}</strong> (${escapeHtmlMail(String(nomenclador))}).</p>
            ${fechasSolo ? `<p>Se te convoca en las siguientes fechas: <strong>${fechasSolo}</strong>.</p>` : ""}
            ${ctaAcceso}
            ${guiaVistas}
            ${bloquePerfil}
            <p style="margin-top:18px;">Cualquier consulta, respondé a este correo.</p>
            <p>¡Saludos!<br>Orquesta Filarmónica de Río Negro</p>
          `;
        } else if (variant === "BAJA") {
          titulo = "Baja de gira";
          parrafo = `
            <p>${saludo}</p>
            <p>Se registró tu <strong>baja</strong> de la gira <strong>${gira}</strong> (${nomenclador}).</p>
            ${reasonBlock}
            ${reasonFootnoteBlock}
            ${fechasZonaBlock}
            <p>Si tenés dudas, respondé a este correo.</p>
          `;
        } else if (variant === "AUSENTE") {
          titulo = "Ausencia en gira";
          parrafo = `
            <p>${saludo}</p>
            <p>Se registró tu situación de <strong>ausente</strong> en la gira <strong>${gira}</strong> (${nomenclador}).</p>
            ${reasonBlock}
            ${reasonFootnoteBlock}
            ${fechasZonaBlock}
            <p>Para cualquier cambio, contactá a la administración.</p>
          `;
        } else if (variant === "GIRA_ELIMINADA") {
          titulo = "Gira cancelada";
          const nombreGiraUnico = gira || nomenclador || "esta gira";
          parrafo = `
            <p>${saludo}</p>
            <p>Te informamos que la gira <strong>${nombreGiraUnico}</strong> ha sido <strong>cancelada definitivamente</strong> y eliminada del cronograma.</p>
            ${fechasZonaBlock}
            <p>Si tenés consultas, contactá a la administración.</p>
          `;
        } else if (variant === "SEATING_CAMBIO") {
          titulo = "Novedades de seating";
          const novedades = Array.isArray(d?.novedades) ? d.novedades : [];
          const novedadesItems = novedades
            .map((n: any) => {
              const obra = escapeHtmlMail(n?.obra || "Obra");
              const cambioRaw =
                typeof n?.cambio === "string" && n.cambio.trim()
                  ? n.cambio.trim()
                  : formatSeatingMailAssignmentChange(n?.from, n?.to);
              const cambio = escapeHtmlMail(cambioRaw);
              return `<li style="margin: 4px 0;"><strong>${obra}</strong>: ${cambio}</li>`;
            })
            .join("");
          const novedadesBlock = novedadesItems
            ? `<p style="margin: 10px 0 6px 0;"><strong>Tus asignaciones:</strong></p><ul style="margin: 0 0 12px 0; padding-left: 18px;">${novedadesItems}</ul>`
            : reasonBlock;
          parrafo = `
            <p>${saludo}</p>
            <p>Se actualizaron tus asignaciones de particella en la gira <strong>${gira}</strong> (${nomenclador}).</p>
            ${fechasZonaBlock}
            ${novedadesBlock}
            ${linkRepertorio ? `<p><a href="${linkRepertorio}" style="color:#4f46e5; font-weight:bold;">Ver repertorio y material</a></p>` : ""}
            <p>Cualquier consulta, respondé a este correo.</p>
          `;
        } else {
          parrafo = `<p>${saludo}</p><p>Actualización sobre la gira <strong>${gira}</strong> (${nomenclador}).</p>${reasonBlock}${fechasZonaBlock}`;
        }

        return `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
              .box { border-left: 4px solid #4f46e5; background-color: #f5f3ff; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="box">
              <h2 style="margin-top:0; color: #111;">${titulo}</h2>
              ${parrafo}
            </div>
            <p style="color: #666; font-size: 12px;">Orquesta Filarmónica de Río Negro – Sistema de Gestión</p>
          </body>
          </html>
        `;
      },
      // 9. Transporte SCRN: aviso genérico operativo (solicitud/cancelación)
      scrn_transporte_evento: (_nombre: string, _gira: string, d: any) => {
        const titulo = d?.titulo || "Aviso Transporte SCRN";
        const lineas = Array.isArray(d?.lineas) ? d.lineas : [];
        const detalle = lineas
          .map((x: any) => String(x || "").trim())
          .filter(Boolean)
          .map((x: string) => `<li style="margin: 4px 0;">${x}</li>`)
          .join("");
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
              .box { border-left: 4px solid #334155; background-color: #f8fafc; padding: 14px; border-radius: 6px; margin: 14px 0; }
            </style>
          </head>
          <body>
            <p>Hola equipo,</p>
            <div class="box">
              <h3 style="margin:0 0 8px 0; color:#111;">${titulo}</h3>
              ${detalle ? `<ul style="margin:0; padding-left: 18px;">${detalle}</ul>` : ""}
            </div>
            <p style="font-size: 12px; color: #666;">Notificación automática Transporte SCRN</p>
          </body>
          </html>
        `;
      },
      // 10. Contraseña de acceso (generada o recuperada desde Mi Perfil)
      acceso_clave: (nombre: string, _gira: string, d: any) => {
        const saludo = String(nombre || "").trim() ? `Hola ${String(nombre || "").trim()},` : "Hola,";
        const clave = escapeHtmlMail(String(d?.clave_acceso || "").trim());
        const mail = escapeHtmlMail(String(d?.mail || "").trim());
        const linkApp = escapeHtmlMail(
          String(d?.link_app || "https://ofrn-web-app.vercel.app/login").trim(),
        );
        const mode = String(d?.mode || "recuperada").toLowerCase();
        const esGenerada = mode === "generada";
        const titulo = esGenerada ? "Tu contraseña de acceso" : "Recuperación de contraseña";
        const intro = esGenerada
          ? "Se generó una contraseña para que puedas entrar a la aplicación OFRN."
          : "Pediste recuperar tu contraseña de acceso a la aplicación OFRN.";
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
              .box { border-left: 4px solid #4f46e5; background-color: #f5f3ff; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .clave { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 20px; font-weight: bold; letter-spacing: 0.08em; color: #111; }
            </style>
          </head>
          <body>
            <p>${saludo}</p>
            <p>${intro}</p>
            <div class="box">
              <h2 style="margin-top:0; color:#111;">${titulo}</h2>
              ${mail ? `<p style="margin:0 0 8px 0; font-size:13px; color:#555;">Email: <strong>${mail}</strong></p>` : ""}
              <p style="margin:0 0 6px 0; font-size:13px;">Contraseña:</p>
              <p class="clave" style="margin:0;">${clave || "—"}</p>
            </div>
            <p>Entrá acá con ese email y contraseña:</p>
            <p><a href="${linkApp}" style="color:#4f46e5; font-weight:bold;">${linkApp}</a></p>
            <p style="font-size:12px; color:#64748b;">Si no pediste este correo, respondé a este mensaje para avisar a administración.</p>
            <p style="color: #666; font-size: 12px;">Orquesta Filarmónica de Río Negro – Sistema de Gestión</p>
          </body>
          </html>
        `;
      },

      // 11. Cambio de alimentación (autogestión del músico)
      cambio_alimentacion: (nombre: string, _gira: string, d: any) => {
        const display = nombre || [d?.nombre, d?.apellido].filter(Boolean).join(" ") || "Integrante";
        const anterior = d?.alimentacion_anterior || "(sin dato)";
        const nueva = d?.alimentacion_nueva || "(sin dato)";
        const mail = d?.mail ? String(d.mail) : "";
        const id = d?.id != null ? String(d.id) : "";
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; font-size: 14px; }
              .box { border-left: 4px solid #d97706; background-color: #fffbeb; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .diet { font-weight: bold; color: #111; }
            </style>
          </head>
          <body>
            <p>Hola producción,</p>
            <p>Un integrante actualizó su tipo de alimentación desde Mi Perfil.</p>
            <div class="box">
              <h3 style="margin-top:0; color:#111;">${display}</h3>
              ${id ? `<p style="margin:0 0 8px 0; color:#555; font-size:13px;">ID: ${id}${mail ? ` · ${mail}` : ""}</p>` : ""}
              <ul style="list-style-type: none; padding-left: 0; margin: 0;">
                <li>• Anterior: <span class="diet">${anterior}</span></li>
                <li>• Nueva: <span class="diet">${nueva}</span></li>
              </ul>
            </div>
            <p style="color: #666; font-size: 12px;">Orquesta Filarmónica de Río Negro – Sistema de Gestión</p>
          </body>
          </html>
        `;
      },
    };

    // --- HANDLER PRINCIPAL ---
    serve(async (req) => {
      if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
      }

      try {
        const payload = await req.json();
        const action = payload.action;
        const templateId = payload.templateId ?? payload.template_id;
        const email = payload.email;
        const bcc = payload.bcc;
        const nombre = payload.nombre;
        const gira = payload.gira;
        const detalle = payload.detalle;
        // console.log("[mails_produccion] Request received:", req.method, "action:", action, "templateId:", templateId);

        if (!GMAIL_USER || !GMAIL_PASS) {
          throw new Error("Falta configurar credenciales de Gmail en Secrets.");
        }

        if (action === "enviar_mail") {
          if (!email && (!bcc || bcc.length === 0)) {
            throw new Error("Falta destinatario (email o bcc)");
          }

          let tid: string;
          if (templateId && typeof templates[templateId as keyof typeof templates] === "function") {
            tid = templateId;
          } else if (templateId) {
            console.error("[mails_produccion] Template no encontrado:", templateId, "Disponibles:", Object.keys(templates));
            throw new Error(`Template no encontrado: ${templateId}`);
          } else {
            tid = "viaticos_simple";
          }
          const generateHTML = templates[tid as keyof typeof templates];
          const nombreGira = gira || "";
          const det = detalle || {};
          const nombreParaTemplate =
            tid === "convocatoria_gira"
              ? ((Array.isArray(bcc) && bcc.length > 1)
                  ? ""
                  : nombreSaludoConvocatoria(nombre || "", det))
              : nombre || "";
          const htmlContent = generateHTML(nombreParaTemplate, nombreGira, det);

          let subject = `Aviso OFRN`;
          if (tid === 'viaticos_simple') {
            subject = `Viáticos OFRN | ${nombreGira}`;
          } else if (tid === 'confirmacion_comidas') {
            subject = `Confirmación de Comidas | ${nombreGira}`;
          } else if (tid === 'nueva_obra') {
            subject = `[Repertorio] Nueva Obra: ${detalle?.titulo || 'Sin título'}`;
          } else if (tid === 'cambio_fechas_gira') {
            subject = `⚠️ CAMBIO DE FECHAS: ${nombreGira}`;
          } else if (tid === 'encargo_arreglo') {
            subject = `[Repertorio] Para arreglar: ${detalle?.titulo || 'Obra'}`;
          } else if (tid === 'obra_entregada') {
            subject = `[Repertorio] Obra entregada: ${detalle?.titulo || 'Obra'}`;
          } else if (tid === 'versionado_arreglo') {
            const tipoLabel = detalle?.tipo === 'NUEVO_ARREGLO' ? 'Nuevo arreglo' : 'Reemplazo';
            subject = `[Repertorio] ${tipoLabel}: ${detalle?.titulo || 'Obra'}`;
          } else if (tid === 'encargo_ajuste') {
            subject = `[Repertorio] Ajuste: ${detalle?.titulo || 'Obra'}`;
          } else if (tid === 'ajuste_entregado') {
            subject = `[Repertorio] Ajuste entregado: ${detalle?.titulo || 'Obra'}`;
          } else if (tid === 'convocatoria_gira') {
            const v = (detalle?.variant || 'INITIAL_BROADCAST').toUpperCase();
            if (v === 'INITIAL_BROADCAST') subject = `Convocatoria a gira | ${nombreGira}`;
            else if (v === 'ALTA') subject = `Alta en gira | ${nombreGira}`;
            else if (v === 'ALTA_ACCESO_PERSONAL') {
              subject = detalle?.es_modelo
                ? `[MODELO] Convocatoria + acceso personal | ${nombreGira}`
                : `Convocado/a a la gira | ${nombreGira}`;
            }
            else if (v === 'BAJA') subject = `Baja de gira | ${nombreGira}`;
            else if (v === 'AUSENTE') subject = `Ausencia en gira | ${nombreGira}`;
            else if (v === 'GIRA_ELIMINADA') subject = `Gira cancelada | ${nombreGira}`;
            else if (v === 'SEATING_CAMBIO') subject = `Novedades de seating | ${nombreGira}`;
            else subject = `Convocatoria OFRN | ${nombreGira}`;
          } else if (tid === "scrn_transporte_evento") {
            subject = detalle?.titulo ? `[SCRN] ${detalle.titulo}` : "Aviso Transporte SCRN";
          } else if (tid === "acceso_clave") {
            const mode = String(detalle?.mode || "recuperada").toLowerCase();
            subject =
              mode === "generada"
                ? "Tu contraseña de acceso | OFRN"
                : "Recuperación de contraseña | OFRN";
          } else if (tid === "cambio_alimentacion") {
            subject = `Cambio de alimentación | ${nombreParaTemplate || "Integrante"}`;
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

          const convocatoriaVariant = String(detalle?.variant || "").toUpperCase();
          if (tid === "convocatoria_gira" && convocatoriaVariant === "ALTA_ACCESO_PERSONAL") {
            mailOptions.attachments = convocatoriaAccesoPersonalAttachments();
          }

          // console.log(`[LOG] Enviando mail (${tid}). TO: ${email || 'Self'}, BCC: ${bcc?.length || 0}`);
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
