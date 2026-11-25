import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { Tooltip } from '@src/presentation/overlays';

let wrapper: VueWrapper | undefined;
let neighbour: VueWrapper | undefined;
let isReducedMotion = false;

beforeEach(() => {
  isReducedMotion = false;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query.includes('prefers-reduced-motion') && isReducedMotion,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  neighbour?.unmount();
  neighbour = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

function mountTooltip(props: { fadeDuration?: number; openDelay?: number } = {}): VueWrapper {
  wrapper = mount(Tooltip, {
    props: { content: 'Filter options', openDelay: 0, ...props },
    slots: { default: '<button>Filter</button>' },
    attachTo: document.body,
  });
  return wrapper;
}

function mountNeighbour(props: { openDelay: number }): VueWrapper {
  neighbour = mount(Tooltip, {
    props: { content: 'Next hint', fadeDuration: 300, ...props },
    slots: { default: '<button>Next</button>' },
    attachTo: document.body,
  });
  return neighbour;
}

function body(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role=tooltip]');
}

function bodies(): (string | null)[] {
  return Array.from(document.querySelectorAll('[role=tooltip]'), (node) => node.textContent);
}

/** Collects the inline style every body had before each change, which shows whether one began transparent. */
function recordStyles(): { readonly styles: string[]; stop: () => void } {
  const styles: string[] = [];
  const observer = new MutationObserver((records) => {
    for (const record of records) styles.push(record.oldValue ?? '');
  });
  observer.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['style'],
    attributeOldValue: true,
  });
  return { styles, stop: () => observer.disconnect() };
}

async function open(trigger: ReturnType<VueWrapper['get']>): Promise<void> {
  await trigger.trigger('pointerenter');
  await vi.advanceTimersByTimeAsync(0);
}

async function close(trigger: ReturnType<VueWrapper['get']>): Promise<void> {
  await trigger.trigger('pointerleave');
  await vi.advanceTimersByTimeAsync(0);
}

describe('Tooltip with an immediate transition', () => {
  it('mounts and unmounts at once, with no style of its own on the body', async () => {
    const trigger = mountTooltip({ fadeDuration: 0 }).get('button');
    await open(trigger);
    expect(body()?.textContent).toBe('Filter options');
    expect(body()?.hasAttribute('style')).toBe(false);

    await close(trigger);
    expect(body()).toBeNull();
    expect(document.querySelector('[data-portal-name]')).toBeNull();
  });

  it('treats a zero or negative fadeDuration as no fade', async () => {
    for (const fadeDuration of [0, -50]) {
      const trigger = mountTooltip({ fadeDuration }).get('button');
      await open(trigger);
      expect(body()?.hasAttribute('style')).toBe(false);
      await close(trigger);
      expect(body()).toBeNull();
      wrapper?.unmount();
    }
  });
});

describe('Tooltip with fadeDuration', () => {
  it('mounts the body transparent and turns it opaque through an opacity transition of that length', async () => {
    const styles: string[] = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) styles.push(record.oldValue ?? '');
    });
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
      attributeOldValue: true,
    });
    try {
      const trigger = mountTooltip({ fadeDuration: 300 }).get('button');
      await open(trigger);
      await nextTick();
      expect(body()?.textContent).toBe('Filter options');
      expect(body()?.style.opacity).toBe('1');
      expect(body()?.style.transition).toBe('opacity 300ms ease-out');
      expect(styles.some((style) => style.includes('opacity: 0'))).toBe(true);
    } finally {
      observer.disconnect();
    }
  });

  it('keeps the body mounted, turned transparent, while it fades out, then removes it and its portal', async () => {
    const trigger = mountTooltip({ fadeDuration: 300 }).get('button');
    await open(trigger);
    const element = body();

    await close(trigger);
    expect(body()).toBe(element);
    expect(element?.style.opacity).toBe('0');
    expect(trigger.attributes('aria-describedby')).toBeUndefined();

    await vi.advanceTimersByTimeAsync(299);
    expect(body()).toBe(element);
    await vi.advanceTimersByTimeAsync(2);
    expect(body()).toBeNull();
    expect(document.querySelector('[data-portal-name]')).toBeNull();
  });

  it('keeps the same body, opaque again, when the pointer returns during the fade-out', async () => {
    const trigger = mountTooltip({ fadeDuration: 300 }).get('button');
    await open(trigger);
    const element = body();

    await close(trigger);
    await vi.advanceTimersByTimeAsync(100);
    await open(trigger);
    await vi.advanceTimersByTimeAsync(1000);
    expect(body()).toBe(element);
    expect(element?.style.opacity).toBe('1');
    expect(trigger.attributes('aria-describedby')).toBe(element?.id);
  });

  it('mounts a body that takes the page from a visible tooltip opaque at once, then fades it out as usual', async () => {
    await open(mountTooltip({ fadeDuration: 300 }).get('button'));
    expect(bodies()).toEqual(['Filter options']);

    const record = recordStyles();
    try {
      const next = mountNeighbour({ openDelay: 0 }).get('button');
      await open(next);
      await nextTick();
      expect(bodies()).toEqual(['Next hint']);
      expect(body()?.style.opacity).toBe('1');
      expect(record.styles.some((style) => style.includes('opacity: 0'))).toBe(false);

      await close(next);
      expect(body()?.style.opacity).toBe('0');
      await vi.advanceTimersByTimeAsync(301);
      expect(body()).toBeNull();
    } finally {
      record.stop();
    }
  });

  it('mounts a body that takes the page from a tooltip fading out opaque at once', async () => {
    const first = mountTooltip({ fadeDuration: 300 }).get('button');
    await open(first);
    await close(first);
    expect(body()?.style.opacity).toBe('0');

    const record = recordStyles();
    try {
      await open(mountNeighbour({ openDelay: 0 }).get('button'));
      await nextTick();
      expect(bodies()).toEqual(['Next hint']);
      expect(body()?.style.opacity).toBe('1');
      expect(record.styles.some((style) => style.includes('opacity: 0'))).toBe(false);
    } finally {
      record.stop();
    }
  });

  it('still fades in a body that takes the page from a tooltip that never opened', async () => {
    await mountTooltip({ fadeDuration: 300, openDelay: 100 }).get('button').trigger('pointerenter');
    expect(body()).toBeNull();

    const record = recordStyles();
    try {
      await open(mountNeighbour({ openDelay: 0 }).get('button'));
      await nextTick();
      expect(bodies()).toEqual(['Next hint']);
      expect(body()?.style.opacity).toBe('1');
      expect(record.styles.some((style) => style.includes('opacity: 0'))).toBe(true);
    } finally {
      record.stop();
    }
  });

  it('fades out after Escape as well', async () => {
    const trigger = mountTooltip({ fadeDuration: 200 }).get('button');
    await open(trigger);
    const element = body();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.advanceTimersByTimeAsync(0);
    expect(body()).toBe(element);
    expect(element?.style.opacity).toBe('0');
    await vi.advanceTimersByTimeAsync(250);
    expect(body()).toBeNull();
  });

  it('leaves nothing behind when it unmounts mid-fade', async () => {
    const trigger = mountTooltip({ fadeDuration: 300 }).get('button');
    await open(trigger);
    await close(trigger);
    expect(body()).not.toBeNull();

    wrapper?.unmount();
    wrapper = undefined;
    expect(body()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('plays no fade for a reader who asked for reduced motion', async () => {
    isReducedMotion = true;
    const trigger = mountTooltip({ fadeDuration: 300 }).get('button');
    await open(trigger);
    expect(body()).not.toBeNull();
    expect(body()?.hasAttribute('style')).toBe(false);

    await close(trigger);
    expect(body()).toBeNull();
  });
});
