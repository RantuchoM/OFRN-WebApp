/**
 * Contract checks for downstage-center lienzo resize math.
 * Mirrors `stagePlotDownstageCenterResizeOffset` in stagePlotPayload.js
 * (kept dependency-free so Node can run it without the Vite import graph).
 *
 * Run: node scripts/verify-stage-plot-center-resize.mjs
 */
import assert from "node:assert/strict";

const CM_TO_PX = 4;

/** @see stagePlotDownstageCenterResizeOffset */
function stagePlotDownstageCenterResizeOffset(
  prevWidthPx,
  prevHeightPx,
  nextWidthPx,
  nextHeightPx,
) {
  const dW = (Number(nextWidthPx) || 0) - (Number(prevWidthPx) || 0);
  const dH = (Number(nextHeightPx) || 0) - (Number(prevHeightPx) || 0);
  return { dx: dW / 2, dy: dH };
}

// Example from the task: 1100×700 → 1200×800 cm
const prevW = 1100 * CM_TO_PX; // 4400
const prevH = 700 * CM_TO_PX; // 2800
const nextW = 1200 * CM_TO_PX; // 4800
const nextH = 800 * CM_TO_PX; // 3200

const { dx, dy } = stagePlotDownstageCenterResizeOffset(
  prevW,
  prevH,
  nextW,
  nextH,
);

assert.equal(dx, 200, "width opens equally left+right");
assert.equal(dy, 400, "height opens only toward upstage (full Δh)");
assert.notEqual(dy, 200, "must NOT use geometric Δh/2");

// Object at old geometric center:
const x0 = prevW / 2; // 2200
const y0 = prevH / 2; // 1400
const x1 = x0 + dx; // 2400 = new center X
const y1 = y0 + dy; // 1800
assert.equal(x1, nextW / 2);
// Distance to downstage edge unchanged (conductor stays relative):
assert.equal(nextH - y1, prevH - y0);

// Geometric-center model would have used dy=200 → y=1600, drifting +200 from conductor.
const geometricY = y0 + (nextH - prevH) / 2;
assert.equal(geometricY, 1600);
assert.equal(nextH - geometricY, prevH - y0 + 200);

// Viewport pan uses the same (dx, dy): screen pos of content stays put.
const scale = 0.25;
const vx0 = 40;
const vy0 = 40;
const screenBefore = { x: vx0 + x0 * scale, y: vy0 + y0 * scale };
const vx1 = vx0 - dx * scale;
const vy1 = vy0 - dy * scale;
const screenAfter = { x: vx1 + x1 * scale, y: vy1 + y1 * scale };
assert.equal(screenAfter.x, screenBefore.x);
assert.equal(screenAfter.y, screenBefore.y);

// Conductor pin moves by (dx, dy) too → same pan keeps it fixed on screen.
const condY0 = prevH - 12; // approx feet margin
const condY1 = nextH - 12;
assert.equal(condY1 - condY0, dy);
const condScreenBefore = vy0 + condY0 * scale;
const condScreenAfter = vy1 + condY1 * scale;
assert.equal(condScreenAfter, condScreenBefore);

console.log("verify-stage-plot-center-resize: ok");
