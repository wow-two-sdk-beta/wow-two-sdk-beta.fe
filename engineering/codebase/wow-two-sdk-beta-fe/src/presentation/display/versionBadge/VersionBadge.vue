<script lang="ts">
/** Defines props for the badge that names an app's version beside its logo. */
export interface VersionBadgeProps {
  /** The version this tab loaded — `0.15.4`, `0.15.4+abc1234` or `dev`. Build metadata after `+` is not shown. */
  readonly version: string;

  /**
   * The version the host serves now, from `useRunningVersion`. While it differs from `version` the badge names it
   * and becomes a button that asks for a reload; `null` or omitted, the badge shows `version`.
   */
  readonly runningVersion?: string | null;

  /** The badge's tooltip; `{version}` becomes the shown version. Default `"Version {version}"`. */
  readonly label?: string;

  /**
   * The stale badge's tooltip and accessible name; `{version}` is the loaded version and `{running}` the served one.
   * Default `"Version {running} is live; this tab runs {version}. Reload to update."`.
   */
  readonly updateLabel?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { RefreshCw } from 'lucide-vue-next';
import { Icon } from '../../../foundation/icons';
import { useLocale } from '../../../foundation/i18n';
import { cn } from '../../../foundation/styles';
import { VersionBadgeExtensions } from './VersionBadgeExtensions';

/**
 * Renders the app version beside a logo. It follows the running version: once the host serves a newer release than
 * the tab loaded, the badge names that release and offers the reload that brings the tab up to it.
 */
defineOptions({ name: 'VersionBadge', inheritAttrs: false });

const props = withDefaults(defineProps<VersionBadgeProps>(), {
  runningVersion: undefined,
  label: undefined,
  updateLabel: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader asks for the newer release — the caller reloads the page. */
  reload: [];
}>();

const attrs = useAttrs();
const locale = useLocale();

const isStale = computed(() => VersionBadgeExtensions.isStale(props.version, props.runningVersion));
const loaded = computed(() => VersionBadgeExtensions.display(props.version));
const shown = computed(() =>
  isStale.value ? VersionBadgeExtensions.display(props.runningVersion ?? props.version) : loaded.value,
);

const name = computed(() => {
  if (isStale.value) {
    const variables = { version: loaded.value, running: shown.value };
    return props.updateLabel === undefined
      ? locale.t(
          'VersionBadge.updateLabel',
          variables,
          'Version {running} is live; this tab runs {version}. Reload to update.',
        )
      : props.updateLabel.replaceAll('{version}', variables.version).replaceAll('{running}', variables.running);
  }
  return props.label === undefined
    ? locale.t('VersionBadge.label', { version: shown.value }, 'Version {version}')
    : props.label.replaceAll('{version}', shown.value);
});

const classes = computed(() =>
  cn(
    'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium leading-4',
    isStale.value
      ? 'bg-warning-soft text-warning-soft-foreground transition-colors hover:bg-warning/20 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none'
      : 'bg-muted text-muted-foreground',
    attrs.class as ClassValue,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});
</script>

<template>
  <button
    v-if="isStale"
    type="button"
    data-version-badge
    data-stale
    :title="name"
    :aria-label="name"
    v-bind="rest"
    :class="classes"
    @click="emit('reload')"
  >
    <Icon :icon="RefreshCw" :size="11" aria-hidden="true" />
    <span>{{ shown }}</span>
  </button>
  <span v-else data-version-badge :title="name" v-bind="rest" :class="classes">{{ shown }}</span>
</template>
