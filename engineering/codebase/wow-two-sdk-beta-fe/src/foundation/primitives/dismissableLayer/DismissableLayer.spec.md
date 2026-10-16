# DismissableLayer

Only the top mounted layer receives Escape or outside pointer-down callbacks. Escape during IME composition is ignored. Logical Vue ancestry survives Teleport, including children mounted before their parent. Each owner document has an independent stack; unmount removes every listener owned by that layer.

An inside pointer uses both DOM containment and the event composed path. A disabled top layer suppresses its event without activating a lower layer. An event is handled at most once, including when its callback synchronously unmounts the top layer. The callbacks own the close decision; the primitive does not automatically mutate open state.

The layer renders one div and exposes its root through `el`. Background isolation and focus management belong to FocusScope; Escape handling alone does not make a dialog modal.
