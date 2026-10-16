# AppErrorBoundary

## Contract

`AppErrorBoundary` captures descendant render, lifecycle and watcher errors plus router navigation errors.
It renders the caller's `fallback` slot first, the deepest route `errorComponent` second, or the built-in
status/message/home-link fallback last. Both custom fallbacks receive the caught error and `reset()`.

`homePath` defaults to `/`. A successful route change clears the error by default; set
`:can-reset-on-navigate="false"` when recovery must be explicit (`resetOnNavigate` is its deprecated alias). The router error subscription is removed on unmount.
