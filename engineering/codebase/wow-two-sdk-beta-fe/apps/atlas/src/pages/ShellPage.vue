<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, watchEffect } from 'vue';
import { Boxes, Gauge, Moon, Rocket, Settings, Sun, Users } from 'lucide-vue-next';
import { getTheme, themeToCss } from '@wow-two-beta/fe/foundation/themes';
import { Button } from '@wow-two-beta/fe/presentation/actions';
import { Card, CardBody } from '@wow-two-beta/fe/presentation/display';
import { SwitchInput, ToggleGroup, ToggleInput } from '@wow-two-beta/fe/presentation/forms';
import { AppFrame, PageHeader, type AppFrameAccount } from '@wow-two-beta/fe/presentation/layout';
import {
  AppSwitcherKind,
  BottomNavMenu,
  BottomNavMenuItem,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSection,
  type AppSwitcherItem,
} from '@wow-two-beta/fe/presentation/nav';
import { replaceQuery, route } from '../router';

/* The app frame, bare and full-viewport: the document a product's own chrome lives in. The page owns the root
   classes while mounted — the frame's tokens resolve per theme — and hands them back on leave. */

const Themes = [
  { id: 'default', label: 'Default' },
  { id: 'platform', label: 'Platform' },
  { id: 'ocharo', label: 'Ocharo' },
] as const;

type ShellTheme = (typeof Themes)[number]['id'];

const Apps: ReadonlyArray<AppSwitcherItem> = [
  {
    key: 'console',
    label: 'Console',
    description: 'Deployments',
    href: 'https://console.example.com/',
    kind: AppSwitcherKind.App,
  },
  {
    key: 'desk',
    label: 'Desk',
    description: 'Events and orders',
    href: 'https://desk.example.com/',
    kind: AppSwitcherKind.App,
  },
  { key: 'catalogue', label: 'Catalogue', href: 'https://catalogue.example.com/', kind: AppSwitcherKind.App },
  { key: 'blog', label: 'Blog', href: 'https://blog.example.com/', kind: AppSwitcherKind.Site },
];

const Account: AppFrameAccount = {
  name: 'Dana Operator',
  description: 'dana@example.com',
  // The appearance rows need a ColorModeProvider, which would fight this page's own `dark` handling.
  showAppearance: false,
  versions: [
    { label: 'Console', version: '0.4.2' },
    { label: 'API', version: '0.4.2', commit: 'abc1234def' },
  ],
  onSignOut: () => undefined,
};

const Crumbs = [{ label: 'Operations' }, { label: 'Deployments', href: '#/shell' }, { label: 'Release 42' }];

const Rows = Array.from({ length: 12 }, (_, index) => ({
  id: `dep-${480 - index}`,
  service: ['checkout', 'search', 'billing', 'identity', 'catalog', 'desk'][index % 6],
  environment: ['production', 'staging', 'preview'][index % 3],
}));

const requestedTheme = computed(() => route.value.query.get('theme'));
const theme = computed<ShellTheme>(() => Themes.find((entry) => entry.id === requestedTheme.value)?.id ?? 'default');
const isDark = computed(() => route.value.query.get('mode') === 'dark');

function writeQuery(next: { theme?: ShellTheme; dark?: boolean }): void {
  replaceQuery({ theme: next.theme ?? theme.value, mode: (next.dark ?? isDark.value) ? 'dark' : 'light' });
}

const hasNewerRelease = shallowRef(false);
const hasSuite = shallowRef(false);
const hasPhoneNav = shallowRef(false);
const barHeight = shallowRef('');

const runningVersion = computed(() => (hasNewerRelease.value ? '0.4.3' : null));

function reload(): void {
  hasNewerRelease.value = false;
}

function measure(): void {
  const bar = document.querySelector('[data-app-frame-bar]');
  barHeight.value = bar ? getComputedStyle(bar).height : '';
}

const root = typeof document === 'undefined' ? null : document.documentElement;
const previous = { className: root?.className ?? '', colorScheme: root?.style.colorScheme ?? '' };
const style = typeof document === 'undefined' ? null : document.createElement('style');

if (style) {
  style.dataset.atlasShell = '';
  style.textContent = ['platform', 'ocharo']
    .map((id) => getTheme(id))
    .flatMap((entry) => (entry ? [themeToCss(entry)] : []))
    .join('\n\n');
}

watchEffect(() => {
  if (!root) return;
  for (const value of [...root.classList]) {
    if (value.startsWith('theme-')) root.classList.remove(value);
  }
  if (theme.value !== 'default') root.classList.add(`theme-${theme.value}`);
  root.classList.toggle('dark', isDark.value);
  root.style.colorScheme = isDark.value ? 'dark' : 'light';
});

onMounted(() => {
  if (style) document.head.append(style);
  measure();
  window.addEventListener('resize', measure);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', measure);
  style?.remove();
  if (root) {
    root.className = previous.className;
    root.style.colorScheme = previous.colorScheme;
  }
});
</script>

<template>
  <AppFrame
    version="0.4.2"
    :running-version="runningVersion"
    :crumbs="Crumbs"
    :apps="hasSuite ? Apps : undefined"
    current-app="console"
    app-subtitle="Suite"
    :account="Account"
    @reload="reload"
  >
    <template #brand="{ isRail }">
      <a href="#/shell" class="flex items-center gap-2 font-semibold">
        <span class="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          W
        </span>
        <span v-if="!isRail">Console</span>
      </a>
    </template>

    <template #nav="{ isRail }">
      <SidebarMenu aria-label="Console" :is-collapsed="isRail">
        <SidebarMenuSection label="Fleet">
          <SidebarMenuItem href="#/shell" is-active>
            <template #icon><Gauge class="size-4" /></template>
            Overview
          </SidebarMenuItem>
          <SidebarMenuItem href="#/shell">
            <template #icon><Rocket class="size-4" /></template>
            Deployments
          </SidebarMenuItem>
          <SidebarMenuItem href="#/shell">
            <template #icon><Boxes class="size-4" /></template>
            Environments
          </SidebarMenuItem>
        </SidebarMenuSection>
        <SidebarMenuSection label="Workspace">
          <SidebarMenuItem href="#/shell">
            <template #icon><Users class="size-4" /></template>
            Members
          </SidebarMenuItem>
          <SidebarMenuItem href="#/shell">
            <template #icon><Gauge class="size-4" /></template>
            Usage
          </SidebarMenuItem>
          <SidebarMenuItem href="#/shell">
            <template #icon><Settings class="size-4" /></template>
            Settings
          </SidebarMenuItem>
        </SidebarMenuSection>
      </SidebarMenu>
    </template>

    <template #bar-end>
      <ToggleGroup
        :model-value="theme"
        variant="segmented"
        aria-label="Theme"
        class="max-md:hidden"
        @update:model-value="(value) => writeQuery({ theme: value as ShellTheme })"
      >
        <ToggleInput v-for="entry in Themes" :key="entry.id" :value="entry.id">{{ entry.label }}</ToggleInput>
      </ToggleGroup>
      <Button
        variant="ghost"
        tone="neutral"
        size="md"
        shape="square"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="writeQuery({ dark: !isDark })"
      >
        <Sun v-if="isDark" class="size-4" aria-hidden="true" />
        <Moon v-else class="size-4" aria-hidden="true" />
      </Button>
    </template>

    <template v-if="hasPhoneNav" #phone-nav>
      <BottomNavMenu :is-fixed="false" variant="glass">
        <BottomNavMenuItem href="#/shell" is-active>Overview</BottomNavMenuItem>
        <BottomNavMenuItem href="#/shell">Deploys</BottomNavMenuItem>
        <BottomNavMenuItem href="#/shell">Members</BottomNavMenuItem>
        <BottomNavMenuItem href="#/shell">Settings</BottomNavMenuItem>
      </BottomNavMenu>
    </template>

    <div class="flex flex-col gap-6">
      <PageHeader title="Deployments" description="Releases across every environment." />

      <Card>
        <CardBody class="flex flex-col gap-3">
          <label class="flex items-center gap-3 text-sm">
            <SwitchInput v-model="hasNewerRelease" aria-label="Simulate a newer release" />
            Simulate a newer release
          </label>
          <label class="flex items-center gap-3 text-sm">
            <SwitchInput v-model="hasSuite" aria-label="Suite apps" />
            Suite apps
          </label>
          <label class="flex items-center gap-3 text-sm">
            <SwitchInput v-model="hasPhoneNav" aria-label="Phone bottom bar" />
            Phone bottom bar
          </label>
          <p class="text-sm text-muted-foreground">
            Bar height:
            <span class="font-mono text-foreground" data-test="bar-height">{{ barHeight }}</span>
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <ul class="divide-y divide-border text-sm">
            <li v-for="row in Rows" :key="row.id" class="flex items-center justify-between gap-4 py-2.5">
              <span class="font-mono">{{ row.id }}</span>
              <span>{{ row.service }}</span>
              <span class="text-muted-foreground">{{ row.environment }}</span>
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  </AppFrame>
</template>
