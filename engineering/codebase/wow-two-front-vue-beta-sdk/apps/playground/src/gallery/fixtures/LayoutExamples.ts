import {
  FieldsetLayout,
  InputAddonLayout,
  InputGroup,
  SeparatorLayout,
  SwipeActionsLayout,
  TiltLayout,
  AppShell,
  AppShellAside,
  AppShellContent,
  AppShellFooter,
  AppShellHeader,
  AppShellMain,
  AppShellSidebar,
  AspectRatioLayout,
  BoxLayout,
  CanvasArea,
  CenterLayout,
  ClusterLayout,
  ContainerLayout,
  DividerLayout,
  FlexLayout,
  FrameLayout,
  Grid,
  HStackLayout,
  InlineLayout,
  Navbar,
  PageHeader,
  PageHeaderActions,
  AnchorLayout,
  PullToRefreshLayout,
  ResizablePanel,
  ResizablePanelsLayout,
  ResizableSeparator,
  ScrollArea,
  Section,
  SpacerLayout,
  StackLayout,
  StickyLayout,
  SurfaceLayout,
  TwoColumnLayout,
  VStackLayout,
  VirtualScrollArea,
  MasonryLayout,
} from '../../../../../src/presentation/layout';
import { h, type VNode } from 'vue';
import { Orientation } from '../../../../../src/foundation/styles';
import { smokeCase, type SmokeCase } from './Example';

/* Wrappers for the compound parts — each renders the part inside the root whose `provide` it
   injects, so the part is smoke-tested in the shape it actually ships in. */
const inResizablePanels = (node: VNode): VNode => h(ResizablePanelsLayout, null, () => node);
const inAppShell = (node: VNode): VNode => h(AppShell, null, () => node);
const inAppShellMain = (node: VNode): VNode => inAppShell(h(AppShellMain, null, () => node));

/**
 * Every component `@wow-two-beta/ui-vue/presentation/layout` exports, as smoke cases.
 * Imported through the public barrel on purpose — a component missing from `index.ts` fails
 * here before a consumer finds it.
 */
export const layoutExamples: readonly SmokeCase[] = [
  smokeCase('BoxLayout', BoxLayout, {}, { slot: true }),

  smokeCase('StackLayout', StackLayout, {}, { slot: true }),

  smokeCase('HStackLayout', HStackLayout, {}, { slot: true }),

  smokeCase('VStackLayout', VStackLayout, {}, { slot: true }),

  smokeCase('Grid', Grid, {}, { slot: true }),

  smokeCase('ContainerLayout', ContainerLayout, {}, { slot: true }),

  smokeCase('FlexLayout', FlexLayout, {}, { slot: true }),

  smokeCase('AspectRatioLayout', AspectRatioLayout, {}, { slot: true }),

  smokeCase('SpacerLayout', SpacerLayout, {}),

  smokeCase('CenterLayout', CenterLayout, {}, { slot: true }),

  smokeCase('DividerLayout', DividerLayout, { orientation: Orientation.Horizontal }),

  smokeCase('ScrollArea', ScrollArea, {}, { slot: true }),

  smokeCase('CanvasArea', CanvasArea, {}, { slot: true }),

  smokeCase('InlineLayout', InlineLayout, {}, { slot: true }),

  smokeCase('ClusterLayout', ClusterLayout, {}, { slot: true }),

  smokeCase('FrameLayout', FrameLayout, {}, { slot: true }),

  smokeCase('TwoColumnLayout', TwoColumnLayout, {}, { slot: true }),

  smokeCase('ResizablePanel', ResizablePanel, {}, { slot: true, wrap: inResizablePanels }),

  smokeCase('ResizablePanelsLayout', ResizablePanelsLayout, {}, { slot: true }),

  smokeCase('ResizableSeparator', ResizableSeparator, {}, { wrap: inResizablePanels }),

  smokeCase('PullToRefreshLayout', PullToRefreshLayout, { onRefresh: () => undefined }, { slot: true }),

  smokeCase('AppShell', AppShell, {}, { slot: true }),

  smokeCase('AppShellHeader', AppShellHeader, {}, { slot: true, wrap: inAppShell }),

  smokeCase('AppShellSidebar', AppShellSidebar, {}, { slot: true, wrap: inAppShell }),

  smokeCase('AppShellMain', AppShellMain, {}, { slot: true, wrap: inAppShell }),

  smokeCase('AppShellContent', AppShellContent, {}, { slot: true, wrap: inAppShellMain }),

  smokeCase('PageHeader', PageHeader, { title: 'Deployments', description: 'Every release, newest first.' }),

  // Without a mounted header the actions render in place, which is what both render tiers see.
  smokeCase('PageHeaderActions', PageHeaderActions, {}, { slot: true }),

  // No slot probe: the aside is `v-if`d off `isAsideHidden`, which tracks a media query — with no
  // real viewport it is always hidden. Its rendered form belongs to the `browser` tier.
  smokeCase('AppShellAside', AppShellAside, {}, { wrap: inAppShell }),

  smokeCase('AppShellFooter', AppShellFooter, {}, { slot: true, wrap: inAppShell }),

  smokeCase('AnchorLayout', AnchorLayout, {}, { slot: true }),

  smokeCase('SurfaceLayout', SurfaceLayout, {}, { slot: true }),

  smokeCase('Section', Section, {}, { slot: true }),

  smokeCase('Navbar', Navbar, {}, { slot: true }),

  smokeCase('FieldsetLayout', FieldsetLayout, {}, { slot: true }),

  smokeCase('InputAddonLayout', InputAddonLayout, {}, { slot: true }),

  smokeCase('InputGroup', InputGroup, {}, { slot: true }),

  smokeCase('SeparatorLayout', SeparatorLayout, {}),

  smokeCase('SwipeActionsLayout', SwipeActionsLayout, {}, { slot: true }),

  smokeCase('TiltLayout', TiltLayout, {}, { slot: true }),

  smokeCase('StickyLayout', StickyLayout, { offset: 8 }, { slot: true }),

  // No slot probe: rows render only once the client measures a viewport.
  smokeCase('VirtualScrollArea', VirtualScrollArea, { items: ['First', 'Second'], itemSize: 24 }),

  smokeCase('MasonryLayout', MasonryLayout, { columns: 2, gap: '0.5rem' }, { slot: true }),
];
