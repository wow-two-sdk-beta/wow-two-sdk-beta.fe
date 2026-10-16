import { describe, expect, it } from 'vitest';
import { compileScript, parse } from 'vue/compiler-sfc';
import * as actions from '@src/presentation/actions';
import * as display from '@src/presentation/display';
import * as feedback from '@src/presentation/feedback';
import * as forms from '@src/presentation/forms';
import * as nav from '@src/presentation/nav';
import * as overlays from '@src/presentation/overlays';
import { Archetypes } from '../../../apps/atlas/src/content/layouts';
import { BaseSpec, OptionLabels, type LayoutSpec } from '../../../apps/atlas/src/content/model';
import { scaffold } from '../../../apps/atlas/src/content/scaffold';

/* A scaffold is only useful if it pastes into a project and compiles: every tag it writes is imported from the
   entry that really exports it, and Vue's own SFC compiler accepts the file. */

const Entries: Readonly<Record<string, Record<string, unknown>>> = { actions, display, feedback, forms, nav, overlays };

function compile(code: string): string {
  const { descriptor, errors } = parse(code, { filename: 'Scaffold.vue' });
  expect(errors).toEqual([]);
  return compileScript(descriptor, { id: 'scaffold', inlineTemplate: true }).content;
}

function check(spec: LayoutSpec, name: string): void {
  const code = scaffold(spec);
  expect(() => compile(code), name).not.toThrow();
  const imported = new Map<string, string>();
  for (const match of code.matchAll(/import \{ ([^}]+) \} from '@wow-two-beta\/ui-vue\/presentation\/(\w+)';/gu)) {
    for (const component of match[1]!.split(', ')) imported.set(component, match[2]!);
  }
  const template = code.slice(code.indexOf('<template>'));
  for (const [, tag] of template.matchAll(/<([A-Z][A-Za-z]+)/gu)) {
    expect(imported.has(tag!), `${name}: <${tag}> is not imported`).toBe(true);
  }
  for (const [component, entry] of imported) {
    expect(Entries[entry]?.[component], `${name}: ${component} from ${entry}`).toBeDefined();
  }
  expect(code).toContain(`data-density="${spec.density}"`);
}

describe('scaffold', () => {
  it.each(Archetypes.map((archetype) => [archetype.id, archetype.spec] as const))(
    'writes a compiling starter for %s',
    (id, spec) => check(spec, id),
  );

  it('compiles every navigation, local strip, content and panel mode', () => {
    for (const navStyle of Object.keys(OptionLabels.nav)) check({ ...BaseSpec, nav: navStyle } as LayoutSpec, navStyle);
    for (const local of Object.keys(OptionLabels.local)) check({ ...BaseSpec, local } as LayoutSpec, local);
    for (const content of Object.keys(OptionLabels.content)) check({ ...BaseSpec, content } as LayoutSpec, content);
    for (const panelMode of Object.keys(OptionLabels.panelMode)) {
      for (const role of Object.keys(OptionLabels.panel)) {
        check({ ...BaseSpec, panelMode, leading: role, trailing: role } as LayoutSpec, `${panelMode}/${role}`);
      }
    }
  });

  it('opens overlay panels from buttons it wires to their drawers', () => {
    const code = scaffold({
      ...BaseSpec,
      panelMode: 'overlay',
      leading: 'filters',
      trailing: 'inspector',
    } as LayoutSpec);
    expect(code).toContain('const isLeadingOpen = ref(false);');
    expect(code).toContain('@click="isTrailingOpen = true"');
    expect(code).toContain('v-model:open="isTrailingOpen" side="right"');
  });
});
