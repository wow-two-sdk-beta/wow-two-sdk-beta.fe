<script lang="ts">
import { inject, type ComputedRef, type InjectionKey, type Ref } from 'vue';

/** Defines the responsive breakpoint at which `AppShell` collapses its sidebar / aside. */
export const Breakpoint = {
  /** Refers to the `sm` (640px) breakpoint. */
  Sm: 'sm',
  /** Refers to the `md` (768px) breakpoint. */
  Md: 'md',
  /** Refers to the `lg` (1024px) breakpoint. */
  Lg: 'lg',
  /** Refers to the `xl` (1280px) breakpoint. */
  Xl: 'xl',
  /** Refers to the `2xl` (1536px) breakpoint. */
  Xxl: '2xl',
} as const;

export type Breakpoint = (typeof Breakpoint)[keyof typeof Breakpoint];

/** Defines what scrolls inside an `AppShell`. */
export const AppShellScroll = {
  /** The main region scrolls; the header, sidebar and footer span the full window and hold still. */
  Region: 'region',
  /** The whole document scrolls, as a page does; the header sticks to the top. */
  Document: 'document',
} as const;

export type AppShellScroll = (typeof AppShellScroll)[keyof typeof AppShellScroll];

/** Defines where an `AppShell` places its navigation. */
export const AppShellNavigation = {
  /** A sidebar rail beside the main region. */
  Vertical: 'vertical',
  /** A top bar only; the main region takes the full width. */
  Horizontal: 'horizontal',
} as const;

export type AppShellNavigation = (typeof AppShellNavigation)[keyof typeof AppShellNavigation];

const BreakpointPx: Record<Breakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * The value shared with `AppShellSidebar` / `AppShellAside`.
 *
 * React's context held plain values re-created on every render behind a
 * `useMemo`; here every field stays a ref or a computed, so a child reads the
 * live value and the root never re-renders to publish one.
 */
export interface AppShellContextValue {
  sidebarWidth: ComputedRef<string>;
  asideWidth: ComputedRef<string>;
  sidebarBreakpoint: ComputedRef<Breakpoint>;
  /** The resolved mobile-sidebar open state. Writable — an assignment routes through `setSidebarOpen`. */
  isSidebarOpen: Ref<boolean>;
  setSidebarOpen: (open: boolean) => void;
  /** True below `sidebarBreakpoint` — the sidebar renders as a `Drawer`. */
  isSidebarCollapsed: ComputedRef<boolean>;
  /** True below `asideBreakpoint` — the aside renders nothing. */
  isAsideHidden: ComputedRef<boolean>;
  /** What scrolls — the regions size and pin themselves by it. */
  scroll: ComputedRef<AppShellScroll>;
}

export const appShellContextKey: InjectionKey<AppShellContextValue> = Symbol('wow-two.appShell');

export function useAppShellContext(): AppShellContextValue {
  const context = inject(appShellContextKey, null);
  if (!context) throw new Error('AppShell.* must be used inside <AppShell>');
  return context;
}

/** Reads the enclosing `AppShell`'s state — widths, breakpoint, and the mobile-sidebar toggle. */
export function useAppShell(): AppShellContextValue {
  return useAppShellContext();
}

/** Controlled axes use their canonical Vue model names; each update event requests caller state. */
export interface AppShellProps {
  /** The sidebar column width, any CSS length. Default `240px`. */
  readonly sidebarWidth?: string;

  /** The aside rail width, any CSS length. Default `280px`. */
  readonly asideWidth?: string;

  /** The sidebar collapses below this breakpoint. Default `lg`. */
  readonly sidebarBreakpoint?: Breakpoint;

  /** The aside hides below this breakpoint. Default `xl`. */
  readonly asideBreakpoint?: Breakpoint;

  /** The mobile-sidebar open state, controlled. The `v-model:sidebarOpen` binding target. */
  readonly sidebarOpen?: boolean;

  /** The initial mobile-sidebar state when uncontrolled. Default `false`. */
  readonly defaultSidebarOpen?: boolean;

  /**
   * What scrolls. Default `region`: the main region scrolls, so the header spans the full window even where the
   * platform draws a classic scrollbar. `document` scrolls the page, for long public pages with a closing footer.
   */
  readonly scroll?: AppShellScroll;

  /**
   * Where the navigation sits. Omit it and the shell reads its children: an `AppShellSidebar` makes it
   * `vertical`, none makes it `horizontal`, so a top-bar app never reserves an empty sidebar column.
   */
  readonly navigation?: AppShellNavigation;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, Fragment, normalizeStyle, provide, useAttrs, useSlots, useTemplateRef, type VNode } from 'vue';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useMediaQuery } from '../../../foundation/device';

const locale = useLocale();

/**
 * Renders the top-level page frame. Children: `AppShellHeader` / `AppShellSidebar` /
 * `AppShellMain` / `AppShellAside` / `AppShellFooter`. CSS-grid layout; the
 * sidebar collapses to a `Drawer` below `sidebarBreakpoint`.
 */
defineOptions({ name: 'AppShell', inheritAttrs: false });

/** The shell's regions — React's required `children`. */
defineSlots<{ default(): unknown }>();

/**
 * `sidebarOpen: undefined` / `sidebarOpen: undefined` are load-bearing: Vue
 * coerces an absent `Boolean` prop to `false` unless the declaration *owns* a
 * `default` key, which would strand the uncontrolled path behind a
 * permanently-closed controlled one.
 */
const props = withDefaults(defineProps<AppShellProps>(), {
  sidebarWidth: '240px',
  asideWidth: '280px',
  sidebarBreakpoint: 'lg',
  asideBreakpoint: 'xl',
  sidebarOpen: undefined,
  defaultSidebarOpen: false,
  scroll: AppShellScroll.Region,
  navigation: undefined,
});

const emit = defineEmits<{
  /** Fires when the mobile sidebar opens or closes — the `v-model:sidebarOpen` half. */
  'update:sidebarOpen': [open: boolean];
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const controlled = useControlled<boolean>({
  controlled: () => props.sidebarOpen,
  default: () => props.defaultSidebarOpen,
  onChange: (value) => {
    emit('update:sidebarOpen', value);
  },
});

const isSidebarWide = useMediaQuery(() => `(min-width: ${BreakpointPx[props.sidebarBreakpoint]}px)`);
const isAsideWide = useMediaQuery(() => `(min-width: ${BreakpointPx[props.asideBreakpoint]}px)`);

const isSidebarCollapsed = computed(() => !isSidebarWide.value);
const isAsideHidden = computed(() => !isAsideWide.value);

provide(appShellContextKey, {
  sidebarWidth: computed(() => props.sidebarWidth),
  asideWidth: computed(() => props.asideWidth),
  sidebarBreakpoint: computed(() => props.sidebarBreakpoint),
  isSidebarOpen: controlled.value,
  setSidebarOpen: controlled.setValue,
  isSidebarCollapsed,
  isAsideHidden,
  scroll: computed(() => props.scroll),
});

const slots = useSlots();

/** Whether the rendered children include an `AppShellSidebar`, looking through fragments and `v-for` lists. */
function hasSidebar(nodes: ReadonlyArray<unknown>): boolean {
  return nodes.some((node) => {
    const vnode = node as VNode;
    if ((vnode?.type as { name?: string } | undefined)?.name === 'AppShellSidebar') return true;
    return vnode?.type === Fragment && Array.isArray(vnode.children) && hasSidebar(vnode.children);
  });
}

/* Read while rendering (the grid style is a render dependency), so the slot call is tracked and warning-free,
   and the server renders the same grid the client hydrates. */
const navigation = computed<AppShellNavigation>(
  () =>
    props.navigation ??
    (hasSidebar(slots.default?.() ?? []) ? AppShellNavigation.Vertical : AppShellNavigation.Horizontal),
);

/**
 * Collapsed drops the sidebar track entirely; header and footer always span the full width. The content column is
 * `minmax(0, 1fr)`: a bare `1fr` keeps an `auto` minimum, so a wide header nav or table would widen the whole shell.
 */
const gridTemplate = computed(() =>
  isSidebarCollapsed.value || navigation.value === AppShellNavigation.Horizontal
    ? `'header' auto 'main' 1fr 'footer' auto / minmax(0, 1fr)`
    : `'header header' auto 'sidebar main' 1fr 'sidebar footer' auto / ${props.sidebarWidth} minmax(0, 1fr)`,
);

/* A region shell owns the viewport: its rows fill the window exactly and only the main region scrolls. */
const classes = computed(() =>
  cn(
    'grid bg-background text-foreground',
    props.scroll === AppShellScroll.Region ? 'h-dvh overflow-hidden' : 'min-h-svh',
    attrs.class as string | undefined,
  ),
);

/** `gridTemplate` is normalized first so a caller's `style` still wins per-property. */
const rootStyle = computed(() => normalizeStyle([{ gridTemplate: gridTemplate.value }, attrs.style]));

/** Everything but `class` / `style`, both re-applied above. */
const rest = computed(() => {
  const { class: _class, style: _style, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :style="rootStyle" :class="classes">
    <a
      href="#app-shell-main"
      class="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-modal focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow"
    >
      {{ locale.t('AppShell.skipToContent', undefined, 'Skip to content') }}
    </a>
    <slot />
  </div>
</template>
