/**
 * Aserción: colapso de hops Persona multi-leg = primera ↑ / última ↓
 * (mismo criterio que calculateLogisticsSummary tras el fix 2026-09-10).
 * Caso gira 12 / Fernández: 13/09 07:00 → 21/09 23:00.
 */
function routeEventDateTime(evt) {
  if (!evt?.fecha) return null;
  const dt = new Date(`${evt.fecha}T${evt.hora_inicio || evt.hora || "00:00"}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function shouldTakeRouteEndpoint(prio, existing, candidateEvt, preferEarliest) {
  if (prio > existing.prio) return true;
  if (prio < existing.prio) return false;
  const candDt = routeEventDateTime(candidateEvt);
  const existDt = routeEventDateTime(existing.data);
  if (!candDt) return !existing.data;
  if (!existDt) return true;
  return preferEarliest ? candDt < existDt : candDt > existDt;
}

function collapseHops(hops) {
  let sub = { prio: -1, data: null };
  let baj = { prio: -1, data: null };
  for (const h of hops) {
    const p = h.prio ?? 5;
    if (h.subida) {
      if (shouldTakeRouteEndpoint(p, sub, h.subida, true)) {
        sub = { prio: p, data: h.subida };
      }
    }
    if (h.bajada) {
      if (shouldTakeRouteEndpoint(p, baj, h.bajada, false)) {
        baj = { prio: p, data: h.bajada };
      }
    }
  }
  return { subida: sub.data, bajada: baj.data };
}

/** Last-wins buggy behavior (p >= overwrite in array order). */
function collapseHopsLastWins(hops) {
  let sub = { prio: -1, data: null };
  let baj = { prio: -1, data: null };
  for (const h of hops) {
    const p = h.prio ?? 5;
    if (h.subida && p >= sub.prio) sub = { prio: p, data: h.subida };
    if (h.bajada && p >= baj.prio) baj = { prio: p, data: h.bajada };
  }
  return { subida: sub.data, bajada: baj.data };
}

const fernandezHops = [
  {
    prio: 5,
    subida: { fecha: "2026-09-13", hora_inicio: "07:00:00" },
    bajada: { fecha: "2026-09-13", hora_inicio: "16:00:00" },
  },
  {
    prio: 5,
    subida: { fecha: "2026-09-21", hora_inicio: "15:00:00" },
    bajada: { fecha: "2026-09-21", hora_inicio: "23:00:00" },
  },
];

const fixed = collapseHops(fernandezHops);
const buggy = collapseHopsLastWins(fernandezHops);

const ok =
  fixed.subida?.fecha === "2026-09-13" &&
  fixed.bajada?.fecha === "2026-09-21" &&
  buggy.subida?.fecha === "2026-09-21"; // documents the prior bug

if (!ok) {
  console.error("FAIL", { fixed, buggy });
  process.exit(1);
}

console.log(
  "OK: Fernández ventana viático =",
  `${fixed.subida.fecha} ${fixed.subida.hora_inicio.slice(0, 5)} → ${fixed.bajada.fecha} ${fixed.bajada.hora_inicio.slice(0, 5)}`,
);
console.log(
  "(bug previo last-wins empezaba en",
  buggy.subida.fecha + ")",
);
