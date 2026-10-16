// Typed path builder — the generic core of a route registry. An app declares its own `paths`
// registry over `definePath` (`const paths = { project: definePath('/projects/:id'), … } as const`);
// this module owns only the builder plus its inferred param types. Framework-agnostic (no vue /
// vue-router imports), so it ports from the React package unchanged.

/** Defines the union of `:param` names inferred from a route template literal (`never` when it has none). */
export type PathParamName<Template extends string> = Template extends `${string}:${infer Param}/${infer Rest}`
  ? Param | PathParamName<Rest>
  : Template extends `${string}:${infer Param}`
    ? Param
    : never;

/** Defines the params object a route template requires — one required string key per `:segment`. */
export type PathParams<Template extends string> = {
  readonly [Key in PathParamName<Template>]: string;
};

/** Defines a path builder's argument tuple — empty when the template has no `:params`, else one params object. */
export type PathBuilderArgs<Template extends string> = [PathParamName<Template>] extends [never]
  ? []
  : [params: PathParams<Template>];

/** Defines a typed path builder — call with the template's params for the href; `.pattern` is the route template. */
export interface PathBuilder<Template extends string> {
  (...args: PathBuilderArgs<Template>): string;

  /** The route pattern template (e.g. `/projects/:id`) — used as the route table's `path`. */
  readonly pattern: Template;
}

const ParamPattern = /:([A-Za-z0-9_]+)/g;

/** Creates a typed path builder — substitutes + URL-encodes each `:param`, and carries the template as `.pattern`. */
export function definePath<const Template extends string>(template: Template): PathBuilder<Template> {
  const build = (params: Record<string, string> = {}): string =>
    template.replace(ParamPattern, (_match: string, name: string) => encodeURIComponent(params[name] ?? ''));
  return Object.assign(build, { pattern: template }) as PathBuilder<Template>;
}
