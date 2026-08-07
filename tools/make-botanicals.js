/* Regenerates assets/typography/vine-wide.svg and vine-narrow.svg.
 *
 * Leaves are sampled directly off the stem path in a real browser, so every
 * leaf sits exactly on the vine and springs off along its tangent — no
 * hand-placed transforms to drift out of sync when the path changes.
 *
 *   npm i playwright   (Chromium only; no browser download needed here)
 *   node tools/make-botanicals.js
 *
 * The generated files are inlined into index.html inside .vine-track. If you
 * regenerate them, paste the new <svg> blocks back in — they need to be inline
 * for the scroll-driven stroke-dashoffset to work.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const ROOT = require('path').resolve(__dirname, '..');

const WIDE = {
  file: 'vine-wide',
  vb: [200, 2400],
  d: 'M100 0C100 140 60 224 46 322C32 420 72 470 116 452C150 438 152 392 120 384C82 374 58 420 66 478C80 580 150 640 160 762C170 884 96 950 60 1052C24 1154 60 1242 120 1230C168 1220 176 1166 140 1150C104 1134 66 1180 72 1252C82 1382 150 1470 150 1602C150 1734 70 1812 56 1932C44 2038 84 2122 120 2202C142 2252 150 2322 146 2400',
  leaves: [
    { at: 0.055, size: 15.5, side: 1, tilt: 34 },
    { at: 0.100, size: 12.0, side: -1, tilt: -30 },
    { at: 0.245, size: 14.0, side: 1, tilt: 30 },
    { at: 0.300, size: 11.0, side: -1, tilt: -34 },
    { at: 0.375, size: 15.0, side: 1, tilt: 32 },
    { at: 0.470, size: 12.5, side: -1, tilt: -28 },
    { at: 0.610, size: 14.5, side: 1, tilt: 30 },
    { at: 0.680, size: 11.5, side: -1, tilt: -32 },
    { at: 0.755, size: 15.0, side: 1, tilt: 34 },
    { at: 0.845, size: 12.0, side: -1, tilt: -30 },
    { at: 0.930, size: 13.5, side: 1, tilt: 30 },
  ],
};

const NARROW = {
  file: 'vine-narrow',
  vb: [80, 2400],
  d: 'M40 0C40 150 16 244 16 352C16 442 56 482 68 422C74 390 46 380 36 410C24 450 34 522 48 602C64 702 20 792 18 912C16 1032 58 1092 66 1202C74 1312 26 1402 24 1522C22 1642 62 1702 66 1822C70 1942 32 2052 34 2182C35 2292 40 2352 44 2400',
  leaves: [
    { at: 0.070, size: 10.5, side: 1, tilt: 32 },
    { at: 0.130, size: 8.5, side: -1, tilt: -30 },
    { at: 0.265, size: 10.0, side: 1, tilt: 30 },
    { at: 0.360, size: 8.0, side: -1, tilt: -32 },
    { at: 0.470, size: 10.5, side: 1, tilt: 32 },
    { at: 0.580, size: 8.5, side: -1, tilt: -30 },
    { at: 0.700, size: 10.0, side: 1, tilt: 32 },
    { at: 0.820, size: 8.5, side: -1, tilt: -30 },
    { at: 0.915, size: 9.5, side: 1, tilt: 30 },
  ],
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<svg id="s" xmlns="http://www.w3.org/2000/svg"><path id="p"/></svg>');

  for (const spec of [WIDE, NARROW]) {
    const pts = await page.evaluate(({ d, leaves }) => {
      const p = document.getElementById('p');
      p.setAttribute('d', d);
      const L = p.getTotalLength();
      return leaves.map(l => {
        const a = p.getPointAtLength(L * l.at);
        const b = p.getPointAtLength(Math.min(L, L * l.at + 1));
        const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
        return { x: +a.x.toFixed(2), y: +a.y.toFixed(2), ang: +ang.toFixed(1), ...l };
      });
    }, { d: spec.d, leaves: spec.leaves });

    const groups = pts.map(l => {
      // leaf points away from the stem, roughly perpendicular to the tangent
      const rot = (l.ang + l.side * 90 - l.side * l.tilt).toFixed(1);
      const h = (l.size * 0.38).toFixed(2);
      const w = l.size.toFixed(2);
      const dd = `M0 0C${(w * 0.22).toFixed(2)} ${-h} ${(w * 0.72).toFixed(2)} ${-h} ${w} 0C${(w * 0.72).toFixed(2)} ${h} ${(w * 0.22).toFixed(2)} ${h} 0 0Z`;
      return `    <g data-at="${l.at}" transform="translate(${l.x} ${l.y}) rotate(${rot})"><path d="${dd}"/></g>`;
    }).join('\n');

    const svg =
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spec.vb[0]} ${spec.vb[1]}" class="vine ${spec.file}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMin meet">
  <path class="vine-stem" d="${spec.d}"/>
  <g class="vine-leaves">
${groups}
  </g>
</svg>`;
    fs.writeFileSync(`${ROOT}/assets/typography/${spec.file}.svg`, svg + '\n');
    console.log('wrote', spec.file, pts.length, 'leaves');
  }
  await browser.close();
})();
