import { onScopeDispose, ref } from 'vue';

/** Keeps gallery groups addressable while retaining diagnostics between visits. */
export function useGroupNavigation(groups: readonly string[], fallback: string) {
  const readGroup = () => {
    const group = new URLSearchParams(location.search).get('g');
    return group !== null && groups.includes(group) ? group : fallback;
  };
  const active = ref(readGroup());
  const sync = () => {
    active.value = readGroup();
  };
  window.addEventListener('popstate', sync);
  onScopeDispose(() => window.removeEventListener('popstate', sync));

  function hrefFor(group: string): string {
    const url = new URL(location.href);
    url.searchParams.set('g', group);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function navigate(event: MouseEvent, group: string): void {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    if (!groups.includes(group) || active.value === group) return;
    history.pushState(null, '', hrefFor(group));
    active.value = group;
  }

  return { active, hrefFor, navigate };
}
