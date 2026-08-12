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
       the card shows normally with no code, a line naming the rebrand,
       and a muted "pending" room-block callout rather than the gold
       confirmed one — see badgeFor() in travel.js. */
    ROOM_BLOCK_CONFIRMED: false,

    /* No wedding-day shuttle plan exists yet. While false, the FAQ answers
       "Is there a shuttle from the hotels?" with "details coming" instead
       of a guess. If a shuttle is arranged, that answer needs real content
       before this flips. */
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
     Five options, rendered as an expand-on-select carousel — see
     lodgeGallery() in travel.js. `driveMinutes` and `coords` are
     UNVERIFIED placeholders except the one property on the venue's own
     grounds (0, trivially true) — do not treat the rest as real until
     checked against Maps. Order here is the order panels render in;
     reordering this array (e.g. if the room block turns out to be a bad
     recommendation) is the entire fix — no template change.

     Each entry below has one real photo now, uploaded straight into
     /images/ (root-relative — see assetPath() in travel.js, which adds
     the '../' this page needs since /travel/ lives one level down). Add
     more paths to an entry's `photos` array and the carousel panel +
     lightbox pick them up automatically — nothing else to change. A
     single photo renders as a plain image in the lightbox; more than
     one turns it into a carousel. */
  lodging: [
    {
      id: 'lodge-at-whitefish-lake',
      name: 'The Lodge at Whitefish Lake',
      badge: 'Wedding Venue',
      tagline: 'Staying where the wedding is',
      address: '1380 Wisconsin Ave, Whitefish, MT 59937',
      driveMinutes: 0,
      priceTier: '$$$$',
      bestFor: 'Staying where the wedding is',
      amenities: ['On-site', 'Lakefront', 'Spa', 'Pools', 'Marina'],
      blurb: 'Montana’s only AAA Four Diamond resort, and the easiest option ' +
        'there is – you don’t have to leave the property. On-site spa, ' +
        'indoor and outdoor pools, a marina, and the Boat Club Restaurant, ' +
        'all right where the wedding is happening.',
      bookingUrl: 'https://www.lodgeatwhitefishlake.com',
      phone: '',
      coords: [48.4231, -114.3536],
      photos: ['images/Lodge at Whitefish.jpg'],
      isRoomBlock: false
    },
    {
      /* See flags.ROOM_BLOCK_CONFIRMED above: Pursuit is rebranding this
         property to "Hotel Whitefish" through a phased renovation that
         runs directly through the wedding weekend. Name the rebrand in
         the copy regardless of outcome — a guest who books here will see
         "Hotel Whitefish" on their confirmation for a property the
         invitation called "Grouse Mountain Lodge," and that confusion is
         guaranteed unless this page names it once. Second in this list
         (not first) so the venue itself stays the lead recommendation;
         `isRoomBlock: true` alone is enough to get the pending "Room
         Block" callout in the gallery/lightbox, independent of
         ROOM_BLOCK_CONFIRMED — see badgeFor() in travel.js. */
      id: 'grouse-mountain-lodge',
      name: 'Grouse Mountain Lodge',
      tagline: 'Rebranding to Hotel Whitefish – call before booking',
      address: '2 Fairway Dr, Whitefish, MT 59937',
      driveMinutes: null,
      priceTier: '$$',
      bestFor: 'Our room block – once confirmed',
      amenities: ['Pool', 'On-site dining (renovation-dependent)'],
      blurb: 'Grouse Mountain Lodge is mid-renovation and relaunching in ' +
        'phases as "Hotel Whitefish" – 144 rooms total, 72 already ' +
        'renovated and open (including a new bridal suite), with a new ' +
        '8,250 sq ft event pavilion opening fall 2026. The full relaunch ' +
        'is targeted for summer 2027, essentially our wedding weekend. We ' +
        'are confirming with the property whether the room block, the ' +
        'restaurant and the lobby will be fully open June 11-13. Details ' +
        'here the moment we know.',
      bookingUrl: '',
      phone: '(406) 862-3000',
      coords: null,
      photos: ['images/Grouse Mountain.jpg'],
      isRoomBlock: true
    },
    {
      id: 'hidden-moose-lodge',
      name: 'Hidden Moose Lodge',
      tagline: 'A quiet 15-room B&B about 2 miles from downtown',
      address: '1735 E Lakeshore Dr, Whitefish, MT 59937',
      driveMinutes: null,
      priceTier: '$$$',
      bestFor: 'A quiet, small-inn stay',
      amenities: ['Breakfast included', 'Hot tub', 'Fireplace lounge'],
      blurb: 'A 15-room bed & breakfast with a big river-rock fireplace, an ' +
        'outdoor hot tub, and a full breakfast included – quieter and more ' +
        'personal than a hotel.',
      bookingUrl: 'https://www.hiddenmooselodge.com',
      phone: '(406) 862-6516',
      coords: null,
      photos: ['images/hidden-moose-lodge-in.jpg'],
      isRoomBlock: false
    },
    {
      id: 'the-firebrand',
      name: 'The Firebrand',
      tagline: 'Downtown, walkable to dinner and the bars after',
      address: '650 E 3rd St, Whitefish, MT 59937',
      driveMinutes: null,
      priceTier: '$$$',
      bestFor: 'Downtown, walkable to dinner',
      amenities: ['Rooftop hot tub', 'Restaurant + bar downstairs'],
      blurb: 'The pick if you want to walk to dinner and the bars afterward ' +
        '– 20+ restaurants within five minutes on foot. Boutique rooms, a ' +
        'rooftop hot tub, and a restaurant and bar downstairs.',
      bookingUrl: 'https://www.firebrandhotel.com',
      phone: '(406) 863-1900',
      coords: null,
      photos: ['images/Firebrand.jpeg'],
      isRoomBlock: false
    },
    {
      id: 'vacation-rentals',
      name: 'Vacation rentals',
      tagline: 'A deep bench of cabins and condos on VRBO/Airbnb',
      address: '',
      noFixedAddress: true,
      driveMinutes: null,
      priceTier: '$$',
      bestFor: 'Easier on the budget, or a longer stay',
      amenities: [],
      blurb: 'Whitefish has a deep bench of cabins and condos on VRBO and ' +
        'Airbnb, from downtown walk-ups to lakefront houses – search ' +
        '"Whitefish, MT." Best option for larger groups or anyone staying ' +
        'longer than the wedding weekend.',
      bookingUrl: '',
      phone: '',
      coords: null,
      photos: ['images/Airbnb.avif'],
      isRoomBlock: false
    }
  ],

  /* ---- Book-by urgency line -------------------------------------------
     No confirmed deadline exists for this page yet — see the open
     question flagged to Spencer. index.html's own post-RSVP note already
     tells guests "we'd suggest booking your stay before the end of
     October" (2026); that line is real, published guidance, so Where to
     Stay repeats it rather than showing a bare "TODO" that would
     contradict what the home page already tells guests. Confirm this is
     still the right date — and give it an explicit year — before June
     2027. */
  lodgingBookBy: {
    confirmed: false,
    text: 'We’d suggest booking your stay by the end of October 2026, while Whitefish still has rooms for the weekend.'
  },

  roomBlock: {
    property: 'grouse-mountain-lodge',
    code: '',          // TODO — Spencer + property, once confirmed in writing
    bookingUrl: '',     // TODO
    cutoff: '',         // TODO — ISO date
    note: 'Gated behind flags.ROOM_BLOCK_CONFIRMED — see the comment on that flag above.'
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
     Not rendered on the current page — the August 2026 redesign narrowed
     /travel/ to one job (get guests to book lodging) and cut every
     section that wasn't that, this one included. The copy below is real
     and verified, not a draft, so it stays rather than getting deleted:
     the moment there's room for a "things to do" section again, it can
     reuse the same card/module pattern lodging does, and this array is
     ready to go. Copy here follows Part D of the build guide exactly —
     the Glacier entry in particular is approved language; see the note
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
        'park – Lake McDonald, Apgar, the Trail of the Cedars – is open ' +
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
      blurb: 'Right at the venue’s doorstep. City Beach downtown is open ' +
        'to everyone and an easy walk from Central Avenue; the lake is ' +
        'also popular for swimming, paddleboarding, kayaking, and boat ' +
        'rentals through the marina.',
      photo: 'assets/photos/whitefish-lake.jpg'
    },
    {
      id: 'downtown',
      name: 'Downtown Whitefish',
      size: 'medium',
      blurb: 'A few walkable blocks of Central Avenue – local shops, ' +
        'galleries, and good restaurants. If you’re around on a Tuesday ' +
        'evening in summer, the Whitefish Farmers Market takes over the ' +
        'north end of Central Avenue from 5-7:30pm with local produce, ' +
        'food, and live music.',
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
      blurb: 'Ten minutes from the venue. Open weekends in early June, ' +
        'with a scenic gondola or chairlift up Big Mountain to 6,817 ' +
        'feet, an alpine slide, and a zip line – should be running ' +
        'Saturday and Sunday. The Summit House at the top has some of the ' +
        'best views in the valley and a solid lunch menu. Check ' +
        'skiwhitefish.com for the 2027 dates before you count on a weekday.',
      photo: ''
    },
    {
      id: 'flathead-lake',
      name: 'Flathead Lake',
      size: 'small',
      blurb: 'Bigfork and Flathead Lake are about 45 minutes south – a ' +
        'nice half-day for lake views, galleries, and lunch on the water.',
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
        'genuinely cold once the sun goes down – think 70° at four ' +
        'o’clock and mid-40s by ten. June is also the wettest month ' +
        'here. The reception is outdoors and lakeside, so bring a real ' +
        'layer, not a decorative one, and something you don’t mind ' +
        'getting a little damp.'
    },
    { q: 'Are kids invited?', a: '' },
    { q: 'Is there a shuttle from the hotels?', a: '', flag: 'SHUTTLE_CONFIRMED' },
    { q: 'I can’t make it – what should I do?', a: '' }
  ],


  contacts: {
    intro: 'Drop either of us a message, we’re happy to help!',
    people: [
      { name: 'Sarah', phone: '(901) 359-5143' },
      { name: 'Spencer', phone: '(206) 399-7024' }
    ]
  }
};
