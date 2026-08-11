/* ==========================================================================
   Sarah & Spencer — Add to calendar

   A save-the-date has exactly two jobs: get the date into the guest's
   calendar, and get the guest's address into ours. This file is the first
   one.

   It is deliberately standalone. It reads window.SAVE_THE_DATE, wires every
   [data-calendar] element it can find, and depends on nothing else — so the
   travel page gets the same button by adding one <script> tag and pasting
   the markup. There is one ICS generator on this site and this is it.

   No library. A VEVENT is fifteen lines, and the only genuinely fiddly
   parts — escaping, 75-octet line folding, and the local-time-to-UTC
   conversion — are about twenty more.

   ── The all-day question ────────────────────────────────────────────────
   config.date carries a ceremony window (16:30–23:30 local), but that
   window is a guess, and a guest who blocks out the wrong six hours of
   their Saturday because we guessed is worse off than one who blocks out
   the day. So the event is ALL-DAY until config.flags.CEREMONY_TIME_CONFIRMED
   says otherwise. All-day is honest and still does the whole job.
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.SAVE_THE_DATE || {};

  var FILENAME = 'sarah-and-spencer.ics';


  /* ---- RFC 5545 plumbing --------------------------------------------- */

  /* Backslash, semicolon, comma and newline are structural in a property
     value. An unescaped comma in a street address silently splits the
     LOCATION into two values, which is the classic way a hand-rolled ICS
     opens with the venue missing. */
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  /* UTF-8 length of one character, without TextEncoder — this runs a few
     hundred times per file and has to work in whatever a guest is holding. */
  function bytes(ch) {
    var code = ch.charCodeAt(0);
    if (code < 0x80) return 1;
    if (code < 0x800) return 2;
    if (code >= 0xd800 && code < 0xdc00) return 4;   /* lead surrogate */
    return 3;
  }

  /* Content lines are capped at 75 octets; longer ones continue on the next
     line, indented by one space. Outlook is the strict reader here — it will
     drop a long DESCRIPTION outright rather than wrap it for you. */
  function fold(line) {
    var out = '';
    var len = 0;
    for (var i = 0; i < line.length; i++) {
      var b = bytes(line[i]);
      if (len + b > 73) { out += '\r\n '; len = 1; }
      out += line[i];
      len += b;
    }
    return out;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function utcStamp(d) {
    return d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) + 'Z';
  }

  /* '20270612T163000' + '-06:00' → the same instant as a UTC Date.
     Everything downstream is written in Z time rather than with a TZID and a
     VTIMEZONE block. A VTIMEZONE has to spell out the US DST rules to be
     correct, every reader already agrees on what Z means, and getting Z
     wrong is impossible in a way that getting a hand-written VTIMEZONE wrong
     is not. X-WR-TIMEZONE below still tells a calendar which zone to *show*
     it in. */
  function localToUtc(local, offset) {
    var m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(local || '');
    if (!m) return null;

    var o = /^([+-])(\d{2}):?(\d{2})$/.exec(offset || '+00:00');
    var minutes = o
      ? (o[1] === '-' ? -1 : 1) * (parseInt(o[2], 10) * 60 + parseInt(o[3], 10))
      : 0;

    return new Date(
      Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - minutes * 60000
    );
  }

  /* '2027-06-12' → '20270612', and one day later for an all-day DTEND,
     which is exclusive. Built by hand rather than through Date so a
     browser in Auckland cannot roll the date over on us. */
  function isoCompact(iso) { return String(iso || '').replace(/-/g, ''); }

  function isoPlusOneDay(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return '';
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + 1));
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
  }


  /* ---- the event ------------------------------------------------------ */

  /* One description of the event, in whichever shape the flag allows, used
     by both the .ics file and the Google template URL so the two can never
     disagree about what day it is. */
  function event() {
    var date = CFG.date || {};
    var place = CFG.location || {};
    var flags = CFG.flags || {};

    var timed = !!flags.CEREMONY_TIME_CONFIRMED;
    var start = timed ? localToUtc(date.startLocal, date.utcOffset) : null;
    var end = timed ? localToUtc(date.endLocal, date.utcOffset) : null;

    // The flag claims a confirmed window; if the strings behind it do not
    // parse, fall back to all-day rather than emitting an invalid event.
    if (timed && (!start || !end)) timed = false;

    return {
      timed: timed,
      start: start,
      end: end,
      allDayStart: isoCompact(date.iso),
      allDayEnd: isoPlusOneDay(date.iso),
      summary: (CFG.couple || 'Sarah & Spencer') + '’s Wedding',
      location: place.icsLocation || place.venue || place.display || '',
      url: CFG.siteUrl || '',
      valid: !!date.iso
    };
  }

  function uid() {
    var host = 'sreppond.github.io';
    try { host = new URL(CFG.siteUrl).hostname || host; } catch (e) {}
    return 'wedding-' + isoCompact((CFG.date || {}).iso) + '@' + host;
  }


  /* ---- the file ------------------------------------------------------- */

  function ics() {
    var e = event();
    if (!e.valid) return '';

    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Sarah & Spencer//Save the Date//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-TIMEZONE:America/Denver',
      'BEGIN:VEVENT',
      'UID:' + esc(uid()),
      'DTSTAMP:' + utcStamp(new Date()),
      'SUMMARY:' + esc(e.summary)
    ];

    if (e.timed) {
      lines.push('DTSTART:' + utcStamp(e.start));
      lines.push('DTEND:' + utcStamp(e.end));
    } else {
      lines.push('DTSTART;VALUE=DATE:' + e.allDayStart);
      lines.push('DTEND;VALUE=DATE:' + e.allDayEnd);
      // An all-day placeholder should not make the guest look busy to
      // anyone checking their availability that Saturday.
      lines.push('TRANSP:TRANSPARENT');
    }

    if (e.location) lines.push('LOCATION:' + esc(e.location));
    if (e.url) {
      lines.push('DESCRIPTION:' + esc(
        (e.timed ? '' : 'Timings to follow. ') + 'Details: ' + e.url
      ));
      lines.push('URL:' + esc(e.url));
    }

    lines.push('END:VEVENT', 'END:VCALENDAR');

    return lines.map(fold).join('\r\n') + '\r\n';
  }

  /* A data: URL rather than a blob:. It is a real href — long-press, open in
     a new tab and copy-link all behave — it needs no revoking, and iOS hands
     text/calendar straight to the Calendar app instead of parking it in
     Files the way it does with a blob. The file is well under a kilobyte. */
  function href() {
    var body = ics();
    return body ? 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body) : '';
  }

  function googleUrl() {
    var e = event();
    if (!e.valid) return '';

    var dates = e.timed
      ? utcStamp(e.start) + '/' + utcStamp(e.end)
      : e.allDayStart + '/' + e.allDayEnd;

    var params = [
      'action=TEMPLATE',
      'text=' + encodeURIComponent(e.summary),
      'dates=' + dates,
      'ctz=America/Denver'
    ];
    if (e.location) params.push('location=' + encodeURIComponent(e.location));
    if (e.url) params.push('details=' + encodeURIComponent('Details: ' + e.url));

    return 'https://calendar.google.com/calendar/render?' + params.join('&');
  }


  /* ---- wiring --------------------------------------------------------- */

  /* Both links ship with a working static href in the markup — a committed
     .ics file and a written-out Google URL — so a guest with no JavaScript
     still gets the date. This overwrites them from config, which is the same
     bargain the rest of the page makes: the HTML is the crawler-and-no-JS
     mirror, config wins at runtime, and drift is loud on localhost.        */
  function wire(root) {
    var scope = root || document;
    var file = href();
    var google = googleUrl();

    Array.prototype.forEach.call(scope.querySelectorAll('[data-calendar]'), function (el) {
      var kind = el.getAttribute('data-calendar');

      if (kind === 'ics') {
        if (!file) { el.remove(); return; }      // never ship a dead action
        warnIfStale(el, 'the committed .ics file');
        el.href = file;
        el.setAttribute('download', FILENAME);
        return;
      }

      if (kind === 'google') {
        if (!google) { el.remove(); return; }
        if (el.getAttribute('href') !== google) warnIfStale(el, 'the Google template URL');
        el.href = google;
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
      }
    });
  }

  /* The .ics on disk cannot re-read config.js, exactly like the traced hero
     lettering cannot re-typeset itself. Same guard, same place: a console
     warning on localhost, never in front of a guest. */
  function warnIfStale(el, what) {
    if (!/localhost|127\.0\.0\.1/.test(location.hostname)) return;
    if (el.getAttribute('data-calendar') !== 'ics') {
      console.warn('[calendar] ' + what + ' in the markup no longer matches config.js. ' +
        'Update the href so a guest without JavaScript gets the right date.');
      return;
    }
    var src = el.getAttribute('href');
    if (!src || /^data:/.test(src)) return;
    fetch(src).then(function (r) { return r.ok ? r.text() : null; }).then(function (text) {
      if (text == null) return;
      // DTSTAMP is the moment the file was written and always differs.
      var strip = function (s) { return s.replace(/^DTSTAMP:.*$/m, '').replace(/\s+/g, ''); };
      if (strip(text) !== strip(ics())) {
        console.warn('[calendar] ' + src + ' no longer matches config.js. ' +
          'Regenerate it with tools/make-ics.js — guests without JavaScript get the file, not the generated one.');
      }
    }).catch(function () {});
  }


  window.WEDDING_CALENDAR = {
    ics: ics,
    href: href,
    googleUrl: googleUrl,
    filename: FILENAME,
    wire: wire
  };

  wire(document);
}());
