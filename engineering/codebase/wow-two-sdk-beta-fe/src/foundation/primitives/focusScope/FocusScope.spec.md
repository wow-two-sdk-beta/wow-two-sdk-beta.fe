# FocusScope

`canLoop` wraps Tab at the scope edges; `isTrapped` recovers escaped focus. Both default false. `isModal` defaults false and adds native background `inert` management; modal owners supply `isTrapped` and `canLoop` as well. The unprefixed `loop`, `trapped` and `modal` remain one release as deprecated aliases. Nonmodal scopes remain reachable alongside the page.

Vue injection records logical scope ancestry across Teleport. An outer trap accepts focus in its nonmodal descendant portals; a nested trapped scope becomes the active trap. Keyboard routing uses the owner document so Tab at a portal edge still reaches the active scope. Parent registration preserves child priority when children mount first.

The top modal makes every background DOM branch inert while preserving each previous inert attribute. Descendant portal branches remain active. A document mutation observer includes late background/portal nodes. Closing a nested modal restores the parent's accessibility boundary; closing the last restores all touched attributes and releases the observer/listeners. State is isolated per owner document.

Initial focus selects an eligible control (excluding disabled/hidden/inert/negative-tabindex candidates), or the scope container. Focus moves use preventScroll. The autofocus callbacks receive cancelable events. Closing restores the connected opening control only when the scope still owns focus and the target is allowed by the remaining trap. Closing an ancestor removes its whole logical registry subtree before child teardown can restore focus into the disappearing subtree.

`asChild` adopts the existing single component root through the shared ComponentElement contract. Dialog naming, aria-modal and visual scrim are the caller's presentation responsibilities. The primitive does not assign a dialog role.

Verification: `tests/unit/foundation/primitives/FocusScope.browser.test.ts` exercises browser Tab, nested modal/nonmodal portals, inert restoration and lifecycle. Forced-colors uses the same keyboard contract.

`returnFocus?: () => HTMLElement | null` supplies a pre-gesture target when browser pointer focus changes would otherwise lose the opener. The getter runs at teardown inside the existing ownership and remaining-scope guards. It cannot steal focus from a newer scope. Overlay wrappers rely on this restoration; they do not schedule independent retries.
