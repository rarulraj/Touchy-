import { planEdits, type EditPlan } from '@/ai/edit';
import { buildFromPrompt } from '@/ai/generate';
import { validateOperations, validateProject } from '@/schema/validate';
import type { Operation, Project } from '@/schema/types';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function requestProject(prompt: string): Promise<{ project: Project; note: string }> {
  const remote = await post({ kind: 'generate', prompt });
  if (remote && typeof remote === 'object' && 'project' in remote) {
    const parsed = validateProject(remote.project);
    if (parsed.ok) {
      return {
        project: { ...parsed.project, meta: { ...parsed.project.meta, provider: 'openai' } },
        note: 'Generated with OpenAI.',
      };
    }
  }
  return { project: buildFromPrompt(prompt), note: 'Generated with the Touchie engine.' };
}

export async function requestEdit(
  project: Project,
  instruction: string,
  selection: string[],
): Promise<Partial<EditPlan> & { operations?: Operation[] }> {
  const remote = await post({ kind: 'edit', instruction, selection, project });
  if (!remote || typeof remote !== 'object') return {};
  const summary = 'summary' in remote && typeof remote.summary === 'string' ? remote.summary : '';
  if ('operations' in remote) {
    const parsed = validateOperations(remote.operations);
    if (parsed.ok) return { summary: summary || 'Updated.', operations: parsed.operations };
  }
  return {};
}

export function planLocal(project: Project, instruction: string, selection: string[]): EditPlan {
  return planEdits(project, selection, instruction);
}

async function post(body: unknown): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${apiBase()}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function apiBase(): string {
  if (Platform.OS === 'web') return '';
  const host = Constants.expoConfig?.hostUri;
  return host ? `http://${host}` : '';
}
