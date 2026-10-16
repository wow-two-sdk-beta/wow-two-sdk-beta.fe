export { default as BottomSheet, useBottomSheet, type BottomSheetProps } from './BottomSheet.vue';

/*
 * Shared chrome re-exported under the BottomSheet namespace — they wire
 * `id={titleId}` / `id={descriptionId}`, so the sheet's `aria-labelledby` /
 * `aria-describedby` resolve. React attached them as `BottomSheet.Title` /
 * `BottomSheet.Description` via `Object.assign`; Vue has no component statics,
 * so the flat names are the whole API.
 */
export { default as BottomSheetTitle } from '../OverlayTitle.vue';
export { default as BottomSheetDescription } from '../OverlayDescription.vue';
