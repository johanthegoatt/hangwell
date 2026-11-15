// Tack, the thumbtack in the corner. Tack gives a tip when tapped and changes
// face to match the job: happy when the plan is ready, thinking when there's
// something to watch (a heavy frame, two hooks needed), a little worried when
// the frames are wider than the wall. The app tells Tack the mood; Tack never
// changes it on a timer of its own. Everything Tack says goes through the
// bubble's live region so a screen reader hears it, and Tack holds still if
// you've asked for reduced motion.
(function () {
  "use strict";
  var btn = document.getElementById("tack");
  var bubble = document.getElementById("tack-bubble");
  if (!btn) { window.Tack = { react: function () {}, context: function () {}, say: function () {} }; return; }

  var still = matchMedia("(prefers-reduced-motion: reduce)");
  var tipKey = "start";
  var bubbleTimer = null, taps = [];

  var TIPS = {
    start: [
      "Hi, I'm Tack. Pop in your frame sizes and the wall width and I'll tell you exactly where the nails go.",
      "The gallery trick: hang art so the middle of the picture is at eye level, about 145 cm off the floor. I do that sum for you.",
      "The nail isn't level with the middle of the frame. The wire lifts it, so the nail goes a bit higher. I've worked that in."
    ],
    ready: [
      "That's your plan. Mark each nail height from the floor and the across-the-wall spot, then check it's level before you hang.",
      "Hold the frame up first and stand back. The numbers get you close; your eye does the last bit.",
      "Measure twice, drill once. A strip of masking tape on the wall takes a pencil mark without marking the paint."
    ],
    row: [
      "A row looks best lined up by the middles, not the tops. I've set every frame's middle on the same eye-level line.",
      "Equal gaps and equal space at the ends is what makes a row look deliberate. I've centred the group for you."
    ],
    twohooks: [
      "A wide or heavy frame hangs straighter on two hooks. I've put them a quarter of the way in from each edge.",
      "Two hooks stop a big frame tipping and make it far easier to get level."
    ],
    heavy: [
      "That's a heavy one. On plasterboard, a bare nail won't hold it. Use a proper toggle fixing, or find the stud behind.",
      "For the heavy frames, a stud or a rated toggle is the difference between a picture and a hole in the wall."
    ],
    overflow: [
      "The frames are wider than the wall as set. Make the gap smaller, drop a frame, or measure the wall again.",
      "No room for that row. Trim the gap or the number of frames and I'll re-space it."
    ]
  };

  function pick(key) {
    var list = TIPS[key] || TIPS.start;
    return list[Math.floor(Math.random() * list.length)];
  }

  var FACES = {
    happy: "M 24 41 Q 32 47 40 41",
    think: "M 24 43 Q 32 40 40 43",
    worry: "M 24 44 Q 32 39 40 44"
  };

  function setMood(m) {
    var mouth = document.getElementById("tack-mouth");
    if (mouth) mouth.setAttribute("d", FACES[m] || FACES.happy);
    btn.classList.toggle("is-worry", m === "worry");
  }

  function say(text) {
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add("show");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.classList.remove("show"); }, 7000);
  }

  // The app calls this with the latest plan so Tack's face and tip match what's
  // on screen.
  function context(info) {
    if (!info || !info.count) { tipKey = "start"; setMood("happy"); return; }
    if (info.overflow) { tipKey = "overflow"; setMood("worry"); return; }
    if (info.anyHeavy) { tipKey = "heavy"; setMood("worry"); return; }
    if (info.anyTwoHooks) { tipKey = "twohooks"; setMood("think"); return; }
    if (info.count > 1) { tipKey = "row"; setMood("happy"); return; }
    tipKey = "ready";
    setMood("happy");
  }

  function react() {
    say(pick(tipKey));
    taps.push(Date.now());
    taps = taps.filter(function (t) { return Date.now() - t < 1500; });
    if (taps.length >= 5 && !still.matches) {
      btn.classList.add("spin");
      setTimeout(function () { btn.classList.remove("spin"); }, 700);
      taps = [];
    }
  }

  btn.addEventListener("click", react);
  btn.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); react(); }
  });

  setMood("happy");
  window.Tack = { react: react, context: context, say: say };
})();
