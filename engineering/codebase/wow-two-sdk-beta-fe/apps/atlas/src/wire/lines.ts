/** A deterministic "text line" width, so wireframes look written without changing between renders. */
export function lineWidth(index: number, min = 40, spread = 45): string {
  return `${min + ((index * 37 + 11) % spread)}%`;
}

/** `count` indices, for `v-for` over drawn rows. */
export function range(count: number): number[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => index);
}
