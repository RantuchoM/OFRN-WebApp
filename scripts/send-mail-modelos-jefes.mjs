/**
 * Reenvía modelos UTF-8 de REPERTORIO_PARTES_LISTOS y SEATING_CAMBIO (jefe)
 * a ofrn.archivo@gmail.com usando la gira 15.
 *
 * Uso: node scripts/send-mail-modelos-jefes.mjs
 */
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eHJidWl2b3BuYXdueGxjanhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODI5MzIsImV4cCI6MjA4MDM1ODkzMn0._tMDAJg2r5vfR1y0JPYd3LVDB66CcyXtj5dY4RqrxIg";
const URL =
  "https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/mails_produccion";

const baseDetalle = {
  nomenclador: "CF 01/26",
  fecha_desde: "2026-11-18",
  fecha_hasta: "2026-11-21",
  zona: "Atlántica",
  link_repertorio:
    "https://ofrn.app/?tab=giras&view=REPERTOIRE&giraId=15",
  es_modelo: true,
};

const payloads = [
  {
    action: "enviar_mail",
    templateId: "convocatoria_gira",
    email: "ofrn.archivo@gmail.com",
    nombre: "Archivo",
    gira: "Cantos del Presente",
    detalle: {
      ...baseDetalle,
      variant: "REPERTORIO_PARTES_LISTOS",
      primer_integrante_nombre: "Archivo",
      primer_integrante_apellido: "OFRN",
    },
  },
  {
    action: "enviar_mail",
    templateId: "convocatoria_gira",
    email: "ofrn.archivo@gmail.com",
    nombre: "Martín Pike",
    gira: "Cantos del Presente",
    detalle: {
      ...baseDetalle,
      variant: "SEATING_CAMBIO",
      actor_jefe: "Pérez, Ana",
      reason:
        "Cambio efectuado por el/la jefe de fila Pérez, Ana.\n- Obra ejemplo: Violín 1 → Violín 1 Divisi A",
      novedades: [
        {
          obra: "Obra ejemplo",
          from: "Violín 1",
          to: "Violín 1 Divisi A",
          cambio: "Violín 1 → Violín 1 Divisi A",
        },
      ],
      primer_integrante_nombre: "Martín",
      primer_integrante_apellido: "Pike",
    },
  },
];

async function send(body) {
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ANON}`,
      apikey: ANON,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok || json?.success !== true) {
    throw new Error(
      `${body.detalle?.variant}: HTTP ${res.status} ${JSON.stringify(json)}`,
    );
  }
  return json;
}

for (const p of payloads) {
  const out = await send(p);
  console.log(`OK ${p.detalle.variant}`, out.id || out);
}
