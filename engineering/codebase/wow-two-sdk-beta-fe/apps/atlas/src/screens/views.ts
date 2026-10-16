import { defineAsyncComponent, type Component } from 'vue';

/** Each real-component screen by id, loaded on demand — shared by the screens page and the device frame. */
export const ScreenViews: Readonly<Record<string, Component>> = {
  dashboard: defineAsyncComponent(() => import('./DashboardScreen.vue')),
  board: defineAsyncComponent(() => import('./BoardScreen.vue')),
  settings: defineAsyncComponent(() => import('./SettingsScreen.vue')),
  inbox: defineAsyncComponent(() => import('./InboxScreen.vue')),
  wizard: defineAsyncComponent(() => import('./WizardScreen.vue')),
  'data-console': defineAsyncComponent(() => import('./DataConsoleScreen.vue')),
  docs: defineAsyncComponent(() => import('./DocsScreen.vue')),
  canvas: defineAsyncComponent(() => import('./CanvasScreen.vue')),
};
