import { OptionLabels, type LayoutSpec, type PanelRole } from './model';

/*
 * Turns a lab composition into a starter single-file component built from the SDK, so a layout picked in the atlas
 * becomes code in one copy. The output is a skeleton — named regions, real components, placeholder data — meant to be
 * renamed and filled, not a finished screen.
 */

/** The SDK entry each component is imported from. */
const Group: Readonly<Record<string, string>> = {
  Button: 'actions',
  Toolbar: 'actions',
  ToolbarButton: 'actions',
  Card: 'display',
  ChatBubbleCard: 'display',
  DataTable: 'display',
  DescriptionGroup: 'display',
  EventCalendarViewer: 'display',
  KanbanBoard: 'display',
  KanbanCard: 'display',
  KanbanColumn: 'display',
  ListGroup: 'display',
  ListGroupItem: 'display',
  StatCard: 'display',
  TabsGroup: 'display',
  TabsGroupList: 'display',
  TabsGroupPanel: 'display',
  TabsGroupTab: 'display',
  TreeViewer: 'display',
  TreeViewerItem: 'display',
  ProgressStepsIndicator: 'feedback',
  ChatComposerInput: 'forms',
  CheckboxField: 'forms',
  Field: 'forms',
  SearchInput: 'forms',
  TextAreaInput: 'forms',
  TextInput: 'forms',
  ToggleGroup: 'forms',
  ToggleInput: 'forms',
  BottomNavMenu: 'nav',
  BottomNavMenuItem: 'nav',
  Breadcrumb: 'nav',
  NavItem: 'nav',
  SidebarMenu: 'nav',
  SidebarMenuItem: 'nav',
  SidebarMenuSection: 'nav',
  TableOfContents: 'nav',
  Drawer: 'overlays',
  DrawerContent: 'overlays',
};

class Builder {
  readonly components = new Set<string>();
  readonly state = new Set<string>();

  /** Records a component for the import block and returns its tag name. */
  use(name: string): string {
    this.components.add(name);
    return name;
  }
}

type Lines = ReadonlyArray<string>;

function indent(lines: Lines, depth: number): string[] {
  const pad = '  '.repeat(depth);
  return lines.map((line) => (line ? pad + line : line));
}

function surfaceRegion(spec: LayoutSpec): string {
  switch (spec.surface) {
    case 'islands':
      return 'rounded-xl border border-border bg-card shadow-sm';
    case 'glass':
      return 'rounded-xl border border-border/60 bg-card/70 backdrop-blur';
    case 'cards':
      return 'bg-card';
    default:
      return 'bg-background';
  }
}

function navBlock(spec: LayoutSpec, b: Builder): { header: string[]; side: string[]; bottom: string[] } {
  const header: string[] = [];
  const side: string[] = [];
  const bottom: string[] = [];
  const region = surfaceRegion(spec);
  if (spec.nav === 'top' || spec.nav === 'toolbar') {
    header.push(`<header class="flex h-14 shrink-0 items-center gap-4 border-b border-border px-4 ${region}">`);
    header.push('  <strong class="text-sm">Product</strong>');
    if (spec.nav === 'top') {
      header.push('  <nav aria-label="Primary" class="flex gap-1">');
      header.push(`    <${b.use('NavItem')} href="#overview" is-active>Overview</NavItem>`);
      header.push('    <NavItem href="#records">Records</NavItem>');
      header.push('    <NavItem href="#reports">Reports</NavItem>');
      header.push('  </nav>');
    } else {
      header.push(`  <${b.use('Toolbar')} aria-label="Tools">`);
      header.push(`    <${b.use('ToolbarButton')}>Select</ToolbarButton>`);
      header.push('    <ToolbarButton>Draw</ToolbarButton>');
      header.push('    <ToolbarButton>Text</ToolbarButton>');
      header.push('  </Toolbar>');
    }
    header.push('</header>');
  }
  if (spec.nav === 'side' || spec.nav === 'rail') {
    const width = spec.nav === 'rail' ? 'w-16' : 'w-60';
    side.push(`<aside class="${width} shrink-0 border-r border-border p-2 ${region}">`);
    side.push(`  <${b.use('SidebarMenu')}${spec.nav === 'rail' ? ' is-collapsed' : ''} aria-label="Primary">`);
    side.push(`    <${b.use('SidebarMenuSection')} label="Workspace">`);
    side.push(`      <${b.use('SidebarMenuItem')} href="#overview" is-active>Overview</SidebarMenuItem>`);
    side.push('      <SidebarMenuItem href="#records">Records</SidebarMenuItem>');
    side.push('      <SidebarMenuItem href="#settings">Settings</SidebarMenuItem>');
    side.push('    </SidebarMenuSection>');
    side.push('  </SidebarMenu>');
    side.push('</aside>');
  }
  if (spec.nav === 'bottom') {
    bottom.push(`<${b.use('BottomNavMenu')}>`);
    bottom.push(`  <${b.use('BottomNavMenuItem')} is-active>Home</BottomNavMenuItem>`);
    bottom.push('  <BottomNavMenuItem>Search</BottomNavMenuItem>');
    bottom.push('  <BottomNavMenuItem>Profile</BottomNavMenuItem>');
    bottom.push('</BottomNavMenu>');
  }
  return { header, side, bottom };
}

function localBlock(spec: LayoutSpec, b: Builder): string[] {
  switch (spec.local) {
    case 'tabs':
      return [
        `<${b.use('TabsGroup')} default-value="overview">`,
        `  <${b.use('TabsGroupList')}>`,
        `    <${b.use('TabsGroupTab')} value="overview">Overview</TabsGroupTab>`,
        '    <TabsGroupTab value="activity">Activity</TabsGroupTab>',
        '  </TabsGroupList>',
        `  <${b.use('TabsGroupPanel')} value="overview" />`,
        '  <TabsGroupPanel value="activity" />',
        '</TabsGroup>',
      ];
    case 'filters':
      b.state.add("const query = ref('');");
      b.state.add("const scope = ref<string | null>('all');");
      return [
        '<div class="flex flex-wrap items-center gap-2">',
        `  <${b.use('SearchInput')} v-model="query" aria-label="Search" />`,
        `  <${b.use('ToggleGroup')} v-model="scope" variant="segmented" aria-label="Scope">`,
        `    <${b.use('ToggleInput')} value="all">All</ToggleInput>`,
        '    <ToggleInput value="mine">Mine</ToggleInput>',
        '  </ToggleGroup>',
        '</div>',
      ];
    case 'breadcrumbs':
      return [
        `<${b.use('Breadcrumb')} :items="[{ label: 'Home', href: '#' }, { label: 'Records', href: '#records' }, { label: 'Detail' }]" />`,
      ];
    case 'steps':
      return [`<${b.use('ProgressStepsIndicator')} :steps="['Account', 'Details', 'Review']" :current="1" />`];
    default:
      return [];
  }
}

function contentBlock(spec: LayoutSpec, b: Builder): string[] {
  switch (spec.content) {
    case 'table':
      b.state.add(
        "const columns = [{ key: 'name', header: 'Name', isSortable: true, accessor: (row: Row) => row.name }];",
      );
      b.state.add("const rows: Row[] = [{ id: '1', name: 'First record' }];");
      return [`<${b.use('DataTable')} :columns="columns" :data="rows" :row-key="(row: Row) => row.id" is-hoverable />`];
    case 'list':
    case 'feed':
      return [
        `<${b.use('ListGroup')}>`,
        `  <${b.use('ListGroupItem')} v-for="n in 5" :key="n">Item {{ n }}</ListGroupItem>`,
        '</ListGroup>',
      ];
    case 'grid':
      return [
        '<div class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">',
        `  <${b.use('Card')} v-for="n in 8" :key="n" padding="lg">Item {{ n }}</Card>`,
        '</div>',
      ];
    case 'kanban':
      b.state.add(
        "const columns = ref([{ key: 'todo', title: 'To do', cards: [{ key: 'c1', text: 'First card' }] }]);",
      );
      return [
        `<${b.use('KanbanBoard')} @move="onMove">`,
        `  <${b.use('KanbanColumn')} v-for="column in columns" :key="column.key" :column-key="column.key" :title="column.title">`,
        `    <${b.use('KanbanCard')} v-for="(card, index) in column.cards" :key="card.key" :item-key="card.key" :index="index">`,
        '      {{ card.text }}',
        '    </KanbanCard>',
        '  </KanbanColumn>',
        '</KanbanBoard>',
      ];
    case 'dashboard':
      return [
        '<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">',
        `  <${b.use('StatCard')} label="Revenue" value="$48.2k" />`,
        '  <StatCard label="Active users" value="2,310" />',
        '  <StatCard label="Churn" value="1.8%" />',
        '</div>',
        `<${b.use('Card')} padding="lg">Chart or table tile</Card>`,
      ];
    case 'form':
      b.state.add("const form = reactive({ name: '', notes: '' });");
      return [
        '<form class="flex max-w-lg flex-col gap-4" @submit.prevent>',
        `  <${b.use('Field')} label="Name" is-required><${b.use('TextInput')} v-model="form.name" /></Field>`,
        `  <Field label="Notes"><${b.use('TextAreaInput')} v-model="form.notes" /></Field>`,
        `  <${b.use('Button')} type="submit" class="w-fit">Save</Button>`,
        '</form>',
      ];
    case 'calendar':
      return [`<${b.use('EventCalendarViewer')} :events="[]" />`];
    case 'chat':
      return [
        '<div class="flex flex-1 flex-col gap-3">',
        `  <${b.use('ChatBubbleCard')} author="Ada">Hello!</ChatBubbleCard>`,
        '  <ChatBubbleCard side="end" tone="primary" author="You">Hi there.</ChatBubbleCard>',
        '</div>',
        `<${b.use('ChatComposerInput')} placeholder="Reply…" />`,
      ];
    case 'detail':
      return [
        `<${b.use('DescriptionGroup')} :items="[{ label: 'Status', value: 'Active' }, { label: 'Owner', value: 'Ada' }]" />`,
      ];
    case 'article':
      return [
        '<article class="mx-auto flex max-w-[65ch] flex-col gap-3">',
        '  <h2 class="text-2xl font-semibold">Title</h2>',
        '  <p>Body copy at a readable measure.</p>',
        '</article>',
      ];
    case 'hero':
      return [
        '<section class="flex flex-col items-center gap-4 py-16 text-center">',
        '  <h1 class="text-4xl font-semibold">Headline</h1>',
        '  <p class="max-w-xl text-muted-foreground">One sentence on the value.</p>',
        `  <${b.use('Button')} size="lg">Get started</Button>`,
        '</section>',
      ];
    default:
      return [
        `<div class="relative min-h-80 flex-1 rounded-lg bg-muted" role="img" aria-label="${OptionLabels.content[spec.content]}">`,
        `  <!-- Mount the ${spec.content === 'scene' ? '3D' : 'map'} renderer here. -->`,
        '</div>',
      ];
  }
}

function panelBody(role: PanelRole, b: Builder): string[] {
  switch (role) {
    case 'navigator':
      return [
        `<${b.use('TreeViewer')} aria-label="Navigator">`,
        `  <${b.use('TreeViewerItem')} value="a">First</TreeViewerItem>`,
        '  <TreeViewerItem value="b">Second</TreeViewerItem>',
        '</TreeViewer>',
      ];
    case 'inspector':
      return [`<${b.use('Field')} label="Name"><${b.use('TextInput')} /></Field>`];
    case 'detail':
    case 'context':
      return [`<${b.use('DescriptionGroup')} :items="[{ label: 'Owner', value: 'Ada' }]" />`];
    case 'toc':
      return [`<${b.use('TableOfContents')} :items="[{ id: 'intro', label: 'Intro' }]" />`];
    case 'filters':
      return [`<${b.use('CheckboxField')} label="Only mine" />`];
    default:
      return [
        `<${b.use('ListGroup')}>`,
        `  <${b.use('ListGroupItem')} v-for="n in 5" :key="n">Entry {{ n }}</ListGroupItem>`,
        '</ListGroup>',
      ];
  }
}

function panelBlock(spec: LayoutSpec, role: PanelRole | null, side: 'left' | 'right', b: Builder): string[] {
  if (!role) return [];
  const label = OptionLabels.panel[role];
  const body = panelBody(role, b);
  if (spec.panelMode === 'overlay') {
    const flag = side === 'left' ? 'isLeadingOpen' : 'isTrailingOpen';
    b.state.add(`const ${flag} = ref(false);`);
    return [
      `<${b.use('Drawer')} v-model:open="${flag}" side="${side}">`,
      `  <${b.use('DrawerContent')} aria-label="${label}" class="w-80 p-4">`,
      ...indent(body, 2),
      '  </DrawerContent>',
      '</Drawer>',
    ];
  }
  const edge = side === 'left' ? 'border-r' : 'border-l';
  const place = side === 'left' ? 'left-3' : 'right-3';
  const cls =
    spec.panelMode === 'floating'
      ? `absolute ${place} top-3 z-10 w-72 rounded-xl border border-border bg-popover p-3 shadow-lg`
      : `w-72 shrink-0 overflow-auto ${edge} border-border p-3 ${surfaceRegion(spec)}`;
  return [`<aside aria-label="${label}" class="${cls}">`, ...indent(body, 1), '</aside>'];
}

/** A starter SFC for a lab composition: named regions, SDK components and placeholder data. */
export function scaffold(spec: LayoutSpec): string {
  const b = new Builder();
  const nav = navBlock(spec, b);
  const local = localBlock(spec, b);
  const content = contentBlock(spec, b);
  const leading = panelBlock(spec, spec.leading, 'left', b);
  const trailing = panelBlock(spec, spec.trailing, 'right', b);
  const isFloating = spec.panelMode === 'floating';
  const isOverlay = spec.panelMode === 'overlay';
  const gap = spec.surface === 'islands' || spec.surface === 'glass' ? ' gap-3 p-3' : '';

  const main = [
    `<main class="${isFloating ? 'relative ' : ''}flex min-w-0 flex-1 flex-col gap-4 overflow-auto p-4 ${surfaceRegion(spec)}">`,
    ...(isOverlay && (spec.leading || spec.trailing)
      ? [
          '  <div class="flex gap-2">',
          ...(spec.leading
            ? [
                `    <${b.use('Button')} variant="outline" size="sm" @click="isLeadingOpen = true">${OptionLabels.panel[spec.leading]}</Button>`,
              ]
            : []),
          ...(spec.trailing
            ? [
                `    <${b.use('Button')} variant="outline" size="sm" @click="isTrailingOpen = true">${OptionLabels.panel[spec.trailing]}</Button>`,
              ]
            : []),
          '  </div>',
        ]
      : []),
    ...indent(local, 1),
    ...indent(content, 1),
    ...(isFloating ? [...indent(leading, 1), ...indent(trailing, 1)] : []),
    '</main>',
  ];

  const body = [
    ...nav.side,
    ...(isFloating || isOverlay ? [] : leading),
    ...main,
    ...(isFloating || isOverlay ? [] : trailing),
  ];

  const rootClass = [
    'flex h-svh flex-col bg-background text-foreground',
    spec.surface === 'glass' ? 'surface-ambient' : '',
    spec.surface === 'islands' || spec.surface === 'cards' ? 'bg-muted/40' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const template = [
    `<div class="${rootClass}" data-density="${spec.density}">`,
    ...indent(nav.header, 1),
    `  <div class="flex min-h-0 flex-1${gap}">`,
    ...indent(body, 2),
    '  </div>',
    ...(isOverlay ? [...indent(leading, 1), ...indent(trailing, 1)] : []),
    ...indent(nav.bottom, 1),
    '</div>',
  ];

  const byGroup = new Map<string, string[]>();
  for (const name of [...b.components].sort()) {
    const group = Group[name]!;
    byGroup.set(group, [...(byGroup.get(group) ?? []), name]);
  }
  const imports = [...byGroup.entries()]
    .sort(([a], [b2]) => a.localeCompare(b2))
    .map(([group, names]) => `import { ${names.join(', ')} } from '@wow-two-beta/ui-vue/presentation/${group}';`);

  const needsRef = [...b.state].some((line) => line.includes('ref('));
  const needsReactive = [...b.state].some((line) => line.includes('reactive('));
  const vueImports = [needsReactive && 'reactive', needsRef && 'ref'].filter(Boolean);
  const script = [
    ...(vueImports.length ? [`import { ${vueImports.join(', ')} } from 'vue';`] : []),
    ...imports,
    ...(spec.content === 'table'
      ? ['', 'interface Row {', '  readonly id: string;', '  readonly name: string;', '}']
      : []),
    ...(b.state.size ? ['', ...b.state] : []),
    ...(spec.content === 'kanban'
      ? [
          '',
          'function onMove(move: { itemKey: string; toColumn: string; toIndex: number }): void {',
          '  // Apply the move to `columns`.',
          '}',
        ]
      : []),
  ];

  const title = `${OptionLabels.nav[spec.nav]} · ${OptionLabels.content[spec.content]}`;
  return [
    `<!-- Scaffolded by the UI atlas: ${title}. Rename the regions and replace the placeholder data. -->`,
    '<script setup lang="ts">',
    ...script,
    '</script>',
    '',
    '<template>',
    ...indent(template, 1),
    '</template>',
    '',
  ].join('\n');
}
