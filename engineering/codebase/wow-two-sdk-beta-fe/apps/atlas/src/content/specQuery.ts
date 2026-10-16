import { BaseSpec, OptionLabels, type Device, type LayoutSpec } from './model';

/** The spec keys the lab exposes, in control order. */
export const SpecKeys = ['nav', 'local', 'leading', 'trailing', 'panelMode', 'content', 'surface', 'density'] as const;

type Options = Readonly<Record<string, string>>;

/** The allowed values per key; panels share one role list and add "none". */
export const SpecOptions: Readonly<Record<(typeof SpecKeys)[number], Options>> = {
  nav: OptionLabels.nav,
  local: OptionLabels.local,
  leading: { none: 'None', ...OptionLabels.panel },
  trailing: { none: 'None', ...OptionLabels.panel },
  panelMode: OptionLabels.panelMode,
  content: OptionLabels.content,
  surface: OptionLabels.surface,
  density: OptionLabels.density,
};

/** Serializes a spec (and device) into query parameters, so a lab composition is a shareable link. */
export function specToQuery(spec: LayoutSpec, device?: Device): Record<string, string> {
  const query: Record<string, string> = {};
  for (const key of SpecKeys) query[key] = String(spec[key] ?? 'none');
  if (spec.bottomDock) query.dock = '1';
  if (device) query.device = device;
  return query;
}

/** Reads a spec from query parameters, falling back to the base spec for anything unknown. */
export function specFromQuery(query: URLSearchParams, fallback: LayoutSpec = BaseSpec): LayoutSpec {
  const next: Record<string, unknown> = { ...fallback };
  for (const key of SpecKeys) {
    const value = query.get(key);
    if (value === null || !(value in SpecOptions[key])) continue;
    next[key] = (key === 'leading' || key === 'trailing') && value === 'none' ? null : value;
  }
  if (query.has('dock')) next.bottomDock = query.get('dock') === '1';
  return next as unknown as LayoutSpec;
}
