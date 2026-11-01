<script setup lang="ts">
import { shallowRef } from 'vue';
import { SwapTransition } from '@wow-two-beta/fe/foundation/primitives';
import { Button } from '@wow-two-beta/fe/presentation/actions';
import { Field, PasswordInput, TextInput } from '@wow-two-beta/fe/presentation/forms';

/* Three auth panes of different heights in one persistent card, as on a hosted sign-in page. */
const Panes = ['sign-in', 'sign-up', 'forgot'] as const;
type Pane = (typeof Panes)[number];

const pane = shallowRef<Pane>('sign-in');
const hasError = shallowRef(false);
const isEnabled = shallowRef(true);
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap gap-2">
      <Button
        v-for="name in Panes"
        :key="name"
        size="sm"
        :variant="pane === name ? 'solid' : 'outline'"
        :aria-pressed="pane === name"
        @click="pane = name"
      >
        {{ name }}
      </Button>
      <Button size="sm" variant="ghost" :aria-pressed="hasError" @click="hasError = !hasError">toggle error</Button>
      <Button size="sm" variant="ghost" :aria-pressed="!isEnabled" @click="isEnabled = !isEnabled">
        {{ isEnabled ? 'animated' : 'instant' }}
      </Button>
    </div>

    <div class="rounded-lg border border-border bg-card p-4">
      <SwapTransition :is-enabled="isEnabled">
        <div v-if="pane === 'sign-in'" key="sign-in" class="flex flex-col gap-3">
          <p class="text-sm font-semibold">Sign in</p>
          <Field label="Email"><TextInput /></Field>
          <Field label="Password" :error="hasError ? 'Wrong email or password' : undefined">
            <PasswordInput />
          </Field>
          <Button>Sign in</Button>
        </div>
        <div v-else-if="pane === 'sign-up'" key="sign-up" class="flex flex-col gap-3">
          <p class="text-sm font-semibold">Create an account</p>
          <Field label="Name"><TextInput /></Field>
          <Field label="Email"><TextInput /></Field>
          <Field label="Password"><PasswordInput /></Field>
          <Field label="Repeat password"><PasswordInput /></Field>
          <Button>Create account</Button>
        </div>
        <div v-else key="forgot" class="flex flex-col gap-3">
          <p class="text-sm font-semibold">Reset your password</p>
          <Field label="Email"><TextInput /></Field>
          <Button>Send link</Button>
        </div>
      </SwapTransition>
    </div>
  </div>
</template>
