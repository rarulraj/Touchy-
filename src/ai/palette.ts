import type { Theme } from '@/schema/types';

export type Tone = 'minimal' | 'bold' | 'playful' | 'elegant' | 'warm';

export function themeFor(tone: Tone, subject: string): Theme {
  const text = `${tone} ${subject}`.toLowerCase();
  if (tone === 'minimal' || /minimal|quiet|clean/.test(text)) {
    return {
      ink: '#1C1917',
      paper: '#F7F4EF',
      card: '#FFFFFF',
      muted: '#8A8178',
      line: '#E6E0D8',
      accent: '#1C1917',
      accentText: '#FFFFFF',
      accent2: '#D6D3D1',
      good: '#3F6F5B',
      warn: '#A16207',
    };
  }
  if (/fashion|cloth|linen|apparel/.test(text) || tone === 'elegant') {
    return {
      ink: '#211C18',
      paper: '#F4EFE8',
      card: '#FBF7F2',
      muted: '#8C7F72',
      line: '#E4D8CB',
      accent: '#8C3A2F',
      accentText: '#FFF8F3',
      accent2: '#D9B48F',
      good: '#3E6B58',
      warn: '#B7791F',
    };
  }
  if (tone === 'playful' || /playful|party|kids/.test(text)) {
    return {
      ink: '#241C33',
      paper: '#FFF4E8',
      card: '#FFFFFF',
      muted: '#8D7C9A',
      line: '#F0D9C8',
      accent: '#FF4D6D',
      accentText: '#FFFFFF',
      accent2: '#7C5CFF',
      good: '#1F9D7A',
      warn: '#F0A202',
    };
  }
  if (tone === 'bold') {
    return {
      ink: '#140E0C',
      paper: '#F6E7D8',
      card: '#FFF8F1',
      muted: '#8A7064',
      line: '#E7CDBB',
      accent: '#FF3B1F',
      accentText: '#FFFFFF',
      accent2: '#1F4BFF',
      good: '#0F8A62',
      warn: '#E39B12',
    };
  }
  return {
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
  };
}

export const PHOTOS = {
  living: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=900&q=70',
  interior: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=70',
  sofa: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=900&q=70',
  bedroom: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=70',
  wood: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=900&q=70',
  beige: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=900&q=70',
  chair: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=70',
  kitchen: 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?auto=format&fit=crop&w=900&q=70',
  fashion1: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=70',
  fashion2: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=900&q=70',
  fashion3: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=70',
  studio: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=70',
  landscape: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=70',
  desk: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=900&q=70',
  plant: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=70',
  city: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=70',
} as const;

export const PHOTO_LIST = Object.values(PHOTOS);

export function photoFor(seed: string, index = 0): string {
  const list = PHOTO_LIST;
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return list[(hash + index) % list.length] ?? PHOTOS.interior;
}
