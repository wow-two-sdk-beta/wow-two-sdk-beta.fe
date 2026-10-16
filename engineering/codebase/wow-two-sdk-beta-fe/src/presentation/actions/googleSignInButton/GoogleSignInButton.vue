<script lang="ts">
import type { GoogleButtonOptions } from '../../../foundation/oauth';

/** Defines the props for {@link GoogleSignInButton}. */
export interface GoogleSignInButtonProps {
  /** The button surface. Default `outline`. */
  readonly theme?: GoogleButtonOptions['theme'];

  /** The button height band. Default `large`. */
  readonly size?: GoogleButtonOptions['size'];

  /** The label wording. Default `signin_with`. */
  readonly text?: GoogleButtonOptions['text'];

  /** The button outline. Default `rectangular`. */
  readonly shape?: GoogleButtonOptions['shape'];

  /** The rendered width in px. GIS caps this at 400; omit to size to the host element. */
  readonly width?: number;

  /** The logo placement. Default `left`. */
  readonly logoAlignment?: GoogleButtonOptions['logo_alignment'];

  /** The BCP-47 locale for the button copy. Defaults to the browser's. */
  readonly locale?: string;
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import { GoogleIdentityStatus, useGoogleIdentity } from '../../../foundation/oauth';

/**
 * Renders the Google sign-in button — the Google-owned control for the GIS ID-token flow.
 *
 * The button itself is drawn by Google into the host element, not by this package: the ID-token flow
 * requires Google's own branding, so `theme` / `size` / `shape` are forwarded to GIS rather than
 * mapped onto house variants. Everything below the pixels is ours — script loading, `initialize`, and
 * the credential handoff live in the ancestor's `provideGoogleIdentity` owner.
 *
 * The owner receives a signed JWT ID token, not a session. Post it to the
 * product's identity endpoint for server-side verification, and let the response drive `AuthProvider`.
 */
defineOptions({ name: 'GoogleSignInButton', inheritAttrs: false });

const props = withDefaults(defineProps<GoogleSignInButtonProps>(), {
  theme: 'outline',
  size: 'large',
  text: 'signin_with',
  shape: 'rectangular',
  logoAlignment: 'left',
});

const host = ref<HTMLElement | null>(null);
const identity = useGoogleIdentity();
const isConfigured = computed(() => identity.status.value !== GoogleIdentityStatus.Unresolved);

/* GIS reads these once per `renderButton` call, so a prop change has to re-render the button rather
   than mutate it. Collected into one computed so the watcher below fires on any of them. */
const buttonOptions = computed<GoogleButtonOptions>(() => ({
  theme: props.theme,
  size: props.size,
  text: props.text,
  shape: props.shape,
  width: props.width,
  logo_alignment: props.logoAlignment,
  locale: props.locale,
}));

const isReady = computed(() => identity.status.value === GoogleIdentityStatus.Ready);

/* `immediate` covers the case where the script resolved before this watcher was registered; the
   `nextTick` covers the opposite one, where `isReady` flips in the same tick the host is created and
   the ref is not populated yet. */
watch(
  [isReady, buttonOptions, host],
  async () => {
    if (!isReady.value) {
      host.value?.replaceChildren();
      return;
    }
    await nextTick();
    if (!isReady.value) return;

    const target = host.value;
    if (!target) return;

    // GIS appends; without the clear, a re-render stacks a second button under the first.
    target.replaceChildren();
    identity.renderButton(target, buttonOptions.value);
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="isConfigured" ref="host" v-bind="$attrs" />
</template>
