<script lang="ts">
import type { HTMLAttributes } from 'vue';
import type { Placement } from '@floating-ui/vue';
import type { SurfaceVariant } from '../../../foundation/styles';

/** Represents one interface language an `AccountMenu` offers. */
export interface AccountMenuLocale {
  /** The locale tag the `locale` model holds — `uz`, `ru`, `en-GB`; also the row's `lang`. */
  readonly value: string;

  /** The language's own name in its own language — `O‘zbekcha`, `Русский`, `English`. */
  readonly label: string;
}

/** Represents one organization the signed-in person belongs to. */
export interface AccountMenuOrganization {
  /** The stable identity the `organization` model holds. */
  readonly id: string;

  /** The organization name, already translated. */
  readonly label: string;

  /** One muted line beside the name — the person's role there, already translated. */
  readonly description?: string;
}

/** Represents one running service whose version the menu reports. */
export interface AccountMenuVersion {
  /** The service name, already translated — `Catalogue`, `API`. */
  readonly label: string;

  /** The running version — `0.1.3`, or the caller's translated placeholder while it loads. */
  readonly version: string;

  /** The commit the service was built from; the menu shows its first seven characters. */
  readonly commit?: string;
}

/** Defines props for the avatar menu that ends an app's top bar. */
export interface AccountMenuProps {
  /** The signed-in person's display name. Omitted, the trigger shows a person glyph and the header hides. */
  readonly name?: string;

  /** The header's second line — the email or the role. */
  readonly description?: string;

  /** The avatar image. Without it, or when it fails, the avatar shows the name's initials. */
  readonly avatarSrc?: string;

  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;

  /** The Floating UI placement. Default `bottom-end`, for a trigger at the end of the bar. */
  readonly placement?: Placement;

  /** The disabled state — the trigger cannot open the menu, and an open menu closes. */
  readonly isDisabled?: boolean;

  /** The busy state — a session or sign-out in flight; blocks the trigger like `isDisabled` and marks it busy. */
  readonly isBusy?: boolean;

  /** The appearance toggle — the system, light and dark rows. Default `true`; needs a `ColorModeProvider`. */
  readonly showAppearance?: boolean;

  /** The interface languages, in display order. Fewer than two hide the language rows. */
  readonly locales?: ReadonlyArray<AccountMenuLocale>;

  /** The current interface language's `value`. The `v-model:locale` binding target. */
  readonly locale?: string;

  /** The person's organizations, in display order. Fewer than two hide the switcher. */
  readonly organizations?: ReadonlyArray<AccountMenuOrganization>;

  /** The current organization's `id`. The `v-model:organization` binding target. */
  readonly organization?: string;

  /** Every running service's version, in display order — the frontend first, then each backend service. */
  readonly versions?: ReadonlyArray<AccountMenuVersion>;

  /**
   * Fires when the reader picks sign out.
   *
   * Kept a PROP, not an emit: its presence renders the sign-out row, and Vue strips a declared emit's
   * listener out of `useAttrs()`, so an emit could never be detected. Bind it as `@sign-out`.
   */
  readonly onSignOut?: () => unknown;

  /** The menu's accessible name. Default `"Account"`, localized. */
  readonly menuLabel?: string;

  /** The trigger's accessible name; `{name}` becomes the name. Default `"Account menu for {name}"`, localized. */
  readonly triggerLabel?: string;

  /** The trigger's accessible name without a `name`. Default `"Account menu"`, localized. */
  readonly anonymousTriggerLabel?: string;

  /** The appearance group heading. Default `"Appearance"`, localized. */
  readonly appearanceLabel?: string;

  /** The row that follows the device setting. Default `"System"`, localized. */
  readonly systemModeLabel?: string;

  /** The light row. Default `"Light"`, localized. */
  readonly lightModeLabel?: string;

  /** The dark row. Default `"Dark"`, localized. */
  readonly darkModeLabel?: string;

  /** The language group heading. Default `"Language"`, localized. */
  readonly languageLabel?: string;

  /** The organization group heading. Default `"Organization"`, localized. */
  readonly organizationLabel?: string;

  /** The versions group heading. Default `"Versions"`, localized. */
  readonly versionsLabel?: string;

  /** The sign-out row. Default `"Sign out"`, localized. */
  readonly signOutLabel?: string;

  /** The panel's surface recipe — `glass` or `glass-outline` for translucent chrome. Default the menu's own. */
  readonly variant?: SurfaceVariant;

  /** The panel class — the hook for an app's own material. */
  readonly panelClass?: HTMLAttributes['class'];
}

/** @internal The appearance rows' values; `system` hands the mode back to the device. */
const Appearance = {
  System: 'system',
  Light: 'light',
  Dark: 'dark',
} as const;

type Appearance = (typeof Appearance)[keyof typeof Appearance];

/** @internal The visible length of a commit hash. */
const CommitLength = 7;
</script>

<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { Check, ChevronDown, LogOut, Monitor, Moon, Sun, UserRound } from 'lucide-vue-next';
import { dataAttr } from '../../../foundation/dom';
import { Icon, type IconAdapter } from '../../../foundation/icons';
import { useLocale, useLocaleDefaults } from '../../../foundation/i18n';
import { useId } from '../../../foundation/identifiers';
import { ColorMode, ColorModeKey } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';
import Avatar from '../../display/avatar/Avatar.vue';
import DropdownMenu from '../dropdownMenu/DropdownMenu.vue';
import DropdownMenuContent from '../dropdownMenu/DropdownMenuContent.vue';
import DropdownMenuTrigger from '../dropdownMenu/DropdownMenuTrigger.vue';
import MenuGroup from '../menu/MenuGroup.vue';
import MenuItem from '../menu/MenuItem.vue';
import MenuRadioGroup from '../menu/MenuRadioGroup.vue';
import MenuRadioItem from '../menu/MenuRadioItem.vue';
import MenuSeparator from '../menu/MenuSeparator.vue';

/**
 * Renders the account menu that ends an app's top bar: an avatar trigger that opens who is signed in, the
 * organization switcher, the caller's account destinations, the colour mode, the interface language, each
 * service's version and sign out — always last.
 */
defineOptions({ name: 'AccountMenu', inheritAttrs: false });

const slots = defineSlots<{
  /** The account-level destinations — `MenuItem` rows such as account settings, placed after the switcher. */
  items?(): unknown;
}>();

const componentProps = withDefaults(defineProps<AccountMenuProps>(), {
  name: undefined,
  description: undefined,
  avatarSrc: undefined,
  open: undefined,
  defaultOpen: false,
  placement: 'bottom-end',
  isDisabled: false,
  isBusy: false,
  showAppearance: true,
  locales: () => [],
  locale: undefined,
  organizations: () => [],
  organization: undefined,
  versions: () => [],
  onSignOut: undefined,
  triggerLabel: undefined,
  variant: undefined,
  panelClass: undefined,
});

const props = useLocaleDefaults(componentProps, 'AccountMenu', {
  menuLabel: 'Account',
  anonymousTriggerLabel: 'Account menu',
  appearanceLabel: 'Appearance',
  systemModeLabel: 'System',
  lightModeLabel: 'Light',
  darkModeLabel: 'Dark',
  languageLabel: 'Language',
  organizationLabel: 'Organization',
  versionsLabel: 'Versions',
  signOutLabel: 'Sign out',
});

const emit = defineEmits<{
  /** Fires when the menu opens or closes — the `v-model:open` half. */
  'update:open': [open: boolean];

  /** Fires when the reader picks another interface language — the `v-model:locale` half. */
  'update:locale': [locale: string];

  /** Fires when the reader picks another organization — the `v-model:organization` half. */
  'update:organization': [organization: string];
}>();

const attrs = useAttrs();
const i18n = useLocale();
const identityId = useId('account-menu-identity');
const trigger = useTemplateRef<InstanceType<typeof DropdownMenuTrigger>>('trigger');

/* Optional: without a provider the appearance rows hide instead of throwing. */
const colorMode = inject(ColorModeKey, null);

const controlled = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (value) => {
    emit('update:open', value);
  },
});

const isOpen = controlled.value;

/** Whether the trigger refuses to open the menu. */
const isBlocked = computed(() => props.isDisabled || props.isBusy);

function setOpen(open: boolean): void {
  if (open && isBlocked.value) return;
  controlled.setValue(open);
}

/* A menu open when the trigger becomes disabled or busy closes, since nothing in it may act now. */
watch(isBlocked, (blocked) => {
  if (blocked && isOpen.value) controlled.setValue(false);
});

const hasName = computed(() => (props.name ?? '').trim() !== '');

const triggerName = computed(() => {
  if (!hasName.value) return props.anonymousTriggerLabel;
  const name = (props.name ?? '').trim();
  return props.triggerLabel === undefined
    ? i18n.t('AccountMenu.triggerLabel', { name }, 'Account menu for {name}')
    : props.triggerLabel.replaceAll('{name}', name);
});

const hasOrganizationSwitcher = computed(() => props.organizations.length > 1);

/** The one organization a person belongs to, named in the header instead of a one-row switcher. */
const soleOrganization = computed(() => (props.organizations.length === 1 ? props.organizations[0] : undefined));

const hasIdentity = computed(() => hasName.value || Boolean(props.description) || soleOrganization.value !== undefined);

const hasAppearance = computed(() => props.showAppearance && colorMode !== null);
const hasLanguages = computed(() => props.locales.length > 1);
const hasVersions = computed(() => props.versions.length > 0);
const hasSignOut = computed(() => typeof props.onSignOut === 'function');

const appearances = computed((): ReadonlyArray<{ value: Appearance; label: string; icon: IconAdapter }> => [
  { value: Appearance.System, label: props.systemModeLabel, icon: Monitor },
  { value: Appearance.Light, label: props.lightModeLabel, icon: Sun },
  { value: Appearance.Dark, label: props.darkModeLabel, icon: Moon },
]);

/** The row the ambient mode marks: `system` while it follows the device, else the mode itself. */
const appearance = computed<Appearance | null>(() => {
  if (!colorMode) return null;
  if (colorMode.followsSystem) return Appearance.System;
  return colorMode.mode === ColorMode.Dark ? Appearance.Dark : Appearance.Light;
});

function chooseAppearance(value: string | null): void {
  if (!colorMode) return;
  if (value === Appearance.System) colorMode.followSystem();
  else if (value === Appearance.Light) colorMode.setMode(ColorMode.Light);
  else if (value === Appearance.Dark) colorMode.setMode(ColorMode.Dark);
}

function chooseLocale(value: string | null): void {
  if (value !== null && value !== props.locale) emit('update:locale', value);
}

function chooseOrganization(id: string | null): void {
  if (id !== null && id !== props.organization) emit('update:organization', id);
}

function signOut(): void {
  void props.onSignOut?.();
}

function shortCommit(commit: string): string {
  return commit.trim().slice(0, CommitLength);
}

/**
 * The sections present, in display order. Read during render, so a section that appears or a slot that is
 * added re-places every separator; a separator sits before each section but the first.
 */
function sections(): ReadonlyArray<string> {
  return [
    hasIdentity.value && 'identity',
    hasOrganizationSwitcher.value && 'organizations',
    slots.items !== undefined && 'items',
    hasAppearance.value && 'appearance',
    hasLanguages.value && 'languages',
    hasVersions.value && 'versions',
    hasSignOut.value && 'signOut',
  ].filter((section): section is string => typeof section === 'string');
}

function isSeparated(section: string): boolean {
  return sections().indexOf(section) > 0;
}

const triggerClasses = computed(() =>
  cn(
    'group/account-menu inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-transparent',
    'py-1 ps-1 pe-2 text-foreground transition-colors motion-reduce:transition-none',
    'hover:border-primary/15 hover:bg-primary-soft',
    'data-[state=open]:border-primary/15 data-[state=open]:bg-primary-soft',
    'outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60',
    attrs.class as ClassValue,
  ),
);

/* The panel fits a phone: never wider than the viewport, never taller than the space under a top bar, and
   scrolling inside itself when the sections outgrow it. */
const panelClasses = computed(() =>
  cn(
    'flex w-[min(18rem,calc(100vw-2rem))] max-h-[calc(100dvh-5rem)] flex-col gap-0.5',
    'overflow-y-auto overscroll-contain',
    props.panelClass as ClassValue,
  ),
);

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
  <DropdownMenu :open="isOpen" :placement="props.placement" @update:open="setOpen">
    <DropdownMenuTrigger ref="trigger" as-child>
      <button
        type="button"
        :aria-label="triggerName"
        :aria-busy="props.isBusy || undefined"
        :disabled="isBlocked"
        :data-busy="dataAttr(props.isBusy)"
        v-bind="rest"
        :class="triggerClasses"
      >
        <Avatar
          v-if="hasName"
          :name="props.name"
          :src="props.avatarSrc"
          alt=""
          size="sm"
          :is-loading="props.isBusy"
          data-account-menu-avatar
        />
        <span
          v-else
          aria-hidden="true"
          class="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
          data-account-menu-avatar
        >
          <Icon :icon="UserRound" :size="18" />
        </span>
        <Icon
          :icon="ChevronDown"
          :size="14"
          class="shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/account-menu:rotate-180 motion-reduce:transition-none"
          data-account-menu-chevron
        />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      :aria-label="props.menuLabel"
      :aria-describedby="hasIdentity ? identityId : undefined"
      :variant="props.variant"
      :class="panelClasses"
    >
      <div v-if="hasIdentity" :id="identityId" class="min-w-0 px-2 py-1.5" data-account-menu-identity>
        <p v-if="hasName" class="truncate text-sm font-semibold text-foreground">{{ props.name }}</p>
        <p v-if="props.description" class="truncate text-xs text-muted-foreground">{{ props.description }}</p>
        <p v-if="soleOrganization" class="truncate text-xs text-muted-foreground" data-account-menu-organization>
          {{ soleOrganization.label
          }}<template v-if="soleOrganization.description"> · {{ soleOrganization.description }}</template>
        </p>
      </div>

      <template v-if="hasOrganizationSwitcher">
        <MenuSeparator v-if="isSeparated('organizations')" />
        <MenuRadioGroup
          :label="props.organizationLabel"
          :model-value="props.organization ?? null"
          data-account-menu-organizations
          @update:model-value="chooseOrganization"
        >
          <!-- Many memberships scroll inside their own band, so appearance and sign out stay in reach. -->
          <div class="max-h-44 overflow-y-auto overscroll-contain" data-account-menu-organization-list>
            <MenuRadioItem v-for="entry in props.organizations" :key="entry.id" :value="entry.id">
              <template #indicator="{ checked }"><Icon v-if="checked" :icon="Check" :size="14" /></template>
              <span class="min-w-0 truncate">{{ entry.label }}</span>
              <span v-if="entry.description" class="ms-auto shrink-0 text-xs text-muted-foreground">
                {{ entry.description }}
              </span>
            </MenuRadioItem>
          </div>
        </MenuRadioGroup>
      </template>

      <template v-if="slots.items">
        <MenuSeparator v-if="isSeparated('items')" />
        <slot name="items" />
      </template>

      <template v-if="hasAppearance">
        <MenuSeparator v-if="isSeparated('appearance')" />
        <MenuRadioGroup
          :label="props.appearanceLabel"
          :model-value="appearance"
          data-account-menu-appearance
          @update:model-value="chooseAppearance"
        >
          <MenuRadioItem v-for="entry in appearances" :key="entry.value" :value="entry.value">
            <template #indicator="{ checked }"><Icon v-if="checked" :icon="Check" :size="14" /></template>
            <Icon :icon="entry.icon" :size="15" class="shrink-0 text-muted-foreground" />
            {{ entry.label }}
          </MenuRadioItem>
        </MenuRadioGroup>
      </template>

      <template v-if="hasLanguages">
        <MenuSeparator v-if="isSeparated('languages')" />
        <MenuRadioGroup
          :label="props.languageLabel"
          :model-value="props.locale ?? null"
          data-account-menu-languages
          @update:model-value="chooseLocale"
        >
          <MenuRadioItem v-for="entry in props.locales" :key="entry.value" :value="entry.value" :lang="entry.value">
            <template #indicator="{ checked }"><Icon v-if="checked" :icon="Check" :size="14" /></template>
            {{ entry.label }}
          </MenuRadioItem>
        </MenuRadioGroup>
      </template>

      <template v-if="hasVersions">
        <MenuSeparator v-if="isSeparated('versions')" />
        <MenuGroup :label="props.versionsLabel" data-account-menu-versions>
          <div
            v-for="(entry, index) in props.versions"
            :key="`${index}:${entry.label}`"
            class="flex items-baseline justify-between gap-3 px-2 py-0.5 text-xs"
            data-account-menu-version
          >
            <span class="min-w-0 truncate text-muted-foreground">{{ entry.label }}</span>
            <span class="shrink-0 font-mono tabular-nums text-foreground"
              >{{ entry.version
              }}<span v-if="entry.commit" class="text-muted-foreground"> · {{ shortCommit(entry.commit) }}</span></span
            >
          </div>
        </MenuGroup>
      </template>

      <template v-if="hasSignOut">
        <MenuSeparator v-if="isSeparated('signOut')" />
        <MenuItem state="destructive" data-account-menu-sign-out @select="signOut">
          <Icon :icon="LogOut" :size="15" class="shrink-0" />
          {{ props.signOutLabel }}
        </MenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
