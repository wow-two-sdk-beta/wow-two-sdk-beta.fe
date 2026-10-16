import { expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { MarkdownEditor } from '@src/presentation/forms';
import { Breadcrumb, LinkItem } from '@src/presentation/nav';
import { PdfViewer } from '@src/presentation/display';

it('escapes raw HTML and filters obfuscated executable preview links', () => {
  const wrapper = mount(MarkdownEditor, {
    props: {
      defaultView: 'preview',
      defaultValue:
        '<img src=x onerror=alert(1)>\n\n[bad](javascript:alert%281%29)\n\n[entity](javascript&#58;alert%281%29)\n\n[good](/guide)',
    },
  });
  try {
    expect(wrapper.find('img[onerror]').exists()).toBe(false);
    expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>');
    expect(wrapper.findAll('a').map((a) => a.attributes('href'))).toEqual(['/guide']);
  } finally {
    wrapper.unmount();
  }
});

it('does not forward executable link or frame URLs', () => {
  const link = mount(LinkItem, { attrs: { href: 'java\tscript:alert(1)' }, slots: { default: 'Unsafe' } });
  const trail = mount(Breadcrumb, {
    props: { items: [{ label: 'Unsafe', href: 'javascript:alert(1)' }, { label: 'Here' }] },
  });
  const frame = mount(PdfViewer, { props: { src: 'data:text/html,<script>alert(1)</script>' } });
  try {
    expect(link.get('a').attributes('href')).toBeUndefined();
    expect(trail.get('a').attributes('href')).toBeUndefined();
    expect(frame.get('iframe').attributes('src')).toBeUndefined();
  } finally {
    link.unmount();
    trail.unmount();
    frame.unmount();
  }
});

it('renders image alternatives without image elements when images are disabled', () => {
  const wrapper = mount(MarkdownEditor, {
    props: {
      defaultView: 'preview',
      showImages: false,
      defaultValue: '![Pattern](https://example.com/pattern.jpg)\n\n<img src="https://example.com/raw.jpg">',
    },
  });
  try {
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toContain('Pattern');
    expect(wrapper.text()).toContain('<img src="https://example.com/raw.jpg">');
  } finally {
    wrapper.unmount();
  }
});
