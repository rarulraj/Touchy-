import { chartSeries, readMetric, readText, scopeFor } from '@/renderer/read';
import type { Project, Runtime, Scope, TouchNode } from '@/schema/types';

export function asksAboutScreen(text: string): boolean {
  const line = text.trim();
  return /\?$/.test(line) || /^(what|why|how|who|when|which|explain|tell me|what's|whats)\b/i.test(line);
}

export function homeGuide(): string {
  return 'I can see this phone. The starters are under me, and the library is at the right. Tell me what to make, or tap one. On the next screen, circle a piece and I will walk you through the next tap. I stay in the notch after you leave.';
}

export function answerFor(project: Project, runtime: Runtime, ids: string[], question?: string): string {
  const nodes = ids.map((id) => project.nodes[id]).filter((node): node is TouchNode => Boolean(node));
  if (!nodes.length) {
    return `You're on ${project.name}. I can see the whole screen, not just one box. Circle a number, a chart, or a button. I will name the next tap, say it out loud, and keep it on the notch if you leave.`;
  }
  const scope = scopeFor(project, runtime);
  const steps = nodes.slice(0, 2).map((node) => step(node, scope));
  const more = nodes.length > 2 ? ` ${nodes.length - 2} more pieces are in the circle. Take the first step, then circle the next one.` : '';
  const body = `${steps.join(' ')}${more}`;
  if (!question) return body;
  return `${body} You asked ${question} Do the first tap I named, then ask me again.`;
}

function step(node: TouchNode, scope: Scope): string {
  const text = readText(node, scope).replace(/\s+/g, ' ').trim();
  if (node.type === 'metric') {
    const value = readMetric(node, scope);
    return `${node.label || node.name} reads ${value || 'empty'}. Next, tap the control that changes the range, then circle this number again and I will read the new one.`;
  }
  if (node.chart) {
    const top = chartSeries(node, scope)[0];
    const point = top ? ` Start with ${top.label}, which is ${top.value}.` : '';
    return `This ${node.chart.kind} chart is the picture of the numbers on this screen.${point} Circle one mark if you want that one alone.`;
  }
  if (node.table) return `${node.name} is the table from ${node.table.source}. Read the first row, then circle a row if you want me to walk through that one.`;
  if (node.type === 'button') return `${text || node.name} is the next tap. Press it. I stay on the notch and tell you what the screen did.`;
  if (node.type === 'nav') {
    const first = node.items?.[0]?.label;
    return first ? `These are the pages. Tap ${first} first. Circle the new screen and I will walk you through it.` : 'Tap a page. Circle the new screen and I will walk you through it.';
  }
  if (text) return `${text.slice(0, 120)} If that is not the line you wanted, say make it shorter and I will change it.`;
  return `${node.name} is a ${node.type} on this screen. Circle the piece beside it and I will take you to the next step.`;
}
