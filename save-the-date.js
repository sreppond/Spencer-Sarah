// Spencer & Sarah — Digital Save the Date
// Envelope tap opens the flap + slides the card out, then crossfades
// into the full-screen hero reveal (same hero image as the main site).

(function () {
  const params = new URLSearchParams(window.location.search);
  const to = params.get('to');

  const greeting = document.getElementById('envelope-greeting');
  if (to && greeting) {
    greeting.textContent = 'For ' + to;
  }

  const envelope = document.getElementById('envelope');
  const envelopeScreen = document.getElementById('envelope-screen');
  const heroScreen = document.getElementById('hero-screen');

  let opened = false;

  function openEnvelope() {
    if (opened) return;
    opened = true;

    envelope.classList.add('is-open');
    envelope.setAttribute('aria-disabled', 'true');

    // Let the seal-break / flap-open / card-out sequence play (~1.5s),
    // then crossfade the whole scene into the hero reveal.
    window.setTimeout(function () {
      heroScreen.classList.add('active');
      requestAnimationFrame(function () {
        heroScreen.classList.add('revealed');
      });
      window.setTimeout(function () {
        envelopeScreen.classList.add('is-hidden');
      }, 250);
    }, 1500);
  }

  envelope.addEventListener('click', openEnvelope);
  envelope.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openEnvelope();
    }
  });

  // Add to Calendar — generates a .ics on the fly, no backend needed.
  const calBtn = document.getElementById('add-to-calendar');
  if (calBtn) {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Spencer & Sarah//Save the Date//EN',
      'BEGIN:VEVENT',
      'UID:spencer-sarah-wedding-2027@savethedate',
      'DTSTAMP:20260730T000000Z',
      'DTSTART:20270618T223000Z',
      'DTEND:20270619T053000Z',
      'SUMMARY:Spencer & Sarah\'s Wedding',
      'DESCRIPTION:Save the date \\u2014 formal invitation with full details to follow.',
      'LOCATION:The Lodge at Whitefish Lake\\, 1380 Wisconsin Ave\\, Whitefish\\, MT 59937',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar' });
    calBtn.href = URL.createObjectURL(blob);
    calBtn.setAttribute('download', 'spencer-and-sarah-save-the-date.ics');
  }
})();
