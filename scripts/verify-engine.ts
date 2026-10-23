import { DEMO_PROMPTS, buildFromPrompt } from '../src/ai/generate';
import { planEdits } from '../src/ai/edit';
import { applyOperations } from '../src/ai/operations';
import { createRuntime, runActions } from '../src/engine/actions';
import { evaluate } from '../src/engine/expr';
import { nodesInLasso } from '../src/canvas/geometry';
import { validateProject } from '../src/schema/validate';
import { sumCheck } from '../src/renderer/read';

const failures: string[] = [];
const check = (name: string, ok: boolean, detail = '') => {
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
};

const math = evaluate('1 + 2 * 3', { state: {}, data: {} });
check('math precedence', math === 7);
check('compare', evaluate("state.q == 'mitochondria'", { state: { q: 'mitochondria' }, data: {} }) === true);
check('calc', evaluate("calc('12+3*2')", { state: {}, data: {} }) === 18);

const finance = buildFromPrompt(DEMO_PROMPTS.finance);
const quiz = buildFromPrompt(DEMO_PROMPTS.quiz);
const site = buildFromPrompt(DEMO_PROMPTS.portfolio);
const deck = buildFromPrompt(DEMO_PROMPTS.deck);
const mood = buildFromPrompt(DEMO_PROMPTS.moodboard);

for (const project of [finance, quiz, site, deck, mood]) {
  const parsed = validateProject(project);
  check(`${project.type} validates`, parsed.ok, parsed.ok ? '' : parsed.errors.join('; '));
}

const runtime = createRuntime(finance);
const week = { ...runtime, state: { ...runtime.state, range: 'week' } };
const month = { ...runtime, state: { ...runtime.state, range: 'month' } };
const all = { ...runtime, state: { ...runtime.state, range: 'all' } };
const spent = (state: typeof runtime) => sumCheck(finance, state, "sumFiltered('transactions','amount', state.range, 'kind', 'expense')");
check('week spend', spent(week) === 234, String(spent(week)));
check('month spend', spent(month) === 2222, String(spent(month)));
check('all spend', spent(all) === 2982, String(spent(all)));
check('filters differ', spent(week) < spent(month) && spent(month) < spent(all));

let quizRuntime = createRuntime(quiz, 'quiz');
const answers = ['mitochondria', 'thymine', 'photosynthesis', 'ribosome'];
answers.forEach((answer, index) => {
  quizRuntime = runActions(quiz, quizRuntime, [{ type: 'set', key: `q${index + 1}`, value: answer }]);
});
const scoreExpr = "(state.q1 == 'mitochondria' ? 1 : 0) + (state.q2 == 'thymine' ? 1 : 0) + (state.q3 == 'photosynthesis' ? 1 : 0) + (state.q4 == 'ribosome' ? 1 : 0)";
quizRuntime = runActions(quiz, quizRuntime, [{ type: 'calculate', target: 'score', expression: scoreExpr }]);
check('quiz score', quizRuntime.state.score === 4, String(quizRuntime.state.score));

const home = createRuntime(site, 'home');
const work = runActions(site, home, [{ type: 'navigate', pageId: 'work' }]);
check('portfolio nav', work.pageId === 'work');
check('deck pages', deck.pages.length >= 5);
check('mood images', Object.values(mood.nodes).filter((node) => node.type === 'image').length >= 4);

const bigger = planEdits(finance, [], 'make these buttons bigger');
const resized = applyOperations(finance, bigger.operations);
const before = Object.values(finance.nodes).find((node) => node.type === 'button');
const after = before ? resized.project.nodes[before.id] : undefined;
check('bigger buttons', Boolean(before && after && after.frame.height > before.frame.height));

const page = mood.pages[0];
const image = page ? Object.values(mood.nodes).find((node) => node.type === 'image') : undefined;
if (page && image) {
  const polygon = [
    { x: image.frame.x - 10, y: image.frame.y - 10 },
    { x: image.frame.x + image.frame.width + 10, y: image.frame.y - 10 },
    { x: image.frame.x + image.frame.width + 10, y: image.frame.y + image.frame.height + 10 },
    { x: image.frame.x - 10, y: image.frame.y + image.frame.height + 10 },
  ];
  const hits = nodesInLasso(page.nodeIds, mood.nodes, polygon);
  check('circle selects image', hits.some((node) => node.id === image.id));
}

const hostile = evaluate("calc('process.exit(1)')", { state: {}, data: {} });
check('calc rejects code', hostile === 'error');

if (failures.length) {
  throw new Error(failures.join('\n'));
}
console.log('Touchie engine ok');
