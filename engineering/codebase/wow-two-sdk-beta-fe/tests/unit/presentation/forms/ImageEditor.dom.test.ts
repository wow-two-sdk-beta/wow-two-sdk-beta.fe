import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { ImageEditor, ImageEditRecipeExtensions, type ImageEditRecipe } from '@src/presentation/forms';

const wrappers: VueWrapper[] = [];
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  vi.restoreAllMocks();
});
function editor(props: Record<string, unknown> = {}) {
  const wrapper = mount(ImageEditor, {
    props: { src: '/original.png', naturalWidth: 800, naturalHeight: 600, ...props },
  });
  wrappers.push(wrapper);
  return wrapper;
}
function button(wrapper: VueWrapper, name: string) {
  const found = wrapper.findAll('button').find((entry) => entry.text() === name);
  if (!found) throw new Error(`Button not found: ${name}`);
  return found;
}
function recipe(wrapper: Pick<VueWrapper, 'emitted'>): ImageEditRecipe {
  return wrapper.emitted('update:modelValue')?.at(-1)?.[0] as ImageEditRecipe;
}

describe('ImageEditor', () => {
  it('emits processing intents only on request and never fetches or changes the source', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const wrapper = editor();
    expect(wrapper.emitted('preview')).toBeUndefined();
    await button(wrapper, 'Rotate right').trigger('click');
    await button(wrapper, 'Flip horizontal').trigger('click');
    expect(recipe(wrapper)).toMatchObject({ rotate: 90, flipHorizontal: true, crop: null });
    await button(wrapper, 'Preview edits').trigger('click');
    await button(wrapper, 'Apply as new image').trigger('click');
    expect(wrapper.emitted('preview')?.[0]?.[0]).toEqual(recipe(wrapper));
    expect(wrapper.emitted('apply')?.[0]?.[0]).toEqual(recipe(wrapper));
    expect(wrapper.get('img').attributes('src')).toBe('/original.png');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps crop coordinates in original upright pixels through rotation', async () => {
    const wrapper = editor();
    await button(wrapper, 'Square').trigger('click');
    expect(recipe(wrapper).crop).toEqual({ x: 100, y: 0, width: 600, height: 600 });
    await button(wrapper, 'Rotate right').trigger('click');
    expect(recipe(wrapper).crop).toEqual({ x: 100, y: 0, width: 600, height: 600 });
    await button(wrapper, 'Full image').trigger('click');
    expect(recipe(wrapper).crop).toBeNull();
  });

  it('undoes, redoes and resets without mutation, and cuts a replaced redo branch', async () => {
    const seed = ImageEditRecipeExtensions.create();
    const wrapper = editor({ defaultValue: seed });
    await button(wrapper, 'Rotate right').trigger('click');
    await button(wrapper, 'Flip vertical').trigger('click');
    await button(wrapper, 'Undo').trigger('click');
    expect(recipe(wrapper)).toMatchObject({ rotate: 90, flipVertical: false });
    await button(wrapper, 'Redo').trigger('click');
    expect(recipe(wrapper).flipVertical).toBe(true);
    await button(wrapper, 'Undo').trigger('click');
    await button(wrapper, 'Flip horizontal').trigger('click');
    expect(button(wrapper, 'Redo').attributes('disabled')).toBeDefined();
    await button(wrapper, 'Reset edits').trigger('click');
    expect(recipe(wrapper)).toEqual(ImageEditRecipeExtensions.create());
    expect(seed).toEqual(ImageEditRecipeExtensions.create());
  });

  it('bounds proportional resizing after rotation and supports independent dimensions', async () => {
    const wrapper = editor({ maxDimension: 1000, maxPixels: 600_000 });
    await button(wrapper, 'Rotate right').trigger('click');
    const width = wrapper.findAll('input[type=number]')[0]!;
    await width.setValue('900');
    const next = recipe(wrapper).resize!;
    expect(next.width * next.height).toBeLessThanOrEqual(600_000);
    expect(next.width / next.height).toBeCloseTo(600 / 800, 2);
    await wrapper.findAll('input[type=checkbox]')[0]!.setValue(false);
    await width.setValue('400');
    expect(recipe(wrapper).resize?.width).toBe(400);
    expect(recipe(wrapper).resize?.height).toBe(next.height);
  });

  it('gates background removal and refuses invalid controlled recipes', async () => {
    const wrapper = editor();
    expect(wrapper.findAll('input[type=checkbox]')[1]!.attributes('disabled')).toBeDefined();
    await wrapper.setProps({ canRemoveBackground: true });
    await wrapper.findAll('input[type=checkbox]')[1]!.setValue(true);
    expect(recipe(wrapper).removeBackground).toBe(true);
    await wrapper.setProps({ canRemoveBackground: false });
    expect(wrapper.get('[role=alert]').text()).toContain('unavailable');
    expect(button(wrapper, 'Apply as new image').attributes('disabled')).toBeDefined();
  });

  it('lets a removed capability be cleared without resetting other edits', async () => {
    const wrapper = editor({
      canRemoveBackground: false,
      defaultValue: {
        ...ImageEditRecipeExtensions.create(),
        removeBackground: true,
        rotate: 90,
      },
    });
    await wrapper.findAll('input[type=checkbox]')[1]!.setValue(false);
    expect(recipe(wrapper)).toMatchObject({ removeBackground: false, rotate: 90 });
    expect(button(wrapper, 'Apply as new image').attributes('disabled')).toBeUndefined();
  });

  it('requires acknowledgement of controlled source resets before processing', async () => {
    const wrapper = editor({ modelValue: { ...ImageEditRecipeExtensions.create(), rotate: 90 } });
    await wrapper.setProps({ src: '/replacement.png' });
    expect(button(wrapper, 'Apply as new image').attributes('disabled')).toBeDefined();
    await button(wrapper, 'Apply as new image').trigger('click');
    expect(wrapper.emitted('apply')).toBeUndefined();
    await wrapper.setProps({ modelValue: ImageEditRecipeExtensions.create() });
    expect(button(wrapper, 'Apply as new image').attributes('disabled')).toBeUndefined();
  });

  it('blocks busy, disabled and read-only intents, announcing supplied failures', async () => {
    for (const flag of ['isBusy', 'isDisabled', 'isReadOnly']) {
      const wrapper = editor({ [flag]: true, error: 'Worker unavailable' });
      await button(wrapper, 'Rotate right').trigger('click');
      await button(wrapper, 'Apply as new image').trigger('click');
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(wrapper.emitted('apply')).toBeUndefined();
      expect(wrapper.get('[role=alert]').text()).toBe('Worker unavailable');
    }
  });

  it('clears source history and hides old previews on source changes', async () => {
    const wrapper = editor({ previewSrc: '/preview.png' });
    expect(wrapper.findAll('img')).toHaveLength(2);
    await button(wrapper, 'Rotate right').trigger('click');
    expect(wrapper.findAll('img')).toHaveLength(1);
    await wrapper.setProps({ previewSrc: '/preview-2.png' });
    expect(wrapper.findAll('img')).toHaveLength(2);
    await wrapper.setProps({ src: '/new.png', naturalWidth: 400, naturalHeight: 300 });
    expect(wrapper.findAll('img')).toHaveLength(1);
    expect(recipe(wrapper)).toEqual(ImageEditRecipeExtensions.create());
    expect(button(wrapper, 'Undo').attributes('disabled')).toBeDefined();
  });

  it('respects controlled ownership and clears history for external replacement', async () => {
    const seed = ImageEditRecipeExtensions.create();
    const wrapper = editor({ modelValue: seed });
    await button(wrapper, 'Rotate right').trigger('click');
    await button(wrapper, 'Apply as new image').trigger('click');
    expect(wrapper.emitted('apply')?.[0]?.[0]).toEqual(seed);
    await wrapper.setProps({ modelValue: recipe(wrapper) });
    expect(button(wrapper, 'Undo').attributes('disabled')).toBeUndefined();
    await wrapper.setProps({ modelValue: { ...seed, rotate: 180 } });
    expect(button(wrapper, 'Undo').attributes('disabled')).toBeDefined();
  });

  it('uses the original seed for native form reset and honors cancellation', async () => {
    const host = mount(
      {
        components: { ImageEditor },
        template: '<form><ImageEditor src="/a.png" :natural-width="800" :natural-height="600" /></form>',
      },
      { attachTo: document.body },
    );
    wrappers.push(host);
    await button(host, 'Rotate right').trigger('click');
    host.get('form').element.dispatchEvent(new Event('reset', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await host.vm.$nextTick();
    const inner = host.getComponent(ImageEditor);
    expect(recipe(inner)).toEqual(ImageEditRecipeExtensions.create());
    await button(host, 'Rotate right').trigger('click');
    host.get('form').element.addEventListener('reset', (event) => event.preventDefault(), { once: true });
    host.get('form').element.dispatchEvent(new Event('reset', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    expect(recipe(inner).rotate).toBe(90);
  });

  it('supports format and quality changes and exposes named keyboard controls', async () => {
    const wrapper = editor();
    await button(wrapper, 'JPEG').trigger('click');
    await wrapper.findAll('input[type=number]')[2]!.setValue('75');
    expect(recipe(wrapper).output).toEqual({ format: 'jpeg', quality: 75 });
    expect(wrapper.find('[aria-label="Rotate and flip"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Edit history"]').exists()).toBe(true);
    expect(wrapper.findAll('label').map((entry) => entry.text())).toContain('Keep proportions');
  });
});
