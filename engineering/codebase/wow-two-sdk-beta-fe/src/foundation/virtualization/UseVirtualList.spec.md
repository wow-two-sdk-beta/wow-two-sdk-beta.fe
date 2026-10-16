# Virtual list measurement contract

- Measurements follow `getItemKey(index)` when provided; reordering preserves each item's own size.
- Without a key function, indices own measurements. Consumers with mutable ordering should provide stable keys.
- Changing the axis clears measurements and pending scroll compensation.
- Reactive values read by the size estimator or key function invalidate the geometry.
- New measurements above the viewport accumulate compensation, applied after Vue patches the DOM.

Regression coverage: [runtime hooks](../../../tests/unit/foundation/browser/RuntimeLifetimes.dom.test.ts).
