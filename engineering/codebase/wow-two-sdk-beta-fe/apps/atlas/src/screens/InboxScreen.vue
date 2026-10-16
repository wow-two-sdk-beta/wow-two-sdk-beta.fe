<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue';
import { Avatar, ChatBubbleCard, CountBadge, DescriptionGroup, Tag } from '@wow-two-beta/ui-vue/presentation/display';
import { ChatComposerInput, SearchInput } from '@wow-two-beta/ui-vue/presentation/forms';

/* Inbox archetype: the conversation list, the open thread with its composer, and the customer in context. Opening
   a conversation reads it; sending appends to the open thread. */

interface Message {
  readonly id: number;
  readonly author: string;
  readonly text: string;
  readonly at: string;
  readonly isMine: boolean;
}

interface Conversation {
  readonly id: string;
  readonly customer: string;
  readonly company: string;
  readonly plan: string;
  readonly since: string;
  readonly tags: ReadonlyArray<string>;
  unread: number;
  messages: Message[];
}

const Agent = 'You';

const conversations = reactive<Conversation[]>([
  {
    id: 'c-1',
    customer: 'Malika Yusupova',
    company: 'Northwind Travel',
    plan: 'Team',
    since: 'March 2025',
    tags: ['billing', 'priority'],
    unread: 2,
    messages: [
      { id: 1, author: 'Malika Yusupova', text: 'We were charged twice for September.', at: '09:12', isMine: false },
      { id: 2, author: 'Malika Yusupova', text: 'Invoice INV-1025 and INV-1026.', at: '09:13', isMine: false },
    ],
  },
  {
    id: 'c-2',
    customer: 'Jasur Ahmedov',
    company: 'Orbit Labs',
    plan: 'Pro',
    since: 'June 2024',
    tags: ['sso'],
    unread: 0,
    messages: [
      { id: 1, author: 'Jasur Ahmedov', text: 'Can we enforce SSO for every seat?', at: 'Mon', isMine: false },
      { id: 2, author: Agent, text: 'Yes — Settings, then Security, then "Require SSO".', at: 'Mon', isMine: true },
    ],
  },
  {
    id: 'c-3',
    customer: 'Nodira Saidova',
    company: 'Bloom Studio',
    plan: 'Free',
    since: 'August 2026',
    tags: ['onboarding'],
    unread: 1,
    messages: [{ id: 1, author: 'Nodira Saidova', text: 'How do I invite my team?', at: 'Sun', isMine: false }],
  },
]);

const query = shallowRef('');
const openId = shallowRef(conversations[0]!.id);

const visible = computed(() => {
  const text = query.value.trim().toLowerCase();
  return conversations.filter(
    (entry) => !text || entry.customer.toLowerCase().includes(text) || entry.company.toLowerCase().includes(text),
  );
});
const open = computed(() => conversations.find((entry) => entry.id === openId.value)!);
const details = computed(() => [
  { label: 'Company', value: open.value.company },
  { label: 'Plan', value: open.value.plan },
  { label: 'Customer since', value: open.value.since },
]);

function select(entry: Conversation): void {
  openId.value = entry.id;
  entry.unread = 0;
}

function send(text: string): void {
  const thread = open.value.messages;
  thread.push({ id: thread.length + 1, author: Agent, text, at: 'now', isMine: true });
}

function preview(entry: Conversation): string {
  return entry.messages.at(-1)?.text ?? '';
}
</script>

<template>
  <div
    class="grid h-full min-h-0 grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_220px]"
  >
    <aside class="flex min-h-0 flex-col gap-2 border-border p-2 md:border-r" aria-label="Conversations">
      <SearchInput v-model="query" placeholder="Search" aria-label="Search conversations" />
      <ul class="flex min-h-0 flex-col gap-0.5 overflow-auto">
        <li v-for="entry in visible" :key="entry.id">
          <button
            type="button"
            class="flex w-full items-start gap-2 rounded-md p-2 text-left transition-colors hover:bg-muted"
            :class="entry.id === openId && 'bg-muted'"
            :aria-current="entry.id === openId ? 'true' : undefined"
            @click="select(entry)"
          >
            <Avatar :name="entry.customer" size="sm" can-auto-color />
            <span class="min-w-0 flex-1">
              <span class="flex items-center justify-between gap-2">
                <span class="truncate text-sm font-medium">{{ entry.customer }}</span>
                <CountBadge :value="entry.unread" can-hide-zero variant="brand" />
              </span>
              <span class="block truncate text-xs text-muted-foreground">{{ preview(entry) }}</span>
            </span>
          </button>
        </li>
      </ul>
    </aside>

    <section class="flex min-h-0 flex-col" :aria-label="`Conversation with ${open.customer}`">
      <header class="border-b border-border px-4 py-3">
        <p class="font-semibold">{{ open.customer }}</p>
        <p class="text-xs text-muted-foreground">{{ open.company }}</p>
      </header>
      <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
        <ChatBubbleCard
          v-for="message in open.messages"
          :key="message.id"
          :side="message.isMine ? 'end' : 'start'"
          :tone="message.isMine ? 'primary' : 'default'"
          :author="message.author"
          :timestamp="message.at"
        >
          {{ message.text }}
        </ChatBubbleCard>
      </div>
      <div class="border-t border-border p-3">
        <ChatComposerInput placeholder="Reply…" @submit="send" />
      </div>
    </section>

    <aside class="hidden min-h-0 flex-col gap-3 border-l border-border p-4 xl:flex" aria-label="Customer">
      <Avatar :name="open.customer" size="lg" can-auto-color />
      <div>
        <p class="font-semibold">{{ open.customer }}</p>
        <p class="text-xs text-muted-foreground">{{ open.company }}</p>
      </div>
      <DescriptionGroup :items="details" layout="stacked" density="sm" />
      <div class="flex flex-wrap gap-1">
        <Tag v-for="tag in open.tags" :key="tag">{{ tag }}</Tag>
      </div>
    </aside>
  </div>
</template>
