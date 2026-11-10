import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { VersionBadge } from '@src/presentation/display';
import { VersionBadgeExtensions } from '@src/presentation/display/versionBadge/VersionBadgeExtensions';

const wrappers: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

function badge(props: Record<string, unknown>): VueWrapper {
  const wrapper = mount(VersionBadge, { props: { version: '0.15.4', ...props } });
  wrappers.push(wrapper);
  return wrapper;
}

describe('VersionBadge', () => {
  it('shows a numbered release with a v prefix', () => {
    expect(badge({}).text()).toBe('v0.15.4');
  });

  it('drops build metadata', () => {
    expect(badge({ version: '0.15.4+abc1234' }).text()).toBe('v0.15.4');
  });

  it('shows a named build as it is', () => {
    expect(badge({ version: 'dev' }).text()).toBe('dev');
  });

  it.each(['0.15.4', '0.15.4+def5678', 'v0.15.4', ' 0.15.4 '])('stays a plain span while %s is running', (running) => {
    const wrapper = badge({ version: '0.15.4+abc1234', runningVersion: running });
    expect(wrapper.element.tagName).toBe('SPAN');
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.attributes('data-stale')).toBeUndefined();
  });

  it('stays a plain span without a running version', () => {
    expect(badge({ runningVersion: null }).element.tagName).toBe('SPAN');
  });

  it('becomes a stale button naming the running version', () => {
    const wrapper = badge({ runningVersion: '0.15.5+abc' });
    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.attributes('data-stale')).toBeDefined();
    expect(wrapper.text()).toBe('v0.15.5');
    expect(wrapper.attributes('title')).toContain('0.15.5');
    expect(wrapper.attributes('title')).toContain('0.15.4');
  });

  it('names the stale button with both versions', () => {
    const name = badge({ runningVersion: '0.15.5' }).attributes('aria-label') ?? '';
    expect(name).toContain('v0.15.5');
    expect(name).toContain('v0.15.4');
  });

  it('emits reload on click', async () => {
    const wrapper = badge({ runningVersion: '0.15.5' });
    await wrapper.trigger('click');
    expect(wrapper.emitted('reload')).toHaveLength(1);
  });

  it('substitutes the label template', () => {
    expect(badge({ label: 'Build {version}' }).attributes('title')).toBe('Build v0.15.4');
  });

  it('substitutes the update label template', () => {
    const wrapper = badge({ runningVersion: '0.15.5', updateLabel: '{running} replaces {version}' });
    expect(wrapper.attributes('title')).toBe('v0.15.5 replaces v0.15.4');
    expect(wrapper.attributes('aria-label')).toBe('v0.15.5 replaces v0.15.4');
  });
});

describe('VersionBadgeExtensions.isStale', () => {
  it('reads null, undefined and empty as not stale', () => {
    expect(VersionBadgeExtensions.isStale('0.15.4', null)).toBe(false);
    expect(VersionBadgeExtensions.isStale('0.15.4', undefined)).toBe(false);
    expect(VersionBadgeExtensions.isStale('0.15.4', '')).toBe(false);
    expect(VersionBadgeExtensions.isStale('0.15.4', '  ')).toBe(false);
  });

  it('compares releases only', () => {
    expect(VersionBadgeExtensions.isStale('0.15.4', 'v0.15.4+x')).toBe(false);
    expect(VersionBadgeExtensions.isStale('0.15.4', '0.15.5')).toBe(true);
    expect(VersionBadgeExtensions.isStale('dev', '0.15.5')).toBe(true);
  });
});
