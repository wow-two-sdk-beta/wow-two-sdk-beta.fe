import ToolbarRoot from './Toolbar.vue';
import ToolbarButton from './ToolbarButton.vue';
import ToolbarLink from './ToolbarLink.vue';
import ToolbarSeparator from './ToolbarSeparator.vue';

/**
 * The toolbar root, carrying its parts as properties so `<Toolbar.Button>` /
 * `<Toolbar.Separator>` resolve in a template — the counterpart of the React
 * original's `Object.assign`. Each part is also exported on its own name.
 */
const Toolbar: typeof ToolbarRoot & {
  Button: typeof ToolbarButton;
  LinkItem: typeof ToolbarLink;
  SeparatorLayout: typeof ToolbarSeparator;
} = Object.assign(ToolbarRoot, {
  Button: ToolbarButton,
  LinkItem: ToolbarLink,
  SeparatorLayout: ToolbarSeparator,
});

export { Toolbar, ToolbarButton, ToolbarLink, ToolbarSeparator };
export type { ToolbarProps } from './Toolbar.vue';
export type { ToolbarButtonProps } from './ToolbarButton.vue';
export type { ToolbarLinkProps } from './ToolbarLink.vue';
export { ToolbarKey, useToolbarContext, type ToolbarContextValue } from './ToolbarContext';
