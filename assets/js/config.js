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
    heroVideoMobile: 'assets/video/whitefish-hero-loop-mobile.mp4', // optional portrait crop
    ambientAudio: 'assets/audio/lake-waves-loop.mp3',
    socialPreview: 'assets/img/social-preview.jpg'
  },

  /* ---- Hero calls to action ---------------------------------
     Two actions sit beneath the names. "Add to calendar" builds its
     .ics in the browser and needs nothing here.

     The lodging link points at the venue. Swap `href` for the room-block
     / group-booking URL the moment it exists — the placeholder below is
     the hotel's front door, not a reserved block. Set `href` to '' and
     the button removes itself, leaving the calendar action centred. */
  lodging: {
    label: 'Lodging',
    note: 'Book before October',
    href: 'https://lodgeatwhitefishlake.com/'
  },

  /* ---- Ambient audio --------------------------------------- */
  audio: {
    targetVolume: 0.16,   // deliberately quiet
    fadeInMs: 4000
  },

  /* ---- Photo journey ----------------------------------------
     Two or three images, no more. Any path that fails to load
     renders a designed "photo to come" frame instead of a broken
     image, so it is safe to ship before the photos exist. */
  photos: [
    {
      src: 'assets/photos/couple-01.jpg',
      alt: 'Sarah and Spencer',
      caption: ''
    },
    {
      src: 'assets/photos/couple-02.jpg',
      alt: 'Sarah and Spencer',
      caption: ''
    },
    {
      src: 'assets/photos/whitefish-lake.jpg',
      alt: 'Watercolour of the shoreline and marina at Whitefish Lake',
      caption: ''
    }
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
