<script lang="ts">
import { defineComponent, h, type PropType } from 'vue';
import type { SmokeCase } from './fixtures/Example';

/** Renders a contextual example with the same typed props used by render tests. */
export default defineComponent({
  name: 'ExampleRenderer',
  props: { example: { type: Object as PropType<SmokeCase>, required: true } },
  setup(props) {
    return () => {
      const example = props.example;
      const node = h(example.component, example.props, example.slot ? { default: () => 'Example content' } : undefined);
      return example.wrap ? example.wrap(node) : node;
    };
  },
});
</script>
