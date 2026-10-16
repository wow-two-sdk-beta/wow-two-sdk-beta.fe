import { spec, type LayoutSpec } from './model';

/** One pattern — a single decision axis shown in isolation. */
export interface Pattern {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly spec: LayoutSpec;
  readonly shines: ReadonlyArray<string>;
  readonly avoid: ReadonlyArray<string>;
}

/** A group of patterns that answer the same question. */
export interface PatternGroup {
  readonly id: string;
  readonly name: string;
  readonly question: string;
  readonly patterns: ReadonlyArray<Pattern>;
}

export const PatternGroups: ReadonlyArray<PatternGroup> = [
  {
    id: 'navigation',
    name: 'Navigation',
    question: 'Where do the destinations live?',
    patterns: [
      {
        id: 'nav-top',
        name: 'Top bar',
        summary: 'Three to seven short destinations across the top; content keeps the width.',
        spec: spec({ nav: 'top', content: 'grid' }),
        shines: ['Few, stable destinations', 'Wide content', 'High content-to-chrome ratio'],
        avoid: ['Growing lists', 'Long labels', 'Deep hierarchies'],
      },
      {
        id: 'nav-side',
        name: 'Sidebar',
        summary: 'Grouped vertical list; scales with the product and scans quickly.',
        spec: spec({ nav: 'side', content: 'table' }),
        shines: ['Many or growing destinations', 'Groups and counts', 'Desktop apps used all day'],
        avoid: ['Canvas-first tools', 'Tiny apps'],
      },
      {
        id: 'nav-rail',
        name: 'Icon rail',
        summary: 'Icons only; modes rather than pages; the rest of the width goes to work.',
        spec: spec({ nav: 'rail', leading: 'library', content: 'detail' }),
        shines: ['Modes that own a list', 'Power users', 'Medium windows (tablets)'],
        avoid: ['Unfamiliar icons without labels', 'More than about seven modes'],
      },
      {
        id: 'nav-toolbar',
        name: 'Toolbar',
        summary: 'A tool row instead of destinations — single-purpose canvas apps.',
        spec: spec({ nav: 'toolbar', content: 'map', trailing: 'inspector', density: 'compact' }),
        shines: ['One job, one canvas', 'Tools and modes over pages'],
        avoid: ['Multi-area products — pair with a top bar or rail'],
      },
      {
        id: 'nav-bottom',
        name: 'Bottom tabs',
        summary: 'Three to five peer destinations under the thumb on phones.',
        spec: spec({ nav: 'bottom', content: 'feed' }),
        shines: ['Phone-first products', 'Frequent switching between peers'],
        avoid: ['More than five destinations', 'Desktop'],
      },
    ],
  },
  {
    id: 'panels',
    name: 'Panels',
    question: 'How do the side panels sit next to the work?',
    patterns: [
      {
        id: 'panel-docked',
        name: 'Docked',
        summary: 'Attached to the frame; the work area shrinks to make room. Resizable and collapsible.',
        spec: spec({ nav: 'toolbar', trailing: 'inspector', content: 'map', density: 'compact' }),
        shines: ['Long, data-heavy panels', 'Panels that are always open', 'Precise, fast work'],
        avoid: ['Immersive canvases where every pixel is the hero'],
      },
      {
        id: 'panel-floating',
        name: 'Floating islands',
        summary: 'Rounded cards over a full-bleed canvas, separated by gaps.',
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
        shines: ['A canvas hero', 'A few short panels', 'Mood and brand'],
        avoid: ['Heavy panning — content slides under the islands', 'Long panels', 'Many panels at once'],
      },
      {
        id: 'panel-overlay',
        name: 'Overlay drawer',
        summary: 'Slides over the content on demand and leaves again.',
        spec: spec({ nav: 'top', local: 'filters', trailing: 'detail', panelMode: 'overlay', content: 'table' }),
        shines: ['Occasional detail over a collection', 'Keeping the list context'],
        avoid: ['Side-by-side comparison', 'Long editing sessions'],
      },
      {
        id: 'panel-split',
        name: 'Split',
        summary: 'Two permanent panes; the list and the selected item share the screen.',
        spec: spec({ nav: 'side', leading: 'list', content: 'detail' }),
        shines: ['Triage', 'Comparison with the list in view'],
        avoid: ['Phones — collapse to push navigation'],
      },
    ],
  },
  {
    id: 'collections',
    name: 'Collections',
    question: 'How is a set of items shown?',
    patterns: [
      {
        id: 'view-table',
        name: 'Table',
        summary: 'Rows and columns: “which row has the highest value in this column?”',
        spec: spec({ nav: 'top', local: 'filters', content: 'table', density: 'compact' }),
        shines: ['Many attributes', 'Sorting, filtering, bulk actions'],
        avoid: ['Visual items', 'Phones without a card fallback'],
      },
      {
        id: 'view-list',
        name: 'List',
        summary: 'One line per item with a few key facts — scanning in order.',
        spec: spec({ nav: 'top', content: 'list' }),
        shines: ['Inboxes, feeds, queues', 'Phones'],
        avoid: ['Comparing many attributes'],
      },
      {
        id: 'view-grid',
        name: 'Gallery grid',
        summary: 'Cards whose media carries the decision.',
        spec: spec({ nav: 'top', local: 'filters', content: 'grid', surface: 'cards' }),
        shines: ['Photos, swatches, products', 'Browsing'],
        avoid: ['Attribute comparison', 'Text-only records'],
      },
      {
        id: 'view-kanban',
        name: 'Kanban',
        summary: 'Stage columns; progress by moving cards.',
        spec: spec({ nav: 'top', local: 'filters', content: 'kanban' }),
        shines: ['Stage-based flow', 'Small work in progress per stage'],
        avoid: ['Huge columns', 'Multi-axis sorting'],
      },
      {
        id: 'view-calendar',
        name: 'Calendar',
        summary: 'Items placed on dates and durations.',
        spec: spec({ nav: 'side', content: 'calendar' }),
        shines: ['Scheduling', 'Deadlines and bookings'],
        avoid: ['Undated work'],
      },
      {
        id: 'view-map',
        name: 'Map',
        summary: 'Items placed in space.',
        spec: spec({ nav: 'toolbar', trailing: 'list', content: 'map', density: 'compact' }),
        shines: ['Spatial questions: where, how far, what is near'],
        avoid: ['Non-spatial data'],
      },
      {
        id: 'view-feed',
        name: 'Feed / timeline',
        summary: 'A chronological stream.',
        spec: spec({ nav: 'top', trailing: 'context', content: 'feed' }),
        shines: ['Activity and history'],
        avoid: ['Comparison'],
      },
    ],
  },
  {
    id: 'surfaces',
    name: 'Surfaces',
    question: 'How do regions separate from each other?',
    patterns: [
      {
        id: 'surface-flat',
        name: 'Flat',
        summary: 'Regions meet at hairline borders; no gaps, no shadows.',
        spec: spec({ nav: 'side', trailing: 'inspector', content: 'table', surface: 'flat' }),
        shines: ['Dense tools', 'Calm, serious consoles'],
        avoid: ['Consumer and brand moments'],
      },
      {
        id: 'surface-cards',
        name: 'Cards',
        summary: 'Rounded cards on a tinted canvas with one gutter.',
        spec: spec({ nav: 'side', trailing: 'inspector', content: 'dashboard', surface: 'cards' }),
        shines: ['Mixed content', 'Dashboards', 'Friendly modern apps'],
        avoid: ['Very dense data (cards cost padding)'],
      },
      {
        id: 'surface-islands',
        name: 'Islands',
        summary: 'Panels float with generous radius and soft shadow; the canvas shows between them.',
        spec: spec({
          nav: 'toolbar',
          leading: 'library',
          trailing: 'inspector',
          panelMode: 'floating',
          content: 'scene',
          surface: 'islands',
          density: 'spacious',
        }),
        shines: ['Canvas heroes', 'Editorial and creative products'],
        avoid: ['Data consoles'],
      },
      {
        id: 'surface-glass',
        name: 'Glass',
        summary: 'Translucent chrome over a coloured ambient; data surfaces stay opaque.',
        spec: spec({ nav: 'top', leading: 'navigator', content: 'dashboard', surface: 'glass' }),
        shines: ['Navigation chrome with brand colour behind it'],
        avoid: ['Glass under text or tables', 'Low-contrast states'],
      },
    ],
  },
  {
    id: 'density',
    name: 'Density',
    question: 'How much fits on a screen?',
    patterns: [
      {
        id: 'density-compact',
        name: 'Compact',
        summary: 'Small controls, tight gutter, a firm type floor (TNIS: 12px, 6px gap).',
        spec: spec({ nav: 'side', trailing: 'inspector', content: 'table', density: 'compact' }),
        shines: ['Experts working all day', 'Data-heavy screens'],
        avoid: ['Touch-first and occasional users'],
      },
      {
        id: 'density-comfortable',
        name: 'Comfortable',
        summary: 'The SDK default: medium controls and gaps.',
        spec: spec({ nav: 'side', trailing: 'inspector', content: 'table', density: 'comfortable' }),
        shines: ['Mixed audiences', 'Most business apps'],
        avoid: ['Nothing in particular — it is the safe middle'],
      },
      {
        id: 'density-spacious',
        name: 'Spacious',
        summary: 'Large padding and type; fewer things, more calm (Ocharo).',
        spec: spec({ nav: 'side', trailing: 'inspector', content: 'table', density: 'spacious' }),
        shines: ['Consumers', 'Editorial and brand-led products', 'Touch'],
        avoid: ['Dense data work'],
      },
    ],
  },
];

/** Finds a pattern group by id. */
export function findPatternGroup(id: string | null): PatternGroup | undefined {
  return PatternGroups.find((group) => group.id === id);
}
