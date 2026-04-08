    import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
    import nodemailer from "npm:nodemailer@6.9.7";

    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_PASS = Deno.env.get("GMAIL_PASS");

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    const fmt = (v: any) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v || 0);

    /**
     * Convocatoria por BCC: el cuerpo usa un único saludo; si viene nombre y apellido del primer integrante
     * en detalle, armar "Nombre Apellido". Si no, usar payload.nombre (p. ej. "Apellido, Nombre" o un solo nombre).
     */
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
        const linkRepertorio = d?.link_repertorio || "";
        const nomenclador = d?.nomenclador || gira;
        const reason = d?.reason || "";
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

        let titulo = "Convocatoria OFRN";
        let parrafo = "";

        if (variant === "INITIAL_BROADCAST") {
          titulo = "Convocatoria a gira";
          parrafo = `
            <p>Hola ${nombre},</p>
            <p>Te convocamos a la gira <strong>${gira}</strong> (${nomenclador}).</p>
            ${fechasZonaBlock}
            <p>Podés consultar el repertorio y material en el siguiente enlace:</p>
            <p><a href="${linkRepertorio || "#"}" style="color:#4f46e5; font-weight:bold;">Ver repertorio y material de la gira</a></p>
            <p>Cualquier consulta, respondé a este correo.</p>
          `;
        } else if (variant === "ALTA") {
          titulo = "Alta en gira";
          parrafo = `
            <p>Hola ${nombre},</p>
            <p>Fuiste dado/a de <strong>alta</strong> en la gira <strong>${gira}</strong> (${nomenclador}).</p>
            ${reasonBlock}
            ${fechasZonaBlock}
            ${linkRepertorio ? `<p><a href="${linkRepertorio}" style="color:#4f46e5; font-weight:bold;">Ver repertorio y material</a></p>` : ""}
            <p>Saludos.</p>
          `;
        } else if (variant === "BAJA") {
          titulo = "Baja de gira";
          parrafo = `
            <p>Hola ${nombre},</p>
            <p>Se registró tu <strong>baja</strong> de la gira <strong>${gira}</strong> (${nomenclador}).</p>
            ${reasonBlock}
            ${fechasZonaBlock}
            <p>Si tenés dudas, respondé a este correo.</p>
          `;
        } else if (variant === "AUSENTE") {
          titulo = "Ausencia en gira";
          parrafo = `
            <p>Hola ${nombre},</p>
            <p>Se registró tu situación de <strong>ausente</strong> en la gira <strong>${gira}</strong> (${nomenclador}).</p>
            ${reasonBlock}
            ${fechasZonaBlock}
            <p>Para cualquier cambio, contactá a la administración.</p>
          `;
        } else if (variant === "GIRA_ELIMINADA") {
          titulo = "Gira cancelada";
          const nombreGiraUnico = gira || nomenclador || "esta gira";
          parrafo = `
            <p>Hola ${nombre},</p>
            <p>Te informamos que la gira <strong>${nombreGiraUnico}</strong> ha sido <strong>cancelada definitivamente</strong> y eliminada del cronograma.</p>
            ${fechasZonaBlock}
            <p>Si tenés consultas, contactá a la administración.</p>
          `;
        } else {
          parrafo = `<p>Hola ${nombre},</p><p>Actualización sobre la gira <strong>${gira}</strong> (${nomenclador}).</p>${reasonBlock}${fechasZonaBlock}`;
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
        console.log("[mails_produccion] Request received:", req.method, "action:", action, "templateId:", templateId);

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
              ? nombreSaludoConvocatoria(nombre || "", det)
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
          } else if (tid === 'convocatoria_gira') {
            const v = (detalle?.variant || 'INITIAL_BROADCAST').toUpperCase();
            if (v === 'INITIAL_BROADCAST') subject = `Convocatoria a gira | ${nombreGira}`;
            else if (v === 'ALTA') subject = `Alta en gira | ${nombreGira}`;
            else if (v === 'BAJA') subject = `Baja de gira | ${nombreGira}`;
            else if (v === 'AUSENTE') subject = `Ausencia en gira | ${nombreGira}`;
            else if (v === 'GIRA_ELIMINADA') subject = `Gira cancelada | ${nombreGira}`;
            else subject = `Convocatoria OFRN | ${nombreGira}`;
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
