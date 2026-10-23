import type { Intent } from '@/ai/intent';
import { box, draft, press } from '@/ai/kit';
import { titleCase } from '@/schema/ids';
import type { Project, Theme } from '@/schema/types';

interface Choice {
  id: string;
  label: string;
}

interface StudyQuestion {
  prompt: string;
  options: Choice[];
  answer: string;
  lessonTitle: string;
  lessonBody: string;
  lessonAnswer: string;
}

export function buildStudy(intent: Intent): Project {
  const pack = packFor(intent);
  const d = draft(intent);
  const theme = intent.theme;
  d.state.submitted = false;
  d.state.score = 0;
  pack.questions.forEach((_, index) => {
    d.state[`q${index + 1}`] = '';
    d.state[`reveal${index + 1}`] = false;
  });

  const guide = d.page('guide', 'Guide', 360, 250 + pack.questions.length * 196, theme.paper);
  const quiz = d.page('quiz', 'Quiz', 360, 250 + pack.questions.length * 214, theme.paper);
  for (const page of d.pages) {
    d.put(page.id, 'nav', box(12, 14, page.width - 24, 40), {
      name: 'nav',
      items: [
        { label: 'Guide', pageId: 'guide' },
        { label: 'Quiz', pageId: 'quiz' },
      ],
      locked: true,
      style: navStyle(theme),
    });
  }

  d.put(guide.id, 'text', box(20, 72, 300, 18), {
    name: 'eyebrow',
    text: 'study guide',
    style: { color: theme.accent, fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  });
  d.put(guide.id, 'text', box(20, 94, 320, 46), {
    name: 'title',
    text: pack.heading,
    style: { color: theme.ink, fontSize: 32, font: 'display' },
  });
  d.put(guide.id, 'text', box(20, 146, 320, 40), {
    name: 'dek',
    text: 'Read a card, reveal the answer, then try the quiz.',
    style: { color: theme.muted, fontSize: 15 },
  });

  pack.questions.forEach((question, index) => {
    const y = 200 + index * 196;
    const key = `reveal${index + 1}`;
    d.put(guide.id, 'container', box(16, y, 328, 184), {
      name: question.lessonTitle,
      style: { background: theme.card, radius: 22, shadow: true },
    });
    d.put(guide.id, 'text', box(32, y + 14, 280, 22), {
      text: question.lessonTitle,
      style: { color: theme.ink, fontSize: 16, fontWeight: '700' },
    });
    d.put(guide.id, 'text', box(32, y + 40, 290, 58), {
      text: question.lessonBody,
      style: { color: theme.muted, fontSize: 14 },
    });
    d.put(guide.id, 'button', box(32, y + 108, 140, 36), {
      name: `reveal ${index + 1}`,
      text: 'Show answer',
      style: { background: theme.ink, color: theme.paper, radius: 18, align: 'center', fontSize: 13, fontWeight: '600' },
      activeWhen: `state.${key} == true`,
      activeStyle: { background: theme.accent },
      interactions: press([{ type: 'toggle', key }]),
    });
    d.put(guide.id, 'text', box(32, y + 148, 290, 24), {
      text: question.lessonAnswer,
      visibleWhen: `state.${key} == true`,
      style: { color: theme.good, fontSize: 14, fontWeight: '700' },
    });
  });

  d.put(quiz.id, 'text', box(20, 70, 200, 36), {
    text: 'Check yourself',
    style: { color: theme.ink, fontSize: 28, font: 'display' },
  });
  d.put(quiz.id, 'metric', box(230, 66, 110, 64), {
    name: 'score',
    label: 'Score',
    valueExpr: 'state.score',
    format: 'number',
    style: { background: theme.ink, color: theme.paper, radius: 18, padding: 8, align: 'center', font: 'display', fontSize: 22 },
  });

  pack.questions.forEach((question, index) => {
    const y = 148 + index * 214;
    const key = `q${index + 1}`;
    d.put(quiz.id, 'text', box(20, y, 324, 48), {
      text: `${index + 1}. ${question.prompt}`,
      style: { color: theme.ink, fontSize: 15, fontWeight: '600' },
    });
    question.options.forEach((option, optionIndex) => {
      d.put(quiz.id, 'button', box(20, y + 52 + optionIndex * 38, 324, 34), {
        name: `${key} ${option.id}`,
        text: option.label,
        style: {
          background: theme.card,
          color: theme.ink,
          radius: 12,
          align: 'left',
          padding: 10,
          fontSize: 13,
          borderWidth: 1,
          borderColor: theme.line,
        },
        activeWhen: `state.${key} == '${option.id}'`,
        activeStyle: { background: theme.accent, color: theme.accentText, borderColor: theme.accent },
        interactions: press([{ type: 'set', key, value: option.id }]),
      });
    });
  });

  const scoreExpr = pack.questions.map((question, index) => `(state.q${index + 1} == '${question.answer}' ? 1 : 0)`).join(' + ');
  const footer = 156 + pack.questions.length * 214;
  d.put(quiz.id, 'button', box(20, footer, 150, 46), {
    name: 'submit quiz',
    text: 'Score it',
    style: { background: theme.accent, color: theme.accentText, radius: 23, align: 'center', fontWeight: '700' },
    interactions: press([
      { type: 'calculate', target: 'score', expression: scoreExpr },
      { type: 'set', key: 'submitted', value: true },
      { type: 'message', text: 'Score updated.' },
    ]),
  });
  d.put(quiz.id, 'button', box(180, footer, 160, 46), {
    name: 'reset quiz',
    text: 'Try again',
    style: { background: theme.card, color: theme.ink, radius: 23, align: 'center', fontWeight: '600', borderWidth: 1, borderColor: theme.line },
    interactions: press([
      ...pack.questions.map((_, index) => ({ type: 'set' as const, key: `q${index + 1}`, value: '' })),
      { type: 'set', key: 'score', value: 0 },
      { type: 'set', key: 'submitted', value: false },
    ]),
  });
  d.put(quiz.id, 'text', box(20, footer + 56, 320, 36), {
    text: `{{ state.score }} of ${pack.questions.length}. The guide is still on the other page.`,
    visibleWhen: 'state.submitted == true',
    style: { color: theme.ink, fontSize: 14, fontWeight: '600' },
  });

  return d.finish(pack.heading, 'interactive');
}

function navStyle(theme: Theme) {
  return {
    background: theme.card,
    radius: 20,
    color: theme.ink,
    fontSize: 13,
    fontWeight: '600' as const,
    shadow: true,
  };
}

function packFor(intent: Intent): { heading: string; questions: StudyQuestion[] } {
  const text = `${intent.prompt} ${intent.subject}`.toLowerCase();
  if (/organic|chemistr/.test(text)) return { heading: 'Organic chemistry', questions: CHEMISTRY };
  if (/biolog|cell|genetic|mitosis/.test(text)) return { heading: 'Biology', questions: BIOLOGY };
  if (/solar|planet|space|astronom/.test(text)) return { heading: 'Solar system', questions: SOLAR };
  if (/artificial intelligence|\bai\b|machine learning/.test(text)) return { heading: 'Artificial intelligence', questions: AI_PACK };
  return { heading: titleCase(intent.subject), questions: starter(intent.subject) };
}

const CHEMISTRY: StudyQuestion[] = [
  q('Which group makes a molecule a carboxylic acid?', 'carboxyl', [['carboxyl', 'Carboxyl'], ['amine', 'Amine'], ['alkene', 'Alkene'], ['ether', 'Ether']], 'Functional groups', 'Alcohols carry a hydroxyl. Carboxylic acids carry a carbonyl and a hydroxyl on the same carbon.', 'The carboxyl group.'),
  q('What is the hybridization of carbon in methane?', 'sp3', [['sp', 'sp'], ['sp2', 'sp2'], ['sp3', 'sp3'], ['s', 's only']], 'Bonding', 'Methane has four single bonds in a tetrahedron. That geometry comes from sp3 orbitals.', 'sp3.'),
  q('Which reaction adds atoms across a double bond?', 'addition', [['addition', 'Addition'], ['elimination', 'Elimination'], ['substitution', 'Substitution'], ['rearrangement', 'Rearrangement only']], 'Reactions', 'Addition uses up a pi bond. Substitution swaps a group. Elimination builds a pi bond.', 'Addition.'),
  q('Benzene is best described as which system?', 'aromatic', [['aromatic', 'Aromatic'], ['alkane', 'Saturated alkane'], ['radical', 'A free radical'], ['ionic', 'Fully ionic']], 'Aromaticity', 'Benzene is a flat ring with delocalized electrons. That is aromatic, not a simple alkene.', 'Aromatic.'),
];

const BIOLOGY: StudyQuestion[] = [
  q('Which organelle makes most of the cell’s ATP?', 'mitochondria', [['nucleus', 'Nucleus'], ['mitochondria', 'Mitochondria'], ['ribosome', 'Ribosome'], ['golgi', 'Golgi apparatus']], 'The cell', 'The nucleus stores DNA. Mitochondria run the reactions that produce most ATP.', 'Mitochondria.'),
  q('In DNA, adenine pairs with which base?', 'thymine', [['thymine', 'Thymine'], ['cytosine', 'Cytosine'], ['guanine', 'Guanine'], ['uracil', 'Uracil, in DNA']], 'Genetics', 'Adenine pairs with thymine in DNA. In RNA, adenine pairs with uracil.', 'Thymine.'),
  q('What do plants use to store energy from sunlight?', 'photosynthesis', [['photosynthesis', 'Photosynthesis'], ['fermentation', 'Fermentation only'], ['digestion', 'Digestion'], ['transcription', 'Transcription']], 'Energy', 'Photosynthesis builds sugars from carbon dioxide and water, using light.', 'Photosynthesis.'),
  q('Where are proteins assembled?', 'ribosome', [['ribosome', 'Ribosomes'], ['lysosome', 'Lysosomes'], ['vacuole', 'Vacuole'], ['membrane', 'Only the membrane']], 'Expression', 'Ribosomes read mRNA and link amino acids.', 'Ribosomes.'),
];

const SOLAR: StudyQuestion[] = [
  q('Which planet is closest to the Sun?', 'mercury', [['mercury', 'Mercury'], ['venus', 'Venus'], ['mars', 'Mars'], ['earth', 'Earth']], 'Order', 'Mercury, Venus, Earth, Mars. Mercury sits nearest the Sun.', 'Mercury.'),
  q('Which planet is famous for its rings?', 'saturn', [['saturn', 'Saturn'], ['mars', 'Mars'], ['venus', 'Venus'], ['mercury', 'Mercury']], 'Giants', 'Saturn’s rings are the ones you can see in a small telescope.', 'Saturn.'),
  q('What is the Sun, mainly?', 'star', [['star', 'A star'], ['planet', 'A rocky planet'], ['galaxy', 'A galaxy'], ['comet', 'A comet']], 'The star', 'The Sun is a star: hot plasma, mostly hydrogen, fusing in the core.', 'A star.'),
  q('About how long is one orbit of Earth?', 'year', [['year', 'About 365 days'], ['day', '24 hours'], ['month', '28 days'], ['week', '7 days']], 'The year', 'One trip around the Sun is one year, about 365 days.', 'About 365 days.'),
];

const AI_PACK: StudyQuestion[] = [
  q('Training with examples and labels is which setup?', 'supervised', [['supervised', 'Supervised learning'], ['unsupervised', 'Unsupervised only'], ['hardware', 'Just a faster chip'], ['database', 'A spreadsheet']], 'Learning setups', 'Supervised learning uses labeled examples. Unsupervised learning looks for structure without labels.', 'Supervised learning.'),
  q('What does a language model predict?', 'next', [['next', 'A likely next piece of text'], ['voltage', 'A voltage'], ['pixel', 'Only pixels'], ['law', 'A legal verdict']], 'Language models', 'Given the words so far, it predicts a likely next piece of text.', 'The next piece of text.'),
  q('Which is a real limit of these systems?', 'wrong', [['wrong', 'They can be confidently wrong'], ['perfect', 'They are perfect at facts'], ['alive', 'They are alive'], ['secret', 'They know your passwords']], 'Limits', 'They can sound sure and still be wrong. Checking the claim is still your job.', 'They can be confidently wrong.'),
  q('What is a useful way to start a hard task?', 'brief', [['brief', 'A clear goal and context'], ['blank', 'An empty message'], ['secret', 'Your passwords'], ['once', 'Never revise it']], 'Working with one', 'Give the goal, the context, and what done looks like. Then edit the result.', 'Goal, context, and a picture of done.'),
];

function q(
  prompt: string,
  answer: string,
  options: [string, string][],
  lessonTitle: string,
  lessonBody: string,
  lessonAnswer: string,
): StudyQuestion {
  return {
    prompt,
    answer,
    options: options.map(([id, label]) => ({ id, label })),
    lessonTitle,
    lessonBody,
    lessonAnswer,
  };
}

function starter(subject: string): StudyQuestion[] {
  const name = titleCase(subject || 'This idea');
  return [
    q(`This guide is about which subject?`, 'subject', [['subject', name], ['other', 'A different topic'], ['blank', 'Nothing yet'], ['all', 'Every topic at once']], 'The subject', `This board starts as a scaffold about ${name}. Circle a card and tell Touchy the real outline.`, name),
    q('What should you do with a starter card?', 'rewrite', [['rewrite', 'Rewrite it in your words'], ['trust', 'Treat it as a textbook'], ['hide', 'Hide the whole guide'], ['skip', 'Skip thinking']], 'Make it yours', 'These cards are a starting structure, not a finished textbook.', 'Rewrite it.'),
    q('A good study pass includes which move?', 'recall', [['recall', 'Try to recall, then peek'], ['once', 'Read it once'], ['copy', 'Copy it without looking away'], ['rush', 'Rush the quiz first']], 'Recall', 'Reading is the start. Trying to answer before you peek is the part that sticks.', 'Answer, then peek.'),
    q('Where do you check these four ideas?', 'quiz', [['quiz', 'On the quiz page'], ['email', 'In an email'], ['map', 'On a map'], ['none', 'Nowhere']], 'The quiz', 'The quiz scores the answers that match these cards.', 'On the quiz page.'),
  ];
}
