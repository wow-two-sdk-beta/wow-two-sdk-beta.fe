import type { ImageEditBounds, ImageEditIssue, ImageEditRecipe } from './ImageEditRecipe';

const isDimension = (value: number) => Number.isSafeInteger(value) && value > 0;

/** Pure editing values and validation, independent of a rendering or transport engine. */
export const ImageEditRecipeExtensions = {
  create(): ImageEditRecipe {
    return {
      crop: null,
      rotate: 0,
      flipHorizontal: false,
      flipVertical: false,
      resize: null,
      output: { format: 'png', quality: 90 },
      removeBackground: false,
    };
  },
  copy(recipe: ImageEditRecipe): ImageEditRecipe {
    return {
      ...recipe,
      crop: recipe.crop ? { ...recipe.crop } : null,
      resize: recipe.resize ? { ...recipe.resize } : null,
      output: { ...recipe.output },
    };
  },
  size(recipe: ImageEditRecipe, width: number, height: number): { width: number; height: number } {
    const crop = recipe.crop ?? { width, height };
    return recipe.rotate === 90 || recipe.rotate === 270
      ? { width: crop.height, height: crop.width }
      : { width: crop.width, height: crop.height };
  },
  validate(recipe: ImageEditRecipe, bounds: ImageEditBounds): ImageEditIssue | undefined {
    const { naturalWidth: width, naturalHeight: height, maxDimension, maxPixels } = bounds;
    if (![width, height, maxDimension, maxPixels].every(isDimension) || width * height > maxPixels) return 'source';
    const crop = recipe.crop;
    if (
      crop &&
      (!Number.isSafeInteger(crop.x) ||
        !Number.isSafeInteger(crop.y) ||
        crop.x < 0 ||
        crop.y < 0 ||
        !isDimension(crop.width) ||
        !isDimension(crop.height) ||
        crop.x + crop.width > width ||
        crop.y + crop.height > height)
    )
      return 'crop';
    if (![0, 90, 180, 270].includes(recipe.rotate)) return 'rotation';
    const size = recipe.resize ?? this.size(recipe, width, height);
    if (
      !isDimension(size.width) ||
      !isDimension(size.height) ||
      size.width > maxDimension ||
      size.height > maxDimension ||
      size.width * size.height > maxPixels
    )
      return 'resize';
    if (
      !['png', 'jpeg', 'webp'].includes(recipe.output.format) ||
      !Number.isSafeInteger(recipe.output.quality) ||
      recipe.output.quality < 1 ||
      recipe.output.quality > 100
    )
      return 'output';
    if (recipe.removeBackground && !bounds.canRemoveBackground) return 'background';
    return undefined;
  },
} as const;
