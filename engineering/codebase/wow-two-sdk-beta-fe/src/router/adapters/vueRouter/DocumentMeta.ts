import type { Router } from 'vue-router';

import type { RouteMeta } from './RouteConfig';
import { deepestHandleValue, resolveHandleValue } from './RouteHandles';

const MetaTagName = 'meta';
const NameAttribute = 'name';
const PropertyAttribute = 'property';
const ContentAttribute = 'content';
const DescriptionName = 'description';

/*
 * Open Graph keys are `<meta property="og:title">`; everything else is `<meta name="…">`. The two
 * are not interchangeable — an `og:` tag written as `name=` is ignored by every scraper that reads
 * the spec, which is the silent half of the failure: the page looks right, the share card is blank.
 * Twitter's `twitter:*` keys are `name=` by their own docs, so the prefix test is `og:` only.
 */
const OpenGraphPrefix = 'og:';

/** The head attribute a meta key is addressed by. */
type MetaAttribute = typeof NameAttribute | typeof PropertyAttribute;

/** Resolves the attribute a meta key is written under — `og:*` is `property`, the rest `name`. */
function attributeFor(key: string): MetaAttribute {
  return key.startsWith(OpenGraphPrefix) ? PropertyAttribute : NameAttribute;
}

/** Upserts (or clears) a single `<meta>` tag, addressed by its attribute + key. */
function setMetaTag(attribute: MetaAttribute, key: string, content: string | undefined): void {
  let tag = document.head.querySelector<HTMLMetaElement>(`${MetaTagName}[${attribute}="${key}"]`);
  if (content == null) {
    tag?.removeAttribute(ContentAttribute);
    return;
  }
  if (!tag) {
    tag = document.createElement(MetaTagName);
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute(ContentAttribute, content);
}

/** The identity a managed tag is tracked by — the attribute is part of it, since one key can move between them. */
function tagId(attribute: MetaAttribute, key: string): string {
  return `${attribute}|${key}`;
}

/**
 * Syncs document `<meta>` tags to the deepest matched route's `handle.meta` (description, `og:*`, and
 * arbitrary keys). Returns the unregister function.
 *
 * `handle.meta` may be a literal or a `RouteHandleResolver` — the resolver form is what gives a
 * `:slug` route a title and description derived from its params, since a static handle cannot know
 * them. A resolver returning `undefined` falls through to the next-shallowest match.
 *
 * React's null-rendering `<DocumentMeta>` becomes an `afterEach` hook, for the same reason
 * `installDocumentTitle` does; `createAppRouter` wires it for you. No-op without a `document` (SSR).
 */
export function installDocumentMeta(router: Router): () => void {
  if (typeof document === 'undefined') return () => {};

  // Tags written on a previous navigation — cleared when the next route's meta omits them, so a tag
  // set by one page never lingers on another. React held this in a ref; a closure is the same thing
  // without the component.
  let managed: ReadonlyMap<string, { attribute: MetaAttribute; key: string }> = new Map();

  return router.afterEach((to, _from, failure) => {
    if (failure) return;
    const meta: RouteMeta | undefined = deepestHandleValue(to, (handle) => resolveHandleValue(handle.meta, to));

    const next = new Map<string, { attribute: MetaAttribute; key: string }>([
      [tagId(NameAttribute, DescriptionName), { attribute: NameAttribute, key: DescriptionName }],
    ]);
    for (const key of Object.keys(meta ?? {})) {
      next.set(tagId(attributeFor(key), key), { attribute: attributeFor(key), key });
    }

    for (const [id, tag] of managed) {
      if (!next.has(id)) setMetaTag(tag.attribute, tag.key, undefined);
    }
    managed = next;

    setMetaTag(NameAttribute, DescriptionName, meta?.description);
    for (const [key, content] of Object.entries(meta ?? {})) {
      if (key !== DescriptionName) setMetaTag(attributeFor(key), key, content);
    }
  });
}
