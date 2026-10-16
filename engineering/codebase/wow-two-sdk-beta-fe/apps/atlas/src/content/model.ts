/**
 * The atlas vocabulary. Every wireframe in the app — archetypes, patterns and the lab — is one `LayoutSpec`
 * drawn by `LayoutWire`, so a pattern, a preset and a composition can never disagree about what a region is.
 */

/** How the app's destinations are presented. */
export const NavStyle = {
  Top: 'top',
  Side: 'side',
  Rail: 'rail',
  Toolbar: 'toolbar',
  Bottom: 'bottom',
  None: 'none',
} as const;
export type NavStyle = (typeof NavStyle)[keyof typeof NavStyle];

/** The local navigation strip under the header. */
export const LocalNav = {
  None: 'none',
  Tabs: 'tabs',
  Filters: 'filters',
  Breadcrumbs: 'breadcrumbs',
  Steps: 'steps',
} as const;
export type LocalNav = (typeof LocalNav)[keyof typeof LocalNav];

/** What a side panel holds. */
export const PanelRole = {
  Navigator: 'navigator',
  Library: 'library',
  List: 'list',
  Inspector: 'inspector',
  Detail: 'detail',
  Toc: 'toc',
  Filters: 'filters',
  Sections: 'sections',
  Context: 'context',
} as const;
export type PanelRole = (typeof PanelRole)[keyof typeof PanelRole];

/** How side panels sit relative to the content. */
export const PanelMode = {
  Docked: 'docked',
  Floating: 'floating',
  Overlay: 'overlay',
} as const;
export type PanelMode = (typeof PanelMode)[keyof typeof PanelMode];

/** The main region's content. */
export const ContentKind = {
  Table: 'table',
  List: 'list',
  Grid: 'grid',
  Kanban: 'kanban',
  Dashboard: 'dashboard',
  Map: 'map',
  Scene: 'scene',
  Article: 'article',
  Form: 'form',
  Calendar: 'calendar',
  Chat: 'chat',
  Feed: 'feed',
  Detail: 'detail',
  Hero: 'hero',
} as const;
export type ContentKind = (typeof ContentKind)[keyof typeof ContentKind];

/** The surface character — how regions separate from each other. */
export const Surface = {
  Flat: 'flat',
  Cards: 'cards',
  Islands: 'islands',
  Glass: 'glass',
} as const;
export type Surface = (typeof Surface)[keyof typeof Surface];

/** The spacing and control scale. */
export const Density = {
  Compact: 'compact',
  Comfortable: 'comfortable',
  Spacious: 'spacious',
} as const;
export type Density = (typeof Density)[keyof typeof Density];

/** The viewport the wireframe is drawn at. */
export const Device = {
  Desktop: 'desktop',
  Tablet: 'tablet',
  Phone: 'phone',
} as const;
export type Device = (typeof Device)[keyof typeof Device];

/** One complete layout — every wireframe in the atlas is drawn from one of these. */
export interface LayoutSpec {
  readonly nav: NavStyle;
  readonly local: LocalNav;
  readonly leading: PanelRole | null;
  readonly trailing: PanelRole | null;
  readonly panelMode: PanelMode;
  readonly content: ContentKind;
  readonly surface: Surface;
  readonly density: Density;
  /** A floating tool island along the bottom of a canvas (camera, zoom, playback). */
  readonly bottomDock?: boolean;
}

/** The spec every preset starts from. */
export const BaseSpec: LayoutSpec = {
  nav: NavStyle.Top,
  local: LocalNav.None,
  leading: null,
  trailing: null,
  panelMode: PanelMode.Docked,
  content: ContentKind.Table,
  surface: Surface.Flat,
  density: Density.Comfortable,
};

/** Builds a spec from the base plus overrides. */
export function spec(overrides: Partial<LayoutSpec>): LayoutSpec {
  return { ...BaseSpec, ...overrides };
}

/** A product of ours that uses a pattern — the evidence behind a verdict. */
export interface ProductExample {
  readonly app: 'TNIS' | 'Ocharo' | 'Haven' | 'Wheelhouse' | 'Atlas' | 'SDK';
  readonly note: string;
}

/** One layout archetype — a named, reusable composition with its verdicts. */
export interface Archetype {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly spec: LayoutSpec;
  readonly anatomy: ReadonlyArray<string>;
  readonly shines: ReadonlyArray<string>;
  readonly avoid: ReadonlyArray<string>;
  readonly examples: ReadonlyArray<ProductExample>;
  readonly related: ReadonlyArray<string>;
  readonly tags: ReadonlyArray<string>;
}

/** Labels for the lab's option groups, in display order. */
export const OptionLabels = {
  nav: {
    top: 'Top bar',
    side: 'Sidebar',
    rail: 'Icon rail',
    toolbar: 'Toolbar',
    bottom: 'Bottom tabs',
    none: 'None',
  },
  local: { none: 'None', tabs: 'Tabs', filters: 'Filters', breadcrumbs: 'Breadcrumbs', steps: 'Steps' },
  panel: {
    navigator: 'Navigator',
    library: 'Library',
    list: 'List',
    inspector: 'Inspector',
    detail: 'Detail',
    toc: 'On this page',
    filters: 'Filters',
    sections: 'Sections',
    context: 'Context',
  },
  panelMode: { docked: 'Docked', floating: 'Floating islands', overlay: 'Overlay drawer' },
  content: {
    table: 'Table',
    list: 'List',
    grid: 'Gallery grid',
    kanban: 'Kanban',
    dashboard: 'Dashboard',
    map: 'Map canvas',
    scene: '3D scene',
    article: 'Article',
    form: 'Form',
    calendar: 'Calendar',
    chat: 'Chat',
    feed: 'Feed',
    detail: 'Record detail',
    hero: 'Landing hero',
  },
  surface: { flat: 'Flat', cards: 'Cards', islands: 'Islands', glass: 'Glass' },
  density: { compact: 'Compact', comfortable: 'Comfortable', spacious: 'Spacious' },
  device: { desktop: 'Desktop', tablet: 'Tablet', phone: 'Phone' },
} as const;
