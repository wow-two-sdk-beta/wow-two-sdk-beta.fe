# codebase

*Last updated: 2026-10-16*

One npm package, one code dir (per [`sdk-structure.md`](../../../../../conventions/development/repo/structure/sdk-structure.md)).

- [`wow-two-sdk-beta-fe/`](./wow-two-sdk-beta-fe/) — the fe sdk, the published Vue package `@wow-two-beta/fe`: `src/` (source-only), `tests/`, `apps/` sandboxes (playground, atlas), `scripts/`, and all tool configs beside `package.json`.
- [`wow-two-front-beta-sdk/`](./wow-two-front-beta-sdk/) — the parked, unpublished React package `@wow-two-beta/ui`: `src/` (source-only), `tests/{unit,stories}`, `.storybook/`, `apps/` sandboxes, and all tool configs beside `package.json`.

Package conventions + layer rules: repo-root [`CLAUDE.md`](../../CLAUDE.md).
