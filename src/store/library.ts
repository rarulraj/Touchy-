import { planEdits } from '@/ai/edit';
import { createBlank, DEMO_PROMPTS, buildFromPrompt } from '@/ai/generate';
import { applyOperations } from '@/ai/operations';
import { requestEdit, requestProject } from '@/ai/client';
import { clone, createId, nowIso, slugify } from '@/schema/ids';
import type { ChatMessage, Project, PublishedProject, VersionSnap } from '@/schema/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'touchie.library.v1';

interface Persisted {
  projects: Record<string, Project>;
  order: string[];
  versions: Record<string, VersionSnap[]>;
  published: Record<string, PublishedProject>;
  conversations: Record<string, ChatMessage[]>;
}

interface Library extends Persisted {
  ready: boolean;
  past: Record<string, Project[]>;
  future: Record<string, Project[]>;
  syncNote: string;
  load: () => Promise<void>;
  createFromPrompt: (prompt: string) => Promise<Project>;
  openBlank: () => Project;
  duplicate: (id: string) => Project | null;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  commit: (id: string, recipe: (project: Project) => Project, label?: string) => void;
  live: (id: string, recipe: (project: Project) => Project) => void;
  undo: (id: string) => void;
  redo: (id: string) => void;
  editWithAI: (id: string, instruction: string, selection: string[]) => Promise<{ summary: string; variants: Project[] }>;
  publish: (id: string) => PublishedProject | null;
  restore: (id: string, versionId: string) => void;
  adoptVariant: (id: string, variant: Project) => void;
}

let pending: Record<string, Project> = {};
let timer: ReturnType<typeof setTimeout> | null = null;

export const useLibrary = create<Library>((set, get) => ({
  ready: false,
  projects: {},
  order: [],
  versions: {},
  published: {},
  conversations: {},
  past: {},
  future: {},
  syncNote: 'On this device',
  load: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Persisted;
      set({ ...saved, ready: true });
      return;
    }
    const seeded = seed();
    set({ ...seeded, ready: true });
    await AsyncStorage.setItem(KEY, JSON.stringify(seeded));
  },
  createFromPrompt: async (prompt) => {
    const remote = await requestProject(prompt);
    const project = remote.project;
    remember(set, get, project, remote.note);
    return project;
  },
  openBlank: () => {
    const project = createBlank();
    remember(set, get, project, 'A blank canvas.');
    return project;
  },
  duplicate: (id) => {
    const source = get().projects[id];
    if (!source) return null;
    const copy = clone(source);
    copy.id = createId('prj');
    copy.name = `${source.name} copy`.slice(0, 80);
    copy.meta = { ...copy.meta, sample: false };
    copy.createdAt = nowIso();
    copy.updatedAt = copy.createdAt;
    copy.version = 1;
    remember(set, get, copy, 'Duplicated.');
    return copy;
  },
  rename: (id, name) => {
    get().commit(id, (project) => ({ ...project, name: name.slice(0, 80) }), 'Renamed');
  },
  remove: (id) => {
    const next = { ...get().projects };
    delete next[id];
    set({
      projects: next,
      order: get().order.filter((item) => item !== id),
    });
    scheduleSave(get);
  },
  commit: (id, recipe, label = 'Edit') => {
    const current = get().projects[id];
    if (!current) return;
    const past = { ...get().past, [id]: [...(get().past[id] ?? []), clone(current)].slice(-40) };
    const project = stamp(recipe(clone(current)));
    set({
      projects: { ...get().projects, [id]: project },
      past,
      future: { ...get().future, [id]: [] },
      versions: pushVersion(get().versions, id, current, label),
    });
    scheduleSave(get);
  },
  live: (id, recipe) => {
    const current = get().projects[id];
    if (!current) return;
    if (!pending[id]) pending[id] = clone(current);
    const project = recipe(clone(current));
    set({ projects: { ...get().projects, [id]: project } });
  },
  undo: (id) => {
    const past = get().past[id] ?? [];
    const previous = past[past.length - 1];
    const current = get().projects[id];
    if (!previous || !current) return;
    set({
      projects: { ...get().projects, [id]: previous },
      past: { ...get().past, [id]: past.slice(0, -1) },
      future: { ...get().future, [id]: [clone(current), ...(get().future[id] ?? [])].slice(0, 40) },
    });
    scheduleSave(get);
  },
  redo: (id) => {
    const future = get().future[id] ?? [];
    const next = future[0];
    const current = get().projects[id];
    if (!next || !current) return;
    set({
      projects: { ...get().projects, [id]: next },
      future: { ...get().future, [id]: future.slice(1) },
      past: { ...get().past, [id]: [...(get().past[id] ?? []), clone(current)].slice(-40) },
    });
    scheduleSave(get);
  },
  editWithAI: async (id, instruction, selection) => {
    const current = get().projects[id];
    if (!current) return { summary: 'That creation is gone.', variants: [] };
    const remote = await requestEdit(current, instruction, selection);
    const plan = remote.operations
      ? { summary: remote.summary ?? 'Updated.', operations: remote.operations }
      : planEdits(current, selection, instruction);
    const applied = applyOperations(current, plan.operations);
    const project = { ...applied.project, id: current.id };
    const past = { ...get().past, [id]: [...(get().past[id] ?? []), clone(current)].slice(-40) };
    const conversations = log(get().conversations, id, instruction, applied.notes[0] ?? plan.summary);
    set({
      projects: { ...get().projects, [id]: project },
      past,
      future: { ...get().future, [id]: [] },
      conversations,
      versions: pushVersion(get().versions, id, current, plan.summary),
    });
    if (applied.publish) get().publish(id);
    scheduleSave(get);
    return { summary: applied.notes.filter(Boolean).join(' ') || plan.summary, variants: applied.variants };
  },
  publish: (id) => {
    const project = get().projects[id];
    if (!project) return null;
    const published: PublishedProject = {
      slug: slugify(project.name),
      projectId: project.id,
      name: project.name,
      snapshot: clone(project),
      at: nowIso(),
    };
    set({ published: { ...get().published, [published.slug]: published } });
    scheduleSave(get);
    return published;
  },
  restore: (id, versionId) => {
    const snap = (get().versions[id] ?? []).find((item) => item.id === versionId);
    if (!snap) return;
    get().commit(id, () => clone(snap.snapshot), 'Restored');
  },
  adoptVariant: (id, variant) => {
    get().commit(id, (project) => ({ ...clone(variant), id: project.id, meta: project.meta }), 'Chose a direction');
  },
}));

function remember(
  set: (partial: Partial<Library>) => void,
  get: () => Library,
  project: Project,
  note: string,
) {
  set({
    projects: { ...get().projects, [project.id]: project },
    order: [project.id, ...get().order.filter((id) => id !== project.id)],
    conversations: log(get().conversations, project.id, project.prompt || 'Blank canvas', note),
  });
  scheduleSave(get);
}

function stamp(project: Project): Project {
  return { ...project, updatedAt: nowIso(), version: project.version + 1 };
}

function pushVersion(versions: Record<string, VersionSnap[]>, id: string, snapshot: Project, label: string) {
  const entry: VersionSnap = { id: createId('ver'), at: nowIso(), label, snapshot };
  return { ...versions, [id]: [entry, ...(versions[id] ?? [])].slice(0, 20) };
}

function log(conversations: Record<string, ChatMessage[]>, id: string, user: string, assistant: string) {
  const next = [
    ...(conversations[id] ?? []),
    { id: createId('msg'), role: 'user' as const, text: user, at: nowIso() },
    { id: createId('msg'), role: 'assistant' as const, text: assistant, at: nowIso() },
  ].slice(-30);
  return { ...conversations, [id]: next };
}

function seed(): Persisted {
  const projects: Record<string, Project> = {};
  const order: string[] = [];
  for (const prompt of Object.values(DEMO_PROMPTS)) {
    const project = buildFromPrompt(prompt);
    project.meta.sample = true;
    projects[project.id] = project;
    order.push(project.id);
  }
  return { projects, order, versions: {}, published: {}, conversations: {} };
}

function scheduleSave(get: () => Library) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const state = get();
    const payload: Persisted = {
      projects: state.projects,
      order: state.order,
      versions: state.versions,
      published: state.published,
      conversations: state.conversations,
    };
    void AsyncStorage.setItem(KEY, JSON.stringify(payload));
  }, 350);
}

export function endStroke(id: string) {
  const before = pending[id];
  delete pending[id];
  if (!before) return;
  const state = useLibrary.getState();
  const current = state.projects[id];
  if (!current) return;
  useLibrary.setState({
    past: { ...state.past, [id]: [...(state.past[id] ?? []), before].slice(-40) },
    future: { ...state.future, [id]: [] },
    versions: pushVersion(state.versions, id, before, 'Moved'),
    projects: { ...state.projects, [id]: stamp(current) },
  });
  scheduleSave(useLibrary.getState);
}
