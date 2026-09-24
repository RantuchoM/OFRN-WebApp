/**
 * Contract: gray formation box handles — edges = one axis, corners = uniform.
 * Run: npx vite-node scripts/verify-formation-box-resize.mjs
 */
import assert from "node:assert/strict";
import {
  createStagePlotFormation,
  formationFromBoundsBoxHandleDrag,
  formationBoundsBoxHandlesWorld,
} from "../src/utils/stagePlotFormations.js";

const facing = { x: 2200, y: 2700 };

for (const kind of ["horseshoe", "semi_arc", "arc", "rect"]) {
  const fm = createStagePlotFormation(kind, 2000, 1400, 8);
  const handles = formationBoundsBoxHandlesWorld(fm, facing);
  const byId = Object.fromEntries(handles.map((h) => [h.id, h]));
  const p0 = { ...fm.params };

  const e = byId.box_e;
  const nextE = formationFromBoundsBoxHandleDrag(
    fm,
    "box_e",
    e.x + 200,
    e.y,
    facing,
  );
  if (kind === "horseshoe" || kind === "rect") {
    assert.ok(nextE.params.width > p0.width, `${kind} e grows width`);
    assert.equal(nextE.params.depth, p0.depth, `${kind} e keeps depth`);
  } else {
    assert.ok(nextE.params.rx > p0.rx, `${kind} e grows rx`);
    assert.equal(nextE.params.ry, p0.ry, `${kind} e keeps ry`);
    if (kind === "semi_arc") {
      assert.ok(
        nextE.params.wingLength > p0.wingLength,
        "semi_arc e grows wingLength",
      );
      assert.equal(nextE.wingSlots, fm.wingSlots);
      assert.equal(nextE.arcSlots, fm.arcSlots);
    }
  }

  const n = byId.box_n;
  const nextN = formationFromBoundsBoxHandleDrag(
    fm,
    "box_n",
    n.x,
    n.y - 150,
    facing,
  );
  if (kind === "horseshoe" || kind === "rect") {
    assert.ok(nextN.params.depth > p0.depth, `${kind} n grows depth`);
    assert.equal(nextN.params.width, p0.width, `${kind} n keeps width`);
  } else {
    assert.ok(nextN.params.ry > p0.ry, `${kind} n grows ry`);
    assert.equal(nextN.params.rx, p0.rx, `${kind} n keeps rx`);
    if (kind === "semi_arc") {
      assert.equal(
        nextN.params.wingLength,
        p0.wingLength,
        "semi_arc n keeps wingLength",
      );
    }
  }

  const se = byId.box_se;
  const nextSE = formationFromBoundsBoxHandleDrag(
    fm,
    "box_se",
    se.x + 120,
    se.y + 80,
    facing,
  );
  if (kind === "horseshoe" || kind === "rect") {
    assert.ok(nextSE.params.width > p0.width);
    assert.ok(nextSE.params.depth > p0.depth);
    assert.ok(
      Math.abs(
        nextSE.params.width / p0.width - nextSE.params.depth / p0.depth,
      ) < 1e-9,
      `${kind} se uniform`,
    );
  } else {
    assert.ok(nextSE.params.rx > p0.rx);
    assert.ok(nextSE.params.ry > p0.ry);
    assert.ok(
      Math.abs(nextSE.params.rx / p0.rx - nextSE.params.ry / p0.ry) < 1e-9,
      `${kind} se uniform`,
    );
  }
  console.log("ok", kind);
}

console.log("all passed");
