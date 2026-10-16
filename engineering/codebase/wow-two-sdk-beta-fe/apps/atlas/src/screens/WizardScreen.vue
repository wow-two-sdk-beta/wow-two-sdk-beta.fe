<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue';
import { Button } from '@wow-two-beta/ui-vue/presentation/actions';
import { DescriptionGroup } from '@wow-two-beta/ui-vue/presentation/display';
import { Alert } from '@wow-two-beta/ui-vue/presentation/feedback';
import {
  ChoiceCard,
  EmailInput,
  Field,
  RadioGroup,
  TagsInput,
  TextInput,
  WizardForm,
  WizardFormFooter,
  WizardFormStep,
  WizardFormSteps,
} from '@wow-two-beta/ui-vue/presentation/forms';

/* Wizard archetype: one task per step, visible steps, a steady footer. Each step validates before Next moves on,
   so an error stays beside the field that caused it. */

const Plans = [
  { value: 'free', label: 'Free', description: 'One project, community support.' },
  { value: 'pro', label: 'Pro', description: 'Unlimited projects, email support.' },
  { value: 'team', label: 'Team', description: 'Shared workspaces and roles.' },
] as const;

const form = reactive({ name: '', email: '', plan: 'pro' as string | null, invites: [] as string[] });
const errors = reactive<{ name?: string; email?: string }>({});
const finishedAt = shallowRef<string | null>(null);

function validateAccount(): boolean {
  errors.name = form.name.trim() ? undefined : 'Enter your name.';
  errors.email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(form.email) ? undefined : 'Enter a work email.';
  return !errors.name && !errors.email;
}

const isEmail = (tag: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(tag);

const summary = computed(() => [
  { label: 'Name', value: form.name || '—' },
  { label: 'Email', value: form.email || '—' },
  { label: 'Plan', value: Plans.find((plan) => plan.value === form.plan)?.label ?? '—' },
  { label: 'Invites', value: form.invites.length ? form.invites.join(', ') : 'None' },
]);

/* Awaited by the wizard, which holds its pending state until this settles. */
async function finish(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  finishedAt.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function restart(): void {
  Object.assign(form, { name: '', email: '', plan: 'pro', invites: [] });
  finishedAt.value = null;
}
</script>

<template>
  <div class="h-full overflow-auto p-6">
    <div class="mx-auto flex max-w-xl flex-col gap-4">
      <header>
        <h2 class="text-lg font-semibold">Create your workspace</h2>
        <p class="text-sm text-muted-foreground">Four short steps; nothing is saved until the last one.</p>
      </header>

      <Alert
        v-if="finishedAt"
        severity="success"
        title="Workspace created"
        :description="`Invitations went out at ${finishedAt}.`"
      >
        <template #actions><Button size="sm" variant="outline" @click="restart">Start over</Button></template>
      </Alert>

      <WizardForm v-else :on-complete="finish" aria-label="Create your workspace">
        <WizardFormSteps />
        <WizardFormStep id="account" label="Account" :validate="validateAccount">
          <Field label="Full name" is-required :error="errors.name">
            <TextInput v-model="form.name" autocomplete="name" />
          </Field>
          <Field label="Work email" is-required :error="errors.email">
            <EmailInput v-model="form.email" autocomplete="email" />
          </Field>
        </WizardFormStep>
        <WizardFormStep id="plan" label="Plan">
          <RadioGroup v-model="form.plan" legend="Choose a plan">
            <ChoiceCard
              v-for="plan in Plans"
              :key="plan.value"
              :value="plan.value"
              :label="plan.label"
              :description="plan.description"
            />
          </RadioGroup>
        </WizardFormStep>
        <WizardFormStep id="team" label="Invite" is-optional>
          <Field label="Teammates" helper="Type an email and press Enter.">
            <TagsInput v-model="form.invites" :validate="isEmail" placeholder="name@company.com" />
          </Field>
        </WizardFormStep>
        <WizardFormStep id="review" label="Review" is-final>
          <DescriptionGroup :items="summary" />
        </WizardFormStep>
        <WizardFormFooter />
      </WizardForm>
    </div>
  </div>
</template>
