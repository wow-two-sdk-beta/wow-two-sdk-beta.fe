# Upload queue lifetime contract

- Cancelled or removed work occupies its concurrency slot until the underlying transport settles.
- Late progress from a previous attempt cannot overwrite the active attempt's progress.
- Subscriber exceptions cannot interrupt scheduling, settlement or cancellation.
- A retry-policy failure settles the item as failed; background queue promises do not reject unobserved.
- The owned Vue queue cancels its remaining uploads on scope disposal.
- Synchronous XHR send failure removes the abort listener and rejects the upload promise.

Regression coverage: [runtime units](../../../tests/unit/foundation/browser/RuntimeLifetimes.test.ts),
[runtime hooks](../../../tests/unit/foundation/browser/RuntimeLifetimes.dom.test.ts) and
[queue concurrency](../../../tests/unit/foundation/browser/Optimization.test.ts).
