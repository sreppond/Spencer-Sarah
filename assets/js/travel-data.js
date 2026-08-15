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
       overlapping June 12, 2027. The block itself is confirmed in writing
       (August 2026): guests call Central Reservations and quote the group
       name — see `roomBlock` below. What's still open is the renovation
       logistics (which wing, restaurant/lobby hours, construction noise) —
       re-check with the property as the date gets closer. While this flag
       is true the card gets the gold "Room Block" badge and the real
       call-to-book instructions; flipping it back to false would fall back
       to the muted "pending" state — see badgeFor() in travel.js. */
    ROOM_BLOCK_CONFIRMED: true,

    /* Friday welcome party time and venue are not set. While false, the
       Weekend section shows Friday as "arrive — details coming" rather
       than a specific time nobody has confirmed. */
    WELCOME_PARTY_SET: true,

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
      /* See flags.ROOM_BLOCK_CONFIRMED and `roomBlock` below: this is our
         actual room block, confirmed in writing with the property in
         August 2026. First in this list on purpose — this is the option
         we want every guest to see and consider before anything else, and
         `isRoomBlock: true` plus the confirmed flag together get it the
         gold "Room Block" badge in the gallery/lightbox (see badgeFor() in
         travel.js). Pursuit is also rebranding this property to "Hotel
         Whitefish" through a phased renovation that runs directly through
         the wedding weekend — name the rebrand in the copy regardless,
         since a guest who books here will see "Hotel Whitefish" on their
         confirmation for a property the invitation called "Grouse
         Mountain Lodge," and that confusion is guaranteed unless this
         page names it once. */
      id: 'grouse-mountain-lodge',
      name: 'Grouse Mountain Lodge',
      tagline: 'Our room block – call to reserve your spot',
      address: '2 Fairway Dr, Whitefish, MT 59937',
      driveMinutes: null,
      priceTier: '$$',
      bestFor: 'Our room block',
      amenities: ['Pool', 'On-site dining (renovation-dependent)'],
      blurb: 'This is where our room block is! Call the Central ' +
        'Reservations office at (406) 892-2525 and let them know you’re ' +
        'with the “Simmons – Reppond Wedding Block” – no code needed, ' +
        'just ask for us by name and they’ll take it from there. The ' +
        'property is mid-renovation and relaunching in phases as "Hotel ' +
        'Whitefish" – 144 rooms total, 72 already renovated and open ' +
        '(including a new bridal suite), with a new 8,250 sq ft event ' +
        'pavilion opening fall 2026. We’ll keep an eye on the ' +
        'restaurant/lobby hours as the date gets closer and update this ' +
        'if anything changes.',
      bookingUrl: '',
      phone: '(406) 862-3000',
      coords: null,
      photos: ['images/Grouse Mountain.jpg'],
      isRoomBlock: true
    },
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
      id: 'vacation-rentals',
      name: 'Vacation rentals',
      tagline: 'Great for larger groups traveling together',
      address: '',
      noFixedAddress: true,
      driveMinutes: null,
      priceTier: '$$',
      bestFor: 'Easier on the budget, or a longer stay',
      amenities: [],
      blurb: 'This is a great option for parties traveling in larger groups ' +
        '– Whitefish has plenty of cabins and condos on VRBO and Airbnb, ' +
        'from downtown walk-ups to lakefront houses. Search "Whitefish, ' +
        'MT." Also a good call if you’re staying longer than the wedding ' +
        'weekend.',
      bookingUrl: '',
      phone: '',
      coords: null,
      photos: ['images/Airbnb.avif'],
      isRoomBlock: false
    }
  ],

  /* ---- Price scale ---------------------------------------------------
     A bare "$$" means nothing without a scale to read it against — this
     is that scale. `max` is how many $ signs the priciest lodging option
     uses (see `priceTier` on each entry above); travel.js renders every
     tier as "$$ of $$$$" using this number rather than a hardcoded 4, so
     adding a pricier property later is still a one-line data change. */
  priceScale: {
    max: 4,
    legend: 'Priced relative to each other, from $ (most budget-friendly) to $$$$ (priciest) – not fixed nightly rates.'
  },

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

  /* No online code or booking link exists for this block — it's a phone
     call, not a click. Guests call Central Reservations and give them the
     group name; the property takes it from there. Confirmed in writing
     with the property, August 2026. See flags.ROOM_BLOCK_CONFIRMED and
     the `grouse-mountain-lodge` lodging entry above, which carries the
     same instructions inline on its own card. */
  roomBlock: {
    property: 'grouse-mountain-lodge',
    groupName: 'Simmons – Reppond Wedding Block',
    reservationsPhone: '(406) 892-2525',
    blurb: 'Call the Central Reservations office and give them the name ' +
      'of our block – they’ll take it from there. No confirmation code ' +
      'needed, just ask for us by name.',
    cutoff: '',         // TODO — ISO date, once the property gives us one
    note: 'Gated behind flags.ROOM_BLOCK_CONFIRMED — see the comment on that flag above.'
  },


  /* ---- Schedule --------------------------------------------------
     Friday's welcome party and Saturday's ceremony + reception window
     are both real and confirmed — see flags.WELCOME_PARTY_SET and
     flags.CEREMONY_TIME_SET (mirrored from config.js
     CEREMONY_TIME_CONFIRMED). Sunday's farewell is still TODO by
     design; the one thing that IS certain regardless of that gap:
     guests should plan to fly in Friday. */
  schedule: [
    {
      day: 'Friday', date: '2027-06-11',
      title: 'Arrive + welcome party',
      time: '8:00 PM', venue: 'Herb & Omni, Whitefish',
      venueUrl: 'https://www.herbandomni.com',
      blurb: 'Kicks off the weekend – plan to be there.', dress: '',
      flag: 'WELCOME_PARTY_SET'
    },
    {
      day: 'Saturday', date: '2027-06-12',
      title: 'Ceremony + reception',
      time: '3:30 PM – 10:00 PM', venue: 'The Lodge at Whitefish Lake', blurb: '', dress: '',
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
     One flat list, no more category tabs – guests were clicking through
     tabs to find one answer, not browsing by topic. Order is deliberate:
     travel logistics first (the questions guests need answered before they
     book anything), then what the weekend itself looks like, then the
     open/unconfirmed stuff last. An empty `a` isn't a bug – it's a real
     question worth asking that we don't have a checked answer for yet;
     the render code in travel.js turns that into an honest "Answer
     coming." rather than a guess. Attire is deliberately not here – we
     haven't decided what to say about it yet. */
  faq: [
    {
      q: 'What time should I arrive on Friday?',
      a: 'The welcome party starts at 8 PM in Whitefish, so we’d recommend ' +
        'getting in by 5-6 PM at the latest – enough time to check in, ' +
        'unpack, and get settled before heading out for the night.'
    },
    {
      q: 'Which airport should I fly into?',
      /* The FCA code really is left over from the airport's old name –
         Kalispell's "Flathead County Airport," before it was renamed
         Glacier Park International. Real fact, not an invented bit. */
      a: 'Glacier Park International – code FCA. The airport code is ' +
        'confusing, right!? It’s left over from the airport’s old name, ' +
        'Flathead County Airport. It’s about 15 minutes from downtown ' +
        'Kalispell and 20 from Whitefish. Missoula is a fallback if you ' +
        'can’t get a good fare into FCA, but treat it as a last resort – ' +
        'it’s a 2.5-3 hour detour from here.'
    },
    {
      q: 'Do I need to rent a car?',
      a: 'We’d recommend renting a car, or splitting one with friends – ' +
        'it’s the best way to get around Flathead Valley and Glacier ' +
        'National Park. Rideshare (Uber/Lyft) is an option too, ' +
        'especially if you’re staying right at the venue, but it’s more ' +
        'limited out here given how rural the area is, so don’t count on ' +
        'it for anything last-minute. Every airport has rental cars ' +
        'through the usual companies (Hertz, Enterprise, etc.), and if ' +
        'you strike out there, Turo is a good backup – like Airbnb, but ' +
        'for cars: enter your city, dates, and vehicle preference.'
    },
    {
      q: 'Are kids invited?',
      a: 'Kids are absolutely welcome for the whole weekend! For the ' +
        'ceremony itself, we’ll have on-site care available so parents ' +
        'can be fully present for our vows – and the kids get to come ' +
        'right back and celebrate with us the moment we say "I do."'
    },
    {
      q: 'Is the Friday welcome party kid-friendly?',
      a: 'Kids are part of the whole weekend, so yes – it’s just an ' +
        'evening event starting at 8 PM, so no worries if that’s past ' +
        'bedtime for the little ones.'
    },
    {
      q: 'What time does the ceremony start on Saturday?',
      a: 'Still working that out – we’re deep in the planning stage, and ' +
        'more wedding-day details (exact time included) are on the way. ' +
        'For now, just save June 12, 2027, and we’ll fill in the rest ' +
        'soon!'
    },
    {
      q: 'The ceremony is outdoors – what happens if it rains?',
      a: 'We’ve got it covered – literally: there’s tented seating and ' +
        'we’ll have umbrellas on hand if the skies open up. Rain on your ' +
        'wedding day is supposedly good luck, but we’re still rooting ' +
        'for sunshine.'
    },
    {
      q: 'What’s the plan for Sunday?',
      a: 'We’re putting together a low-key farewell gathering on Sunday, ' +
        'June 13 – time and place are still coming together, and we’ll ' +
        'share details as soon as we have them.'
    },
    {
      q: 'We’re thinking about extending our trip – is it worth it?',
      a: 'Absolutely – Glacier National Park is right there in Flathead ' +
        'Valley, and June is a beautiful time to see it. We don’t have ' +
        'specific recommendations pulled together yet, but block off ' +
        'extra days if you can swing it.'
    },
    {
      q: 'Can we bring our dog?',
      a: 'As much as we’d love to meet your furry friend, we ask that ' +
        'pets sit this one out – no dogs, cats, or other creatures at ' +
        'the festivities, please.'
    },
    {
      q: 'Do you have a gift registry?',
      a: 'Not yet – we’re planning to have one ready in early 2027. ' +
        'We’ll share it here as soon as it’s live.'
    },
    {
      q: 'I can’t make it – what should I do?',
      a: 'We’ll miss you, but totally understand – just let us know so we ' +
        'can keep you posted and make sure you’re not stuck wondering ' +
        'what you missed.'
    }
  ],


  contacts: {
    intro: 'Drop either of us a message, we’re happy to help!',
    people: [
      { name: 'Sarah', phone: '(901) 359-5143' },
      { name: 'Spencer', phone: '(206) 399-7024' }
    ]
  }
};
