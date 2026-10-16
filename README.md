# wow-two-sdk-beta.fe

> ⚠️ **Beta-forever.** No semver, no API stability, no graduation roadmap. Ship fast, fix-forward.

The wow-two fe sdk: Vue 3 components, application adapters and browser capabilities, published as
`@wow-two-beta/fe` (npm name `@wow-two-beta/ui-vue` through `0.0.17`).

| Package | Code dir | State |
|---|---|---|
| `@wow-two-beta/fe` (Vue) | [`engineering/codebase/wow-two-sdk-beta-fe/`](engineering/codebase/wow-two-sdk-beta-fe/) | published by `release-fe.yml` |
| `@wow-two-beta/ui` (React) | [`engineering/codebase/wow-two-front-beta-sdk/`](engineering/codebase/wow-two-front-beta-sdk/) | parked, unpublished |

## Install

```bash
pnpm add @wow-two-beta/fe vue
```

Entries, optional peers and the runtime support matrix: the [package README](engineering/codebase/wow-two-sdk-beta-fe/README.md).

## Develop

Commands run from the package dir; the repository root is not a pnpm package.

```bash
cd engineering/codebase/wow-two-sdk-beta-fe
pnpm install
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build && pnpm check:package
```

Layout and rules: [`CLAUDE.md`](CLAUDE.md) and [`engineering/engineering.md`](engineering/engineering.md).

## License

MIT
