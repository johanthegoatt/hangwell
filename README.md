# Hangwell

Put in your frame sizes and the wall, and Hangwell tells you the exact nail
height off the floor, spaces a row of frames evenly, and says what fixing the
wall needs. It draws the wall to scale with every nail marked.

Runs entirely in your browser. Nothing is uploaded, and there is nothing to
sign in to.

## How it works it out

- **Nail height** — galleries hang art so the *middle* of the picture sits at
  eye level, about 145 cm (57 inches) off the floor, whatever the size. The
  nail isn't level with the middle, though: the wire or hook sits a little below
  the top of the frame and lifts it, so the nail goes above the middle by half
  the frame height minus the wire drop. Hangwell does that sum, so you mark the
  nail straight off the floor.
- **A row of frames** — the trap is lining frames up by their tops or bottoms
  when they're different sizes, which looks crooked. Hangwell lines them up by
  their *middles* (so the nails land at different heights) and spreads the row
  across the wall with equal gaps and equal space at the ends. If the frames are
  wider than the wall, it says so instead of running them off the edge.
- **Two hooks** — a wide or heavy frame (60 cm+ or 10 kg+) hangs straighter on
  two hooks a quarter of the way in from each edge, so it can't tip and is easy
  to level. Hangwell marks both.
- **Fixings** — what holds the frame depends on the wall. A light frame hangs on
  a hardened picture hook, but plasterboard needs a proper toggle for anything
  heavier, and a stud or brick holds far more. Hangwell gives the band for the
  weight and wall type you pick.

## Where the numbers come from

The 57-inch (≈145 cm) centre-line height is common museum and gallery hanging
practice. The fixing weight bands follow the usual trade guidance: a hardened
picture hook or pin into plasterboard for light frames, a self-drive or
metal-toggle plasterboard fixing for medium, a stud or heavy toggle for heavy,
and a plug and screw into brick or block for much more. Weights are a guide —
always check the rating printed on the fixing pack.

Hangwell is a guide for hanging pictures, not a structural calculation. For
something very heavy — a large mirror or a TV — use fixings rated for the weight
and find the studs or use the right masonry anchors.

## Running it

Open `index.html` in a browser. No build step.

```
npm test
```

runs the engine tests (`node --test`, no dependencies). All the maths lives in
`src/core.js` with no DOM, so it runs the same in the page and under test.

## Files

- `src/core.js` — the engine: nail height, row spacing, two-hook placement and
  fixing bands. No DOM.
- `src/app.js` — reads the inputs, draws the scale wall drawing, lists the plan.
- `src/tack.js` — Tack, the thumbtack mascot who gives a tip when tapped.
- `test/core.test.js` — engine tests.

## Licence

MIT
