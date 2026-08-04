/**
 * Cron: recordatorios de salida de ensayo.
 * - T−10 min de hora_fin (si hay llegada y no salida): Web Push
 * - T+15 min de hora_fin: Web Push + email
 * Idempotente vía eventos_checkin_recordatorios.
 *
 * Auth: header x-ensayo-salida-cron-secret (o fallback DB_BACKUP_CRON_SECRET).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import nodemailer from "npm:nodemailer@6.9.7";
import webpush from "npm:web-push@3.6.7";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_PASS = Deno.env.get("GMAIL_PASS");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET =
  Deno.env.get("ENSAYO_SALIDA_CRON_SECRET") ??
  Deno.env.get("DB_BACKUP_CRON_SECRET") ??
  "";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT =
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:filarmonica.scrn@gmail.com";
const APP_BASE = (
  Deno.env.get("APP_BASE_URL") ||
  Deno.env.get("FRONTEND_URL") ||
  "https://ofrn-web-app.vercel.app"
).replace(/\/$/, "");

const PRE_MIN = 10;
const POST_MIN = 15;
const MAX_AGE_HOURS = 12;
const TIPO_ENSAYO = 13;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ensayo-salida-cron-secret, x-db-backup-cron-secret",
};

/** fecha + hora de pared ART (UTC−3 fijo) → epoch ms UTC */
function wallArToUtcMs(fecha: string, hora: string | null | undefined): number {
  if (!fecha || !hora) return NaN;
  const [y, m, d] = String(fecha).split("-").map(Number);
  const hm = String(hora).slice(0, 8).split(":");
  const hh = Number(hm[0]);
  const mm = Number(hm[1] || 0);
  const ss = Number(hm[2] || 0);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return NaN;
  return Date.UTC(y, m - 1, d, hh + 3, mm, ss || 0);
}

function todayArDateStr(now = new Date()): string {
  // UTC−3
  const t = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, "0");
  const d = String(t.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDateStr(yyyyMmDd: string, deltaDays: number): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function eventoLabel(ev: {
  descripcion?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
}): string {
  const desc = String(ev.descripcion || "").trim();
  const hi = String(ev.hora_inicio || "").slice(0, 5);
  const hf = String(ev.hora_fin || "").slice(0, 5);
  const horario = hi && hf && hf !== hi ? `${hi}–${hf}` : hi || hf;
  if (desc && horario) return `${desc} · ${horario}`;
  if (desc) return desc;
  return horario ? `Ensayo ${horario}` : "Ensayo de ensamble";
}

function templatePostEmail(nombre: string, label: string, link: string): string {
  const saludo = nombre ? `Hola ${nombre},` : "Hola,";
  return `<!DOCTYPE html><html><body style="font-family:Helvetica,Arial,sans-serif;color:#333;line-height:1.5;font-size:14px;">
  <p>${saludo}</p>
  <p>Pasaron <strong>${POST_MIN} minutos</strong> del fin programado de <strong>${label}</strong> y todavía no registraste la hora de salida.</p>
  <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#be123c;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Abrir agenda y marcar salida</a></p>
  <p style="font-size:12px;color:#666;">Si ya la marcaste, podés ignorar este mail.</p>
  </body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (CRON_SECRET) {
    const hdr =
      req.headers.get("x-ensayo-salida-cron-secret") ??
      req.headers.get("x-db-backup-cron-secret") ??
      "";
    if (hdr !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Config incompleta" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date();
  const nowMs = now.getTime();
  const today = todayArDateStr(now);
  const yesterday = shiftDateStr(today, -1);

  const out = {
    candidatos: 0,
    pre_push: 0,
    post_push: 0,
    post_mail: 0,
    skipped: 0,
    errores: [] as string[],
  };

  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  }

  const { data: checks, error: qErr } = await supabase
    .from("eventos_checkin_ensayo")
    .select("id_evento, id_integrante, registrado_at, salida_at, justificado")
    .not("registrado_at", "is", null)
    .is("salida_at", null);

  if (qErr) {
    return new Response(JSON.stringify({ error: qErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  type CheckRow = {
    id_evento: number;
    id_integrante: number;
    registrado_at: string;
    salida_at: string | null;
    justificado: boolean | null;
  };

  const openChecks = ((checks || []) as CheckRow[]).filter(
    (c) => !c.justificado,
  );

  if (!openChecks.length) {
    return new Response(JSON.stringify({ ...out, candidatos: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventIds = [...new Set(openChecks.map((c) => c.id_evento))];
  const integranteIds = [...new Set(openChecks.map((c) => c.id_integrante))];

  const [{ data: eventos, error: eErr }, { data: integrantes, error: iErr }] =
    await Promise.all([
      supabase
        .from("eventos")
        .select(
          "id, fecha, hora_inicio, hora_fin, descripcion, id_tipo_evento, is_deleted",
        )
        .in("id", eventIds)
        .eq("id_tipo_evento", TIPO_ENSAYO)
        .in("fecha", [today, yesterday]),
      supabase
        .from("integrantes")
        .select("id, nombre, apellido, mail")
        .in("id", integranteIds),
    ]);

  if (eErr) out.errores.push(`eventos: ${eErr.message}`);
  if (iErr) out.errores.push(`integrantes: ${iErr.message}`);

  const evById = new Map(
    (eventos || [])
      .filter((e) => !e.is_deleted)
      .map((e) => [Number(e.id), e]),
  );
  const intById = new Map(
    (integrantes || []).map((i) => [Number(i.id), i]),
  );

  type Row = {
    id_evento: number;
    id_integrante: number;
    eventos: {
      id: number;
      fecha: string;
      hora_inicio: string | null;
      hora_fin: string | null;
      descripcion: string | null;
      id_tipo_evento: number;
      is_deleted: boolean | null;
    };
    integrantes: {
      id: number;
      nombre: string | null;
      apellido: string | null;
      mail: string | null;
    };
  };

  const rows: Row[] = [];
  for (const c of openChecks) {
    const ev = evById.get(Number(c.id_evento));
    const integ = intById.get(Number(c.id_integrante));
    if (!ev || !integ) continue;
    rows.push({
      id_evento: Number(c.id_evento),
      id_integrante: Number(c.id_integrante),
      eventos: ev as Row["eventos"],
      integrantes: integ as Row["integrantes"],
    });
  }

  out.candidatos = rows.length;

  const { data: already } = await supabase
    .from("eventos_checkin_recordatorios")
    .select("id_evento, id_integrante, tipo, canal")
    .in(
      "id_evento",
      rows.length ? [...new Set(rows.map((r) => r.id_evento))] : [-1],
    );

  const sent = new Set(
    (already || []).map(
      (a) =>
        `${a.id_evento}:${a.id_integrante}:${a.tipo}:${a.canal}`,
    ),
  );

  const markSent = async (
    idEvento: number,
    idIntegrante: number,
    tipo: string,
    canal: string,
  ) => {
    const key = `${idEvento}:${idIntegrante}:${tipo}:${canal}`;
    if (sent.has(key)) return false;
    const { error } = await supabase.from("eventos_checkin_recordatorios").insert({
      id_evento: idEvento,
      id_integrante: idIntegrante,
      tipo,
      canal,
    });
    if (error) {
      if (error.code === "23505") {
        sent.add(key);
        return false;
      }
      out.errores.push(`mark ${key}: ${error.message}`);
      return false;
    }
    sent.add(key);
    return true;
  };

  const hasSent = (
    idEvento: number,
    idIntegrante: number,
    tipo: string,
    canal: string,
  ) => sent.has(`${idEvento}:${idIntegrante}:${tipo}:${canal}`);

  let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
  if (GMAIL_USER && GMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });
  }

  const sendPush = async (
    idIntegrante: number,
    title: string,
    body: string,
    tag: string,
  ) => {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return { sent: 0, gone: [] as string[] };
    const { data: subs } = await supabase
      .from("web_push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("id_integrante", idIntegrante);
    let n = 0;
    const gone: string[] = [];
    for (const s of subs || []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          JSON.stringify({
            title,
            body,
            tag,
            url: `${APP_BASE}/`,
            renotify: true,
          }),
        );
        n += 1;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          gone.push(s.endpoint);
        } else {
          out.errores.push(
            `push ${idIntegrante}: ${(err as Error)?.message || String(err)}`,
          );
        }
      }
    }
    if (gone.length) {
      await supabase
        .from("web_push_subscriptions")
        .delete()
        .in("endpoint", gone);
    }
    return { sent: n, gone };
  };

  for (const row of rows) {
    const ev = row.eventos;
    const endMs = wallArToUtcMs(ev.fecha, ev.hora_fin || ev.hora_inicio);
    if (!Number.isFinite(endMs)) {
      out.skipped += 1;
      continue;
    }
    if (nowMs < endMs - PRE_MIN * 60 * 1000) {
      out.skipped += 1;
      continue;
    }
    if (nowMs > endMs + MAX_AGE_HOURS * 60 * 60 * 1000) {
      out.skipped += 1;
      continue;
    }

    const label = eventoLabel(ev);
    const name = [row.integrantes?.nombre, row.integrantes?.apellido]
      .filter(Boolean)
      .join(" ")
      .trim();

    const isPost = nowMs >= endMs + POST_MIN * 60 * 1000;

    if (isPost) {
      // Push post (1x)
      if (!hasSent(row.id_evento, row.id_integrante, "post_cierre", "push")) {
        const title = "Falta marcar la salida";
        const body =
          `Pasaron ${POST_MIN} min del fin de «${label}» y aún no registraste la salida.`;
        await sendPush(
          row.id_integrante,
          title,
          body,
          `ensayo-salida-post-${row.id_evento}`,
        );
        // Marcar aunque no haya suscripciones (evita reintentos infinitos de mail? no, push y mail separan)
        // Solo marcar push si enviamos o no hay subs — igual marcamos para no spamear reintentos
        await markSent(row.id_evento, row.id_integrante, "post_cierre", "push");
        out.post_push += 1;
      }

      // Email post (1x)
      if (
        transporter &&
        !hasSent(row.id_evento, row.id_integrante, "post_cierre", "email")
      ) {
        const mail = String(row.integrantes?.mail || "").trim();
        if (mail && mail.includes("@") && !mail.includes("placeholder")) {
          try {
            await transporter.sendMail({
              from: `"Filarmónica SCRN" <${GMAIL_USER}>`,
              replyTo: "filarmonica.scrn@gmail.com",
              to: mail,
              subject: `Salida pendiente · ${label}`,
              html: templatePostEmail(name, label, `${APP_BASE}/`),
            });
            await markSent(
              row.id_evento,
              row.id_integrante,
              "post_cierre",
              "email",
            );
            out.post_mail += 1;
          } catch (e) {
            out.errores.push(
              `mail ${row.id_integrante}: ${(e as Error).message}`,
            );
          }
        } else {
          // Sin mail: no reintentar
          await markSent(
            row.id_evento,
            row.id_integrante,
            "post_cierre",
            "email",
          );
        }
      }
    } else {
      // Pre: solo push (T−10 … T+15 no alcanzado)
      if (!hasSent(row.id_evento, row.id_integrante, "pre_cierre", "push")) {
        const title = "Cierre de ensayo en breve";
        const body =
          `Quedan ~${PRE_MIN} min (o está por terminar) «${label}». Recordá registrar la hora de salida.`;
        await sendPush(
          row.id_integrante,
          title,
          body,
          `ensayo-salida-pre-${row.id_evento}`,
        );
        await markSent(row.id_evento, row.id_integrante, "pre_cierre", "push");
        out.pre_push += 1;
      } else {
        out.skipped += 1;
      }
    }
  }

  return new Response(JSON.stringify(out), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
