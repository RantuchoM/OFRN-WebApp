/**
 * Cron: recordatorios de ingreso al ensayo (T−15 de hora_inicio).
 * - Web Push + email
 * - Solo integrantes con rol admin (gate de prueba; al abrir a músicos quitar el filtro)
 * - Solo si está convocado al ensayo y aún no tiene llegada
 * Idempotente vía eventos_checkin_recordatorios (tipo pre_inicio, canal push|email).
 *
 * Auth: header x-ensayo-inicio-cron-secret / x-ensayo-salida-cron-secret /
 *       x-db-backup-cron-secret (fallback ENSAYO_INICIO / SALIDA / DB_BACKUP).
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
  Deno.env.get("ENSAYO_INICIO_CRON_SECRET") ??
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

/** Minutos antes de hora_inicio (alineado al banner / alarma local). */
const PRE_MIN = 15;
/** Ventana tras el inicio para aún avisar si no ingresó (evita mails eternos). */
const MAX_AFTER_START_HOURS = 3;
const TIPO_ENSAYO = 13;
/**
 * Gate de prueba: solo admins. Poner en false (o borrar filtro) al abrir a músicos.
 */
const ONLY_ADMINS = true;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ensayo-inicio-cron-secret, x-ensayo-salida-cron-secret, x-db-backup-cron-secret",
};

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

function membershipActiveOnDate(
  row: { fecha_desde?: string | null; fecha_hasta?: string | null },
  fecha: string,
): boolean {
  if (!fecha) return false;
  const desde = row.fecha_desde ? String(row.fecha_desde).slice(0, 10) : null;
  const hasta = row.fecha_hasta ? String(row.fecha_hasta).slice(0, 10) : null;
  if (desde && fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
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

function templateInicioEmail(
  nombre: string,
  label: string,
  hi: string,
  link: string,
): string {
  const saludo = nombre ? `Hola ${nombre},` : "Hola,";
  const cuando = hi
    ? `En unos minutos empieza <strong>${label}</strong> (${hi})`
    : `En unos minutos empieza <strong>${label}</strong>`;
  return `<!DOCTYPE html><html><body style="font-family:Helvetica,Arial,sans-serif;color:#333;line-height:1.5;font-size:14px;">
  <p>${saludo}</p>
  <p>${cuando}. Recordá registrar la <strong>llegada / ingreso</strong> desde la app.</p>
  <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#d97706;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Abrir agenda y marcar ingreso</a></p>
  <p style="font-size:12px;color:#666;">Si ya lo marcaste, podés ignorar este mail.</p>
  </body></html>`;
}

function isAdminRole(rolSistema: unknown): boolean {
  if (Array.isArray(rolSistema)) {
    return rolSistema.map(String).includes("admin");
  }
  if (typeof rolSistema === "string") {
    return rolSistema
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .includes("admin");
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (CRON_SECRET) {
    const hdr =
      req.headers.get("x-ensayo-inicio-cron-secret") ??
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
  const tomorrow = shiftDateStr(today, 1);

  const out = {
    candidatos: 0,
    pre_push: 0,
    pre_mail: 0,
    skipped: 0,
    only_admins: ONLY_ADMINS,
    errores: [] as string[],
  };

  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  }

  // Eventos de hoy y mañana (cerca de medianoche ART)
  const { data: eventos, error: eErr } = await supabase
    .from("eventos")
    .select(
      "id, fecha, hora_inicio, hora_fin, descripcion, id_tipo_evento, is_deleted",
    )
    .eq("id_tipo_evento", TIPO_ENSAYO)
    .in("fecha", [today, tomorrow])
    .or("is_deleted.is.null,is_deleted.eq.false");

  if (eErr) {
    return new Response(JSON.stringify({ error: eErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  type Ev = {
    id: number;
    fecha: string;
    hora_inicio: string | null;
    hora_fin: string | null;
    descripcion: string | null;
    id_tipo_evento: number;
    is_deleted: boolean | null;
  };

  const eventosActivos = ((eventos || []) as Ev[]).filter((e) => !e.is_deleted);

  // Filtrar a ventana T−15 … T+MAX_AFTER
  const enVentana: Ev[] = [];
  for (const ev of eventosActivos) {
    const startMs = wallArToUtcMs(ev.fecha, ev.hora_inicio);
    if (!Number.isFinite(startMs)) {
      out.skipped += 1;
      continue;
    }
    const openAt = startMs - PRE_MIN * 60 * 1000;
    const closeAt = startMs + MAX_AFTER_START_HOURS * 60 * 60 * 1000;
    if (nowMs < openAt || nowMs > closeAt) {
      out.skipped += 1;
      continue;
    }
    enVentana.push(ev);
  }

  if (!enVentana.length) {
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventIds = enVentana.map((e) => Number(e.id));

  const [
    { data: links, error: lErr },
    { data: checks, error: cErr },
    { data: integrantesAll, error: iErr },
  ] = await Promise.all([
    supabase
      .from("eventos_ensambles")
      .select("id_evento, id_ensamble")
      .in("id_evento", eventIds),
    supabase
      .from("eventos_checkin_ensayo")
      .select("id_evento, id_integrante, registrado_at, justificado")
      .in("id_evento", eventIds),
    ONLY_ADMINS
      ? supabase
          .from("integrantes")
          .select("id, nombre, apellido, mail, rol_sistema")
          .contains("rol_sistema", ["admin"])
      : supabase
          .from("integrantes")
          .select("id, nombre, apellido, mail, rol_sistema"),
  ]);

  if (lErr) out.errores.push(`eventos_ensambles: ${lErr.message}`);
  if (cErr) out.errores.push(`checkin: ${cErr.message}`);
  if (iErr) out.errores.push(`integrantes: ${iErr.message}`);

  type Integ = {
    id: number;
    nombre: string | null;
    apellido: string | null;
    mail: string | null;
    rol_sistema: unknown;
  };

  let integrantes = (integrantesAll || []) as Integ[];
  if (ONLY_ADMINS) {
    // Cinturón de seguridad si el column filter no aplica a valores legacy string
    integrantes = integrantes.filter((i) => isAdminRole(i.rol_sistema));
  }
  if (!integrantes.length) {
    return new Response(JSON.stringify({ ...out, reason: "sin_admins" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const integranteIds = integrantes.map((i) => Number(i.id));
  const ensambleIds = [
    ...new Set(
      (links || [])
        .map((l: { id_ensamble: number }) => Number(l.id_ensamble))
        .filter((n) => !Number.isNaN(n)),
    ),
  ];

  const [{ data: memberships }, { data: customs }] = await Promise.all([
    ensambleIds.length
      ? supabase
          .from("integrantes_ensambles")
          .select("id_integrante, id_ensamble, fecha_desde, fecha_hasta")
          .in("id_integrante", integranteIds)
          .in("id_ensamble", ensambleIds)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from("eventos_asistencia_custom")
      .select("id_evento, id_integrante, tipo")
      .in("id_evento", eventIds)
      .in("id_integrante", integranteIds),
  ]);

  const ensamblesByEvent = new Map<number, number[]>();
  for (const l of links || []) {
    const eid = Number((l as { id_evento: number }).id_evento);
    const ens = Number((l as { id_ensamble: number }).id_ensamble);
    if (!ensamblesByEvent.has(eid)) ensamblesByEvent.set(eid, []);
    ensamblesByEvent.get(eid)!.push(ens);
  }

  type Memb = {
    id_integrante: number;
    id_ensamble: number;
    fecha_desde?: string | null;
    fecha_hasta?: string | null;
  };
  const membByIntegrante = new Map<number, Memb[]>();
  for (const m of (memberships || []) as Memb[]) {
    const id = Number(m.id_integrante);
    if (!membByIntegrante.has(id)) membByIntegrante.set(id, []);
    membByIntegrante.get(id)!.push(m);
  }

  const customMap = new Map<string, string>();
  for (const c of customs || []) {
    customMap.set(
      `${Number((c as { id_evento: number }).id_evento)}:${Number((c as { id_integrante: number }).id_integrante)}`,
      String((c as { tipo: string }).tipo || ""),
    );
  }

  const hasLlegada = new Set<string>();
  for (const c of checks || []) {
    const row = c as {
      id_evento: number;
      id_integrante: number;
      registrado_at: string | null;
      justificado: boolean | null;
    };
    if (row.registrado_at || row.justificado) {
      hasLlegada.add(`${Number(row.id_evento)}:${Number(row.id_integrante)}`);
    }
  }

  function isConvocado(evento: Ev, idIntegrante: number): boolean {
    const key = `${Number(evento.id)}:${idIntegrante}`;
    const custom = customMap.get(key);
    if (custom === "ausente") return false;
    if (custom === "adicional" || custom === "invitado") return true;
    const ensIds = new Set(ensamblesByEvent.get(Number(evento.id)) || []);
    if (!ensIds.size) return false;
    const membs = membByIntegrante.get(idIntegrante) || [];
    return membs.some(
      (m) =>
        ensIds.has(Number(m.id_ensamble)) &&
        membershipActiveOnDate(m, evento.fecha),
    );
  }

  type Candidate = { evento: Ev; integ: Integ };
  const candidates: Candidate[] = [];
  for (const ev of enVentana) {
    for (const integ of integrantes) {
      const key = `${Number(ev.id)}:${Number(integ.id)}`;
      if (hasLlegada.has(key)) continue;
      if (!isConvocado(ev, Number(integ.id))) continue;
      candidates.push({ evento: ev, integ });
    }
  }

  out.candidatos = candidates.length;
  if (!candidates.length) {
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: already } = await supabase
    .from("eventos_checkin_recordatorios")
    .select("id_evento, id_integrante, tipo, canal")
    .eq("tipo", "pre_inicio")
    .in(
      "id_evento",
      [...new Set(candidates.map((c) => Number(c.evento.id)))],
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
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return { sent: 0 };
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
    return { sent: n };
  };

  for (const { evento: ev, integ } of candidates) {
    const idEvento = Number(ev.id);
    const idIntegrante = Number(integ.id);
    const label = eventoLabel(ev);
    const hi = String(ev.hora_inicio || "").slice(0, 5);
    const name = [integ.nombre, integ.apellido].filter(Boolean).join(" ").trim();
    const title = "Ensayo en breve · marcá el ingreso";
    const body = hi
      ? `En ~${PRE_MIN} min (o ya empezó) «${label}» (${hi}). Abrí la app y registrá la llegada.`
      : `En ~${PRE_MIN} min (o ya empezó) «${label}». Abrí la app y registrá la llegada.`;
    const tag = `ensayo-inicio-pre-${idEvento}`;

    if (!hasSent(idEvento, idIntegrante, "pre_inicio", "push")) {
      await sendPush(idIntegrante, title, body, tag);
      await markSent(idEvento, idIntegrante, "pre_inicio", "push");
      out.pre_push += 1;
    }

    if (
      transporter &&
      !hasSent(idEvento, idIntegrante, "pre_inicio", "email")
    ) {
      const mail = String(integ.mail || "").trim();
      if (mail && mail.includes("@") && !mail.includes("placeholder")) {
        try {
          await transporter.sendMail({
            from: `"Filarmónica SCRN" <${GMAIL_USER}>`,
            replyTo: "filarmonica.scrn@gmail.com",
            to: mail,
            subject: `Ingreso a ensayo · ${label}`,
            html: templateInicioEmail(name, label, hi, `${APP_BASE}/`),
          });
          await markSent(idEvento, idIntegrante, "pre_inicio", "email");
          out.pre_mail += 1;
        } catch (e) {
          out.errores.push(
            `mail ${idIntegrante}: ${(e as Error).message}`,
          );
        }
      } else {
        await markSent(idEvento, idIntegrante, "pre_inicio", "email");
      }
    } else if (!transporter) {
      // sin Gmail: no reintentar mail
      if (!hasSent(idEvento, idIntegrante, "pre_inicio", "email")) {
        await markSent(idEvento, idIntegrante, "pre_inicio", "email");
      }
    }
  }

  return new Response(JSON.stringify(out), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
