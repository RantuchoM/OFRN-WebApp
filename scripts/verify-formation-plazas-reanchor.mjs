/**
 * Contract: changing formation slot count preserves magnetized slotIds for
 * indices that still exist; decrease demagnetizes only index >= new N.
 * (Mirrors non-redistribute path of reanchorItemsToFormations.)
 *
 * Run: node scripts/verify-formation-plazas-reanchor.mjs
 */
import assert from "node:assert/strict";

function makeSlotId(formationId, index) {
  return `${formationId}:${index}`;
}

function parseSlotId(slotId) {
  if (slotId == null || slotId === "") return null;
  const s = String(slotId);
  const i = s.lastIndexOf(":");
  if (i <= 0) return null;
  const index = Number(s.slice(i + 1));
  if (!Number.isFinite(index)) return null;
  return { formationId: s.slice(0, i), index };
}

/** Non-redistribute reanchor: keep slotId if index < N, else clear. */
function reanchorPreserveSlotIds(items, formationId, newSlots) {
  return items.map((it) => {
    const parsed = parseSlotId(it.slotId);
    if (!parsed || parsed.formationId !== formationId) return it;
    if (parsed.index >= newSlots) return { ...it, slotId: null };
    return { ...it, slotId: makeSlotId(formationId, parsed.index) };
  });
}

const fid = "fm1";
const items = [0, 2, 5, 7].map((index) => ({
  id: `i${index}`,
  slotId: makeSlotId(fid, index),
}));

const up = reanchorPreserveSlotIds(items, fid, 10);
assert.deepEqual(
  up.map((it) => it.slotId),
  items.map((it) => it.slotId),
  "increase preserves slotIds (incl. gaps)",
);

const down = reanchorPreserveSlotIds(items, fid, 6);
const byId = Object.fromEntries(down.map((it) => [it.id, it]));
assert.equal(byId.i0.slotId, makeSlotId(fid, 0));
assert.equal(byId.i2.slotId, makeSlotId(fid, 2));
assert.equal(byId.i5.slotId, makeSlotId(fid, 5));
assert.equal(byId.i7.slotId, null, "index 7 demagnetized when N=6");

console.log("verify-formation-plazas-reanchor: ok");
