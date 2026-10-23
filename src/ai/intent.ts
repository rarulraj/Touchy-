import { themeFor, type Tone } from '@/ai/palette';
import { titleCase } from '@/schema/ids';
import type { CreationType, Theme } from '@/schema/types';

export interface Intent {
  prompt: string;
  type: CreationType;
  subject: string;
  title: string;
  tone: Tone;
  theme: Theme;
}

const TYPE_WORDS = [
  'pitch deck',
  'mood board',
  'moodboard',
  'study guide',
  'mind map',
  'mindmap',
  'flowchart',
  'dashboard',
  'presentation',
  'itinerary',
  'calculator',
  'portfolio',
  'website',
  'planner',
  'tracker',
  'document',
  'diagram',
  'poster',
  'flyer',
  'slides',
  'slide',
  'deck',
  'quiz',
  'report',
  'notes',
  'app',
];

export function interpret(prompt: string): Intent {
  const cleaned = prompt.trim().replace(/[.?!]+$/g, '');
  const text = cleaned.toLowerCase();
  const type = detectType(text);
  const subject = cleanSubject(extractSubject(cleaned), type);
  const tone = detectTone(text);
  const title = makeTitle(type, subject, text);
  return {
    prompt: cleaned,
    type,
    subject,
    title,
    tone,
    theme: themeFor(tone, `${text} ${subject}`),
  };
}

function detectType(text: string): CreationType {
  if (/mood\s?board|palette|swatch|inspiration board/.test(text)) return 'moodboard';
  if (/mind\s?map|flowchart|diagram|architecture/.test(text)) return 'diagram';
  if (/pitch|slides|presentation|deck|keynote/.test(text)) return 'presentation';
  if (/dashboard|analytics|budget|finance|spending|metrics/.test(text)) return 'dashboard';
  if (/website|portfolio|landing|homepage|site for|web page|clothing brand/.test(text)) return 'website';
  if (/poster|flyer|instagram|social post|graphic|album cover/.test(text)) return 'graphic';
  if (/document|report|essay|white paper|memo|notes on/.test(text)) return 'document';
  return 'interactive';
}

function detectTone(text: string): Tone {
  if (/minimal|quiet|clean|simple/.test(text)) return 'minimal';
  if (/bold|loud|vivid|brutal/.test(text)) return 'bold';
  if (/playful|fun|friendly|party/.test(text)) return 'playful';
  if (/elegant|luxury|editorial|fashion|clothing/.test(text)) return 'elegant';
  return 'warm';
}

function extractSubject(prompt: string): string {
  const about = prompt.match(/\b(?:for|about|of|on)\s+(?:my\s+|an?\s+|the\s+)?(.+)$/i);
  if (about?.[1]) return about[1];
  const made = prompt.match(/^(?:please\s+)?(?:build|create|make|design|generate|start)\s+(?:me\s+)?(?:an?\s+|the\s+)?(.+)$/i);
  return made?.[1] ?? prompt;
}

function cleanSubject(subject: string, type: CreationType): string {
  let next = subject
    .replace(/^(me\s+)?(an?\s+|the\s+)/i, '')
    .replace(/\bmy\s+/i, '');
  for (const word of TYPE_WORDS) {
    next = next.replace(new RegExp(`\\b${word}\\b`, 'ig'), ' ');
  }
  next = next
    .replace(/\b(interactive|modern|simple|beautiful|mobile|multi-page|starter)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!next) {
    if (type === 'dashboard') return 'finance';
    if (type === 'website') return 'portfolio';
    if (type === 'presentation') return 'startup';
    if (type === 'moodboard') return 'apartment';
    if (type === 'diagram') return 'this idea';
    return 'this idea';
  }
  return next;
}

function makeTitle(type: CreationType, subject: string, text: string): string {
  if (type === 'dashboard' && /finance|budget|spend|money/.test(text)) return 'Personal finance';
  if (type === 'website' && /cloth|fashion|apparel|brand/.test(text)) return 'Linen & Co.';
  if (type === 'website' && /portfolio/.test(text)) return 'North Studio';
  if (type === 'presentation') return subject === 'startup' ? 'A small startup' : titleCase(subject);
  if (type === 'moodboard' && /apartment|interior|home/.test(text)) return 'Apartment mood';
  if (type === 'diagram' && /artificial intelligence|^ai$/.test(subject)) return 'Artificial intelligence';
  return titleCase(subject);
}
