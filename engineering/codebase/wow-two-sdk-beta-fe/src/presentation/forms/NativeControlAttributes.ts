import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'vue';

/** Type-only native fallthrough; model value, fixed type and visual size remain component-owned. */
export type NativeInputAttributes<TOwned extends keyof InputHTMLAttributes = never> = Omit<
  InputHTMLAttributes,
  'size' | 'value' | 'defaultValue' | 'checked' | 'type' | 'autocomplete' | TOwned
> & {
  /** Native autocomplete token string. Kept extensible rather than expanding the platform token cross-product. */
  autocomplete?: string;
};

/** Type-only textarea fallthrough; canonical model values remain component-owned. */
export type NativeTextareaAttributes = Omit<TextareaHTMLAttributes, 'value' | 'defaultValue'>;
