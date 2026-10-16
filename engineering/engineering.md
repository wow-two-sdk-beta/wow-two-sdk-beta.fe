# engineering

*Last updated: 2026-10-16*

The doc-bearing shell for the fe sdk (`@wow-two-beta/fe`) — everything except the shipped npm package itself.

| Dir | Holds |
|---|---|
| [`planning/`](./planning/) | [`backlog.md`](./planning/backlog.md) (every unbuilt item) · [`version-track/`](./planning/version-track/) (one folder per version; newest = active, [`v0.1`](./planning/version-track/v0.1/v0.1.md)) |
| [`development/`](./development/) | [`rules.md`](./development/rules.md) — working rules for agents |
| [`architecture/`](./architecture/) | Design ([`architecture.md`](./architecture/architecture.md)) · [`component-catalog.md`](./architecture/component-catalog.md) (all 248 shipped components, derived) · [`vector-registry.md`](./architecture/vector-registry.md) (all vectors — shipped + possible) · `decisions/` (ADRs) · [`testing.md`](./architecture/testing.md) · `analysis/` (deep vector reference) · `templates/` (component doc templates) · `theming.md` · `common-standards.md` |
| [`codebase/`](./codebase/) | The npm package → [`wow-two-sdk-beta-fe/`](./codebase/wow-two-sdk-beta-fe/) · parked React → [`wow-two-front-beta-sdk/`](./codebase/wow-two-front-beta-sdk/) |

Layout follows [`sdk-structure.md`](../../../../conventions/development/repo/structure/sdk-structure.md). Package conventions live in the repo-root [`CLAUDE.md`](../CLAUDE.md).
