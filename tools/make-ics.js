#!/usr/bin/env node
/* ==========================================================================
   Regenerate assets/sarah-and-spencer.ics from assets/js/config.js.

     node tools/make-ics.js

   Why a file at all, when assets/js/calendar.js can build one in the
   browser: a guest with JavaScript off still needs the date. The committed
   .ics is the href every "add to calendar" link ships with, and the script
   swaps in a freshly generated data: URL on top of it at runtime.

   That means the file can drift from config.js — same failure mode as the
   traced hero lettering, and it gets the same treatment. calendar.js warns
   on localhost when the two disagree; this is how you fix it.

   Run it whenever you change config.date, config.location.icsLocation,
   config.siteUrl, or flip config.flags.CEREMONY_TIME_CONFIRMED. It prints
   the matching Google Calendar template URL too — paste that into the
   static href on the "Google Calendar" links.

   No dependencies. It runs the real calendar.js rather than reimplementing
   it, so there is exactly one ICS generator on this project.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

/* The smallest browser calendar.js will accept: somewhere to hang the
   config, a hostname that is not localhost (so the drift check stays
   quiet), and a document with nothing in it to wire. */
const sandbox = {
  window: {},
  document: { querySelectorAll: () => [] },
  location: { hostname: 'build' },
  URL,
  console
};
vm.createContext(sandbox);

vm.runInContext(read('assets/js/config.js'), sandbox);
vm.runInContext(read('assets/js/calendar.js'), sandbox);

const calendar = sandbox.window.WEDDING_CALENDAR;
const body = calendar.ics();

if (!body) {
  console.error('config.date.iso is missing — nothing to generate.');
  process.exit(1);
}

const out = path.join(root, 'assets', calendar.filename);
fs.writeFileSync(out, body);

const allDay = !(sandbox.window.SAVE_THE_DATE.flags || {}).CEREMONY_TIME_CONFIRMED;

console.log('wrote assets/' + calendar.filename +
  (allDay ? '  (all-day — flags.CEREMONY_TIME_CONFIRMED is false)' : '  (timed)'));
console.log('\nGoogle Calendar URL for the static hrefs:\n' + calendar.googleUrl() + '\n');
