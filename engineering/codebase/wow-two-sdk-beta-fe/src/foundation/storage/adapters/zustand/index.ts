// foundation/storage/zustand — the zustand-persist adapter subpath. Kept a sibling of the base
// `foundation/storage` barrel (not folded into it) so the base storage surface stays zustand-name-free; a
// consumer opts in via `@wow-two-beta/ui-vue/foundation/storage/zustand`. No zustand dependency — the returned
// storage is structurally compatible with zustand v5's `persist({ storage })` (see `ZustandPersist.ts`).

export { type StorageValue, type PersistStorage, brokerPersistStorage } from './ZustandPersist';
