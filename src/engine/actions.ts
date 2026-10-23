import { evaluate } from '@/engine/expr';
import type { Action, Project, Runtime } from '@/schema/types';

const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

export function createRuntime(project: Project, pageId?: string): Runtime {
  return {
    pageId: pageId && project.pages.some((page) => page.id === pageId) ? pageId : (project.pages[0]?.id ?? 'page'),
    state: { ...project.state },
    message: null,
    link: null,
  };
}

export function runActions(project: Project, runtime: Runtime, actions: Action[]): Runtime {
  let next: Runtime = { ...runtime, state: { ...runtime.state }, link: null };
  for (const action of actions) next = applyAction(project, next, action);
  return next;
}

export function applyAction(project: Project, runtime: Runtime, action: Action): Runtime {
  const state = { ...runtime.state };
  switch (action.type) {
    case 'navigate': {
      const exists = project.pages.some((page) => page.id === action.pageId);
      return exists ? { ...runtime, state, pageId: action.pageId, link: null } : { ...runtime, state, link: null };
    }
    case 'set':
    case 'filter':
      state[action.key] = action.value;
      return { ...runtime, state, link: null };
    case 'setExpr':
    case 'calculate': {
      const key = action.type === 'setExpr' ? action.key : action.target;
      const expression = action.type === 'setExpr' ? action.expr : action.expression;
      try {
        const value = evaluate(expression, { state, data: project.data });
        state[key] = value == null ? '' : value;
      } catch {
        state[key] = 'error';
      }
      return { ...runtime, state, link: null };
    }
    case 'toggle': {
      state[action.key] = !state[action.key];
      return { ...runtime, state, link: null };
    }
    case 'inc': {
      const current = Number(state[action.key] ?? 0);
      state[action.key] = (Number.isFinite(current) ? current : 0) + (action.by ?? 1);
      return { ...runtime, state, link: null };
    }
    case 'sort':
      state[action.key] = action.field;
      state[`${action.key}Dir`] = action.direction;
      return { ...runtime, state, link: null };
    case 'submit':
      state.submitted = true;
      return {
        ...runtime,
        state,
        message: action.message ?? runtime.message,
        link: null,
      };
    case 'message':
      return { ...runtime, state, message: action.text, link: null };
    case 'link':
      return SAFE_LINK.test(action.url) ? { ...runtime, state, link: action.url } : { ...runtime, state, link: null };
    default:
      return runtime;
  }
}
