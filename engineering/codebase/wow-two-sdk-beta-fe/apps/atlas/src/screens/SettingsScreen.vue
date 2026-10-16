<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue';
import { Bell, CreditCard, Shield, User } from 'lucide-vue-next';
import { Button } from '@wow-two-beta/ui-vue/presentation/actions';
import { DescriptionGroup, LegendText } from '@wow-two-beta/ui-vue/presentation/display';
import { Field, SwitchField, TextAreaInput, TextInput } from '@wow-two-beta/ui-vue/presentation/forms';
import { FieldsetLayout } from '@wow-two-beta/ui-vue/presentation/layout';
import { NavItem } from '@wow-two-beta/ui-vue/presentation/nav';

/* Settings archetype: a section list beside grouped forms. Edits stay a draft until "Save", which states what
   happened — the save feedback the archetype names. */

const Sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'security', label: 'Security', icon: Shield },
] as const;

type SectionId = (typeof Sections)[number]['id'];

const Initial = {
  name: 'Aziza Karimova',
  email: 'aziza@example.com',
  bio: 'Runs releases and the on-call rota.',
  mentions: true,
  digest: false,
  incidents: true,
  twoFactor: true,
};

const section = shallowRef<SectionId>('profile');
const draft = reactive({ ...Initial });
const saved = shallowRef({ ...Initial });
const savedAt = shallowRef<string | null>(null);

const isDirty = computed(() =>
  (Object.keys(Initial) as Array<keyof typeof Initial>).some((key) => draft[key] !== saved.value[key]),
);
const emailError = computed(() => (/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(draft.email) ? undefined : 'Enter an email.'));

function save(): void {
  if (emailError.value) return;
  saved.value = { ...draft };
  savedAt.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function discard(): void {
  Object.assign(draft, saved.value);
}

const Billing = [
  { label: 'Plan', value: 'Team' },
  { label: 'Seats', value: '8 of 10' },
  { label: 'Renews', value: '1 November' },
];
</script>

<template>
  <div class="flex h-full min-h-0 flex-col md:flex-row">
    <nav
      aria-label="Settings sections"
      class="flex shrink-0 gap-1 overflow-x-auto border-border p-2 md:w-52 md:flex-col md:border-r"
    >
      <NavItem v-for="entry in Sections" :key="entry.id" as-child :is-active="section === entry.id">
        <button type="button" @click="section = entry.id">
          <component :is="entry.icon" class="size-4" aria-hidden="true" />
          {{ entry.label }}
        </button>
      </NavItem>
    </nav>

    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex-1 overflow-auto p-4">
        <FieldsetLayout v-if="section === 'profile'" class="flex max-w-lg flex-col gap-4">
          <LegendText>Profile</LegendText>
          <Field label="Display name" is-required>
            <TextInput v-model="draft.name" />
          </Field>
          <Field label="Email" helper="Receipts and alerts go here." :error="emailError">
            <TextInput v-model="draft.email" type="email" />
          </Field>
          <Field label="Bio">
            <TextAreaInput v-model="draft.bio" :rows="3" />
          </Field>
        </FieldsetLayout>

        <FieldsetLayout v-else-if="section === 'notifications'" class="flex max-w-lg flex-col gap-4">
          <LegendText>Notifications</LegendText>
          <SwitchField v-model="draft.mentions" label="Mentions" description="When someone mentions you." />
          <SwitchField v-model="draft.digest" label="Weekly digest" description="A Monday summary of activity." />
          <SwitchField v-model="draft.incidents" label="Incidents" description="Pages for production incidents." />
        </FieldsetLayout>

        <section v-else-if="section === 'billing'" class="flex max-w-lg flex-col gap-4" aria-label="Billing">
          <h3 class="font-semibold">Billing</h3>
          <DescriptionGroup :items="Billing" />
          <Button variant="outline" class="w-fit">Change plan</Button>
        </section>

        <FieldsetLayout v-else class="flex max-w-lg flex-col gap-4">
          <LegendText>Security</LegendText>
          <SwitchField
            v-model="draft.twoFactor"
            label="Two-factor authentication"
            description="Ask for a code on every new device."
          />
          <Button tone="danger" variant="soft" class="w-fit">Sign out of all sessions</Button>
        </FieldsetLayout>
      </div>

      <footer class="flex items-center justify-end gap-2 border-t border-border p-3" aria-live="polite">
        <span class="mr-auto text-sm text-muted-foreground">
          {{ isDirty ? 'Unsaved changes' : savedAt ? `Saved at ${savedAt}` : 'All changes saved' }}
        </span>
        <Button variant="ghost" size="sm" :is-disabled="!isDirty" @click="discard">Discard</Button>
        <Button size="sm" :is-disabled="!isDirty || Boolean(emailError)" @click="save">Save changes</Button>
      </footer>
    </div>
  </div>
</template>
