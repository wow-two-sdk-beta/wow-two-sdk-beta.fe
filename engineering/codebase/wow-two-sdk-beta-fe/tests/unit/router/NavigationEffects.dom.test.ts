import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { installDocumentMeta, installDocumentTitle, installRoutePersistence, prefetch } from '@src/router';

afterEach(() => {
  document.head.innerHTML = '';
  window.localStorage.clear();
});

describe('navigation side effects', () => {
  it('keeps successful metadata and persistence when navigation is rejected', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: {}, meta: { title: 'Home', meta: { description: 'Home page' } } },
        {
          path: '/blocked',
          component: {},
          meta: { title: 'Blocked', meta: { description: 'Wrong page' } },
          beforeEnter: () => false,
        },
      ],
    });
    installDocumentTitle(router);
    installDocumentMeta(router);
    installRoutePersistence(router, { storageKey: 'route' });
    await router.push('/');
    await router.push('/blocked');
    expect(router.currentRoute.value.path).toBe('/');
    expect(document.title).toBe('Home');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Home page');
    expect(window.localStorage.getItem('route')).toBe('/');
  });

  it('retries failed prefetch while deduplicating concurrent attempts', async () => {
    const importer = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ default: {} });
    prefetch(importer);
    prefetch(importer);
    await vi.waitFor(() => expect(importer).toHaveBeenCalledTimes(1));
    prefetch(importer);
    await vi.waitFor(() => expect(importer).toHaveBeenCalledTimes(2));
    prefetch(importer);
    await Promise.resolve();
    expect(importer).toHaveBeenCalledTimes(2);
  });
});
