/**
 * Modelos UTF-8: SEATING_CAMBIO_JEFE_RESUMEN + SEATING_ATRIL_CAMBIO → Archivo
 * Gira 15 (Cantos del Presente).
 */
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eHJidWl2b3BuYXdueGxjanhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODI5MzIsImV4cCI6MjA4MDM1ODkzMn0._tMDAJg2r5vfR1y0JPYd3LVDB66CcyXtj5dY4RqrxIg";
const URL =
  "https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/mails_produccion";

const base = {
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
    nombre: "Marko",
    gira: "Cantos del Presente",
    detalle: {
      ...base,
      variant: "SEATING_CAMBIO_JEFE_RESUMEN",
      actor_jefe: "Pérez, Ana",
      reason:
        "- [particella] Corro, Oswaldo | Chant for East Timor: Violoncello 2 → Violoncello 1\n- [particella] Gómez, Lucía | Obra ejemplo: Violín 1 → Violín 1 Divisi A\n- [atril/silla] Corro, Oswaldo | bloque Programa A · Violonchelos: atril 3, silla b → atril 2, silla a",
      novedades_resumen: [
        {
          tipo: "particella",
          musico: "Corro, Oswaldo",
          obra: "Chant for East Timor",
          from: "Violoncello 2",
          to: "Violoncello 1",
          cambio: "Violoncello 2 → Violoncello 1",
        },
        {
          tipo: "particella",
          musico: "Gómez, Lucía",
          obra: "Obra ejemplo",
          from: "Violín 1",
          to: "Violín 1 Divisi A",
          cambio: "Violín 1 → Violín 1 Divisi A",
        },
        {
          tipo: "atril",
          musico: "Corro, Oswaldo",
          obra: "bloque Programa A · Violonchelos",
          from: "atril 3, silla b",
          to: "atril 2, silla a",
          cambio: "atril 3, silla b → atril 2, silla a",
          bloque: "Programa A",
          contenedor: "Violonchelos",
        },
      ],
      vars: {
        actor_jefe: "Pérez, Ana",
        cantidad: "3",
        cantidad_particella: "2",
        cantidad_atril: "1",
      },
    },
  },
  {
    action: "enviar_mail",
    templateId: "convocatoria_gira",
    email: "ofrn.archivo@gmail.com",
    nombre: "Oswaldo Corro",
    gira: "Cantos del Presente",
    detalle: {
      ...base,
      variant: "SEATING_ATRIL_CAMBIO",
      actor_jefe: "Pérez, Ana",
      bloque: "Programa A",
      contenedor: "Violonchelos",
      asiento: "atril 2, silla a",
      asiento_previo: "atril 3, silla b",
      atril: "2",
      silla: "a",
      vars: {
        bloque: "Programa A",
        contenedor: "Violonchelos",
        asiento: "atril 2, silla a",
        asiento_previo: "atril 3, silla b",
        actor_jefe: "Pérez, Ana",
      },
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
