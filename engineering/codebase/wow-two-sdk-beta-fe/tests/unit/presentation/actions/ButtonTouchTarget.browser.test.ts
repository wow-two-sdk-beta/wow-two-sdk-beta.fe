import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { h } from 'vue';
import Button from '@src/presentation/actions/button/Button.vue';
import { canEmulateCoarsePointer, useCoarsePointer, useFinePointer } from '../../../support/CoarsePointer';
import { reachOf } from '../../../support/TouchReach';
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
    // Room around the button, so the hit area is not cut at the viewport's edge.
    document.body.style.padding = '24px';
    await useCoarsePointer();
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
  });
  afterEach(async () => {
    document.body.style.padding = '';
    await useFinePointer();
  });

  it.each(['sm', 'md'] as const)('lifts size %s to a 44 x 44px hit area, short label included', (size) => {
    const button = mountButton({ size }, 'Day');
    expect(box(button).height).toBeGreaterThanOrEqual(44);
    expect(reachOf(button).width).toBeGreaterThanOrEqual(43.5);
  });

  it('lifts the default size, which is md', () => {
    expect(box(mountButton()).height).toBeGreaterThanOrEqual(44);
  });

  it.each([
    ['sm', 32],
    ['md', 40],
  ] as const)('gives a square %s icon button a 44 x 44px hit area on its own %ipx box', (size, side) => {
    const button = mountButton({ size, shape: 'square' }, null);
    expect(box(button)).toEqual({ width: side, height: side });
    const { width, height } = reachOf(button);
    expect(width).toBeGreaterThanOrEqual(43.5);
    expect(height).toBeGreaterThanOrEqual(43.5);
  });

  it('gives a circle md icon button a 44 x 44px hit area and keeps its 40px round box', () => {
    const button = mountButton({ shape: 'circle' }, null);
    expect(box(button)).toEqual({ width: 40, height: 40 });
    const { width, height } = reachOf(button);
    expect(width).toBeGreaterThanOrEqual(43.5);
    expect(height).toBeGreaterThanOrEqual(43.5);
    expect(getComputedStyle(button).borderTopLeftRadius).not.toBe('0px');
  });

  it('gives a short sm label a 44px-wide hit area without widening its box', () => {
    const button = mountButton({ size: 'sm' }, 'A');
    expect(box(button).width).toBeLessThan(44);
    expect(reachOf(button).width).toBeGreaterThanOrEqual(43.5);
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

  it('leaves the link variant at its text height, with no hit area past its text', () => {
    const link = mountButton({ variant: 'link' }, 'Terms');
    expect(box(link).height).toBeLessThan(44);
    expect(reachOf(link).height).toBeLessThan(44);
  });
});
