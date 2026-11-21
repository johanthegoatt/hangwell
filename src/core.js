// Hangwell core: plan where to put the nails so pictures hang at the right
// height and a row of frames lines up. Give it the frame sizes, the wall width
// and how high you want things, and it works out the nail height off the floor
// for each frame, how to space a row evenly, and what fixing the wall needs for
// the weight. No DOM in here, so the same file runs in the page and under
// `node --test`.
//
// The height rule is the one galleries and museums use: hang art so the middle
// of the picture sits at eye level, about 57 inches (145 cm) off the floor.
// People get the nail height wrong because the nail is not at the middle of the
// frame: the wire or the hook sits a little below the top edge and lifts the
// frame, so the nail goes above the middle by (half the frame height minus the
// drop of the wire). Hangwell does that sum for you.
//
// For a row, the trap is lining frames up by their tops or bottoms when they
// are different sizes, which looks crooked. The gallery way is to line up the
// middles (the centre line), so every frame's middle sits on the same eye-level
// line and the nails land at different heights. Hangwell spaces the row across
// the wall with equal gaps and equal margins at the ends, and warns if the
// frames are wider than the wall.
//
// The 57 in / 145 cm centre-line height follows common museum hanging practice;
// the fixing weight bands follow the usual trade guidance for plasterboard and
// masonry (a hardened picture hook or pin into plasterboard for light frames, a
// plasterboard toggle/expanding fixing for medium, a stud or heavy toggle for
// heavy; a plug and screw into brick or block for much more). Weights are a
// guide: check the fixing pack's own rating.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Hangwell = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var CM_PER_IN = 2.54;
  var EYE_LEVEL_CM = 145;   // ~57 in, centre of the picture at eye level
  var WIRE_DROP_CM = 5;     // how far the taut wire/hook sits below the frame top
  var TWO_HOOK_WIDTH_CM = 60; // frames this wide or wider hang straighter on two hooks

  function round(n, dp) {
    var f = Math.pow(10, dp || 0);
    return Math.round(n * f) / f;
  }

  function toCm(value, unit) {
    return unit === "in" ? value * CM_PER_IN : value;
  }
  function fromCm(valueCm, unit) {
    return unit === "in" ? valueCm / CM_PER_IN : valueCm;
  }

  // Height of the nail off the floor for one frame hung centre-at-eye-level.
  // The frame's middle sits at the eye level; the top of the frame is half a
  // height above that; the nail sits a wire-drop below the top. So the nail is
  // above the middle by (frameHeight/2 - wireDrop), which can be below the
  // middle for a short frame on a long wire (that is fine, the sum still holds).
  function nailHeight(opts) {
    opts = opts || {};
    var frameHeight = Math.max(0, Number(opts.frameHeight) || 0);
    var eyeLevel = Number(opts.eyeLevel);
    if (!isFinite(eyeLevel)) eyeLevel = EYE_LEVEL_CM;
    var wireDrop = Number(opts.wireDrop);
    if (!isFinite(wireDrop) || wireDrop < 0) wireDrop = WIRE_DROP_CM;

    var topOfFrame = eyeLevel + frameHeight / 2;
    var nail = topOfFrame - wireDrop;

    // Most people hold the tape at the ceiling (or a picture rail) and measure
    // down, not up from a skirting board that may not be level, so when a
    // ceiling height is given, report the nail as a drop from it too. That's the
    // ceiling height minus the nail height off the floor.
    var ceiling = Number(opts.ceilingHeight);
    var nailFromCeiling = null, topFromCeiling = null;
    if (isFinite(ceiling) && ceiling > nail) {
      nailFromCeiling = round(ceiling - nail, 1);
      topFromCeiling = round(ceiling - topOfFrame, 1);
    }

    return {
      centre: round(eyeLevel, 1),
      topOfFrame: round(topOfFrame, 1),
      bottomOfFrame: round(eyeLevel - frameHeight / 2, 1),
      nail: round(nail, 1),
      wireDrop: wireDrop,
      ceilingHeight: isFinite(ceiling) && ceiling > 0 ? round(ceiling, 1) : null,
      nailFromCeiling: nailFromCeiling,
      topFromCeiling: topFromCeiling
    };
  }

  // Spread a row of frames across a wall with equal gaps between them and equal
  // margins at each end. Frames keep their own widths; the gap is what you set.
  // Returns each frame's left edge, its centre across the wall, and the nail
  // position (x across the wall, height off the floor). All in cm.
  function rowPlan(opts) {
    opts = opts || {};
    var wallWidth = Math.max(0, Number(opts.wallWidth) || 0);
    var gap = Math.max(0, Number(opts.gap) || 0);
    var eyeLevel = isFinite(Number(opts.eyeLevel)) ? Number(opts.eyeLevel) : EYE_LEVEL_CM;
    var wireDrop = isFinite(Number(opts.wireDrop)) ? Number(opts.wireDrop) : WIRE_DROP_CM;
    var ceilingHeight = Number(opts.ceilingHeight);

    var frames = (opts.frames || []).map(function (f) {
      return {
        width: Math.max(0, Number(f.width) || 0),
        height: Math.max(0, Number(f.height) || 0),
        weight: Math.max(0, Number(f.weight) || 0)
      };
    }).filter(function (f) { return f.width > 0 && f.height > 0; });

    var n = frames.length;
    if (n === 0) {
      return { frames: [], groupWidth: 0, startX: 0, sideMargin: 0, gap: gap, overflow: false, wallWidth: wallWidth };
    }

    var framesWidth = frames.reduce(function (s, f) { return s + f.width; }, 0);
    var groupWidth = framesWidth + gap * (n - 1);
    var overflow = wallWidth > 0 && groupWidth > wallWidth + 0.001;
    // Centre the group: equal margin each side. If it overflows, the margin is
    // negative, which the caller surfaces as a warning rather than hiding it.
    var sideMargin = wallWidth > 0 ? (wallWidth - groupWidth) / 2 : 0;

    var x = sideMargin;
    var placed = frames.map(function (f) {
      var left = x;
      var centreX = left + f.width / 2;
      var nh = nailHeight({ frameHeight: f.height, eyeLevel: eyeLevel, wireDrop: wireDrop, ceilingHeight: ceilingHeight });
      var twoHooks = f.width >= TWO_HOOK_WIDTH_CM || f.weight >= 10;
      var hooks = twoHooks
        // Two hooks sit a quarter of the width in from each edge, so the frame
        // can't tip and is easy to level.
        ? [round(left + f.width * 0.25, 1), round(left + f.width * 0.75, 1)]
        : [round(centreX, 1)];
      x += f.width + gap;
      return {
        width: f.width,
        height: f.height,
        weight: f.weight,
        left: round(left, 1),
        right: round(left + f.width, 1),
        centreX: round(centreX, 1),
        nailHeight: nh.nail,
        nailFromCeiling: nh.nailFromCeiling,
        topOfFrame: nh.topOfFrame,
        bottomOfFrame: nh.bottomOfFrame,
        hooks: hooks,
        twoHooks: twoHooks
      };
    });

    return {
      frames: placed,
      groupWidth: round(groupWidth, 1),
      framesWidth: round(framesWidth, 1),
      startX: round(sideMargin, 1),
      sideMargin: round(sideMargin, 1),
      gap: round(gap, 1),
      overflow: overflow,
      wallWidth: wallWidth,
      eyeLevel: round(eyeLevel, 1)
    };
  }

  // The gap that spreads the frames evenly with a chosen margin at each end,
  // for when you'd rather pick the end margin than the gap. Returns 0 (butted
  // up) if they don't fit with that margin.
  function gapToFit(opts) {
    opts = opts || {};
    var wallWidth = Math.max(0, Number(opts.wallWidth) || 0);
    var sideMargin = Math.max(0, Number(opts.sideMargin) || 0);
    var frames = (opts.frames || []).filter(function (f) { return Number(f.width) > 0; });
    var n = frames.length;
    if (n < 2) return 0;
    var framesWidth = frames.reduce(function (s, f) { return s + (Number(f.width) || 0); }, 0);
    var free = wallWidth - 2 * sideMargin - framesWidth;
    if (free <= 0) return 0;
    return round(free / (n - 1), 1);
  }

  // What fixing the wall needs for a frame of this weight. Bands are the usual
  // trade guidance; the real number is on the fixing pack.
  function fixing(opts) {
    opts = opts || {};
    var weight = Math.max(0, Number(opts.weight) || 0);
    var wall = opts.wall === "masonry" ? "masonry" : opts.wall === "stud" ? "stud" : "plasterboard";

    if (wall === "masonry") {
      if (weight <= 20) return band("A wall plug and screw", "Brick or block holds plenty. Drill, push in a plug and drive a screw.", "ok");
      return band("A heavier plug and screw", "Use a bigger plug and screw rated for the weight; spread two fixings on a wide frame.", "ok");
    }
    if (wall === "stud") {
      if (weight <= 20) return band("A screw into the stud", "You've found the timber behind the board, so a screw straight into it holds well.", "ok");
      return band("Two screws into the stud", "Heavy frame: use two screws into the stud and D-rings on the frame.", "ok");
    }
    // Plasterboard / drywall with no stud behind.
    if (weight <= 2) return band("A hardened picture hook or pin", "A light frame hangs on a hardened picture hook or a brass pin into the board.", "ok");
    if (weight <= 10) return band("A plasterboard fixing", "Use a self-drive or metal-toggle plasterboard fixing rated for the weight, not a bare nail.", "watch");
    if (weight <= 20) return band("A metal toggle, or find a stud", "Getting heavy for board alone. Use a spring/metal toggle rated for it, or fix into a stud.", "watch");
    return band("Find a stud or use heavy toggles", "Too heavy to trust to plasterboard. Screw into a stud, or use two heavy toggle fixings.", "heavy");
  }
  function band(fitting, detail, level) {
    return { fitting: fitting, detail: detail, level: level };
  }

  return {
    CM_PER_IN: CM_PER_IN,
    EYE_LEVEL_CM: EYE_LEVEL_CM,
    WIRE_DROP_CM: WIRE_DROP_CM,
    TWO_HOOK_WIDTH_CM: TWO_HOOK_WIDTH_CM,
    round: round,
    toCm: toCm,
    fromCm: fromCm,
    nailHeight: nailHeight,
    rowPlan: rowPlan,
    gapToFit: gapToFit,
    fixing: fixing
  };
});
