import { validateOperations, validateProject } from '@/schema/validate';
import type { Operation, Project } from '@/schema/types';

const SYSTEM = `You are Touchie's creation engine. Return JSON only.
Projects use pages, nodes, state, data, and theme. Nodes are text, image, shape, container, button, input, chart, table, nav, metric, swatch, or progress.
Interactions are validated actions: navigate, set, setExpr, toggle, inc, calculate, filter, sort, submit, message, link.
Never return JavaScript. For edits, return {"summary":"...","operations":[...]} using create_page, add_component, update_component, remove_component, move_component, resize_component, update_style, update_interaction, generate_image, set_state_default, set_type, update_data.
For a new creation, return {"project": Project}.`;

export async function POST(request: Request): Promise<Response> {
  const key = process.env.OPENAI_API_KEY;
  let body: { kind?: string; prompt?: string; instruction?: string; project?: Project; selection?: string[] } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }
  if (body.kind === 'status') return Response.json({ openai: Boolean(key) });
  if (!key) return Response.json({ provider: 'engine' });

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const user =
    body.kind === 'edit'
      ? `Instruction: ${body.instruction}\nSelection: ${(body.selection ?? []).join(', ')}\nProject: ${JSON.stringify(body.project).slice(0, 24000)}`
      : `Make this: ${body.prompt}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!response.ok) return Response.json({ provider: 'engine', error: 'Model request failed' });
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return Response.json({ provider: 'engine' });
    const parsed = JSON.parse(content) as { project?: unknown; operations?: unknown; summary?: string };
    if (parsed.project) {
      const project = validateProject(parsed.project);
      if (!project.ok) return Response.json({ provider: 'engine', errors: project.errors });
      return Response.json({ provider: 'openai', project: project.project });
    }
    if (parsed.operations) {
      const operations = validateOperations(parsed.operations);
      if (!operations.ok) return Response.json({ provider: 'engine', errors: operations.errors });
      return Response.json({ provider: 'openai', summary: parsed.summary ?? 'Updated.', operations: operations.operations satisfies Operation[] });
    }
    return Response.json({ provider: 'engine' });
  } catch {
    return Response.json({ provider: 'engine' });
  }
}
