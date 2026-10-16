<script setup lang="ts">
/**
 * Renders a labelled `rows × cols` grid of one component's variant axes.
 *
 * This is the shape that catches a dropped `cn()` merge: if every cell in a
 * `variant × tone` matrix looks identical, the variant classes never reached
 * the element. A single hand-picked example can never show that.
 */
defineProps<{
  /** The axis down the left edge — e.g. `variant`. */
  rowAxis: string;
  /** The axis across the top — e.g. `tone`. Omit for a single-axis strip. */
  colAxis?: string;
  rows: readonly string[];
  cols?: readonly string[];
}>();

defineSlots<{
  default(props: { row: string; col: string }): unknown;
}>();
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-left">
      <thead v-if="cols?.length">
        <tr>
          <th class="px-2 py-1 text-[10px] font-medium uppercase text-subtle-foreground">
            {{ rowAxis }} \ {{ colAxis }}
          </th>
          <th v-for="col in cols" :key="col" class="px-2 py-1 font-mono text-[10px] font-medium text-subtle-foreground">
            {{ col }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row" class="align-middle">
          <th scope="row" class="whitespace-nowrap px-2 py-1 font-mono text-[10px] font-medium text-subtle-foreground">
            {{ row }}
          </th>
          <td v-for="col in cols ?? ['']" :key="col" class="px-2 py-1">
            <slot :row="row" :col="col" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
