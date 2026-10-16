# Command registration ownership

Each registration receives its own ownership token, including repeated registration of the same object.
A stale single or batch disposer cannot remove a newer registration.

CommandsProvider exposes a stable live facade over its current registry prop.
Scoped useRegisterCommands registrations move between provider registries when that prop changes.
Disposal unregisters from the current owner; live reads and subscriptions observe the replacement.
Command handlers, availability predicates, and icons resolve from the latest command source.

Registry handler exceptions still report through onError and reject the command promise.
