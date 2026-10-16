import type { InjectionKey } from 'vue';

/** A scope's logical ownership survives Vue Teleport. */
export interface FocusScopeEntry {
  readonly parent: FocusScopeEntry | null;
  readonly node: () => HTMLElement | null;
  readonly trapped: () => boolean;
  readonly modal: () => boolean;
  readonly recover: () => void;
  readonly onKeydown: (event: KeyboardEvent) => void;
  readonly captureReturnFocus: (document: Document) => void;
}

/** Carries logical focus ancestry across portalled descendants. */
export const FocusScopeKey: InjectionKey<FocusScopeEntry> = Symbol('FocusScope');

interface ScopeRegistry {
  readonly entries: FocusScopeEntry[];
  readonly inert: Map<Element, string | null>;
  readonly observer: MutationObserver;
  readonly onFocus: (event: FocusEvent) => void;
  readonly onKeydown: (event: KeyboardEvent) => void;
}

const Registries = new WeakMap<Document, ScopeRegistry>();

/** Checks logical ancestry, including scopes whose DOM lives in another portal. */
export function isScopeDescendant(entry: FocusScopeEntry, ancestor: FocusScopeEntry): boolean {
  for (let current: FocusScopeEntry | null = entry; current; current = current.parent) {
    if (current === ancestor) return true;
  }
  return false;
}

/** Returns every mounted DOM branch owned by the scope. */
export function scopeContainers(entry: FocusScopeEntry): HTMLElement[] {
  const node = entry.node();
  if (!node) return [];
  const entries = Registries.get(node.ownerDocument)?.entries ?? [entry];
  return entries
    .filter((candidate) => isScopeDescendant(candidate, entry))
    .flatMap((candidate) => {
      const element = candidate.node();
      return element?.isConnected ? [element] : [];
    });
}

/** Checks whether a DOM node belongs to the scope or a logical portal branch. */
export function scopeContains(entry: FocusScopeEntry, target: Node | null): boolean {
  return target !== null && scopeContainers(entry).some((container) => container.contains(target));
}

/** Returns the currently active focus trap for this document. */
export function topFocusScope(document: Document): FocusScopeEntry | undefined {
  return [...(Registries.get(document)?.entries ?? [])].reverse().find((entry) => entry.trapped());
}

function restoreInert(registry: ScopeRegistry): void {
  for (const [node, previous] of registry.inert) {
    if (previous === null) node.removeAttribute('inert');
    else node.setAttribute('inert', previous);
  }
  registry.inert.clear();
}

/** Recomputes inaccessible background branches, preserving each prior inert attribute. */
function updateInert(document: Document, registry: ScopeRegistry): void {
  restoreInert(registry);
  const modal = [...registry.entries].reverse().find((entry) => entry.modal());
  if (!modal || !document.body) return;
  const allowed = scopeContainers(modal);
  if (allowed.length === 0) return;
  const walk = (parent: Element): void => {
    for (const child of parent.children) {
      if (allowed.some((node) => node === child || node.contains(child))) continue;
      if (allowed.some((node) => child.contains(node))) walk(child);
      else {
        registry.inert.set(child, child.getAttribute('inert'));
        child.setAttribute('inert', '');
      }
    }
  };
  walk(document.body);
}

/** Registers a mounted scope with one document's trap and modal-background lifecycle. */
export function registerFocusScope(entry: FocusScopeEntry): () => void {
  const document = entry.node()?.ownerDocument;
  const view = document?.defaultView;
  if (!document || !view) return () => undefined;
  let registry = Registries.get(document);
  if (!registry) {
    const onFocus = (event: FocusEvent): void => {
      const top = topFocusScope(document);
      if (top && !scopeContains(top, event.target as Node | null)) top.recover();
    };
    const onKeydown = (event: KeyboardEvent): void => {
      topFocusScope(document)?.onKeydown(event);
    };
    const observer = new view.MutationObserver(() => {
      const current = Registries.get(document);
      if (current) updateInert(document, current);
    });
    registry = { entries: [], inert: new Map(), observer, onFocus, onKeydown };
    Registries.set(document, registry);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('keydown', onKeydown);
    observer.observe(document.body, { childList: true, subtree: true });
  }
  // Children mount first. Insert the parent before any already-mounted logical child.
  const descendant = registry.entries.findIndex((candidate) => isScopeDescendant(candidate, entry));
  if (descendant < 0) registry.entries.push(entry);
  else registry.entries.splice(descendant, 0, entry);
  updateInert(document, registry);
  return () => {
    if (Registries.get(document) !== registry) return;
    // An ancestor teardown owns all nested portals. Their later hooks must not revive this stack.
    for (let index = registry.entries.length - 1; index >= 0; index -= 1) {
      const candidate = registry.entries[index];
      if (candidate && isScopeDescendant(candidate, entry)) registry.entries.splice(index, 1);
    }
    updateInert(document, registry);
    if (registry.entries.length === 0) {
      registry.observer.disconnect();
      document.removeEventListener('focusin', registry.onFocus);
      document.removeEventListener('keydown', registry.onKeydown);
      restoreInert(registry);
      Registries.delete(document);
    }
  };
}

/** Refreshes modal attributes after reactive trap/modal options change. */
export function refreshFocusScope(entry: FocusScopeEntry): void {
  const document = entry.node()?.ownerDocument;
  const registry = document && Registries.get(document);
  if (document && registry) updateInert(document, registry);
}

/** Whether this scope still owns a mounted registry entry. */
export function isFocusScopeRegistered(entry: FocusScopeEntry): boolean {
  const document = entry.node()?.ownerDocument;
  return document ? Registries.get(document)?.entries.includes(entry) === true : false;
}
