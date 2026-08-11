/* ============================================================
   Sarah & Spencer — Travel & Stay
   SINGLE SOURCE OF TRUTH for the travel page.

   Change anything below and push — that's it, no build step. Do not
   change the field names on the left of the colons; travel.js reads them
   by name. Every "TODO" string below is a real gap, not filler text: the
   page renders it as an honest "details coming" placeholder rather than
   inventing a price, phone number, drive time or opening date.

   Facts that ARE filled in here were checked in August 2026 — see the
   `lastVerified` fields, and re-check anything with one before June 2027.
   ============================================================ */

window.TRAVEL = {

  /* ---- Flags -------------------------------------------------
     A false flag never produces a broken or empty section — it produces
     the honest "details coming" state instead. Only flip one once the
     fact behind it is actually confirmed; see the comment on each. */
  flags: {
    /* Grouse Mountain Lodge is mid-renovation into "Hotel Whitefish"
       through a phased reopening that runs into summer 2027 — directly
       overlapping June 12, 2027. Call the property before this becomes
       true: is the block honored under the rebrand, which wing, will the
       restaurant/lobby be open, is there active construction. Until then
       the card shows normally with no code and a line naming the
       rebrand, and it does not get the gold room-block treatment. */
    ROOM_BLOCK_CONFIRMED: false,

    /* No wedding-day shuttle plan exists yet. While false, "Getting Here"
       recommends renting a car without qualification. If a shuttle is
       arranged, that recommendation needs to change (and gets a callout
       of its own) before this flips. */
    SHUTTLE_CONFIRMED: false,

    /* Friday welcome party time and venue are not set. While false, the
       Weekend section shows Friday as "arrive — details coming" rather
       than a specific time nobody has confirmed. */
    WELCOME_PARTY_SET: false,

    /* config.js's ceremony window (16:30-23:30 local) is a placeholder-
       shaped guess. Shared with the save-the-date's calendar action —
       see assets/js/config.js flags.CEREMONY_TIME_CONFIRMED, which is
       the actual flag calendar.js reads. Mirrored here only so anything
       on this page that wants to know is reading one flag, not two. */
    get CEREMONY_TIME_SET() {
      return !!((window.SAVE_THE_DATE || {}).flags || {}).CEREMONY_TIME_CONFIRMED;
    }
  },


  /* ---- Lodging -------------------------------------------------
     Six options. `driveMinutes` and `coords` are UNVERIFIED placeholders
     — see lastVerified below — do not treat them as real until checked
     against Maps and that date is updated. Order here is the order cards
     render in; reordering this array (e.g. if the room block turns out
     to be a bad recommendation) is the entire fix — no template change. */
  lodging: [
    {
      id: 'lodge-at-whitefish-lake',
      name: 'The Lodge at Whitefish Lake',
      tagline: 'Staying where the wedding is',
      address: '1380 Wisconsin Ave, Whitefish, MT 59937',
      driveMinutes: 0,
      priceTier: '$$$$',
      bestFor: 'Staying where the wedding is',
      amenities: ['On-site', 'Lakefront'],
      blurb: 'TODO — Spencer to write 2-3 sentences in his own voice.',
      bookingUrl: '',
      phone: '',
      coords: [48.4231, -114.3536],
      tags: ['walk-to-ceremony', 'downtown'],
      photo: 'assets/photos/lodging/lodge.jpg',
      isRoomBlock: false
    },
    {
      id: 'viking-creek-homes',
      name: 'Viking Creek Homes',
      tagline: '',
      address: '',
      driveMinutes: null,
      priceTier: '$$$',
      bestFor: 'Groups wanting a house to themselves',
      amenities: [],
      blurb: 'TODO',
      bookingUrl: '',
      phone: '',
      coords: null,
      tags: ['best-for-groups'],
      photo: 'assets/photos/lodging/viking-creek.jpg',
      isRoomBlock: false
    },
    {
      id: 'hidden-moose-lodge',
      name: 'Hidden Moose Lodge',
      tagline: '',
      address: '',
      driveMinutes: null,
      priceTier: '$$$',
      bestFor: 'A quiet, small-inn stay',
      amenities: [],
      blurb: 'TODO',
      bookingUrl: '',
      phone: '',
      coords: null,
      tags: ['downtown'],
      photo: 'assets/photos/lodging/hidden-moose.jpg',
      isRoomBlock: false
    },
    {
      /* See flags.ROOM_BLOCK_CONFIRMED above and §C.3: Pursuit is rebranding
         this property to "Hotel Whitefish" through a phased renovation
         that runs directly through the wedding weekend. Name the rebrand
         in the copy regardless of outcome — a guest who books here will
         see "Hotel Whitefish" on their confirmation for a property the
         invitation called "Grouse Mountain Lodge," and that confusion is
         guaranteed unless this page names it once. */
      id: 'grouse-mountain-lodge',
      name: 'Grouse Mountain Lodge',
      tagline: 'Rebranding to Hotel Whitefish — call before booking',
      address: '2 Fairway Dr, Whitefish, MT 59937',
      driveMinutes: null,
      priceTier: '$$$',
      bestFor: 'Our room block — once confirmed',
      amenities: ['Pool', 'On-site dining (renovation-dependent)'],
      blurb: 'Grouse Mountain Lodge is mid-renovation and relaunching as ' +
        '"Hotel Whitefish" in phases through summer 2027 — which overlaps ' +
        'our wedding weekend. We are confirming with the property whether ' +
        'the room block, the restaurant and the lobby will be fully open ' +
        'June 11-13. Details here the moment we know.',
      bookingUrl: '',
      phone: '',
      coords: null,
      tags: ['our-room-block'],
      photo: 'assets/photos/lodging/grouse-mountain.jpg',
      isRoomBlock: true
    },
    {
      id: 'the-firebrand',
      name: 'The Firebrand',
      tagline: '',
      address: '',
      driveMinutes: null,
      priceTier: '$$$',
      bestFor: 'Downtown, walkable to dinner',
      amenities: [],
      blurb: 'TODO',
      bookingUrl: '',
      phone: '',
      coords: null,
      tags: ['downtown'],
      photo: 'assets/photos/lodging/firebrand.jpg',
      isRoomBlock: false
    },
    {
      id: 'vacation-rentals',
      name: 'Vacation rentals',
      tagline: '',
      address: '',
      driveMinutes: null,
      priceTier: '$$',
      bestFor: 'Easier on the budget, or a longer stay',
      amenities: [],
      blurb: 'TODO — a short note on where to look (Airbnb/Vrbo search area) ' +
        'rather than a single link, since this is a category, not one property.',
      bookingUrl: '',
      phone: '',
      coords: null,
      tags: ['easier-on-the-budget'],
      photo: 'assets/photos/lodging/rentals.jpg',
      isRoomBlock: false
    }
  ],

  roomBlock: {
    property: 'grouse-mountain-lodge',
    code: '',          // TODO — Spencer + property, once confirmed in writing
    bookingUrl: '',     // TODO
    cutoff: '',         // TODO — ISO date
    note: 'Gated behind flags.ROOM_BLOCK_CONFIRMED — see the comment on that flag above.'
  },


  /* ---- Flights ---------------------------------------------------
     Verified August 2026 against Glacier Park International (FCA)'s
     published carrier list. Every SEASONAL route carries a caveat in the
     UI automatically — travel.js reads `status`, not this comment — so
     the caveat can never be forgotten on one row and not another.
     Re-verify: summer 2026 flight loads publish ~330 days out, so check
     again in January 2027 for anything that's shifted. */
  flights: {
    lastVerified: '2026-08-09',
    airportCode: 'FCA',
    airportName: 'Glacier Park International',
    airportToVenue: '11-12 miles, about 20-25 minutes',
    origins: [
      { code: 'SEA', city: 'Seattle', status: 'nonstop-year-round', airlines: ['Alaska'] },
      { code: 'DEN', city: 'Denver', status: 'nonstop-year-round', airlines: ['United'] },
      { code: 'SLC', city: 'Salt Lake City', status: 'nonstop-year-round', airlines: ['Delta'] },
      { code: 'MSP', city: 'Minneapolis-St. Paul', status: 'nonstop-year-round', airlines: ['Delta', 'Sun Country'] },
      { code: 'LAS', city: 'Las Vegas', status: 'nonstop-year-round', airlines: ['Allegiant'] },
      { code: 'AZA', city: 'Phoenix-Mesa', status: 'nonstop-year-round', airlines: ['Allegiant'] },

      { code: 'ORD', city: 'Chicago', status: 'nonstop-seasonal', airlines: ['United', 'American'] },
      { code: 'DFW', city: 'Dallas-Fort Worth', status: 'nonstop-seasonal', airlines: ['American'] },
      { code: 'ATL', city: 'Atlanta', status: 'nonstop-seasonal', airlines: ['Delta'] },
      { code: 'LGA', city: 'New York (LaGuardia)', status: 'nonstop-seasonal', airlines: ['American'] },
      { code: 'LAX', city: 'Los Angeles', status: 'nonstop-seasonal', airlines: ['Delta', 'American', 'Allegiant'] },
      { code: 'SFO', city: 'San Francisco', status: 'nonstop-seasonal', airlines: ['United'] },
      { code: 'IAH', city: 'Houston', status: 'nonstop-seasonal', airlines: ['United'] },
      { code: 'PDX', city: 'Portland', status: 'nonstop-seasonal', airlines: ['Alaska'] },
      { code: 'OAK', city: 'Oakland', status: 'nonstop-seasonal', airlines: ['Allegiant'] },
      { code: 'SAN', city: 'San Diego', status: 'nonstop-seasonal', airlines: ['Alaska'] },
      { code: 'CLT', city: 'Charlotte', status: 'nonstop-seasonal', airlines: ['American'] },

      // A representative rather than exhaustive connect list — the combobox
      // falls back to this generic result for any US metro not named above.
      { code: 'BOS', city: 'Boston', status: 'connect', via: ['MSP', 'SEA', 'DEN'] }
    ]
  },


  /* ---- Schedule --------------------------------------------------
     Most of this is TODO by design — see §E item 4 (welcome party) and
     item 7 (Sunday farewell). The one thing that IS certain and belongs
     in the lede regardless of the gaps: guests should plan to fly in
     Friday. */
  schedule: [
    {
      day: 'Friday', date: '2027-06-11',
      title: 'Arrive + welcome party',
      time: '', venue: '', blurb: '', dress: '',
      flag: 'WELCOME_PARTY_SET'
    },
    {
      day: 'Saturday', date: '2027-06-12',
      title: 'Ceremony + reception',
      time: '', venue: 'The Lodge at Whitefish Lake', blurb: '', dress: '',
      flag: 'CEREMONY_TIME_SET'
    },
    {
      day: 'Sunday', date: '2027-06-13',
      title: 'Farewell',
      time: '', venue: '', blurb: '', dress: '',
      flag: null
    }
  ],


  /* ---- While You're Here -------------------------------------------
     Copy here follows Part D of the build guide exactly — the Glacier
     entry in particular is approved language, not a draft; see the note
     on it below before editing. */
  whileHere: [
    {
      id: 'glacier',
      name: 'Glacier National Park',
      size: 'large',
      /* Verbatim from the build guide §D.1. Do not soften this back
         toward the alpine crossing — Logan Pass reliably is not open by
         June 12 (average full opening since 2010 is ~June 26; the road
         has opened in May exactly once since 2000). "You're getting the
         quiet, green, waterfall season" is true and lands better than a
         guest arriving expecting the pass to be open. */
      blurb: 'Glacier is under an hour away, and the west side of the ' +
        'park — Lake McDonald, Apgar, the Trail of the Cedars — is open ' +
        'and stunning in mid-June. The full Going-to-the-Sun Road over ' +
        'Logan Pass usually doesn’t open until late June or early ' +
        'July, so plan on the lower valley rather than the alpine ' +
        'crossing. Snowmelt means the waterfalls are at their best and ' +
        'the crowds haven’t arrived yet. Check nps.gov/glac for road ' +
        'status before you go.',
      photo: 'assets/photos/whitefish-lake.jpg'
    },
    {
      id: 'whitefish-lake',
      name: 'Whitefish Lake',
      size: 'medium',
      blurb: 'TODO',
      photo: 'assets/photos/whitefish-lake.jpg'
    },
    {
      id: 'downtown',
      name: 'Downtown Whitefish',
      size: 'medium',
      blurb: 'TODO',
      photo: ''
    },
    {
      id: 'wmr',
      name: 'Whitefish Mountain Resort',
      size: 'medium',
      /* §D.3/C.5: the resort runs weekends-only in early June, daily
         service starting mid-June. June 12, 2027 is a Saturday, so on
         the recent pattern the lifts/alpine slide/zip line are likely
         running that weekend specifically. Re-verify: WMR publishes
         summer dates in April — check April 2027. */
      blurb: 'Open weekends in early June — scenic lift rides, the ' +
        'alpine slide and the zip line should be running Saturday and ' +
        'Sunday. Check skiwhitefish.com for the 2027 dates before you ' +
        'count on a weekday.',
      photo: ''
    },
    {
      id: 'flathead-lake',
      name: 'Flathead Lake',
      size: 'small',
      blurb: 'TODO',
      photo: ''
    }
  ],


  /* ---- FAQ -----------------------------------------------------
     Seeds from the build guide §B.11. Answers are TODO except the
     packing line, which has a real, checked answer already. */
  faq: [
    { q: 'What time should I arrive on Friday?', a: '' },
    { q: 'Do I need to rent a car?', a: '' },
    {
      q: 'What should I wear?',
      /* §C.4, checked against average June temps/precip for Whitefish.
         Do not soften the "wettest month" or the evening-cold framing —
         both are the actual, checked forecast pattern, not hedging. */
      a: 'Mid-June in northwest Montana runs warm in the afternoon and ' +
        'genuinely cold once the sun goes down — think 70° at four ' +
        'o’clock and mid-40s by ten. June is also the wettest month ' +
        'here. The reception is outdoors and lakeside, so bring a real ' +
        'layer, not a decorative one, and something you don’t mind ' +
        'getting a little damp.'
    },
    { q: 'Are kids invited?', a: '' },
    { q: 'Is there a shuttle from the hotels?', a: '', flag: 'SHUTTLE_CONFIRMED' },
    { q: 'I can’t make it — what should I do?', a: '' }
  ],


  contacts: {
    couple: { email: '' },   // TODO — mirrors config.contact.email in config.js
    local: { name: '', relation: 'Spencer’s mom', phone: '', email: '' }  // TODO
  }
};
