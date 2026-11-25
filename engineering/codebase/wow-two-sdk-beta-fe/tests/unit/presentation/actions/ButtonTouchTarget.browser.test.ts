import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import Button from '@src/presentation/actions/button/Button.vue';
import { canEmulateCoarsePointer, useCoarsePointer, useFinePointer } from '../../../support/CoarsePointer';
import '@src/index.css';

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

function mountButton(props: Record<string, unknown> = {}, label: string | null = 'Go'): HTMLButtonElement {
  wrapper = mount(Button, {
    attachTo: document.body,
    props,
    attrs: label === null ? { 'aria-label': 'Open' } : {},
    slots: { default: () => (label === null ? h('svg', { width: 16, height: 16, 'aria-hidden': 'true' }) : label) },
  });
  return wrapper.get('button').element;
}

const box = (button: HTMLElement): { width: number; height: number } => {
  const rect = button.getBoundingClientRect();
  return { width: Math.round(rect.width), height: Math.round(rect.height) };
};

describe('Button under a fine pointer', () => {
  it.each([
    ['xs', 24],
    ['sm', 32],
    ['md', 40],
    ['lg', 48],
    ['xl', 56],
  ] as const)('keeps size %s at its own %ipx height', (size, height) => {
    expect(box(mountButton({ size })).height).toBe(height);
  });

  it('keeps a square md icon button at 40 x 40px', () => {
    expect(box(mountButton({ shape: 'square' }, null))).toEqual({ width: 40, height: 40 });
  });
});

describe.skipIf(!canEmulateCoarsePointer)('Button under a coarse pointer', () => {
  beforeEach(async () => {
    await useCoarsePointer();
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
  });
  afterEach(async () => {
    await useFinePointer();
  });

  it.each(['sm', 'md'] as const)('lifts size %s to a 44 x 44px hit area, short label included', (size) => {
    const { width, height } = box(mountButton({ size }, 'Day'));
    expect(height).toBeGreaterThanOrEqual(44);
    expect(width).toBeGreaterThanOrEqual(44);
  });

  it('lifts the default size, which is md', () => {
    expect(box(mountButton()).height).toBeGreaterThanOrEqual(44);
  });

  it.each(['sm', 'md'] as const)('lifts a square %s icon button to 44 x 44px', (size) => {
    const { width, height } = box(mountButton({ size, shape: 'square' }, null));
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  });

  it('lifts a circle md icon button to 44 x 44px and keeps it round', () => {
    const button = mountButton({ shape: 'circle' }, null);
    const { width, height } = box(button);
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
    expect(width).toBe(height);
    expect(getComputedStyle(button).borderTopLeftRadius).not.toBe('0px');
  });

  it('lifts an md button whose caller shortens it with a class', () => {
    expect(box(mountButton({ class: 'h-8' })).height).toBeGreaterThanOrEqual(44);
  });

  it('leaves xs, lg and xl at their own sizes', () => {
    expect(box(mountButton({ size: 'xs' })).height).toBe(24);
    wrapper?.unmount();
    expect(box(mountButton({ size: 'lg' })).height).toBe(48);
    wrapper?.unmount();
    expect(box(mountButton({ size: 'xl' })).height).toBe(56);
  });

  it('leaves the link variant at its text height', () => {
    expect(box(mountButton({ variant: 'link' }, 'Terms')).height).toBeLessThan(44);
  });
});
