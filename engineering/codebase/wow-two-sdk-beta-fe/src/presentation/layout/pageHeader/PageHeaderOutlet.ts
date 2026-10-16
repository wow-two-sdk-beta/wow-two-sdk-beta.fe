import { getCurrentInstance, shallowRef, type ShallowRef } from 'vue';

/* One outlet per app: a page's `PageHeaderActions` and the layout's `PageHeader` are siblings in the component
   tree, so neither can provide to the other. Keyed by the app, never module-global, so server renders and
   separate apps on one page stay apart. */
const Outlets = new WeakMap<object, ShallowRef<HTMLElement | null>>();

/** Returns the current app's page-header actions outlet — the element `PageHeaderActions` teleports into. */
export function usePageHeaderOutlet(): ShallowRef<HTMLElement | null> {
  const app = getCurrentInstance()?.appContext.app;
  if (!app) return shallowRef(null);
  let outlet = Outlets.get(app);
  if (!outlet) {
    outlet = shallowRef<HTMLElement | null>(null);
    Outlets.set(app, outlet);
  }
  return outlet;
}
