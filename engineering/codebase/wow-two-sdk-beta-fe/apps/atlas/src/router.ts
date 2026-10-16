import { computed, ref } from 'vue';

/** The atlas sections, in top-bar order. */
export const Sections = [
  { key: 'home', label: 'Atlas' },
  { key: 'layouts', label: 'Layouts' },
  { key: 'patterns', label: 'Patterns' },
  { key: 'guides', label: 'Guides' },
  { key: 'lab', label: 'Lab' },
  { key: 'screens', label: 'Screens' },
  { key: 'components', label: 'Components' },
  { key: 'themes', label: 'Themes' },
  { key: 'studio', label: 'Studio' },
] as const;

/* `frame` renders one screen bare, for the device preview's iframe; it has no place in the top bar. */
const HiddenSections = ['frame'] as const;

export type SectionKey = (typeof Sections)[number]['key'] | (typeof HiddenSections)[number];

const hash = ref(typeof location === 'undefined' ? '' : location.hash);
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    hash.value = location.hash;
    window.scrollTo({ top: 0 });
  });
}

/** The current `#/section/id?query` route. */
export const route = computed(() => {
  const [path = '', query = ''] = hash.value.replace(/^#\/?/, '').split('?');
  const [section = 'home', id = null] = path.split('/');
  const known =
    Sections.some((entry) => entry.key === section) || (HiddenSections as ReadonlyArray<string>).includes(section);
  return {
    section: (known ? section : 'home') as SectionKey,
    id: id || null,
    query: new URLSearchParams(query),
  };
});

/** Builds a link to a section, an entry and optional query parameters. */
export function href(section: SectionKey, id?: string | null, query?: Record<string, string>): string {
  const search = query ? `?${new URLSearchParams(query).toString()}` : '';
  return `#/${section}${id ? `/${id}` : ''}${search}`;
}

/** Replaces the query string without a navigation — the lab keeps its spec shareable this way. */
export function replaceQuery(query: Record<string, string>): void {
  const { section, id } = route.value;
  const next = href(section, id, query);
  history.replaceState(null, '', next);
  hash.value = next;
}
