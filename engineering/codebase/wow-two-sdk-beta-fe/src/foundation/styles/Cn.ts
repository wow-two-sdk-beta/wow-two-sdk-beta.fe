import clsx, { type ClassValue } from 'clsx';
import { cn as mergeClasses } from 'tailwind-variants';

/**
 * Conditional class composer with Tailwind conflict-resolution.
 * Use anywhere you'd otherwise concatenate class strings.
 */
export function cn(...inputs: ReadonlyArray<ClassValue>): string {
  // Variants and caller overrides share one merge engine and its bounded cache.
  return mergeClasses(clsx(inputs)) ?? '';
}
