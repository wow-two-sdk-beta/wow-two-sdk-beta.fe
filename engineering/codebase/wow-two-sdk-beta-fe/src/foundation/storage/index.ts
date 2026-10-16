// storage — foundation seam. The generic, domain-agnostic client-side persistence contract
// (`StorageBroker`) plus its two implementations: `localStorageStorageBroker` (production, SSR-safe) and
// `memoryStorageBroker` (isolated in-memory double). The persistence hooks in this capability
// (`usePersistentState`, `useRecentItems`) read and write through this seam. v2 adds two composables over any
// broker: `namespacedBroker` (key prefixing / isolation) and `createVersionedStore` (schema-versioned values
// with an on-read migration chain).

export { type StorageBroker, localStorageStorageBroker, memoryStorageBroker } from './StorageBroker';

export { namespacedBroker } from './NamespacedBroker';

export {
  type Migration,
  type MigrationMap,
  type VersionedStore,
  type VersionedStoreOptions,
  createVersionedStore,
} from './VersionedStore';

export * from './hooks/UseAutosave';
export * from './hooks/UsePersistentState';
export * from './hooks/UseRecentItems';
