<script lang="ts">
import type { HTMLAttributes } from 'vue';
import type { IconAdapter } from '../../../foundation/icons';
import type { SurfaceVariant } from '../../../foundation/styles';
import type { Breakpoint } from '../../layout/appShell/AppShell.vue';

/** Defines which group of an `AppSwitcherMenu` a destination joins. */
export const AppSwitcherKind = {
  /** Refers to a workspace app — a tile that opens in the same tab. */
  App: 'app',
  /** Refers to a public site — a link under the divider that opens in a new tab. */
  Site: 'site',
} as const;

export type AppSwitcherKind = (typeof AppSwitcherKind)[keyof typeof AppSwitcherKind];

/** Represents one destination in an `AppSwitcherMenu`. */
export interface AppSwitcherItem {
  /** The stable identity; `current` names the open app by it. */
  readonly key: string;

  /** The app or site name, already translated. */
  readonly label: string;

  /** One line under an app's label naming what it is for. */
  readonly description?: string;

  /** The address: an absolute HTTPS URL without credentials, query or fragment, else the menu drops the item. */
  readonly href: string;

  /** An app tile's glyph. Default the label's first character. */
  readonly icon?: IconAdapter;

  /** The group — `app` tiles or `site` links. */
  readonly kind: AppSwitcherKind;
}

/** Defines props for the control that names the current app and opens the others. */
export interface AppSwitcherMenuProps<T extends AppSwitcherItem = AppSwitcherItem> {
  /** Every destination, in display order; each group keeps this order. */
  readonly items: ReadonlyArray<T>;

  /** The key of the open app or site; that entry renders as the current marker. */
  readonly current: string;

  /** The app name on the trigger. Default the current item's label, else `title`. */
  readonly label?: string;

  /** A second line on the trigger — the organisation or workspace. Hidden below `breakpoint`. */
  readonly subtitle?: string;

  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;

  /** From this breakpoint up the menu is a popover; below it, a dialog. Default `md`. */
  readonly breakpoint?: Breakpoint;

  /** The menu heading. Default `"Apps"`, localized. */
  readonly title?: string;

  /** The sites group heading. Default `"Sites"`, localized. */
  readonly sitesLabel?: string;

  /** The dialog's close button name. Default `"Close"`, localized. */
  readonly closeLabel?: string;

  /** The screen-reader text after each site link. Default `"(opens in a new tab)"`, localized. */
  readonly newTabLabel?: string;

  /** The trigger's accessible name; `{app}` becomes the app name. Default `"{app} — switch app"`, localized. */
  readonly triggerLabel?: string;

  /** The panel's surface recipe — `glass` or `glass-outline` for translucent chrome. Default the overlay's own. */
  readonly variant?: SurfaceVariant;

  /** The popover and dialog panel class — the hook for an app's own material. */
  readonly panelClass?: HTMLAttributes['class'];
}

/* Static per-breakpoint classes, so Tailwind finds every one in the source. */
const NarrowHiddenClass: Record<Breakpoint, string> = {
  sm: 'max-sm:hidden',
  md: 'max-md:hidden',
  lg: 'max-lg:hidden',
  xl: 'max-xl:hidden',
  '2xl': 'max-2xl:hidden',
};
</script>

<script setup lang="ts" generic="T extends AppSwitcherItem">
import { computed, onMounted, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { ChevronDown, LayoutGrid } from 'lucide-vue-next';
import { TailwindBreakpoints, useMediaQuery } from '../../../foundation/device';
import { Icon } from '../../../foundation/icons';
import { useLocale, useLocaleDefaults } from '../../../foundation/i18n';
import { useId } from '../../../foundation/identifiers';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';
import Modal from '../../overlays/modal/Modal.vue';
import ModalContent from '../../overlays/modal/ModalContent.vue';
import OverlayCloseButton from '../../overlays/OverlayCloseButton.vue';
import OverlayTitle from '../../overlays/OverlayTitle.vue';
import Popover from '../../overlays/popover/Popover.vue';
import PopoverContent from '../../overlays/popover/PopoverContent.vue';
import PopoverTrigger from '../../overlays/popover/PopoverTrigger.vue';
import AppSwitcherMenuPanel from './AppSwitcherMenuPanel.vue';
import { AppSwitcherMenuExtensions } from './AppSwitcherMenuExtensions';

/**
 * Renders the app-switcher menu: one trigger naming the current app, which opens the suite's other apps as tiles
 * and its public sites as new-tab links — a popover under the trigger from `breakpoint` up, a dialog below it.
 */
defineOptions({ name: 'AppSwitcherMenu', inheritAttrs: false });

defineSlots<{
  /** The brand mark at the trigger's start. Default a grid glyph on the primary colour. */
  mark?(props: { current: T | undefined }): unknown;
}>();

const componentProps = withDefaults(defineProps<AppSwitcherMenuProps<T>>(), {
  label: undefined,
  subtitle: undefined,
  open: undefined,
  defaultOpen: false,
  breakpoint: 'md',
  triggerLabel: undefined,
  variant: undefined,
  panelClass: undefined,
});

const props = useLocaleDefaults(componentProps, 'AppSwitcherMenu', {
  title: 'Apps',
  sitesLabel: 'Sites',
  closeLabel: 'Close',
  newTabLabel: '(opens in a new tab)',
});

const emit = defineEmits<{
  /** Fires when the menu opens or closes — the `v-model:open` half. */
  'update:open': [open: boolean];

  /** Fires when the reader opens another app or site. The link navigates unless the listener prevents it. */
  select: [item: T, event: MouseEvent];
}>();

const attrs = useAttrs();
const locale = useLocale();
const titleId = useId('app-switcher-title');
const trigger = useTemplateRef<InstanceType<typeof PopoverTrigger>>('trigger');

const controlled = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (value) => {
    emit('update:open', value);
  },
});

const isOpen = controlled.value;

function setOpen(open: boolean): void {
  controlled.setValue(open);
}

function close(): void {
  controlled.setValue(false);
}

/** Whether the viewport reaches `breakpoint` — `false` on the server and in the first render. */
const isWide = useMediaQuery(() => `(min-width: ${TailwindBreakpoints[props.breakpoint]}px)`);

/* An open menu closes when the viewport crosses the breakpoint, since its surface changes kind. Registered after
   mount, so the first media-query reading never closes a menu opened by `defaultOpen`. */
onMounted(() => {
  watch(isWide, () => {
    if (isOpen.value) close();
  });
});

const currentItem = computed(() => props.items.find((item) => item.key === props.current));

/** The trigger's visible app name. */
const appName = computed(() => props.label ?? currentItem.value?.label ?? props.title);

const triggerName = computed(() =>
  props.triggerLabel === undefined
    ? locale.t('AppSwitcherMenu.triggerLabel', { app: appName.value }, '{app} — switch app')
    : props.triggerLabel.replaceAll('{app}', appName.value),
);

/** Every destination the menu can show: the current entry as given, the rest only with a safe href. */
const destinations = computed(() =>
  props.items.flatMap((item): AppSwitcherItem[] => {
    if (item.key === props.current) return [item];
    const href = AppSwitcherMenuExtensions.toSafeHref(item.href);
    return href === null ? [] : [{ ...item, href }];
  }),
);

const apps = computed(() => destinations.value.filter((item) => item.kind === AppSwitcherKind.App));
const sites = computed(() => destinations.value.filter((item) => item.kind === AppSwitcherKind.Site));

/** Reports the caller's own item, not the checked copy the panel rendered. */
function select(item: AppSwitcherItem, event: MouseEvent): void {
  const original = props.items.find((entry) => entry.key === item.key);
  if (original) emit('select', original, event);
}

const triggerClasses = computed(() =>
  cn(
    'group/app-switcher inline-flex min-h-11 min-w-0 max-w-full shrink-0 items-center gap-2.5 rounded-xl border',
    'border-transparent py-1 ps-1 pe-2 text-start text-foreground transition-colors motion-reduce:transition-none',
    'hover:border-primary/15 hover:bg-primary-soft data-[state=open]:border-primary/15 data-[state=open]:bg-primary-soft',
    'outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    attrs.class as ClassValue,
  ),
);

const subtitleClasses = computed(() =>
  cn('block max-w-40 truncate text-xs leading-tight text-muted-foreground', NarrowHiddenClass[props.breakpoint]),
);

const popoverClasses = computed(() => cn('w-[min(28rem,calc(100vw-2rem))]', props.panelClass as ClassValue));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** The trigger button. */
const el = computed(() => trigger.value?.el ?? null);

defineExpose({ el });
</script>

<template>
  <Popover :open="isOpen && isWide" placement="bottom-start" @update:open="setOpen">
    <PopoverTrigger ref="trigger" as-child>
      <button
        type="button"
        aria-haspopup="dialog"
        :aria-expanded="isOpen"
        :aria-label="triggerName"
        :data-state="isOpen ? 'open' : 'closed'"
        v-bind="rest"
        :class="triggerClasses"
      >
        <span aria-hidden="true" class="flex shrink-0" data-app-switcher-mark>
          <slot name="mark" :current="currentItem">
            <span class="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Icon :icon="LayoutGrid" :size="18" />
            </span>
          </slot>
        </span>
        <span class="min-w-0">
          <span class="block truncate text-sm font-semibold leading-tight">{{ appName }}</span>
          <span v-if="props.subtitle" :class="subtitleClasses" data-app-switcher-subtitle>{{ props.subtitle }}</span>
        </span>
        <Icon
          :icon="ChevronDown"
          :size="16"
          class="shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/app-switcher:rotate-180 motion-reduce:transition-none"
          data-app-switcher-chevron
        />
      </button>
    </PopoverTrigger>
    <PopoverContent
      v-if="isWide"
      :aria-labelledby="titleId"
      :variant="props.variant"
      radius="xl"
      :class="popoverClasses"
    >
      <h2 :id="titleId" class="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {{ props.title }}
      </h2>
      <AppSwitcherMenuPanel
        :apps="apps"
        :sites="sites"
        :current="props.current"
        :sites-label="props.sitesLabel"
        :new-tab-label="props.newTabLabel"
        @select="select"
        @close="close"
      />
    </PopoverContent>
  </Popover>
  <Modal v-if="!isWide" :open="isOpen" @update:open="setOpen">
    <ModalContent :variant="props.variant" radius="xl" padding="lg" :class="props.panelClass">
      <div class="mb-4 flex shrink-0 items-center justify-between gap-3">
        <OverlayTitle>{{ props.title }}</OverlayTitle>
        <OverlayCloseButton :aria-label="props.closeLabel" class="static -me-2 h-11 w-11 rounded-xl" />
      </div>
      <AppSwitcherMenuPanel
        :apps="apps"
        :sites="sites"
        :current="props.current"
        :sites-label="props.sitesLabel"
        :new-tab-label="props.newTabLabel"
        @select="select"
        @close="close"
      />
    </ModalContent>
  </Modal>
</template>
