<script lang="ts">
import type { AccountMenuProps } from '../../nav/accountMenu/AccountMenu.vue';
import type { AppSwitcherItem, AppSwitcherMenuProps } from '../../nav/appSwitcherMenu/AppSwitcherMenu.vue';
import type { HTMLAttributes } from 'vue';
import type { SizeValue } from '../../../foundation/styles';
import type { BreadcrumbItem } from '../../nav/breadcrumb/Breadcrumb.vue';
import type { ContainerLayoutSize } from '../containerLayout/ContainerLayout.variants';

/** Defines how wide an `AppFrame` lets its page run. */
export const AppFrameContentWidth = {
  /** Refers to the shared page column: the frame's gutter, capped at `--frame-content-max` and centred. */
  Default: 'default',
  /** Refers to a page that fills the main region edge to edge — an editor, a canvas, a map. */
  Full: 'full',
} as const;

export type AppFrameContentWidth = (typeof AppFrameContentWidth)[keyof typeof AppFrameContentWidth];

/** Defines the surface an `AppFrame` paints its chrome with. */
export const AppFrameVariant = {
  /** Refers to the theme's glass: a translucent bar and sidebar over the ambient backdrop. The default. */
  Glass: 'glass',
  /** Refers to opaque chrome on the card colour — a dense data tool or a print-first product. */
  Solid: 'solid',
} as const;

export type AppFrameVariant = (typeof AppFrameVariant)[keyof typeof AppFrameVariant];

/**
 * Who is signed in and what the account menu offers: every `AccountMenu` prop except the three the frame binds as
 * models (`open`, `locale`, `organization`).
 */
export type AppFrameAccount = Omit<AccountMenuProps, 'open' | 'defaultOpen' | 'locale' | 'organization'>;

/** The app switcher's own strings and breakpoint, passed through to `AppSwitcherMenu`. */
export type AppFrameSwitcher = Pick<
  AppSwitcherMenuProps,
  'title' | 'sitesLabel' | 'closeLabel' | 'newTabLabel' | 'triggerLabel' | 'breakpoint'
>;

/** Defines props for the frame every app renders its places inside. */
export interface AppFrameProps {
  /** The version this tab loaded, shown beside the brand — `0.15.4`, `0.15.4+abc1234` or `dev`. Omitted, no badge. */
  readonly version?: string;

  /** The version the host serves now, from `useRunningVersion`; when it differs the badge offers a reload. */
  readonly runningVersion?: string | null;

  /**
   * Fires when the reader asks for the newer release. Default reloads the page.
   *
   * Kept a PROP, not an emit: its presence replaces the built-in reload, and Vue strips a declared emit's listener
   * out of `useAttrs()`, so an emit could never be detected. Bind it as `@reload`.
   */
  readonly onReload?: () => unknown;

  /** The trail to the current place, the last item the place itself. Empty or omitted, the bar shows none. */
  readonly crumbs?: ReadonlyArray<BreadcrumbItem | string>;

  /** The trail landmark's accessible name. Default `"Breadcrumb"`, localized. */
  readonly trailLabel?: string;

  /**
   * Opens a trail link through the app's router: a plain left click on a link whose `href` starts with `/` calls
   * this instead of loading the page. Modified clicks keep the browser's behaviour.
   *
   * Kept a PROP, not an emit, for the reason `onReload` is. Bind it as `@navigate`.
   */
  readonly onNavigate?: (href: string, event: MouseEvent) => unknown;

  /** The suite's apps and sites. Given, the brand becomes the app switcher; omitted, the `brand` slot stands alone. */
  readonly apps?: ReadonlyArray<AppSwitcherItem>;

  /** The key of this app among `apps`. */
  readonly currentApp?: string;

  /** The app name on the switcher. Default the current app's label. */
  readonly appLabel?: string;

  /** The switcher's second line — the suite or the organization. */
  readonly appSubtitle?: string;

  /** The switcher's own strings and breakpoint. */
  readonly appSwitcher?: AppFrameSwitcher;

  /** The account menu that ends the bar. Omitted, the bar ends with the `account` slot, or with nothing. */
  readonly account?: AppFrameAccount;

  /** The account menu's open state, controlled. The `v-model:accountOpen` binding target. */
  readonly accountOpen?: boolean;

  /** The current interface language. The `v-model:locale` binding target. */
  readonly locale?: string;

  /** The current organization's id. The `v-model:organization` binding target. */
  readonly organization?: string;

  /**
   * Whether the frame has a sidebar. Default follows the `nav` slot; `false` drops the sidebar, the brand cell and the
   * toggle while the slot stays declared — an app whose navigation waits for a choice.
   */
  readonly hasNavigation?: boolean;

  /**
   * Where this browser remembers the desktop sidebar's collapse. Read once, when the frame is created. Default
   * `wow-two.app-frame.sidebar-collapsed`; an app that kept a key of its own passes it and keeps its readers' choice.
   */
  readonly collapseStorageKey?: string;

  /** Whether the desktop sidebar starts as the icon rail until the reader chooses. Default `false`. */
  readonly isCollapsedByDefault?: boolean;

  /** How wide the page runs. Default `default`. */
  readonly contentWidth?: AppFrameContentWidth;

  /**
   * The cap on the page column under `contentWidth="default"`: a `ContainerLayoutSize` step or any CSS length
   * (number = px). Default `--frame-content-max`, 1536px — the width every app shares unless its pages need another.
   */
  readonly contentMaxWidth?: ContainerLayoutSize | SizeValue;

  /** Extra classes on the bar. */
  readonly barClass?: HTMLAttributes['class'];

  /** Extra classes on the sidebar. */
  readonly sidebarClass?: HTMLAttributes['class'];

  /** Extra classes on the scrolling main region. */
  readonly mainClass?: HTMLAttributes['class'];

  /** Extra classes on the page column; unused under `contentWidth="full"`, which renders none. */
  readonly contentClass?: HTMLAttributes['class'];

  /** The chrome's surface. Default `glass`. */
  readonly variant?: AppFrameVariant;

  /** The toggle's name while the desktop sidebar is open. Default `"Collapse sidebar"`, localized. */
  readonly collapseLabel?: string;

  /** The toggle's name while the desktop sidebar is the rail. Default `"Expand sidebar"`, localized. */
  readonly expandLabel?: string;

  /** The toggle's name where it opens the navigation drawer. Default `"Open navigation"`, localized. */
  readonly openNavigationLabel?: string;

  /** The navigation drawer's accessible title. Default `"Navigation"`, localized. */
  readonly navigationLabel?: string;

  /** The version badge's tooltip; `{version}` is the shown version. Default `"Version {version}"`, localized. */
  readonly versionLabel?: string;

  /** The stale version badge's name; `{version}` is the loaded release, `{running}` the served one. Localized. */
  readonly versionUpdateLabel?: string;

  /** The skip link's text. Default `"Skip to content"`, localized. */
  readonly skipToContentLabel?: string;
}

/** What the `brand` slot receives. */
export interface AppFrameBrandSlotProps {
  /** True where only the mark fits: above the icon rail and in a phone's bar. */
  readonly isRail: boolean;
}

/** What the `nav` slot receives. */
export interface AppFrameNavSlotProps {
  /** True in the icon rail; false in the open sidebar and in the drawer. */
  readonly isRail: boolean;

  /** Closes the navigation drawer. A click on any link inside the slot already does. */
  readonly close: () => void;
}

/** @internal The default slot of the collapse choice in `localStorage`. */
const DefaultCollapseStorageKey = 'wow-two.app-frame.sidebar-collapsed';

/** @internal Accepts only a stored boolean; anything else reads as the default. */
function decodeCollapsed(stored: unknown): boolean | undefined {
  return typeof stored === 'boolean' ? stored : undefined;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUpdate, shallowRef, useAttrs, useSlots, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { PanelLeft } from 'lucide-vue-next';
import { TailwindBreakpoints, useBreakpointBelow, useBreakpointUp } from '../../../foundation/device';
import { dataAttr } from '../../../foundation/dom';
import { Icon } from '../../../foundation/icons';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { createPersistentRef } from '../../../foundation/storage';
import { cn, SurfaceVariant } from '../../../foundation/styles';
import Button from '../../actions/button/Button.vue';
import VersionBadge from '../../display/versionBadge/VersionBadge.vue';
import AccountMenu from '../../nav/accountMenu/AccountMenu.vue';
import AppSwitcherMenu from '../../nav/appSwitcherMenu/AppSwitcherMenu.vue';
import Breadcrumb from '../../nav/breadcrumb/Breadcrumb.vue';
import Drawer from '../../overlays/drawer/Drawer.vue';
import DrawerContent from '../../overlays/drawer/DrawerContent.vue';
import OverlayTitle from '../../overlays/OverlayTitle.vue';
import AppShell, { AppShellNavigation } from '../appShell/AppShell.vue';
import AppShellContent from '../appShell/AppShellContent.vue';
import AppShellHeader from '../appShell/AppShellHeader.vue';
import AppShellMain from '../appShell/AppShellMain.vue';
import AppShellSidebar from '../appShell/AppShellSidebar.vue';

/**
 * Renders the frame every app shares: a 56px bar with the brand or app switcher and the version above the sidebar,
 * the sidebar toggle, the trail, the app's own bar controls and the account menu; a sidebar that collapses to an
 * icon rail and is remembered; and the page column. The dimensions are the `--frame-*` tokens and the edges are the
 * theme's glass hairlines, so two apps on two themes hold the same frame. An app passes its brand, its navigation,
 * its app list and its slots.
 */
defineOptions({ name: 'AppFrame', inheritAttrs: false });

const slots = defineSlots<{
  /** The page. */
  default?(): unknown;

  /** The brand: a home link around the wordmark, or the mark where `isRail`. With `apps`, the switcher's mark. */
  brand?(props: AppFrameBrandSlotProps): unknown;

  /** The sidebar's navigation — a `SidebarMenu` bound to `isRail`. Omitted, the frame has no sidebar. */
  nav?(props: AppFrameNavSlotProps): unknown;

  /** What stands at the sidebar's foot, under a hairline — a home link, a help link. */
  'nav-footer'?(props: Pick<AppFrameNavSlotProps, 'isRail'>): unknown;

  /** Controls between the toggle and the trail. */
  'bar-start'?(): unknown;

  /** Replaces the trail — a portal target, or a trail that carries a page's actions. */
  trail?(): unknown;

  /** The app's own bar controls, before the account menu. */
  'bar-end'?(): unknown;

  /** Replaces the account menu. */
  account?(): unknown;

  /** The account-level destinations inside the account menu — `MenuItem` rows. */
  'account-items'?(): unknown;

  /** A phone's bottom bar, below `md`. Given, a phone has no drawer and the toggle hides there. */
  'phone-nav'?(): unknown;

  /** What stands above every page — a notice, a connection banner. */
  notice?(): unknown;
}>();

const componentProps = withDefaults(defineProps<AppFrameProps>(), {
  version: undefined,
  runningVersion: undefined,
  onReload: undefined,
  crumbs: () => [],
  onNavigate: undefined,
  apps: undefined,
  currentApp: undefined,
  appLabel: undefined,
  appSubtitle: undefined,
  appSwitcher: undefined,
  account: undefined,
  accountOpen: undefined,
  locale: undefined,
  organization: undefined,
  hasNavigation: undefined,
  collapseStorageKey: DefaultCollapseStorageKey,
  isCollapsedByDefault: false,
  contentWidth: AppFrameContentWidth.Default,
  contentMaxWidth: undefined,
  barClass: undefined,
  sidebarClass: undefined,
  mainClass: undefined,
  contentClass: undefined,
  trailLabel: undefined,
  versionLabel: undefined,
  versionUpdateLabel: undefined,
  skipToContentLabel: undefined,
  variant: AppFrameVariant.Glass,
});

const props = useLocaleDefaults(componentProps, 'AppFrame', {
  collapseLabel: 'Collapse sidebar',
  expandLabel: 'Expand sidebar',
  openNavigationLabel: 'Open navigation',
  navigationLabel: 'Navigation',
});

const emit = defineEmits<{
  /** Fires when the account menu opens or closes — the `v-model:accountOpen` half. */
  'update:accountOpen': [open: boolean];

  /** Fires when the reader picks another interface language — the `v-model:locale` half. */
  'update:locale': [locale: string];

  /** Fires when the reader picks another organization — the `v-model:organization` half. */
  'update:organization': [organization: string];

  /** Fires when the reader collapses or expands the desktop sidebar. */
  collapse: [isCollapsed: boolean];
}>();

const attrs = useAttrs();
const liveSlots = useSlots();
const shell = useTemplateRef<InstanceType<typeof AppShell>>('shell');
const main = useTemplateRef<InstanceType<typeof AppShellMain>>('main');

/* Mobile-first on the server and in the first render: a phone until mounted, then the real viewport. */
const isPhone = useBreakpointBelow(TailwindBreakpoints, 'md');
const isDesktop = useBreakpointUp(TailwindBreakpoints, 'lg');

/* The stored choice is read as the ref is created, so a collapsed sidebar never animates in from the open one. */
const isCollapsed = createPersistentRef<boolean>(props.collapseStorageKey, props.isCollapsedByDefault, {
  decode: decodeCollapsed,
});
const isDrawerOpen = shallowRef(false);

/* Slots are not reactive: their presence is read at setup and again before each update, so a slot an app adds or
   drops with `v-if` moves the layout in the same render. */
const hasNavSlot = shallowRef(Boolean(liveSlots['nav']));
const hasPhoneNav = shallowRef(Boolean(liveSlots['phone-nav']));
onBeforeUpdate(() => {
  hasNavSlot.value = Boolean(liveSlots['nav']);
  hasPhoneNav.value = Boolean(liveSlots['phone-nav']);
});

const hasSidebar = computed(() => props.hasNavigation ?? hasNavSlot.value);

/** Between `md` and `lg`: the rail beside the page, the full navigation in a drawer. */
const isTablet = computed(() => !isPhone.value && !isDesktop.value);

/** The sidebar shows as the icon rail: always on tablets, by choice on desktops. */
const isRail = computed(() => hasSidebar.value && !isPhone.value && (!isDesktop.value || isCollapsed.value));

/** A phone with a bottom bar already holds its navigation, so the toggle has nothing to open there. */
const hasToggle = computed(() => hasSidebar.value && !(isPhone.value && hasPhoneNav.value));

const sidebarWidth = computed(() => (isRail.value ? 'var(--frame-rail-width)' : 'var(--frame-sidebar-width)'));
const navigation = computed(() => (hasSidebar.value ? AppShellNavigation.Vertical : AppShellNavigation.Horizontal));

const toggleLabel = computed(() => {
  if (!isDesktop.value) return props.openNavigationLabel;
  return isCollapsed.value ? props.expandLabel : props.collapseLabel;
});

/** Desktop: collapse or expand the sidebar. Tablet and phone: open the full navigation over the page. */
function toggleSidebar(): void {
  if (isDesktop.value) {
    isCollapsed.value = !isCollapsed.value;
    emit('collapse', isCollapsed.value);
  } else {
    isDrawerOpen.value = true;
  }
}

function setDrawerOpen(open: boolean): void {
  isDrawerOpen.value = open;
}

function closeNavigation(): void {
  isDrawerOpen.value = false;
}

/* Growing to a desktop puts the sidebar back beside the page; a drawer left open would cover it. */
watch(isDesktop, (desktop) => {
  if (desktop) closeNavigation();
});

/** Picking a destination closes the drawer; the link itself navigates. */
function onNavClick(event: MouseEvent): void {
  if ((event.target as Element | null)?.closest?.('a[href]')) closeNavigation();
}

/** Hands a plain left click on a same-origin trail link to the app's router. */
function onTrailClick(event: MouseEvent): void {
  if (!props.onNavigate || event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const href = (event.target as Element | null)?.closest?.('a')?.getAttribute('href');
  if (!href || !href.startsWith('/') || href.startsWith('//')) return;
  event.preventDefault();
  props.onNavigate(href, event);
}

function reload(): void {
  if (props.onReload) props.onReload();
  else if (typeof window !== 'undefined') window.location.reload();
}

const isGlass = computed(() => props.variant === AppFrameVariant.Glass);

/* A glass frame's menus float over the page, so they take the theme's menu glass unless the caller chose. */
const menuVariant = computed(() => (isGlass.value ? SurfaceVariant.GlassMenu : undefined));
const accountProps = computed(() => ({ variant: menuVariant.value, ...props.account }));
const switcherProps = computed(() => ({ variant: menuVariant.value, ...props.appSwitcher }));

const shellClasses = computed(() =>
  cn(
    'surface-ambient transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none',
    'print:block print:h-auto print:overflow-visible',
    attrs.class as ClassValue,
  ),
);

/* The bar is the token's height, hairline included, plus the device's top inset; its row fills what is left. */
const headerClasses =
  'h-[calc(var(--frame-bar-height)+env(safe-area-inset-top,0px))] gap-0 px-0 pt-[env(safe-area-inset-top,0px)] print:hidden';

/* A glass frame draws its lines in the theme's glass edge; a solid one in the border colour its bar already uses. */
const edgeClass = computed(() => (isGlass.value ? 'border-glass-edge' : 'border-border'));

const brandCellClasses = computed(() =>
  cn(
    'flex shrink-0 items-center gap-2 overflow-hidden border-e',
    edgeClass.value,
    'transition-[width] duration-200 ease-out motion-reduce:transition-none',
    isRail.value ? 'justify-center' : 'px-3',
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** The frame's root element. */
const el = computed(() => shell.value?.el ?? null);

/** The scrolling main region. */
const mainEl = computed(() => main.value?.el ?? null);

/** Returns the main region to its top — for an app whose router does not reset a region's scroll. */
function scrollToTop(): void {
  mainEl.value?.scrollTo?.({ top: 0 });
}

/** Plain labels become trail items, so an app without links passes its translated strings as they are. */
const trail = computed<BreadcrumbItem[]>(() =>
  props.crumbs.map((crumb) => (typeof crumb === 'string' ? { label: crumb } : crumb)),
);

/* Bound only when given: an `aria-label` of `undefined` would strip the breadcrumb's own localized name. */
const trailAttrs = computed(() => (props.trailLabel === undefined ? {} : { 'aria-label': props.trailLabel }));

defineExpose({ el, mainEl, isRail, isCollapsed, toggleSidebar, closeNavigation, scrollToTop });
</script>

<template>
  <AppShell
    ref="shell"
    data-app-frame
    :data-rail="dataAttr(isRail)"
    v-bind="rest"
    :class="shellClasses"
    sidebar-breakpoint="md"
    :sidebar-width="sidebarWidth"
    :navigation="navigation"
    :sidebar-open="isPhone && isDrawerOpen"
    :skip-to-content-label="props.skipToContentLabel"
    @update:sidebar-open="setDrawerOpen"
  >
    <AppShellHeader height="md" :variant="props.variant" :class="[headerClasses, props.barClass]" data-app-frame-bar>
      <div class="flex h-full w-full min-w-0 items-stretch">
        <!-- From tablets up the brand sits above the sidebar, as wide as it, divided from the bar by a hairline. -->
        <div
          v-if="hasSidebar && !isPhone"
          :class="brandCellClasses"
          :style="{ width: sidebarWidth }"
          data-app-frame-brand
        >
          <AppSwitcherMenu
            v-if="props.apps"
            :items="props.apps"
            :current="props.currentApp ?? ''"
            :label="props.appLabel"
            :subtitle="props.appSubtitle"
            :is-compact="isRail"
            v-bind="switcherProps"
            class="shrink"
          >
            <template v-if="slots.brand" #mark><slot name="brand" :is-rail="true" /></template>
          </AppSwitcherMenu>
          <slot v-else name="brand" :is-rail="isRail" />
          <VersionBadge
            v-if="props.version && !isRail"
            :version="props.version"
            :running-version="props.runningVersion"
            :label="props.versionLabel"
            :update-label="props.versionUpdateLabel"
            @reload="reload"
          />
        </div>
        <div class="flex min-w-0 flex-1 items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6" data-app-frame-row>
          <!-- A phone's bar, and a frame without a sidebar, carry the brand inline. -->
          <div v-if="!hasSidebar || isPhone" class="flex shrink-0 items-center gap-2" data-app-frame-brand>
            <AppSwitcherMenu
              v-if="props.apps"
              :items="props.apps"
              :current="props.currentApp ?? ''"
              :label="props.appLabel"
              :subtitle="props.appSubtitle"
              :is-compact="isPhone"
              v-bind="switcherProps"
            >
              <template v-if="slots.brand" #mark><slot name="brand" :is-rail="true" /></template>
            </AppSwitcherMenu>
            <slot v-else name="brand" :is-rail="isPhone" />
            <VersionBadge
              v-if="props.version && !isPhone"
              :version="props.version"
              :running-version="props.runningVersion"
              :label="props.versionLabel"
              :update-label="props.versionUpdateLabel"
              @reload="reload"
            />
          </div>
          <Button
            v-if="hasToggle"
            variant="ghost"
            tone="neutral"
            size="md"
            shape="square"
            class="shrink-0"
            data-app-frame-toggle
            :aria-label="toggleLabel"
            :aria-expanded="isDesktop ? !isCollapsed : isDrawerOpen"
            :title="toggleLabel"
            @click="toggleSidebar"
          >
            <Icon :icon="PanelLeft" :size="18" />
          </Button>
          <slot name="bar-start" />
          <slot name="trail">
            <Breadcrumb
              v-if="trail.length > 0"
              :items="trail"
              is-single-line
              v-bind="trailAttrs"
              class="flex-1"
              @click="onTrailClick"
            />
            <span v-else class="flex-1" />
          </slot>
          <slot name="bar-end" />
          <slot name="account">
            <AccountMenu
              v-if="props.account"
              v-bind="accountProps"
              :open="props.accountOpen"
              :locale="props.locale"
              :organization="props.organization"
              class="shrink-0"
              @update:open="emit('update:accountOpen', $event)"
              @update:locale="emit('update:locale', $event)"
              @update:organization="emit('update:organization', $event)"
            >
              <template v-if="slots['account-items']" #items><slot name="account-items" /></template>
            </AccountMenu>
          </slot>
        </div>
      </div>
    </AppShellHeader>
    <AppShellSidebar
      v-if="hasSidebar"
      :variant="props.variant"
      :class="[edgeClass, 'print:hidden', props.sidebarClass]"
    >
      <div class="flex min-h-0 flex-1 flex-col" @click="onNavClick">
        <slot name="nav" :is-rail="isRail" :close="closeNavigation" />
      </div>
      <div
        v-if="slots['nav-footer']"
        :class="['mt-2 shrink-0 border-t pt-2', edgeClass]"
        data-app-frame-nav-footer
        @click="onNavClick"
      >
        <slot name="nav-footer" :is-rail="isRail" />
      </div>
    </AppShellSidebar>
    <AppShellMain ref="main" :class="['min-w-0 print:block print:overflow-visible', props.mainClass]">
      <AppShellContent
        v-if="props.contentWidth === 'default'"
        gutter="lg"
        :max-width="props.contentMaxWidth ?? 'var(--frame-content-max)'"
        :class="['lg:px-6 xl:px-8 print:p-0 print:*:max-w-none', props.contentClass]"
      >
        <slot name="notice" />
        <slot />
      </AppShellContent>
      <template v-else>
        <slot name="notice" />
        <slot />
      </template>
    </AppShellMain>
    <div v-if="hasPhoneNav && isPhone" class="z-sticky [grid-area:footer] print:hidden" data-app-frame-phone-nav>
      <slot name="phone-nav" />
    </div>
  </AppShell>
  <!-- A tablet keeps the rail beside the page; the full navigation opens over it. -->
  <Drawer v-if="hasSidebar && isTablet" :open="isDrawerOpen" side="left" @update:open="setDrawerOpen">
    <DrawerContent class="w-72 max-w-[80%]" :variant="menuVariant">
      <OverlayTitle class="sr-only">{{ props.navigationLabel }}</OverlayTitle>
      <div class="flex min-h-0 flex-1 flex-col" @click="onNavClick">
        <slot name="nav" :is-rail="false" :close="closeNavigation" />
      </div>
      <div
        v-if="slots['nav-footer']"
        :class="['mt-2 shrink-0 border-t pt-2', edgeClass]"
        data-app-frame-nav-footer
        @click="onNavClick"
      >
        <slot name="nav-footer" :is-rail="false" />
      </div>
    </DrawerContent>
  </Drawer>
</template>
