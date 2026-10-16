import { provideGoogleIdentity } from '../../../../../src/foundation/oauth';
import { defineComponent, h } from 'vue';
import {
  BackToTopButton,
  Button,
  ButtonGroup,
  CopyButton,
  DisclosureButton,
  FabButton,
  GoogleSignInButton,
  SpeedDialGroup,
  SpeedDialGroupAction,
  SpeedDialGroupTrigger,
  Toolbar,
  ToolbarButton,
  ToolbarLink,
  ToolbarSeparator,
} from '../../../../../src/presentation/actions';
import { smokeCase, type SmokeCase } from './Example';

/**
 * Every component `@wow-two-beta/ui-vue/presentation/actions` exports, as smoke cases.
 * Imported through the public barrel on purpose — a component missing from `index.ts` fails
 * here before a consumer finds it.
 */
export const actionsExamples: readonly SmokeCase[] = [
  smokeCase('Button', Button, {}, { slot: true }),

  smokeCase('ButtonGroup', ButtonGroup, {}, { slot: true }),

  // `aria-label` is required through FabButton's `@vue-ignore`d heritage and reaches the DOM as a
  // fallthrough attr — never as a declared prop. `Actions.a11y.dom.test.ts` pins that it lands.
  smokeCase('FabButton', FabButton, { 'aria-label': 'Create' }, { slot: true }),

  smokeCase('CopyButton', CopyButton, { text: 'copied', 'aria-label': 'Copy' }, { slot: true }),

  smokeCase('DisclosureButton', DisclosureButton, {}, { slot: true }),

  smokeCase('BackToTopButton', BackToTopButton, {}),

  // No slot (Google draws the button into the host, so there is nothing to probe) and no client
  // id: an id would send the breadth tier off to fetch the real GIS script. The unconfigured path
  // is a supported state — apps without a client id stay guest-only — so this covers setup and the
  // SSR tier honestly, and `GoogleSignInButton.dom.test.ts` carries the rendered flow against a
  // stubbed client.
  smokeCase(
    'GoogleSignInButton',
    GoogleSignInButton,
    {},
    {
      wrap: (node) =>
        h(
          defineComponent({
            setup() {
              provideGoogleIdentity({ clientId: undefined, onCredential: () => {} });
              return () => node;
            },
          }),
        ),
    },
  ),

  smokeCase('Toolbar', Toolbar, {}, { slot: true }),

  smokeCase(
    'ToolbarButton',
    ToolbarButton,
    {},
    {
      slot: true,
      wrap: (node) => h(Toolbar, null, () => node),
    },
  ),

  smokeCase(
    'ToolbarLink',
    ToolbarLink,
    {},
    {
      slot: true,
      wrap: (node) => h(Toolbar, null, () => node),
    },
  ),

  smokeCase(
    'ToolbarSeparator',
    ToolbarSeparator,
    {},
    {
      wrap: (node) => h(Toolbar, null, () => node),
    },
  ),

  // No slot probe: SpeedDialGroup partitions its default slot by child component type (trigger vs
  // actions) and drops anything matching neither, so a generic probe node proves nothing. The
  // two real child types are covered by the `SpeedDialGroupTrigger` / `SpeedDialGroupAction` cases below.
  smokeCase('SpeedDialGroup', SpeedDialGroup, {}),

  smokeCase(
    'SpeedDialGroupTrigger',
    SpeedDialGroupTrigger,
    {},
    {
      wrap: (node) => h(SpeedDialGroup, null, () => node),
    },
  ),

  smokeCase(
    'SpeedDialGroupAction',
    SpeedDialGroupAction,
    { 'aria-label': 'Share' },
    {
      wrap: (node) => h(SpeedDialGroup, { defaultOpen: true }, () => node),
    },
  ),
];
