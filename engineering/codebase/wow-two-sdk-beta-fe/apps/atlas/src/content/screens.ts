/** A screen built from real SDK components that realizes one layout archetype. */
export interface Screen {
  readonly id: string;
  readonly name: string;
  readonly archetype: string;
  readonly summary: string;
  /** The SDK components the screen is built from, in reading order. */
  readonly components: ReadonlyArray<string>;
}

export const Screens: ReadonlyArray<Screen> = [
  {
    id: 'dashboard',
    name: 'Fleet dashboard',
    archetype: 'dashboard',
    summary: 'A sidebar shell with a KPI row, trend tiles and the records behind the numbers.',
    components: ['SidebarMenu', 'StatCard', 'Sparkline', 'ToggleGroup', 'DataTable', 'Badge', 'Alert'],
  },
  {
    id: 'board',
    name: 'Release board',
    archetype: 'board',
    summary: 'Shared filters above stage columns; cards move by drag or keyboard.',
    components: ['SearchInput', 'ToggleGroup', 'KanbanBoard', 'Tag', 'Avatar', 'EmptyState'],
  },
  {
    id: 'settings',
    name: 'Workspace settings',
    archetype: 'settings',
    summary: 'A section list beside grouped forms, with explicit save feedback.',
    components: ['NavItem', 'FieldsetLayout', 'LegendText', 'Field', 'TextInput', 'SwitchField', 'DescriptionGroup'],
  },
  {
    id: 'inbox',
    name: 'Support inbox',
    archetype: 'inbox',
    summary: 'Conversations, the open thread with a composer, and the customer in context.',
    components: ['SearchInput', 'Avatar', 'CountBadge', 'ChatBubbleCard', 'ChatComposerInput', 'DescriptionGroup'],
  },
  {
    id: 'wizard',
    name: 'Workspace setup',
    archetype: 'wizard',
    summary: 'One task per step with a validated Next, an optional step and a review before finishing.',
    components: ['WizardForm', 'Field', 'TextInput', 'EmailInput', 'RadioGroup', 'ChoiceCard', 'TagsInput'],
  },
  {
    id: 'data-console',
    name: 'Listings console',
    archetype: 'data-console',
    summary: 'Search and status filters over a dense table, a bulk bar for picked rows, and pages.',
    components: ['SearchInput', 'ToggleGroup', 'DataTable', 'Badge', 'Button', 'Pagination'],
  },
  {
    id: 'docs',
    name: 'Theming guide',
    archetype: 'docs',
    summary: 'Section navigation, a readable article and an outline that follows the reader.',
    components: ['NavItem', 'CodeText', 'KbdText', 'Callout', 'TableOfContents'],
  },
  {
    id: 'canvas',
    name: 'Poster canvas',
    archetype: 'canvas-islands',
    summary: 'The work fills the screen; a tool strip, a folding inspector and zoom float over it.',
    components: ['Toolbar', 'ToolbarButton', 'ColorInput', 'SliderInput', 'SwitchField', 'ButtonGroup'],
  },
];

export function findScreen(id: string | null | undefined): Screen | undefined {
  return Screens.find((screen) => screen.id === id);
}

/** The screen that realizes an archetype, when one exists. */
export function screenFor(archetype: string): Screen | undefined {
  return Screens.find((screen) => screen.archetype === archetype);
}
