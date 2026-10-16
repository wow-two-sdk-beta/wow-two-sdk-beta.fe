/** A natural-pixel rectangle in the original upright image. */
export interface ImageEditCrop {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Quarter-turn clockwise rotation, applied after the source crop. */
export type ImageEditRotation = 0 | 90 | 180 | 270;

/** Encoders supported by the portable raster editing contract. */
export type ImageEditFormat = 'png' | 'jpeg' | 'webp';

/** An immutable edit intent; it never contains image bytes, URLs or storage identities. */
export interface ImageEditRecipe {
  readonly crop: ImageEditCrop | null;
  readonly rotate: ImageEditRotation;
  readonly flipHorizontal: boolean;
  readonly flipVertical: boolean;
  readonly resize: { readonly width: number; readonly height: number } | null;
  readonly output: { readonly format: ImageEditFormat; readonly quality: number };
  readonly removeBackground: boolean;
}

/** Caller-owned bounds applied before processing an editing intent. */
export interface ImageEditBounds {
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readonly maxDimension: number;
  readonly maxPixels: number;
  readonly canRemoveBackground: boolean;
}

/** Validation outcomes; presentation owns the translated explanations. */
export type ImageEditIssue = 'source' | 'crop' | 'rotation' | 'resize' | 'output' | 'background';
