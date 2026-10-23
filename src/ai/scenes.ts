import type { Intent } from '@/ai/intent';
import { PHOTOS, photoFor } from '@/ai/palette';
import { box, draft, press, type Draft } from '@/ai/kit';
import { titleCase } from '@/schema/ids';
import type { NavItem, Project, Theme, TouchNode } from '@/schema/types';

const inkButton = (theme: Theme, text: string): Partial<TouchNode> => ({
  text,
  style: { background: theme.accent, color: theme.accentText, radius: 22, align: 'center', fontWeight: '700', fontSize: 15 },
});

function nav(d: Draft, theme: Theme, items: NavItem[]): void {
  for (const page of d.pages) {
    d.put(page.id, 'nav', box(12, 14, page.width - 24, 42), {
      name: 'navigation',
      items,
      locked: true,
      style: { background: theme.card, color: theme.ink, radius: 21, fontSize: 13, fontWeight: '600', shadow: true },
    });
  }
}

export function buildWebsite(intent: Intent): Project {
  const fashion = /cloth|fashion|apparel|linen|brand/.test(`${intent.prompt} ${intent.subject}`.toLowerCase());
  return fashion ? buildFashion(intent) : buildPortfolio(intent);
}

function buildPortfolio(intent: Intent): Project {
  const d = draft(intent);
  const theme = intent.theme;
  const name = intent.title || 'North Studio';
  d.state.sent = false;
  d.state.note = '';
  d.state.person = '';
  const items: NavItem[] = [
    { label: 'Home', pageId: 'home' },
    { label: 'Work', pageId: 'work' },
    { label: 'About', pageId: 'about' },
    { label: 'Visit', pageId: 'visit' },
  ];
  d.page('home', 'Home', 360, 980, theme.paper);
  d.page('work', 'Work', 360, 860, theme.paper);
  d.page('about', 'About', 360, 820, theme.paper);
  d.page('visit', 'Visit', 360, 780, theme.paper);
  nav(d, theme, items);

  d.put('home', 'text', box(20, 78, 300, 18), { text: 'portfolio', style: { color: theme.accent, fontSize: 13, fontWeight: '700', letterSpacing: 0.8 } });
  d.put('home', 'text', box(20, 104, 320, 84), { text: name, style: { color: theme.ink, fontSize: 42, font: 'display' } });
  d.put('home', 'text', box(20, 196, 310, 56), { text: 'Product, brand, and spaces. A small studio for people who care how things feel.', style: { color: theme.muted, fontSize: 16 } });
  d.put('home', 'image', box(20, 268, 320, 220), { name: 'hero', src: PHOTOS.studio, style: { radius: 24 } });
  d.put('home', 'button', box(20, 508, 180, 48), { ...inkButton(theme, 'See the work'), interactions: press([{ type: 'navigate', pageId: 'work' }]) });
  ['Brand', 'Product', 'Space'].forEach((label, index) => {
    d.put('home', 'container', box(20 + index * 110, 580, 100, 88), { style: { background: theme.card, radius: 18, shadow: true } });
    d.put('home', 'text', box(32 + index * 110, 600, 80, 48), { text: label, style: { color: theme.ink, fontSize: 16, fontWeight: '700' } });
  });

  d.put('work', 'text', box(20, 74, 300, 36), { text: 'Selected work', style: { color: theme.ink, fontSize: 30, font: 'display' } });
  [
    ['Harbor notes', 'A research site for a climate lab.', PHOTOS.landscape],
    ['Atelier site', 'Editorial shop for a small clothing label.', PHOTOS.fashion1],
    ['Field guide', 'A quiet product for weekend walks.', PHOTOS.plant],
  ].forEach((item, index) => {
    const y = 130 + index * 220;
    d.put('work', 'image', box(20, y, 320, 140), { src: String(item[2]), style: { radius: 20 } });
    d.put('work', 'text', box(20, y + 150, 220, 24), { text: String(item[0]), style: { color: theme.ink, fontSize: 18, fontWeight: '700' } });
    d.put('work', 'text', box(20, y + 176, 300, 28), { text: String(item[1]), style: { color: theme.muted, fontSize: 14 } });
  });

  d.put('about', 'text', box(20, 74, 300, 40), { text: 'About the studio', style: { color: theme.ink, fontSize: 30, font: 'display' } });
  d.put('about', 'image', box(20, 130, 320, 200), { src: PHOTOS.desk, style: { radius: 22 } });
  d.put('about', 'text', box(20, 348, 320, 120), {
    text: `${name} is a two-person practice. We design the page, the object, and the sentence around it. This site is a Touchie creation: tap the nav, nothing here is a picture of a website.`,
    style: { color: theme.ink, fontSize: 16 },
  });
  d.put('about', 'button', box(20, 490, 160, 46), { ...inkButton(theme, 'Say hello'), interactions: press([{ type: 'navigate', pageId: 'visit' }]) });

  d.put('visit', 'text', box(20, 74, 300, 40), { text: 'Write to us', style: { color: theme.ink, fontSize: 30, font: 'display' } });
  d.put('visit', 'input', box(20, 140, 320, 48), { name: 'name', placeholder: 'Your name', bind: 'person', style: { background: theme.card, color: theme.ink, radius: 14, padding: 12, borderWidth: 1, borderColor: theme.line, fontSize: 15 } });
  d.put('visit', 'input', box(20, 200, 320, 90), { name: 'note', placeholder: 'What are you making?', bind: 'note', style: { background: theme.card, color: theme.ink, radius: 14, padding: 12, borderWidth: 1, borderColor: theme.line, fontSize: 15 } });
  d.put('visit', 'button', box(20, 308, 160, 48), {
    ...inkButton(theme, 'Send'),
    interactions: press([
      { type: 'submit', message: 'Message kept on this device.' },
      { type: 'set', key: 'sent', value: true },
    ]),
  });
  d.put('visit', 'text', box(20, 372, 320, 48), {
    text: 'Thanks {{ state.person }}. This form stays on the phone — Touchie does not send mail unless you connect a service.',
    visibleWhen: 'state.sent == true',
    style: { color: theme.good, fontSize: 15, fontWeight: '600' },
  });
  return d.finish(name, 'website');
}

function buildFashion(intent: Intent): Project {
  const d = draft(intent);
  const theme = intent.theme;
  d.page('home', 'Home', 360, 900, theme.paper);
  d.page('look', 'Lookbook', 360, 980, theme.paper);
  d.page('visit', 'Visit', 360, 640, theme.paper);
  nav(d, theme, [
    { label: 'Home', pageId: 'home' },
    { label: 'Lookbook', pageId: 'look' },
    { label: 'Visit', pageId: 'visit' },
  ]);
  d.put('home', 'text', box(20, 78, 280, 16), { text: 'a clothing studio', style: { color: theme.muted, fontSize: 13, letterSpacing: 1, fontWeight: '600' } });
  d.put('home', 'text', box(20, 104, 320, 90), { text: intent.title, style: { color: theme.ink, fontSize: 46, font: 'display' } });
  d.put('home', 'text', box(20, 200, 300, 48), { text: 'Cloth, cut, and a shopfront you can tap through.', style: { color: theme.muted, fontSize: 16 } });
  d.put('home', 'image', box(20, 264, 320, 280), { src: PHOTOS.fashion2, style: { radius: 8 } });
  d.put('home', 'button', box(20, 564, 190, 48), { ...inkButton(theme, 'Open the lookbook'), interactions: press([{ type: 'navigate', pageId: 'look' }]) });
  [PHOTOS.fashion1, PHOTOS.fashion3, PHOTOS.beige].forEach((src, index) => {
    const y = 120 + index * 270;
    d.put('look', 'image', box(20, y, 320, 210), { src, style: { radius: 8 } });
    d.put('look', 'text', box(20, y + 218, 280, 28), { text: ['Linen shirt', 'Evening column', 'Weekend set'][index], style: { color: theme.ink, fontSize: 18, font: 'display' } });
  });
  d.put('visit', 'text', box(20, 80, 300, 70), { text: 'The shop is a preview. Payments need a connected service.', style: { color: theme.ink, fontSize: 22, font: 'display' } });
  d.put('visit', 'button', box(20, 180, 200, 48), { ...inkButton(theme, 'Back home'), interactions: press([{ type: 'navigate', pageId: 'home' }]) });
  return d.finish(intent.title, 'website');
}

export function buildPresentation(intent: Intent): Project {
  const d = draft(intent);
  const theme = intent.theme;
  const name = intent.title;
  const slides = [
    ['01', name, 'A short deck for a thing that does not exist yet. Swipe the buttons, not a PDF.'],
    ['02', 'The problem', `People trying to do ${intent.subject} still stitch together five tools and a spreadsheet.`],
    ['03', 'The approach', 'One place to see the work, decide, and tell the next person what changed.'],
    ['04', 'Why now', 'The models are good enough. The interface is still a chat box. This is the other shape.'],
    ['05', 'The ask', 'A small pilot, six weeks, and a room where we can watch someone use it.'],
  ];
  slides.forEach((slide, index) => {
    const id = `s${index + 1}`;
    d.page(id, `Slide ${index + 1}`, 360, 640, index === 0 ? theme.ink : theme.paper);
    const color = index === 0 ? '#FFF8F2' : theme.ink;
    const muted = index === 0 ? 'rgba(255,248,242,0.7)' : theme.muted;
    d.put(id, 'text', box(24, 36, 200, 20), { text: slide[0], style: { color: theme.accent, fontSize: 14, fontWeight: '700', letterSpacing: 1 } });
    d.put(id, 'text', box(24, 80, 310, 140), { text: slide[1], style: { color, fontSize: 40, font: 'display' } });
    d.put(id, 'text', box(24, 250, 310, 120), { text: slide[2], style: { color: muted, fontSize: 18 } });
    d.put(id, 'text', box(24, 560, 80, 24), { text: `${index + 1} / ${slides.length}`, style: { color: muted, fontSize: 13, fontWeight: '600' } });
    if (index > 0) {
      d.put(id, 'button', box(120, 548, 90, 40), {
        text: 'Back',
        style: { background: 'transparent', color, radius: 20, align: 'center', borderWidth: 1, borderColor: index === 0 ? 'rgba(255,255,255,0.3)' : theme.line, fontWeight: '600' },
        interactions: press([{ type: 'navigate', pageId: `s${index}` }]),
      });
    }
    const next = index === slides.length - 1 ? 's1' : `s${index + 2}`;
    d.put(id, 'button', box(220, 548, 116, 40), {
      text: index === slides.length - 1 ? 'Start over' : 'Next',
      style: { background: theme.accent, color: theme.accentText, radius: 20, align: 'center', fontWeight: '700' },
      interactions: press([{ type: 'navigate', pageId: next }]),
    });
  });
  return d.finish(name === 'A small startup' ? 'Startup pitch' : `${name} pitch`, 'presentation');
}

export function buildMoodboard(intent: Intent): Project {
  const d = draft(intent);
  const theme = intent.theme;
  const apartment = /apartment|interior|home|room/.test(`${intent.prompt} ${intent.subject}`.toLowerCase());
  const page = d.page('board', 'Board', 820, 1100, '#EFE4D4');
  d.put(page.id, 'text', box(28, 24, 360, 28), { text: apartment ? 'apartment mood' : intent.title, style: { color: theme.ink, fontSize: 28, font: 'display' } });
  d.put(page.id, 'text', box(28, 58, 420, 22), { text: 'Drag anything. Circle a piece and say what should change.', style: { color: theme.muted, fontSize: 14 } });
  const photos = apartment
    ? [PHOTOS.living, PHOTOS.sofa, PHOTOS.bedroom, PHOTOS.wood, PHOTOS.kitchen, PHOTOS.chair]
    : [0, 1, 2, 3, 4, 5].map((index) => photoFor(intent.subject, index));
  const frames = [
    box(28, 110, 280, 220, -2),
    box(330, 140, 220, 180, 3),
    box(570, 100, 210, 250, -1),
    box(40, 360, 200, 240, 2),
    box(260, 400, 300, 200, -3),
    box(580, 380, 200, 180, 4),
  ];
  photos.forEach((src, index) => {
    const frame = frames[index] ?? box(28, 110, 200, 160);
    d.put(page.id, 'image', frame, { name: `photo ${index + 1}`, src, style: { radius: 18, shadow: true } });
  });
  const swatches = [
    ['#F3E6D4', 'linen'],
    ['#C4A484', 'oak'],
    ['#7C8C74', 'sage'],
    ['#1C1714', 'ink'],
    ['#E7D3C4', 'clay'],
  ];
  swatches.forEach((swatch, index) => {
    d.put(page.id, 'swatch', box(36 + index * 110, 660, 96, 96), {
      name: swatch[1],
      text: swatch[1],
      style: { background: swatch[0], color: index === 3 ? '#F6F0E6' : theme.ink, radius: 18, align: 'center', fontSize: 13, fontWeight: '600' },
    });
  });
  d.put(page.id, 'text', box(36, 790, 300, 50), { text: 'Fraunces', style: { color: theme.ink, fontSize: 40, font: 'display' } });
  d.put(page.id, 'text', box(36, 846, 280, 28), { text: 'for headlines, quiet and a little warm', style: { color: theme.muted, fontSize: 16 } });
  d.put(page.id, 'text', box(360, 800, 280, 40), { text: 'Outfit', style: { color: theme.ink, fontSize: 32, fontWeight: '600' } });
  d.put(page.id, 'text', box(360, 848, 300, 28), { text: 'for the small words and the buttons', style: { color: theme.muted, fontSize: 16 } });
  d.put(page.id, 'container', box(36, 920, 340, 130), { style: { background: '#FFF9F2', radius: 20, shadow: true } });
  d.put(page.id, 'text', box(52, 940, 300, 90), { text: apartment ? 'Morning light, low furniture, one deep color so the room is not beige on beige.' : `A starting palette for ${intent.subject}. Move the pictures until it feels right.`, style: { color: theme.ink, fontSize: 16 } });
  return d.finish(apartment ? 'Apartment mood' : `${titleCase(intent.subject)} mood`, 'moodboard');
}

export function buildDiagram(intent: Intent): Project {
  const d = draft(intent);
  const theme = intent.theme;
  const page = d.page('map', 'Map', 820, 820, theme.paper);
  const ai = /artificial intelligence|^ai$|machine learning/.test(intent.subject.toLowerCase());
  const title = ai ? 'Artificial intelligence' : titleCase(intent.subject);
  const branches = ai
    ? [
        ['Models', 'Predict the next piece'],
        ['Data', 'Examples and labels'],
        ['Tools', 'Search, code, pictures'],
        ['Limits', 'Confident and wrong'],
        ['People', 'The one who checks'],
      ]
    : [
        ['What it is', title],
        ['Parts', 'The pieces inside'],
        ['Example', 'One concrete case'],
        ['Question', 'What is still fuzzy'],
        ['Next', 'The following step'],
      ];
  d.put(page.id, 'shape', box(300, 340, 220, 120), { shape: 'ellipse', style: { background: theme.ink } });
  d.put(page.id, 'text', box(320, 372, 180, 60), { text: title, style: { color: theme.paper, fontSize: 20, font: 'display', align: 'center' } });
  const spots = [
    box(40, 80, 200, 110),
    box(560, 70, 210, 110),
    box(40, 620, 210, 110),
    box(560, 620, 210, 110),
    box(300, 40, 220, 100),
  ];
  branches.forEach((branch, index) => {
    const spot = spots[index] ?? box(40, 80, 180, 90);
    d.put(page.id, 'shape', box(spot.x + spot.width / 2 - 2, Math.min(spot.y + spot.height, 400), 4, Math.abs(400 - (spot.y + spot.height / 2)), 0), {
      shape: 'line',
      style: { background: theme.line },
    });
    d.put(page.id, 'container', spot, { style: { background: theme.card, radius: 18, shadow: true } });
    d.put(page.id, 'text', box(spot.x + 14, spot.y + 16, spot.width - 28, 28), { text: branch[0], style: { color: theme.ink, fontSize: 16, fontWeight: '700' } });
    d.put(page.id, 'text', box(spot.x + 14, spot.y + 48, spot.width - 28, 40), { text: branch[1], style: { color: theme.muted, fontSize: 14 } });
  });
  return d.finish(title, 'diagram');
}

export function buildGraphic(intent: Intent): Project {
  const d = draft(intent);
  const theme = intent.theme;
  const page = d.page('poster', 'Poster', 360, 640, theme.ink);
  d.put(page.id, 'shape', box(180, -40, 240, 240), { shape: 'ellipse', style: { background: theme.accent } });
  d.put(page.id, 'text', box(24, 180, 300, 28), { text: 'touchie', style: { color: theme.accent, fontSize: 14, fontWeight: '700', letterSpacing: 2 } });
  d.put(page.id, 'text', box(24, 220, 310, 180), { text: intent.title, style: { color: '#FFF8F2', fontSize: 52, font: 'display' } });
  d.put(page.id, 'text', box(24, 430, 280, 70), { text: 'Made with your fingers. No files, no terminal.', style: { color: 'rgba(255,248,242,0.75)', fontSize: 18 } });
  return d.finish(`${intent.title} poster`, 'graphic');
}

export function buildDocument(intent: Intent): Project {
  const d = draft(intent);
  const theme = intent.theme;
  const page = d.page('doc', 'Notes', 360, 1100, theme.paper);
  d.put(page.id, 'text', box(24, 28, 300, 20), { text: 'notes', style: { color: theme.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1 } });
  d.put(page.id, 'text', box(24, 56, 310, 80), { text: intent.title, style: { color: theme.ink, fontSize: 36, font: 'display' } });
  const sections = [
    ['Why this exists', `A first pass on ${intent.subject}. Edit any line by circling it.`],
    ['What we know', 'Keep the claims you can stand behind. Mark the rest as open.'],
    ['Open questions', 'What would change the decision? Who else needs to see this?'],
    ['Next', 'Turn a section into a page, a chart, or a slide when you are ready.'],
  ];
  sections.forEach((section, index) => {
    const y = 170 + index * 210;
    d.put(page.id, 'text', box(24, y, 300, 28), { text: section[0], style: { color: theme.ink, fontSize: 20, fontWeight: '700' } });
    d.put(page.id, 'text', box(24, y + 40, 310, 100), { text: section[1], style: { color: theme.muted, fontSize: 16 } });
  });
  return d.finish(intent.title, 'document');
}

export function buildHabit(intent: Intent): Project {
  const d = draft(intent);
  const theme = intent.theme;
  const page = d.page('week', 'Week', 360, 760, theme.paper);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  days.forEach((day, index) => {
    d.state[`d${index}`] = false;
  });
  d.put(page.id, 'text', box(20, 28, 300, 40), { text: intent.title || 'Habits', style: { color: theme.ink, fontSize: 34, font: 'display' } });
  d.put(page.id, 'text', box(20, 76, 300, 24), { text: 'Tap a day when you did the thing.', style: { color: theme.muted, fontSize: 15 } });
  days.forEach((day, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    d.put(page.id, 'button', box(20 + col * 84, 130 + row * 90, 76, 76), {
      name: day,
      text: day,
      style: { background: theme.card, color: theme.ink, radius: 22, align: 'center', fontWeight: '700', borderWidth: 1, borderColor: theme.line },
      activeWhen: `state.d${index} == true`,
      activeStyle: { background: theme.good, color: '#FFFFFF', borderColor: theme.good },
      interactions: press([{ type: 'toggle', key: `d${index}` }]),
    });
  });
  d.put(page.id, 'progress', box(20, 360, 320, 18), {
    name: 'week progress',
    progressExpr: '(num(state.d0)+num(state.d1)+num(state.d2)+num(state.d3)+num(state.d4)+num(state.d5)+num(state.d6))/7',
    style: { background: theme.line, color: theme.accent, radius: 9 },
  });
  d.put(page.id, 'text', box(20, 392, 300, 28), {
    text: '{{ round((num(state.d0)+num(state.d1)+num(state.d2)+num(state.d3)+num(state.d4)+num(state.d5)+num(state.d6))/7*100) }}% of the week',
    style: { color: theme.ink, fontSize: 16, fontWeight: '600' },
  });
  d.put(page.id, 'text', box(20, 440, 300, 40), {
    text: 'A full week. Leave it up if you want the reminder.',
    visibleWhen: 'num(state.d0)+num(state.d1)+num(state.d2)+num(state.d3)+num(state.d4)+num(state.d5)+num(state.d6) == 7',
    style: { color: theme.good, fontSize: 16, fontWeight: '700' },
  });
  return d.finish('Habit tracker', 'interactive');
}

export function buildWorkout(intent: Intent): Project {
  const d = draft(intent);
  const theme = intent.theme;
  d.state.day = 'Mon';
  d.state.done = 0;
  d.data.moves = {
    rows: [
      { name: 'Squat', detail: '3 x 8', day: 'Mon' },
      { name: 'Bench', detail: '3 x 6', day: 'Mon' },
      { name: 'Row', detail: '3 x 10', day: 'Mon' },
      { name: 'Hinge', detail: '3 x 8', day: 'Wed' },
      { name: 'Press', detail: '3 x 8', day: 'Wed' },
      { name: 'Carry', detail: '4 x 30m', day: 'Wed' },
      { name: 'Easy run', detail: '25 min', day: 'Fri' },
      { name: 'Core', detail: '3 rounds', day: 'Fri' },
    ],
  };
  const page = d.page('plan', 'Plan', 360, 820, theme.paper);
  d.put(page.id, 'text', box(20, 24, 300, 40), { text: 'Workout', style: { color: theme.ink, fontSize: 34, font: 'display' } });
  ['Mon', 'Wed', 'Fri'].forEach((day, index) => {
    d.put(page.id, 'button', box(20 + index * 112, 80, 100, 40), {
      text: day,
      style: { background: theme.card, color: theme.ink, radius: 20, align: 'center', fontWeight: '700', borderWidth: 1, borderColor: theme.line },
      activeWhen: `state.day == '${day}'`,
      activeStyle: { background: theme.ink, color: theme.paper, borderColor: theme.ink },
      interactions: press([{ type: 'filter', key: 'day', value: day }]),
    });
  });
  d.put(page.id, 'table', box(16, 140, 328, 360), {
    name: 'moves',
    table: {
      source: 'moves',
      columns: [
        { key: 'name', label: 'Move' },
        { key: 'detail', label: 'Dose' },
      ],
      filter: { state: 'day', field: 'day', mode: 'equals' },
    },
    style: { background: theme.card, radius: 20, color: theme.ink, fontSize: 15 },
  });
  d.put(page.id, 'metric', box(20, 520, 150, 80), {
    label: 'Logged',
    valueExpr: 'state.done',
    style: { background: theme.ink, color: theme.paper, radius: 18, padding: 12, font: 'display', fontSize: 28 },
  });
  d.put(page.id, 'button', box(186, 520, 154, 80), {
    text: 'Mark done',
    style: { background: theme.accent, color: theme.accentText, radius: 18, align: 'center', fontWeight: '700' },
    interactions: press([{ type: 'inc', key: 'done', by: 1 }]),
  });
  return d.finish('Workout planner', 'interactive');
}

export function buildTravel(intent: Intent): Project {
  const d = draft(intent);
  const theme = intent.theme;
  const place = /travel|itinerary|trip/.test(intent.subject) ? 'Kyoto' : titleCase(intent.subject);
  d.state.a = false;
  d.state.b = false;
  d.state.c = false;
  const page = d.page('trip', place, 360, 860, theme.paper);
  d.put(page.id, 'image', box(0, 0, 360, 200), { src: PHOTOS.city, style: { radius: 0 } });
  d.put(page.id, 'text', box(20, 216, 320, 40), { text: place, style: { color: theme.ink, fontSize: 36, font: 'display' } });
  d.put(page.id, 'text', box(20, 262, 320, 36), { text: 'A starter itinerary. Tick a stop when you have done it.', style: { color: theme.muted, fontSize: 14 } });
  [
    ['a', 'Morning', 'Walk before the crowds. Coffee, then one neighborhood.'],
    ['b', 'Afternoon', 'A museum or a garden. Leave the map in your pocket for an hour.'],
    ['c', 'Evening', 'A long dinner. No second plan after it.'],
  ].forEach((item, index) => {
    const y = 320 + index * 130;
    d.put(page.id, 'container', box(16, y, 328, 118), { style: { background: theme.card, radius: 18, shadow: true } });
    d.put(page.id, 'text', box(32, y + 12, 200, 22), { text: item[1], style: { color: theme.ink, fontSize: 16, fontWeight: '700' } });
    d.put(page.id, 'text', box(32, y + 38, 220, 48), { text: item[2], style: { color: theme.muted, fontSize: 13 } });
    d.put(page.id, 'button', box(250, y + 36, 76, 36), {
      text: 'Done',
      style: { background: theme.paper, color: theme.ink, radius: 16, align: 'center', fontWeight: '700', borderWidth: 1, borderColor: theme.line, fontSize: 13 },
      activeWhen: `state.${item[0]} == true`,
      activeStyle: { background: theme.good, color: '#FFFFFF', borderColor: theme.good },
      interactions: press([{ type: 'toggle', key: item[0] }]),
    });
  });
  d.put(page.id, 'progress', box(20, 720, 320, 16), {
    progressExpr: '(num(state.a)+num(state.b)+num(state.c))/3',
    style: { background: theme.line, color: theme.accent, radius: 8 },
  });
  return d.finish(`${place} itinerary`, 'interactive');
}

export function buildCalculator(intent: Intent): Project {
  const d = draft(intent);
  const theme = intent.theme;
  d.state.display = '';
  const page = d.page('calc', 'Calculator', 360, 640, theme.paper);
  d.put(page.id, 'text', box(20, 28, 200, 24), { text: 'calculator', style: { color: theme.muted, fontSize: 13, fontWeight: '700' } });
  d.put(page.id, 'container', box(16, 64, 328, 90), { style: { background: theme.ink, radius: 20 } });
  d.put(page.id, 'text', box(32, 80, 296, 58), {
    text: "{{ state.display == '' ? '0' : state.display }}",
    style: { color: theme.paper, fontSize: 36, font: 'display', align: 'right' },
  });
  const keys = ['C', '⌫', '%', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='];
  keys.forEach((key, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const wide = false;
    const action =
      key === 'C'
        ? press([{ type: 'set', key: 'display', value: '' }])
        : key === '⌫'
          ? press([{ type: 'setExpr', key: 'display', expr: 'drop(state.display)' }])
          : key === '='
            ? press([{ type: 'calculate', target: 'display', expression: 'calc(state.display)' }])
            : press([{ type: 'setExpr', key: 'display', expr: `concat(state.display, '${key}')` }]);
    d.put(page.id, 'button', box(16 + col * 84, 176 + row * 72, wide ? 160 : 76, 64), {
      name: `key ${key}`,
      text: key,
      style: {
        background: key === '=' ? theme.accent : '/C⌫'.includes(key) || '+-*/%'.includes(key) ? theme.ink : theme.card,
        color: key === '=' ? theme.accentText : '/C⌫'.includes(key) || '+-*/%'.includes(key) ? theme.paper : theme.ink,
        radius: 18,
        align: 'center',
        fontSize: 22,
        fontWeight: '700',
      },
      interactions: action,
    });
  });
  return d.finish('Calculator', 'interactive');
}

export function buildGeneric(intent: Intent): Project {
  const d = draft(intent);
  const theme = intent.theme;
  d.state.step1 = false;
  d.state.step2 = false;
  d.state.step3 = false;
  const page = d.page('plan', 'Plan', 360, 720, theme.paper);
  d.put(page.id, 'text', box(20, 28, 320, 70), { text: intent.title, style: { color: theme.ink, fontSize: 34, font: 'display' } });
  d.put(page.id, 'text', box(20, 110, 320, 40), { text: 'A starter you can touch. Tick a step, or circle it and ask for a real one.', style: { color: theme.muted, fontSize: 15 } });
  ['Name the outcome', 'List the pieces', 'Do the first small one'].forEach((label, index) => {
    const key = `step${index + 1}`;
    d.put(page.id, 'button', box(20, 180 + index * 88, 320, 72), {
      text: label,
      style: { background: theme.card, color: theme.ink, radius: 18, align: 'left', padding: 16, fontSize: 16, fontWeight: '600', shadow: true },
      activeWhen: `state.${key} == true`,
      activeStyle: { background: theme.good, color: '#FFFFFF' },
      interactions: press([{ type: 'toggle', key }]),
    });
  });
  d.put(page.id, 'progress', box(20, 460, 320, 16), {
    progressExpr: '(num(state.step1)+num(state.step2)+num(state.step3))/3',
    style: { background: theme.line, color: theme.accent, radius: 8 },
  });
  return d.finish(intent.title, 'interactive');
}

export function blankProject(): Project {
  const intent = {
    prompt: '',
    type: 'graphic' as const,
    subject: 'blank',
    title: 'Untitled',
    tone: 'warm' as const,
    theme: {
      ink: '#1C1714',
      paper: '#F6F0E6',
      card: '#FFF9F2',
      muted: '#8A7B6E',
      line: '#E7D9C8',
      accent: '#FF4B3E',
      accentText: '#FFFFFF',
      accent2: '#2F5BFF',
      good: '#1E8C6E',
      warn: '#E7A423',
    },
  };
  const d = draft(intent);
  const page = d.page('canvas', 'Canvas', 360, 640, intent.theme.paper);
  d.put(page.id, 'text', box(24, 40, 300, 80), {
    text: 'Untitled',
    style: { color: intent.theme.ink, fontSize: 40, font: 'display' },
  });
  d.put(page.id, 'text', box(24, 130, 300, 60), {
    text: 'Ask Touchie to add the first thing.',
    style: { color: intent.theme.muted, fontSize: 16 },
  });
  return d.finish('Untitled', 'graphic');
}
