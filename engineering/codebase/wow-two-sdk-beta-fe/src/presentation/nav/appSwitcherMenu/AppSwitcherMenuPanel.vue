<script lang="ts">
import type { AppSwitcherItem } from './AppSwitcherMenu.vue';

/**
 * @internal Defines props for the app switcher's body, shared by its popover and its phone dialog. The owner
 * passes destinations already split by kind, with checked hrefs.
 */
export interface AppSwitcherMenuPanelProps {
  /** The workspace apps, drawn as tiles. */
  readonly apps: ReadonlyArray<AppSwitcherItem>;

  /** The public sites, drawn as new-tab links under a divider. */
  readonly sites: ReadonlyArray<AppSwitcherItem>;

  /** The key of the open app or site. */
  readonly current: string;

  /** The sites group heading. */
  readonly sitesLabel: string;

  /** The screen-reader text after each new-tab link. */
  readonly newTabLabel: string;
}

const FocusClass = 'outline-hidden focus-visible:ring-2 focus-visible:ring-ring';

const TileClass = `flex min-h-14 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start transition-colors motion-reduce:transition-none ${FocusClass}`;

const TileIconClass =
  'grid size-9 shrink-0 place-items-center rounded-lg border text-sm font-semibold forced-colors:border-[CanvasText]';

const SiteClass = `inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors motion-reduce:transition-none ${FocusClass}`;
</script>

<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next';
import { Icon } from '../../../foundation/icons';
import { useId } from '../../../foundation/identifiers';
import { cn } from '../../../foundation/styles';

/** Renders the app switcher's body: the workspace apps as tiles, then the public sites as new-tab links. */
defineOptions({ name: 'AppSwitcherMenuPanel', inheritAttrs: false });

const props = defineProps<AppSwitcherMenuPanelProps>();

const emit = defineEmits<{
  /** Fires when the reader opens another app or site; the link's own navigation proceeds. */
  select: [item: AppSwitcherItem, event: MouseEvent];

  /** Fires when the reader picks anything, the current app included; the owner closes the menu. */
  close: [];
}>();

const sitesId = useId('app-switcher-sites');

/** The tile glyph for an app without an icon: its label's first character. */
function initialOf(label: string): string {
  return (Array.from(label.trim())[0] ?? '').toLocaleUpperCase();
}

function pick(item: AppSwitcherItem, event: MouseEvent): void {
  emit('select', item, event);
  emit('close');
}

function close(): void {
  emit('close');
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <ul v-if="props.apps.length > 0" role="list" class="grid grid-cols-1 gap-1 sm:grid-cols-2">
      <li v-for="app in props.apps" :key="app.key">
        <button
          v-if="app.key === props.current"
          type="button"
          aria-current="true"
          :class="cn(TileClass, 'bg-primary-soft')"
          @click="close"
        >
          <span
            aria-hidden="true"
            :class="cn(TileIconClass, 'border-transparent bg-primary text-primary-foreground')"
            data-app-switcher-icon
          >
            <Icon v-if="app.icon" :icon="app.icon" :size="18" />
            <template v-else>{{ initialOf(app.label) }}</template>
          </span>
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold text-primary-soft-foreground">{{ app.label }}</span>
            <span v-if="app.description" class="block truncate text-xs text-muted-foreground">{{
              app.description
            }}</span>
          </span>
        </button>
        <a v-else :href="app.href" :class="cn(TileClass, 'hover:bg-muted')" @click="pick(app, $event)">
          <span
            aria-hidden="true"
            :class="cn(TileIconClass, 'border-primary/10 bg-primary-soft/70 text-primary-soft-foreground')"
            data-app-switcher-icon
          >
            <Icon v-if="app.icon" :icon="app.icon" :size="18" />
            <template v-else>{{ initialOf(app.label) }}</template>
          </span>
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold text-foreground">{{ app.label }}</span>
            <span v-if="app.description" class="block truncate text-xs text-muted-foreground">{{
              app.description
            }}</span>
          </span>
        </a>
      </li>
    </ul>
    <template v-if="props.sites.length > 0">
      <div v-if="props.apps.length > 0" aria-hidden="true" class="h-px bg-border" data-app-switcher-divider />
      <h3 :id="sitesId" class="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {{ props.sitesLabel }}
      </h3>
      <ul role="list" :aria-labelledby="sitesId" class="flex flex-wrap gap-2 px-1">
        <li v-for="site in props.sites" :key="site.key">
          <button
            v-if="site.key === props.current"
            type="button"
            aria-current="true"
            :class="cn(SiteClass, 'border-primary/15 bg-primary-soft text-primary-soft-foreground')"
            @click="close"
          >
            {{ site.label }}
          </button>
          <a
            v-else
            :href="site.href"
            target="_blank"
            rel="noopener noreferrer"
            :class="cn(SiteClass, 'border-border text-muted-foreground hover:border-input hover:text-foreground')"
            @click="pick(site, $event)"
            >{{ site.label }}<Icon :icon="ExternalLink" :size="14" /><span class="sr-only">{{
              ` ${props.newTabLabel}`
            }}</span></a
          >
        </li>
      </ul>
    </template>
  </div>
</template>
