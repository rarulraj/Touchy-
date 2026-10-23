import { buildDashboard } from '@/ai/dashboard';
import { interpret } from '@/ai/intent';
import {
  blankProject,
  buildCalculator,
  buildDiagram,
  buildDocument,
  buildGeneric,
  buildGraphic,
  buildHabit,
  buildMoodboard,
  buildPresentation,
  buildTravel,
  buildWebsite,
  buildWorkout,
} from '@/ai/scenes';
import { buildStudy } from '@/ai/study';
import type { Project } from '@/schema/types';

export const DEMO_PROMPTS = {
  finance: 'Build me a personal finance dashboard.',
  quiz: 'Build an interactive biology study guide.',
  portfolio: 'Make a modern portfolio website.',
  deck: 'Design a pitch deck for my startup.',
  moodboard: 'Make a moodboard for my apartment.',
} as const;

export function buildFromPrompt(prompt: string): Project {
  const intent = interpret(prompt);
  const text = `${prompt} ${intent.subject}`.toLowerCase();
  if (intent.type === 'dashboard') return buildDashboard(intent);
  if (intent.type === 'website') return buildWebsite(intent);
  if (intent.type === 'presentation') return buildPresentation(intent);
  if (intent.type === 'moodboard') return buildMoodboard(intent);
  if (intent.type === 'diagram') return buildDiagram(intent);
  if (intent.type === 'graphic') return buildGraphic(intent);
  if (intent.type === 'document') return /study guide|quiz/.test(text) ? buildStudy(intent) : buildDocument(intent);
  if (/study guide|quiz|organic chemistry|biology/.test(text)) return buildStudy(intent);
  if (/habit/.test(text)) return buildHabit(intent);
  if (/workout|exercise/.test(text)) return buildWorkout(intent);
  if (/travel|itinerary|trip/.test(text)) return buildTravel(intent);
  if (/calculator|calc\b/.test(text)) return buildCalculator(intent);
  return buildGeneric(intent);
}

export function createBlank(): Project {
  return blankProject();
}
