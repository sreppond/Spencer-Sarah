const fs = require('fs');
const path = require('path');

const dir = path.dirname(process.argv[1] || __filename);

const images = {
  'hero.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="0.6">
      <stop offset="0%" stop-color="#87AEBF"/>
      <stop offset="40%" stop-color="#C8D8DD"/>
      <stop offset="70%" stop-color="#E8DDD0"/>
      <stop offset="100%" stop-color="#F0E4D4"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7BA3B0"/>
      <stop offset="50%" stop-color="#5D8A98"/>
      <stop offset="100%" stop-color="#4A7585"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#sky)"/>
  <!-- Mountains back -->
  <polygon points="0,520 200,280 450,380 650,220 850,350 1050,200 1200,320 1400,240 1600,300 1920,380 1920,580 0,580" fill="#6B8090" opacity="0.5"/>
  <!-- Mountains mid -->
  <polygon points="0,480 150,350 350,420 500,300 700,380 900,260 1100,340 1300,280 1500,350 1700,310 1920,400 1920,600 0,600" fill="#5A7080" opacity="0.7"/>
  <!-- Mountains front -->
  <polygon points="0,540 100,420 300,480 500,380 650,450 800,370 1000,430 1200,350 1400,420 1600,380 1800,440 1920,400 1920,620 0,620" fill="#4A6070"/>
  <!-- Treeline -->
  <polygon points="0,580 50,555 100,570 150,550 200,565 250,545 300,560 350,540 400,558 450,538 500,555 550,535 600,552 650,534 700,550 750,530 800,548 850,528 900,546 950,526 1000,544 1050,524 1100,542 1150,522 1200,540 1250,520 1300,538 1350,518 1400,536 1450,516 1500,534 1550,518 1600,536 1650,520 1700,538 1750,522 1800,540 1850,525 1920,540 1920,620 0,620" fill="#2E4A38"/>
  <!-- Water -->
  <rect x="0" y="610" width="1920" height="470" fill="url(#water)"/>
  <!-- Water reflections -->
  <rect x="0" y="610" width="1920" height="470" fill="url(#water)" opacity="0.8"/>
  <line x1="100" y1="680" x2="400" y2="680" stroke="#8BB5C2" stroke-width="1" opacity="0.3"/>
  <line x1="600" y1="720" x2="950" y2="720" stroke="#8BB5C2" stroke-width="1" opacity="0.25"/>
  <line x1="1100" y1="700" x2="1500" y2="700" stroke="#8BB5C2" stroke-width="1" opacity="0.2"/>
  <line x1="200" y1="780" x2="700" y2="780" stroke="#8BB5C2" stroke-width="0.8" opacity="0.15"/>
  <line x1="900" y1="800" x2="1400" y2="800" stroke="#8BB5C2" stroke-width="0.8" opacity="0.15"/>
  <!-- Sun glow -->
  <circle cx="1400" cy="280" r="200" fill="#F0E4D4" opacity="0.3"/>
  <circle cx="1400" cy="280" r="100" fill="#F5EDE0" opacity="0.2"/>
</svg>`,

  'photo-1.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="s1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7CA8B8"/>
      <stop offset="40%" stop-color="#B8CCD4"/>
      <stop offset="100%" stop-color="#5A8898"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#s1)"/>
  <polygon points="0,450 200,280 400,380 600,250 800,350 800,550 0,550" fill="#4A6878" opacity="0.8"/>
  <polygon points="0,500 150,380 350,440 550,340 750,420 800,400 800,600 0,600" fill="#3A5868"/>
  <polygon points="0,560 100,530 200,550 300,520 400,545 500,510 600,535 700,505 800,530 800,600 0,600" fill="#1E3A2A"/>
  <rect x="0" y="590" width="800" height="410" fill="#4A7888"/>
  <rect x="350" y="680" width="120" height="80" rx="2" fill="#6A5040" opacity="0.6"/>
  <rect x="360" y="720" width="30" height="20" rx="1" fill="#8A6050" opacity="0.5"/>
  <rect x="400" y="715" width="35" height="25" rx="1" fill="#7A5545" opacity="0.5"/>
  <rect x="445" y="720" width="25" height="18" rx="1" fill="#9A7060" opacity="0.5"/>
</svg>`,

  'photo-2.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="s2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1A1A2E"/>
      <stop offset="50%" stop-color="#2D3050"/>
      <stop offset="100%" stop-color="#16213E"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#s2)"/>
  <polygon points="0,500 150,380 300,440 500,320 700,400 800,360 800,550 0,550" fill="#0D1520" opacity="0.8"/>
  <circle cx="500" cy="200" r="8" fill="#FFF" opacity="0.8"/>
  <circle cx="200" cy="150" r="3" fill="#FFF" opacity="0.5"/>
  <circle cx="650" cy="120" r="4" fill="#FFF" opacity="0.6"/>
  <circle cx="350" cy="100" r="2" fill="#FFF" opacity="0.4"/>
  <circle cx="100" cy="250" r="3" fill="#FFF" opacity="0.5"/>
  <circle cx="700" cy="280" r="2" fill="#FFF" opacity="0.3"/>
  <rect x="0" y="540" width="800" height="260" fill="#0A0F18"/>
  <line x1="50" y1="600" x2="250" y2="600" stroke="#1A2540" stroke-width="1" opacity="0.5"/>
  <line x1="400" y1="620" x2="700" y2="620" stroke="#1A2540" stroke-width="1" opacity="0.4"/>
</svg>`,

  'photo-3.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="s3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#A8C4D0"/>
      <stop offset="50%" stop-color="#D5DFE0"/>
      <stop offset="100%" stop-color="#6A9AAA"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#s3)"/>
  <polygon points="100,300 250,180 400,250 550,160 700,220 800,260 800,350 0,350" fill="#5A7A6A" opacity="0.6"/>
  <polygon points="0,310 200,250 350,290 500,220 650,270 800,240 800,380 0,380" fill="#3A5A4A" opacity="0.8"/>
  <rect x="0" y="370" width="800" height="230" fill="#5A8A9A"/>
  <ellipse cx="400" cy="370" rx="300" ry="20" fill="#4A7A8A" opacity="0.4"/>
</svg>`,

  'photo-4.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 700">
  <defs>
    <linearGradient id="s4" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#C4A882"/>
      <stop offset="30%" stop-color="#A8C0B8"/>
      <stop offset="100%" stop-color="#5A8A78"/>
    </linearGradient>
  </defs>
  <rect width="800" height="700" fill="url(#s4)"/>
  <polygon points="0,400 150,280 350,350 500,240 700,320 800,280 800,450 0,450" fill="#4A6A5A" opacity="0.7"/>
  <polygon points="0,420 100,380 250,410 400,350 600,400 800,360 800,480 0,480" fill="#2A4A3A"/>
  <rect x="0" y="470" width="800" height="230" fill="#4A8070"/>
  <!-- Dock -->
  <rect x="300" y="490" width="200" height="8" fill="#6A5040" opacity="0.7" rx="1"/>
  <rect x="320" y="470" width="6" height="40" fill="#5A4030" opacity="0.6"/>
  <rect x="480" y="470" width="6" height="40" fill="#5A4030" opacity="0.6"/>
</svg>`,

  'photo-5.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 500">
  <defs>
    <linearGradient id="s5" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8AAA7A"/>
      <stop offset="100%" stop-color="#3A6A3A"/>
    </linearGradient>
  </defs>
  <rect width="600" height="500" fill="url(#s5)"/>
  <ellipse cx="150" cy="200" rx="120" ry="180" fill="#4A7A4A" opacity="0.6"/>
  <ellipse cx="350" cy="180" rx="100" ry="200" fill="#3A6A3A" opacity="0.5"/>
  <ellipse cx="500" cy="220" rx="130" ry="170" fill="#5A8A5A" opacity="0.4"/>
  <rect x="0" y="400" width="600" height="100" fill="#2A4A2A"/>
  <line x1="100" y1="440" x2="500" y2="440" stroke="#3A5A3A" stroke-width="2" opacity="0.3"/>
</svg>`,

  'story-1.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="st1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#E8D5C0"/>
      <stop offset="100%" stop-color="#C4A882"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#st1)"/>
  <text x="400" y="480" text-anchor="middle" fill="#8A7968" font-family="Georgia" font-size="24" font-style="italic">Your Photo Here</text>
  <text x="400" y="520" text-anchor="middle" fill="#8A7968" font-family="Georgia" font-size="16">Spencer &amp; Sarah</text>
</svg>`,

  'story-2.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="st2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7CA8B8"/>
      <stop offset="100%" stop-color="#B8CCD4"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#st2)"/>
  <polygon points="0,600 200,500 400,550 600,480 800,530 800,700 0,700" fill="#4A7080" opacity="0.5"/>
  <text x="400" y="480" text-anchor="middle" fill="#FFF" font-family="Georgia" font-size="24" font-style="italic" opacity="0.8">Your Photo Here</text>
  <text x="400" y="520" text-anchor="middle" fill="#FFF" font-family="Georgia" font-size="16" opacity="0.6">Adventures Together</text>
</svg>`,

  'story-3.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="st3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D4C5B0"/>
      <stop offset="100%" stop-color="#E8D5C0"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#st3)"/>
  <text x="400" y="480" text-anchor="middle" fill="#8A7968" font-family="Georgia" font-size="24" font-style="italic">Your Photo Here</text>
  <text x="400" y="520" text-anchor="middle" fill="#8A7968" font-family="Georgia" font-size="16">The Proposal</text>
</svg>`,

  'venue-wide.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 600">
  <defs>
    <linearGradient id="vw" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#90B8C8"/>
      <stop offset="35%" stop-color="#C8D8DD"/>
      <stop offset="100%" stop-color="#5A8A9A"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="600" fill="url(#vw)"/>
  <polygon points="0,280 200,180 400,240 600,150 800,200 1000,140 1200,210 1400,160 1600,220 1600,340 0,340" fill="#5A7A8A" opacity="0.6"/>
  <polygon points="0,310 300,250 500,290 800,230 1100,270 1400,240 1600,280 1600,380 0,380" fill="#3A5A6A" opacity="0.8"/>
  <polygon points="0,350 50,330 100,345 150,325 200,340 250,318 300,335 350,315 400,332 450,312 500,330 550,310 600,328 650,308 700,325 750,305 800,322 850,302 900,320 950,300 1000,318 1050,298 1100,316 1150,296 1200,314 1250,294 1300,312 1350,292 1400,310 1450,295 1500,312 1550,298 1600,315 1600,380 0,380" fill="#1E3A2A"/>
  <rect x="0" y="370" width="1600" height="230" fill="#5A8A9A"/>
</svg>`,

  'venue-1.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="v1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#A0C0B0"/>
      <stop offset="100%" stop-color="#5A8A78"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#v1)"/>
  <polygon points="100,400 300,250 500,350 700,200 800,300 800,500 0,500" fill="#3A6A5A" opacity="0.7"/>
  <rect x="0" y="490" width="800" height="310" fill="#4A7A68"/>
  <!-- Flower ground cover -->
  <circle cx="150" cy="520" r="8" fill="#E8D5C0" opacity="0.5"/>
  <circle cx="300" cy="530" r="6" fill="#F0E0D0" opacity="0.4"/>
  <circle cx="500" cy="510" r="7" fill="#E8D5C0" opacity="0.5"/>
  <circle cx="650" cy="525" r="9" fill="#F0E0D0" opacity="0.4"/>
</svg>`,

  'venue-2.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="v2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#90B0C0"/>
      <stop offset="100%" stop-color="#5A8898"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#v2)"/>
  <polygon points="50,300 200,200 350,280 500,180 600,250 600,380 0,380" fill="#4A6878"/>
  <rect x="0" y="370" width="600" height="230" fill="#4A7888"/>
  <!-- Dock -->
  <rect x="180" y="400" width="240" height="10" fill="#6A5040" opacity="0.8" rx="2"/>
  <rect x="200" y="380" width="8" height="50" fill="#5A4030" opacity="0.7"/>
  <rect x="400" y="380" width="8" height="50" fill="#5A4030" opacity="0.7"/>
  <!-- Boats -->
  <ellipse cx="250" cy="440" rx="25" ry="8" fill="#8A6050" opacity="0.6"/>
  <ellipse cx="320" cy="445" rx="22" ry="7" fill="#A07060" opacity="0.5"/>
  <ellipse cx="380" cy="442" rx="24" ry="8" fill="#C0A080" opacity="0.5"/>
</svg>`,

  'venue-3.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400">
  <defs>
    <linearGradient id="v3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C8D8DD"/>
      <stop offset="100%" stop-color="#A8C0C8"/>
    </linearGradient>
  </defs>
  <rect width="800" height="400" fill="url(#v3)"/>
  <polygon points="0,200 200,120 400,180 600,100 800,160 800,280 0,280" fill="#5A7A6A" opacity="0.6"/>
  <polygon points="0,240 150,200 350,230 500,190 700,220 800,200 800,300 0,300" fill="#3A5A4A"/>
  <rect x="0" y="290" width="800" height="110" fill="#5A8A7A"/>
</svg>`,

  'rsvp-bg.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000">
  <defs>
    <linearGradient id="rb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2A4A3A"/>
      <stop offset="100%" stop-color="#1A3A2A"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#rb)"/>
  <polygon points="0,400 300,250 600,350 900,200 1200,300 1600,220 1600,500 0,500" fill="#1A3028" opacity="0.8"/>
  <polygon points="0,450 200,400 400,430 600,380 800,420 1000,370 1200,410 1400,380 1600,420 1600,550 0,550" fill="#0F2018"/>
  <rect x="0" y="540" width="1600" height="460" fill="#0A1810"/>
</svg>`
};

Object.entries(images).forEach(([name, svg]) => {
  fs.writeFileSync(path.join('/home/user/Spencer-Sarah/images', name), svg.trim());
});

console.log('Generated ' + Object.keys(images).length + ' SVG images');
