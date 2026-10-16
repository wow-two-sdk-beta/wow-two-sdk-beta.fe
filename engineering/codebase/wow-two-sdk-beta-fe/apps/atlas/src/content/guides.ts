import { spec, type LayoutSpec } from './model';

/** One possible answer; each adds weight to some outcomes. */
export interface GuideOption {
  readonly label: string;
  readonly weights: Readonly<Record<string, number>>;
}

/** One question of a guide. */
export interface GuideQuestion {
  readonly id: string;
  readonly text: string;
  readonly options: ReadonlyArray<GuideOption>;
}

/** A recommendation the guide can land on. */
export interface GuideOutcome {
  readonly id: string;
  readonly name: string;
  readonly why: string;
  readonly spec: LayoutSpec;
  readonly archetype?: string;
}

/** A decision guide — questions that score outcomes. */
export interface Guide {
  readonly id: string;
  readonly name: string;
  readonly intro: string;
  readonly questions: ReadonlyArray<GuideQuestion>;
  readonly outcomes: ReadonlyArray<GuideOutcome>;
}

export const Guides: ReadonlyArray<Guide> = [
  {
    id: 'navigation',
    name: 'Top bar, sidebar, rail or tabs?',
    intro: 'Navigation follows the number and stability of destinations, the width the content needs and the device.',
    questions: [
      {
        id: 'count',
        text: 'How many top-level destinations?',
        options: [
          { label: '3–5', weights: { top: 2, bottom: 1 } },
          { label: '6–10', weights: { side: 2, top: 1 } },
          { label: 'More, or growing', weights: { side: 3 } },
          { label: 'Modes, not pages', weights: { rail: 3, toolbar: 1 } },
        ],
      },
      {
        id: 'content',
        text: 'What fills the main area?',
        options: [
          { label: 'Wide boards or tables', weights: { top: 2, rail: 1 } },
          { label: 'A canvas (map, 3D, media)', weights: { toolbar: 3, rail: 1 } },
          { label: 'Pages and forms', weights: { side: 2 } },
          { label: 'Reading', weights: { top: 1, side: 1 } },
        ],
      },
      {
        id: 'device',
        text: 'Which device matters most?',
        options: [
          { label: 'Desktop', weights: { side: 1, top: 1 } },
          { label: 'Phone first', weights: { bottom: 4 } },
          { label: 'Both equally', weights: { top: 1, rail: 1 } },
        ],
      },
    ],
    outcomes: [
      {
        id: 'top',
        name: 'Top bar',
        why: 'Few stable destinations and wide content: the top bar keeps every horizontal pixel for the work.',
        spec: spec({ nav: 'top', local: 'filters', content: 'kanban' }),
        archetype: 'top-bar-workspace',
      },
      {
        id: 'side',
        name: 'Sidebar',
        why: 'Many or growing destinations scan faster in a vertical list and never force a redesign.',
        spec: spec({ nav: 'side', content: 'table' }),
        archetype: 'sidebar-shell',
      },
      {
        id: 'rail',
        name: 'Icon rail',
        why: 'Modes that each own a list fit a rail, leaving the width to the work.',
        spec: spec({ nav: 'rail', leading: 'library', content: 'detail' }),
        archetype: 'icon-rail',
      },
      {
        id: 'toolbar',
        name: 'Toolbar over a canvas',
        why: 'A canvas app is one job: tools and modes beat destinations.',
        spec: spec({ nav: 'toolbar', trailing: 'inspector', content: 'map', density: 'compact' }),
        archetype: 'canvas-docked',
      },
      {
        id: 'bottom',
        name: 'Bottom tabs',
        why: 'On phones, three to five peers belong under the thumb (Material 3: navigation bar below 600dp).',
        spec: spec({ nav: 'bottom', content: 'list' }),
        archetype: 'mobile-tabs',
      },
    ],
  },
  {
    id: 'panels',
    name: 'Docked, floating, drawer or split?',
    intro:
      'Panels follow the hero, the panel’s length and how often it is open. Figma moved UI3 back to docked panels for speed.',
    questions: [
      {
        id: 'hero',
        text: 'Is a canvas the hero?',
        options: [
          { label: 'Yes — map, 3D, media', weights: { floating: 2, docked: 1 } },
          { label: 'No — records and pages', weights: { drawer: 1, split: 1 } },
        ],
      },
      {
        id: 'length',
        text: 'What goes in the panel?',
        options: [
          { label: 'A few short controls', weights: { floating: 3 } },
          { label: 'Long readings or evidence', weights: { docked: 3 } },
          { label: 'One record’s detail', weights: { drawer: 2, split: 1 } },
        ],
      },
      {
        id: 'frequency',
        text: 'How often is it open?',
        options: [
          { label: 'Always', weights: { docked: 2, split: 1 } },
          { label: 'On demand', weights: { drawer: 2, floating: 1 } },
        ],
      },
      {
        id: 'compare',
        text: 'Must the list and the item be compared side by side?',
        options: [
          { label: 'Yes', weights: { split: 3 } },
          { label: 'No', weights: {} },
        ],
      },
    ],
    outcomes: [
      {
        id: 'floating',
        name: 'Floating islands',
        why: 'A canvas hero with short panels: islands frame it and keep the mood.',
        spec: spec({
          nav: 'toolbar',
          leading: 'library',
          trailing: 'inspector',
          panelMode: 'floating',
          content: 'scene',
          surface: 'islands',
          density: 'spacious',
          bottomDock: true,
        }),
        archetype: 'canvas-islands',
      },
      {
        id: 'docked',
        name: 'Docked, resizable panel',
        why: 'Long panels must not cover the canvas; docking keeps both readable.',
        spec: spec({ nav: 'toolbar', local: 'tabs', trailing: 'inspector', content: 'map', density: 'compact' }),
        archetype: 'canvas-docked',
      },
      {
        id: 'drawer',
        name: 'Overlay drawer',
        why: 'Occasional detail over a collection keeps the list context.',
        spec: spec({ nav: 'top', local: 'filters', trailing: 'detail', panelMode: 'overlay', content: 'grid' }),
        archetype: 'collection-drawer',
      },
      {
        id: 'split',
        name: 'Split view',
        why: 'Comparison needs both panes visible at once.',
        spec: spec({ nav: 'side', leading: 'list', content: 'detail' }),
        archetype: 'master-detail',
      },
    ],
  },
  {
    id: 'collections',
    name: 'Table, list, grid or board?',
    intro:
      'Start with a list; move to a table when comparing columns is the job, a grid when images decide, a board when stages do.',
    questions: [
      {
        id: 'decides',
        text: 'What decides which item people want?',
        options: [
          { label: 'The image', weights: { grid: 3 } },
          { label: 'Attributes', weights: { table: 3 } },
          { label: 'The stage it is in', weights: { kanban: 3 } },
          { label: 'Just the next one', weights: { list: 3 } },
        ],
      },
      {
        id: 'volume',
        text: 'How many items at a time?',
        options: [
          { label: 'Under 50', weights: { kanban: 1, grid: 1, list: 1 } },
          { label: 'Hundreds or more', weights: { table: 2, list: 1 } },
        ],
      },
      {
        id: 'bulk',
        text: 'Bulk actions on many items?',
        options: [
          { label: 'Yes', weights: { table: 2 } },
          { label: 'No', weights: {} },
        ],
      },
      {
        id: 'phone',
        text: 'Used on phones?',
        options: [
          { label: 'Often', weights: { list: 2, grid: 1 } },
          { label: 'Rarely', weights: { table: 1 } },
        ],
      },
    ],
    outcomes: [
      {
        id: 'table',
        name: 'Table',
        why: 'Comparing attributes and acting in bulk: rows and columns answer instantly.',
        spec: spec({ nav: 'side', local: 'filters', content: 'table', density: 'compact' }),
        archetype: 'data-console',
      },
      {
        id: 'list',
        name: 'List',
        why: 'Scanning one item after another with a few key facts.',
        spec: spec({ nav: 'top', content: 'list' }),
      },
      {
        id: 'grid',
        name: 'Gallery grid',
        why: 'When the image does the deciding, cards give it room.',
        spec: spec({ nav: 'top', local: 'filters', content: 'grid', surface: 'cards' }),
        archetype: 'gallery',
      },
      {
        id: 'kanban',
        name: 'Kanban board',
        why: 'Stage-based work reads best as columns you move cards across.',
        spec: spec({ nav: 'top', local: 'filters', content: 'kanban' }),
        archetype: 'board',
      },
    ],
  },
  {
    id: 'character',
    name: 'Density and surface',
    intro: 'Who works here, how much data a screen carries and how much mood matters set the density and the surface.',
    questions: [
      {
        id: 'who',
        text: 'Who works here?',
        options: [
          { label: 'Experts, all day', weights: { console: 3 } },
          { label: 'A mixed team', weights: { business: 2 } },
          { label: 'Consumers or creatives', weights: { atelier: 2, showcase: 1 } },
        ],
      },
      {
        id: 'data',
        text: 'How much data per screen?',
        options: [
          { label: 'A lot', weights: { console: 2 } },
          { label: 'Some', weights: { business: 2 } },
          { label: 'Little — one object', weights: { atelier: 2, showcase: 1 } },
        ],
      },
      {
        id: 'mood',
        text: 'How much does mood matter?',
        options: [
          { label: 'Calm tool', weights: { console: 1, business: 1 } },
          { label: 'Editorial and warm', weights: { atelier: 3 } },
          { label: 'Showy, brand-led', weights: { showcase: 3 } },
        ],
      },
    ],
    outcomes: [
      {
        id: 'console',
        name: 'Compact and flat',
        why: 'Experts on data-heavy screens: small controls, one tight gutter, hairline borders (TNIS).',
        spec: spec({ nav: 'toolbar', trailing: 'inspector', content: 'map', density: 'compact', surface: 'flat' }),
        archetype: 'canvas-docked',
      },
      {
        id: 'business',
        name: 'Comfortable cards',
        why: 'The safe middle for business apps: medium controls on cards with one gutter.',
        spec: spec({ nav: 'side', content: 'dashboard', surface: 'cards' }),
        archetype: 'dashboard',
      },
      {
        id: 'atelier',
        name: 'Spacious islands',
        why: 'One hero object with generous space around it (Ocharo).',
        spec: spec({
          nav: 'toolbar',
          leading: 'library',
          trailing: 'inspector',
          panelMode: 'floating',
          content: 'scene',
          surface: 'islands',
          density: 'spacious',
          bottomDock: true,
        }),
        archetype: 'canvas-islands',
      },
      {
        id: 'showcase',
        name: 'Glass chrome',
        why: 'Brand colour behind translucent navigation, opaque data below (Wheelhouse chrome).',
        spec: spec({ nav: 'top', leading: 'navigator', content: 'dashboard', surface: 'glass' }),
        archetype: 'studio-three-pane',
      },
    ],
  },
];

/** Scores a guide's outcomes from the chosen option index per question; ties keep outcome order. */
export function recommend(guide: Guide, answers: Readonly<Record<string, number>>): GuideOutcome {
  const scores = new Map(guide.outcomes.map((outcome) => [outcome.id, 0]));
  for (const question of guide.questions) {
    const option = question.options[answers[question.id] ?? -1];
    if (!option) continue;
    for (const [outcome, weight] of Object.entries(option.weights)) {
      scores.set(outcome, (scores.get(outcome) ?? 0) + weight);
    }
  }
  let best = guide.outcomes[0]!;
  for (const outcome of guide.outcomes) {
    if ((scores.get(outcome.id) ?? 0) > (scores.get(best.id) ?? 0)) best = outcome;
  }
  return best;
}
