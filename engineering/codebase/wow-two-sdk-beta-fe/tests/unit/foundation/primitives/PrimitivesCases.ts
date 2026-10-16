import { h, type VNode } from 'vue';
import {
  AccessibleIcon,
  Announce,
  AnchoredPositioner,
  ColorModeProvider,
  Direction,
  DirectionProvider,
  DismissableLayer,
  FocusScope,
  FormControlProvider,
  OverlayArrow,
  Portal,
  Presence,
  Primitive,
  RovingFocusGroup,
  ScrollLockProvider,
  ScrollViewport,
  Slottable,
  VisuallyHidden,
} from '@src/foundation/primitives';
import { smokeCase, type SmokeCase } from '../../../support/Smoke';

/* AnchoredPositioner needs something to anchor to; `null` is the documented "not yet" value. */
const inPositioner = (node: VNode): VNode => h(AnchoredPositioner, { anchor: null }, () => node);

/**
 * Every component `@wow-two-beta/ui-vue/foundation/primitives` exports, as smoke cases.
 *
 * This is the L2 headless layer every presentation component composes over, so a primitive that
 * stops mounting or stops surviving SSR breaks the groups above it wholesale rather than one
 * component at a time — which is what earns it its own sweep rather than coverage-by-proxy.
 */
export const primitivesCases: readonly SmokeCase[] = [
  smokeCase('Primitive', Primitive, {}, { slot: true }),
  smokeCase('Slottable', Slottable, {}, { slot: true }),
  smokeCase('Portal', Portal, {}, { slot: true }),
  smokeCase('VisuallyHidden', VisuallyHidden, {}, { slot: true }),
  smokeCase('Presence', Presence, { isPresent: true }, { slot: true }),
  smokeCase('DirectionProvider', DirectionProvider, { dir: Direction.Ltr }, { slot: true }),
  smokeCase('AccessibleIcon', AccessibleIcon, { label: 'Save' }, { slot: true }),
  smokeCase('FocusScope', FocusScope, {}, { slot: true }),
  smokeCase('DismissableLayer', DismissableLayer, {}, { slot: true }),
  smokeCase('AnchoredPositioner', AnchoredPositioner, { anchor: null }, { slot: true }),
  smokeCase('RovingFocusGroup', RovingFocusGroup, {}, { slot: true }),
  smokeCase('FormControlProvider', FormControlProvider, {}, { slot: true }),
  smokeCase('ScrollLockProvider', ScrollLockProvider, {}, { slot: true }),
  smokeCase('ScrollViewport', ScrollViewport, {}, { slot: true }),
  smokeCase('OverlayArrow', OverlayArrow, {}, { wrap: inPositioner }),
  smokeCase('Announce', Announce, {}, { slot: true }),
  smokeCase('ColorModeProvider', ColorModeProvider, {}, { slot: true }),
];
