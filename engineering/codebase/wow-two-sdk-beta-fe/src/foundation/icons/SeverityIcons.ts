import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-vue-next';
import type { Severity } from '../styles';
import type { IconAdapter } from './icon';

/**
 * Provides the glyph each severity carries — a distinct shape per tone, so the meaning never rests on colour
 * alone. `neutral` carries no intent and has none.
 */
export const SeverityIcons: Readonly<Record<Severity, IconAdapter | null>> = Object.freeze({
  neutral: null,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
});

/** Provides the text colour each severity glyph takes — the tones' `-soft-foreground` text tokens. */
export const SeverityIconClasses: Readonly<Record<Severity, string>> = Object.freeze({
  neutral: 'text-muted-foreground',
  info: 'text-info-soft-foreground',
  success: 'text-success-soft-foreground',
  warning: 'text-warning-soft-foreground',
  danger: 'text-destructive-soft-foreground',
});
