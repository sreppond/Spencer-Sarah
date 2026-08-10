/* ============================================================
   Sarah & Spencer — Save the Date
   SINGLE SOURCE OF TRUTH

   Everything you are likely to change lives in this one file.
   Nothing else in the project hard-codes a name, date, place,
   asset path or endpoint. Edit here, reload, done.
   ============================================================ */

window.SAVE_THE_DATE = {

  /* ---- Who, when, where ------------------------------------ */
  couple: 'Sarah & Spencer',
  names: { first: 'Sarah', second: 'Spencer' },

  date: {
    display: 'June 12, 2027',        // as printed on the page
    displayUpper: 'JUNE 12, 2027',   // hero metadata line
    iso: '2027-06-12',
    // Local ceremony window, used for the .ics file.
    // Whitefish, MT is UTC-6 in June (Mountain Daylight Time).
    startLocal: '20270612T163000',
    endLocal: '20270612T233000',
    utcOffset: '-06:00'
  },

  location: {
    display: 'Whitefish, Montana',
    displayLower: 'whitefish, montana',
    venue: 'The Lodge at Whitefish Lake',
    icsLocation: 'The Lodge at Whitefish Lake, 1380 Wisconsin Ave, Whitefish, MT 59937'
  },

  /* ---- What the hero artwork actually says ------------------
     The hero title, divider and date/place block are vector artwork
     traced out of the painted reference — they are not live text and
     cannot re-typeset themselves when the strings above change.
     This block records what the artwork depicts. If it drifts from the
     values above, the page says so in the console on localhost.
     To change it for real: edit the strings above, then re-run
     tools/extract-typography.py and update these to match.
     See assets/typography/README.md. */
  baked: {
    couple: 'Sarah & Spencer',
    date: 'June 12, 2027',
    location: 'Whitefish, Montana'
  },

  /* ---- Canonical URL (used for Open Graph + the .ics UID) --- */
  siteUrl: 'https://sreppond.github.io/Spencer-Sarah/',

  /* ---- Media ------------------------------------------------
     The hero still ships today. Drop the Higgsfield loop in at
     the video paths below and it takes over automatically —
     no markup changes needed. Until then the still is the hero. */
  media: {
    /* The poster is the loop's own first frame, not images/hero-lake.jpg.
       The loop was generated from that painting but is not a pixel-faithful
       animation of it — the clouds are redrawn and the framing sits slightly
       differently — so posting the original made the whole picture visibly
       shift the moment the video faded in. Frame 0 makes that hand-off
       invisible. Re-export it with tools/make-hero-poster.sh if the loop
       is ever replaced. images/hero-lake.jpg remains the social-card source. */
    heroPoster: 'assets/video/whitefish-hero-poster.jpg',
    heroVideo: 'assets/video/whitefish-hero-loop.mp4',
    /* Optional portrait crop, served below 768px. Not cut yet, so it is
       left empty rather than pointed at a file that is not there: the
       hero falls straight through to heroVideo above. Fill this in when
       the crop ships — see assets/video/README.md. */
    heroVideoMobile: '',
    /* Ambient bed. Mastered to -18 LUFS so the 0.16 gain below lands it
       around -34 LUFS in the room. Rebuild it with tools/make-ambient-loop.sh
       rather than dropping a raw clip in — see assets/audio/README.md. */
    ambientAudio: 'assets/audio/whitefish-ambience-loop.mp3',
    socialPreview: 'assets/img/social-preview.jpg'
  },

  /* ---- Lodging ----------------------------------------------
     This is the last screen of the form, not a hero button: it only
     appears once someone has told us who they are, which is the first
     moment the ask makes sense.

     `href` points at lodging.html, the details page on this site. Point
     it straight at a booking URL instead if you would rather skip the
     page. Set `href` to '' and the button is removed rather than
     shipped as a dead link — the deadline line stays. */
  lodging: {
    label: 'Lodging details',
    deadline: 'Book lodging by October',
    blurb: 'Rooms in Whitefish go early in June. Here\'s where to stay and how to book.',
    href: 'lodging.html'
  },

  /* ---- Ambient audio --------------------------------------- */
  audio: {
    targetVolume: 0.16,   // deliberately quiet
    fadeInMs: 4000
  },

  /* ---- The mosaic -------------------------------------------
     Six images. The first is the one that fills the screen and then
     shrinks into a framed card; the other five fly in around it as you
     scroll. Order matters and matches the frames in index.html:

       0  centre   the photograph that opens full-bleed
       1  top-left        2  bottom-left
       3  top-right       4  bottom-right       5  middle-right

     Any path that fails to load renders a designed "photograph to come"
     frame instead of a broken image, so this is safe to ship before the
     photos exist — drop files with these names into assets/photos/ and
     they appear on their own. Put the strongest, widest photograph at
     index 0: it is the only one seen at full width. */
  mosaic: [
    { src: 'assets/photos/mosaic-centre.jpg', alt: 'Sarah and Spencer' },
    { src: 'assets/photos/mosaic-1.jpg', alt: '' },
    { src: 'assets/photos/mosaic-2.jpg', alt: '' },
    { src: 'assets/photos/mosaic-3.jpg', alt: '' },
    { src: 'assets/photos/mosaic-4.jpg', alt: '' },
    { src: 'assets/photos/mosaic-5.jpg', alt: '' }
  ],

  /* ---- Guest information form -------------------------------
     Leave FORM_ENDPOINT empty and the form validates fully but
     refuses to claim success — it shows an honest "not connected
     yet" state instead. Paste a Formspree / Apps Script / Basin
     URL here and it starts posting JSON. Nothing else changes. */
  FORM_ENDPOINT: '',
  form: {
    method: 'POST',
    // 'json' posts application/json; 'formdata' posts multipart —
    // Formspree and Google Apps Script are happiest with 'formdata'.
    encoding: 'json'
  }
};
