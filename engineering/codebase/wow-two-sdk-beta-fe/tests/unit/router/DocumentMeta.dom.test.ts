import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';

import { installDocumentMeta } from '@src/router';
import type { RouteHandle } from '@src/router';

/*
 * `dom` project (happy-dom) — the hook writes straight to `document.head`.
 *
 * Driven through a raw `createRouter` rather than `createAppRouter`: a route record's `meta` IS the
 * compiled `handle`, so setting it directly is the same input with none of the other root behaviors
 * installed alongside.
 *
 * The `og:` case is the reason this file exists. An Open Graph tag written as `name=` renders a
 * perfectly normal-looking page whose share card is blank, so nothing short of asserting the
 * attribute catches it.
 */

const Blank = { template: '<div />' };

function read(attribute: 'name' | 'property', key: string): string | null {
  return document.head.querySelector(`meta[${attribute}="${key}"]`)?.getAttribute('content') ?? null;
}

function routerWith(routes: readonly RouteRecordRaw[]) {
  const router = createRouter({ history: createMemoryHistory(), routes: [...routes] });
  installDocumentMeta(router);
  return router;
}

/** Builds a record whose `meta` is a `RouteHandle`, the shape `createAppRouter` compiles to. */
function record(path: string, handle: RouteHandle, children?: RouteRecordRaw[]): RouteRecordRaw {
  return { path, component: Blank, meta: handle, ...(children ? { children } : {}) } as RouteRecordRaw;
}

beforeEach(() => {
  document.head.innerHTML = '';
});

describe('installDocumentMeta', () => {
  it('writes og: keys as property and everything else as name', async () => {
    const router = routerWith([
      record('/', {
        meta: {
          description: 'A dynamic QR platform',
          'og:title': 'Smart QR',
          'twitter:card': 'summary_large_image',
        },
      }),
    ]);

    await router.push('/');

    expect(read('name', 'description')).toBe('A dynamic QR platform');
    expect(read('property', 'og:title')).toBe('Smart QR');
    expect(read('name', 'og:title')).toBeNull();
    // Twitter's own docs use `name=`, so the prefix test is `og:` only.
    expect(read('name', 'twitter:card')).toBe('summary_large_image');
  });

  it('resolves a function handle against the active route params', async () => {
    const router = routerWith([
      record('/blog/:slug', {
        meta: (route) => ({
          description: `Post: ${String(route.params.slug)}`,
          'og:title': String(route.params.slug),
        }),
      }),
    ]);

    await router.push('/blog/never-expire');

    expect(read('name', 'description')).toBe('Post: never-expire');
    expect(read('property', 'og:title')).toBe('never-expire');
  });

  it('re-resolves on a param change within the same route', async () => {
    const router = routerWith([
      record('/blog/:slug', { meta: (route) => ({ description: String(route.params.slug) }) }),
    ]);

    await router.push('/blog/first');
    await router.push('/blog/second');

    expect(read('name', 'description')).toBe('second');
  });

  it('clears a tag the next route omits', async () => {
    const router = routerWith([
      record('/', { meta: { 'og:title': 'Home', 'og:image': '/hero.png' } }),
      record('/pricing', { meta: { 'og:title': 'Pricing' } }),
    ]);

    await router.push('/');
    await router.push('/pricing');

    expect(read('property', 'og:title')).toBe('Pricing');
    expect(read('property', 'og:image')).toBeNull();
  });

  it('falls through to the parent match when a resolver returns undefined', async () => {
    const router = routerWith([
      record('/', { meta: { description: 'Layout default' } }, [
        record('shop/:id', { meta: (route) => (route.params.id === 'hidden' ? undefined : { description: 'Item' }) }),
      ]),
    ]);

    await router.push('/shop/hidden');

    expect(read('name', 'description')).toBe('Layout default');
  });
});
