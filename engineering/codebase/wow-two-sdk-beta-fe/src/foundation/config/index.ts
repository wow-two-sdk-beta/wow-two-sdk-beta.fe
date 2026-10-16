// config — foundation seam. A typed, fail-fast reader for application configuration: `defineConfig(schema)`
// validates each declared key against a `ConfigField` spec (`str`/`num`/`bool`/`oneOf`/`url`/`port`/`json`/
// `list`), reading through an ordered source list — runtime `window.__APP_CONFIG__` layered ahead of build-time
// `import.meta.env` by default — and throws one aggregated `ConfigError` at startup when anything is missing or
// invalid. No Vue, no peer deps; consumed by any app that wants its env parsed once into a frozen typed object.

export {
  type ConfigField,
  type ConfigJsonDecoder,
  type ConfigFieldOptions,
  type AnyConfigField,
  type ListFieldOptions,
  str,
  num,
  bool,
  oneOf,
  url,
  port,
  json,
  list,
} from './ConfigField';

export {
  type ConfigSource,
  DefaultRuntimeConfigKey,
  importMetaEnvSource,
  windowConfigSource,
  staticSource,
  defaultSources,
  resolveRaw,
} from './ConfigSource';

export {
  type ConfigSchema,
  type InferConfig,
  type DefineConfigOptions,
  type ConfigIssue,
  ConfigError,
  defineConfig,
} from './DefineConfig';

export { Environment, IsDevelopment, IsProduction } from './Environment';
