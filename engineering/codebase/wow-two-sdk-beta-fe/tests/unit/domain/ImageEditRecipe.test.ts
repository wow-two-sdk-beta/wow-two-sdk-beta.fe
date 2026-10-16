import { describe, expect, it } from 'vitest';
import { ImageEditRecipeExtensions as edits } from '@src/domain/imageEditing';

const bounds = {
  naturalWidth: 800,
  naturalHeight: 600,
  maxDimension: 8192,
  maxPixels: 50_000_000,
  canRemoveBackground: false,
};
describe('ImageEditRecipe', () => {
  it('accepts complete source and valid portable transforms', () => {
    expect(edits.validate(edits.create(), bounds)).toBeUndefined();
    const recipe = { ...edits.create(), crop: { x: 100, y: 10, width: 400, height: 300 }, rotate: 90 as const };
    expect(edits.size(recipe, 800, 600)).toEqual({ width: 300, height: 400 });
    expect(edits.validate(recipe, bounds)).toBeUndefined();
    const copy = edits.copy(recipe);
    expect(copy).toEqual(recipe);
    expect(copy.crop).not.toBe(recipe.crop);
  });
  it('rejects bad geometry, caps, unsupported capabilities and formats', () => {
    expect(edits.validate(edits.create(), { ...bounds, naturalWidth: NaN })).toBe('source');
    expect(edits.validate({ ...edits.create(), crop: { x: 700, y: 0, width: 200, height: 50 } }, bounds)).toBe('crop');
    expect(edits.validate({ ...edits.create(), resize: { width: 9000, height: 1 } }, bounds)).toBe('resize');
    expect(edits.validate({ ...edits.create(), resize: { width: 8192, height: 8192 } }, bounds)).toBe('resize');
    expect(edits.validate({ ...edits.create(), removeBackground: true }, bounds)).toBe('background');
    expect(edits.validate({ ...edits.create(), output: { format: 'jpeg', quality: 101 } }, bounds)).toBe('output');
  });
});
