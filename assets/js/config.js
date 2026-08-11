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

  /* ---- Feature flags -----------------------------------------
     A flag that is false never renders a broken or empty state —
     it renders the honest, designed alternative instead. Flip one
     only when the fact behind it is actually confirmed. */
  flags: {
    /* The ceremony window in `date` above is a placeholder-shaped
       guess. While this is false the "add to calendar" action makes
       an ALL-DAY event for June 12, which is honest and still does
       the only job that matters — getting the day into the calendar.
       Set the real startLocal/endLocal above, THEN set this true. */
    CEREMONY_TIME_CONFIRMED: false
  },

  /* ---- How a guest reaches us -------------------------------
     Used by the form's failure message and, later, the FAQ. Leave
     it empty and the copy simply drops the sentence rather than
     shipping a dead mailto: — see the failure copy in
     save-the-date.js. TODO: Spencer to decide whether this is a
     personal address or a dedicated wedding one. */
  contact: {
    email: ''
  },

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

  /* ---- Ambient audio --------------------------------------- */
  audio: {
    targetVolume: 0.08,   // half of the already-quiet 0.16 it shipped at
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
     index 0: it is the only one seen at full width.

     Optional `webp`: when set, the mosaic serves it first with `src` as
     the <picture> fallback for a browser or codec that cannot decode it —
     export each photo at 2x its largest rendered size, WebP first, JPEG
     fallback, and aim for ≤180KB apiece. Six full-resolution phone JPEGs
     would blow the page's JS-adjacent asset budget on their own.

     `alt`: five of six are '' on purpose — pure decoration, correctly
     silent to a screen reader. Index 0 is not: it is the one photograph
     seen at full width and it depicts the couple, so its alt text should
     say who and roughly what ("Sarah and Spencer on the dock at
     Whitefish Lake"), not stay generic. Write it once there is a real
     photo in the file — inventing a description of a picture that
     doesn't exist yet would be exactly the fabricated content §3
     warns against. Index 1, the next-most-prominent satellite, is worth
     the same treatment once it exists. */
  mosaic: [
    { src: 'assets/photos/mosaic-centre.jpg', webp: '', alt: 'Sarah and Spencer' },
    { src: 'assets/photos/mosaic-1.jpg', webp: '', alt: '' },
    { src: 'assets/photos/mosaic-2.jpg', webp: '', alt: '' },
    { src: 'assets/photos/mosaic-3.jpg', webp: '', alt: '' },
    { src: 'assets/photos/mosaic-4.jpg', webp: '', alt: '' },
    { src: 'assets/photos/mosaic-5.jpg', webp: '', alt: '' }
  ],

  /* ---- Guest information form -------------------------------
     🔴 THIS IS THE ONE THING THE SITE CANNOT DO WITHOUT.

     Leave FORM_ENDPOINT empty and the form validates fully but
     refuses to claim success — it shows an honest "not connected
     yet" state instead, and every address a guest types goes
     nowhere. Everything else below is already wired; pasting one
     URL here is the entire remaining step.

     To get one (about five minutes):
       1. formspree.io → new form → copy the endpoint. It looks
          like https://formspree.io/f/abcdwxyz
       2. Paste it below.
       3. Submit a real test entry from the live site and confirm
          it lands in the Formspree inbox and in email. Then
          delete the test row.

     A Google Apps Script web app writing to a Sheet works exactly
     the same way — paste its /exec URL instead. Both are happier
     with 'formdata' than with JSON, which is why that is the
     default now. */
  FORM_ENDPOINT: '',
  form: {
    method: 'POST',
    // 'json' posts application/json; 'formdata' posts multipart —
    // Formspree and Google Apps Script are happiest with 'formdata'.
    encoding: 'formdata',

    /* Extra fields sent with every submission. Formspree reads
       _subject (the notification email's subject line) and
       _replyto (so hitting reply answers the guest). Anything in
       here is posted verbatim, so an endpoint that does not know
       these names simply records them as extra columns. */
    extraFields: {
      _subject: 'Save the date — a guest sent their details'
    },

    /* Once someone has sent their details, showing them an empty
       form again on the next visit reads as "that did not work".
       On success we remember it for this many days and show the
       done screen instead, with a quiet way back to the form.
       Set to 0 to turn the behaviour off. */
    rememberSentDays: 400
  }
};
