/**
 * Returns `""` when the condition is true, `undefined` otherwise.
 * Use for boolean `data-*` attributes — Vue removes the attr when the bound value is undefined,
 * so the DOM cleanly toggles `data-state` rather than `data-state="false"`.
 */
export function dataAttr(condition: boolean | undefined): '' | undefined {
  return condition ? '' : undefined;
}
