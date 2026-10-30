# Persistent refs

Source: [PersistentRef.ts](PersistentRef.ts).

Public import: `import { createPersistentRef } from '@wow-two-beta/fe/foundation/storage';`.

## Contract

- `createPersistentRef(key, initial, { decode?, broker?, syncTabs? })` returns one `Ref<T>` mirrored into the broker
  under `key`; create it once at module scope and share it, unlike the per-component `usePersistentState`.
- It reads the broker when created. A miss, a stored `null`, a value `decode` answers `undefined` for, or a `decode`
  that throws yields `initial`; without `decode` the stored JSON is trusted as `T`.
- `decode(stored: unknown): T | undefined` validates what storage holds and may normalise it (filter, cap); `null` is a
  value it may return.
- Assigning a value that differs (`Object.is`) writes it through at once; an equal assignment and every read write
  nothing. A failed write keeps the value for the visit.
- The ref is shallow: replace an array or object to persist it.
- Over `localStorageStorageBroker` with `syncTabs` on (the default), a write under `key` in another tab is decoded and
  adopted, and removal or `localStorage.clear()` returns it to `initial`; session storage and other keys are ignored.
  Adoption never writes back.
- Created inside an effect scope, its `storage` listener detaches when the scope stops; at module scope it lives with
  the page.
- The broker's JSON contract applies: a raw string an app stored before the move is not JSON and reads as `initial`.
  Re-encode such values once before the ref is created.

```ts
const sidebarCollapsed = createPersistentRef('app.sidebar-collapsed', false, {
  decode: (stored) => (typeof stored === 'boolean' ? stored : undefined),
});
export const useSidebarCollapsed = (): Ref<boolean> => sidebarCollapsed;
```

## Verification

[PersistentRef.test.ts](../../../tests/unit/foundation/storage/PersistentRef.test.ts) covers reads, decoding,
write-through, shared readers and the SSR fallback over a memory broker;
[PersistentRef.dom.test.ts](../../../tests/unit/foundation/storage/PersistentRef.dom.test.ts) covers `localStorage`
and tab sync.
