"use strict";
const test = require("node:test");
const assert = require("node:assert");
const H = require("../src/core.js");

test("nail sits above the centre by half the height minus the wire drop", () => {
  const r = H.nailHeight({ frameHeight: 40, eyeLevel: 145, wireDrop: 5 });
  assert.strictEqual(r.centre, 145);
  assert.strictEqual(r.topOfFrame, 165);      // 145 + 20
  assert.strictEqual(r.bottomOfFrame, 125);   // 145 - 20
  assert.strictEqual(r.nail, 160);            // top 165 - drop 5
});

test("a bigger wire drop lowers the nail", () => {
  const a = H.nailHeight({ frameHeight: 40, eyeLevel: 145, wireDrop: 3 });
  const b = H.nailHeight({ frameHeight: 40, eyeLevel: 145, wireDrop: 9 });
  assert.strictEqual(a.nail - b.nail, 6);
});

test("defaults fill in when options are missing", () => {
  const r = H.nailHeight({ frameHeight: 50 });
  assert.strictEqual(r.centre, 145);
  assert.strictEqual(r.nail, H.round(145 + 25 - 5, 1));
});

test("a row centres with equal margins each side", () => {
  const plan = H.rowPlan({
    wallWidth: 200,
    gap: 10,
    frames: [{ width: 40, height: 30 }, { width: 40, height: 30 }, { width: 40, height: 30 }]
  });
  // 3 x 40 + 2 x 10 gap = 140, so (200 - 140)/2 = 30 each side
  assert.strictEqual(plan.groupWidth, 140);
  assert.strictEqual(plan.sideMargin, 30);
  assert.strictEqual(plan.frames[0].left, 30);
  assert.strictEqual(plan.frames[2].right, 170);
  assert.strictEqual(plan.overflow, false);
});

test("different frame heights share a centre line but get different nail heights", () => {
  const plan = H.rowPlan({
    wallWidth: 300, gap: 10, eyeLevel: 145, wireDrop: 5,
    frames: [{ width: 40, height: 30 }, { width: 40, height: 60 }]
  });
  // both centres at 145; taller frame's nail is higher
  assert.strictEqual(plan.frames[0].nailHeight, 145 + 15 - 5); // 155
  assert.strictEqual(plan.frames[1].nailHeight, 145 + 30 - 5); // 170
  assert.ok(plan.frames[1].nailHeight > plan.frames[0].nailHeight);
});

test("overflow is flagged when frames are wider than the wall", () => {
  const plan = H.rowPlan({
    wallWidth: 100, gap: 10,
    frames: [{ width: 60, height: 40 }, { width: 60, height: 40 }]
  });
  assert.strictEqual(plan.overflow, true);
  assert.ok(plan.sideMargin < 0);
});

test("wide or heavy frames get two hooks a quarter in from each edge", () => {
  const plan = H.rowPlan({
    wallWidth: 300, gap: 10,
    frames: [{ width: 80, height: 50, weight: 4 }, { width: 30, height: 20, weight: 1 }]
  });
  assert.strictEqual(plan.frames[0].twoHooks, true);
  assert.strictEqual(plan.frames[0].hooks.length, 2);
  // quarter and three-quarter of the 80 wide frame from its left edge
  const f = plan.frames[0];
  assert.strictEqual(f.hooks[0], H.round(f.left + 20, 1));
  assert.strictEqual(f.hooks[1], H.round(f.left + 60, 1));
  assert.strictEqual(plan.frames[1].twoHooks, false);
  assert.strictEqual(plan.frames[1].hooks.length, 1);
});

test("a heavy but narrow frame still gets two hooks", () => {
  const plan = H.rowPlan({ wallWidth: 200, gap: 0, frames: [{ width: 30, height: 40, weight: 12 }] });
  assert.strictEqual(plan.frames[0].twoHooks, true);
});

test("empty row returns zero group with no frames", () => {
  const plan = H.rowPlan({ wallWidth: 200, gap: 10, frames: [] });
  assert.strictEqual(plan.frames.length, 0);
  assert.strictEqual(plan.groupWidth, 0);
});

test("zero-size frames are dropped", () => {
  const plan = H.rowPlan({ wallWidth: 200, gap: 10, frames: [{ width: 0, height: 30 }, { width: 40, height: 30 }] });
  assert.strictEqual(plan.frames.length, 1);
});

test("gapToFit spreads the free space between frames", () => {
  // wall 200, 20 margin each side -> 160 free; two 40 frames = 80; 80 free over 1 gap
  const gap = H.gapToFit({ wallWidth: 200, sideMargin: 20, frames: [{ width: 40 }, { width: 40 }] });
  assert.strictEqual(gap, 80);
});

test("gapToFit returns zero when the frames don't fit", () => {
  const gap = H.gapToFit({ wallWidth: 100, sideMargin: 20, frames: [{ width: 40 }, { width: 40 }] });
  assert.strictEqual(gap, 0);
});

test("inches convert to cm and back", () => {
  assert.strictEqual(H.round(H.toCm(57, "in"), 2), 144.78);
  assert.strictEqual(H.round(H.fromCm(2.54, "in"), 2), 1);
  assert.strictEqual(H.toCm(10, "cm"), 10);
});

test("plasterboard fixing gets heavier with weight", () => {
  assert.strictEqual(H.fixing({ weight: 1, wall: "plasterboard" }).level, "ok");
  assert.strictEqual(H.fixing({ weight: 6, wall: "plasterboard" }).level, "watch");
  assert.strictEqual(H.fixing({ weight: 25, wall: "plasterboard" }).level, "heavy");
});

test("masonry and a found stud hold more than bare plasterboard", () => {
  assert.strictEqual(H.fixing({ weight: 15, wall: "masonry" }).level, "ok");
  assert.strictEqual(H.fixing({ weight: 15, wall: "stud" }).level, "ok");
  assert.strictEqual(H.fixing({ weight: 15, wall: "plasterboard" }).level, "watch");
});

test("nailHeight reports a drop from the ceiling when a ceiling height is given", () => {
  // 50 cm frame, default 145 cm eye level, default wire drop.
  const r = H.nailHeight({ frameHeight: 50, ceilingHeight: 240 });
  assert.ok(r.nail > 0);
  assert.ok(Math.abs(r.nailFromCeiling - (240 - r.nail)) < 1e-9);
  assert.ok(Math.abs(r.topFromCeiling - (240 - r.topOfFrame)) < 1e-9);
});

test("no ceiling height leaves the drop-from-ceiling null", () => {
  const r = H.nailHeight({ frameHeight: 50 });
  assert.strictEqual(r.nailFromCeiling, null);
  assert.strictEqual(r.ceilingHeight, null);
  assert.strictEqual(r.topFromCeiling, null);
});

test("a ceiling lower than the nail is ignored rather than going negative", () => {
  const r = H.nailHeight({ frameHeight: 50, ceilingHeight: 100 }); // nail ~165 cm > 100
  assert.strictEqual(r.nailFromCeiling, null);
});

test("rowPlan passes the ceiling drop onto each frame", () => {
  const r = H.rowPlan({ wallWidth: 200, gap: 10, ceilingHeight: 240, frames: [{ width: 40, height: 50 }, { width: 30, height: 40 }] });
  assert.strictEqual(r.frames.length, 2);
  r.frames.forEach((f) => {
    assert.ok(f.nailFromCeiling != null);
    assert.ok(Math.abs(f.nailFromCeiling - (240 - f.nailHeight)) < 1e-9);
  });
});

test("aboveFurniture: nail height builds up from the furniture top", () => {
  // Sofa top 85 cm, 18 cm gap, 50 cm frame, 5 cm wire drop.
  const r = H.aboveFurniture({ furnitureTop: 85, gap: 18, frameHeight: 50, wireDrop: 5 });
  assert.strictEqual(r.bottomOfFrame, 103);   // 85 + 18
  assert.strictEqual(r.topOfFrame, 153);      // + 50
  assert.strictEqual(r.centre, 128);          // bottom + 25
  assert.strictEqual(r.nail, 148);            // top - wire drop
});

test("aboveFurniture: default gap is the ~7 inch rule", () => {
  const r = H.aboveFurniture({ furnitureTop: 90, frameHeight: 40 });
  assert.strictEqual(r.gap, H.FURNITURE_GAP_CM);
});

test("aboveFurniture: reports the art-width band from the furniture width", () => {
  const r = H.aboveFurniture({ furnitureTop: 85, frameHeight: 50, furnitureWidth: 200 });
  assert.ok(Math.abs(r.artWidthMin - 133.3) < 0.2); // two-thirds
  assert.strictEqual(r.artWidthMax, 150);           // three-quarters
});

test("aboveFurniture: tells you how far above standing eye level it sits", () => {
  const low = H.aboveFurniture({ furnitureTop: 50, frameHeight: 40 });
  const high = H.aboveFurniture({ furnitureTop: 100, frameHeight: 40 });
  assert.ok(high.aboveEyeLevel > low.aboveEyeLevel);
});

test("aboveFurniture returns null without the furniture and frame sizes", () => {
  assert.strictEqual(H.aboveFurniture({ furnitureTop: 85 }), null);
  assert.strictEqual(H.aboveFurniture({ frameHeight: 50 }), null);
  assert.strictEqual(H.aboveFurniture({}), null);
});
