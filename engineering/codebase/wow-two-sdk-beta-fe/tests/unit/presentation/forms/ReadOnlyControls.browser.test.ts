import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { h, nextTick, type VNode } from 'vue';
import { Bell, Star } from 'lucide-vue-next';
import { memoryStorageBroker } from '@src/foundation/storage';
import {
  ColorPicker,
  ColorSwatchPicker,
  EmojiPickerPopover,
  FilePicker,
  FileUploadPicker,
  FontPicker,
  GradientPicker,
  IconPicker,
  KeyboardShortcutPicker,
  RadioInput,
  SignatureInput,
} from '@src/presentation/forms';
import {
  ariaViolations,
  bg,
  cursorOf,
  descriptionOf,
  isForcedColors,
  mountPair,
  settle,
  tabTo,
  textColor,
  tokenColor,
  unmountAfterEach,
  type PairVariant,
} from '../../../support/ReadOnlyHarness';

/*
 * The pickers that open a panel or a system dialog from a button take the read-only look and behaviour of the inputs:
 * the muted surface, a default cursor, no hover emphasis, a 1px neutral focus ring, the focus, and no change. A
 * `button` has no `aria-readonly`, so each describes itself as "Read only" and stays valid ARIA.
 */

unmountAfterEach();

const changes: PairVariant[] = [];

interface ControlCase {
  readonly make: (variant: PairVariant, onChange: (variant: PairVariant) => void) => VNode;
  /** Selects the focusable control; the normal one comes first, the read-only one second. */
  readonly control: string;
  /** Selects the panel a normal control opens; absent for a control that opens none. */
  readonly opens?: string;
  /** Names a control whose frame is not itself the muted surface (a bare swatch). */
  readonly hasSurface?: boolean;
  /** Names a control whose normal hover emphasis is its fill (covered by the surface test), not its border. */
  readonly hasHoverBorder?: boolean;
}

const Controls: Record<string, ControlCase> = {
  'ColorPicker (full trigger)': {
    make: (variant, onChange) =>
      h(ColorPicker, {
        'aria-label': 'Color',
        defaultValue: '#336699',
        'onUpdate:modelValue': () => onChange(variant),
      }),
    control: 'button[aria-haspopup]',
    opens: '[role=dialog]',
  },
  'ColorPicker (value trigger)': {
    make: (variant, onChange) =>
      h(ColorPicker, {
        'aria-label': 'Color',
        triggerVariant: 'value',
        defaultValue: '#336699',
        'onUpdate:modelValue': () => onChange(variant),
      }),
    control: 'button[aria-haspopup]',
    opens: '[role=dialog]',
  },
  'ColorPicker (swatch trigger)': {
    make: (variant, onChange) =>
      h(ColorPicker, {
        'aria-label': 'Color',
        triggerVariant: 'swatch',
        defaultValue: '#336699',
        'onUpdate:modelValue': () => onChange(variant),
      }),
    control: 'button[aria-haspopup]',
    opens: '[role=dialog]',
    hasSurface: false,
  },
  'ColorPicker (custom trigger)': {
    make: (variant, onChange) =>
      h(
        ColorPicker,
        { defaultValue: '#336699', 'onUpdate:modelValue': () => onChange(variant) },
        { trigger: () => h('button', { type: 'button', class: 'rounded border px-2' }, 'Pick') },
      ),
    control: 'button[aria-haspopup]',
    opens: '[role=dialog]',
    hasSurface: false,
  },
  FontPicker: {
    make: (variant, onChange) =>
      h(FontPicker, { 'aria-label': 'Font', 'onUpdate:modelValue': () => onChange(variant) }),
    control: 'button[aria-haspopup]',
    opens: '[role=dialog]',
    hasHoverBorder: false,
  },
  EmojiPickerPopover: {
    make: (variant, onChange) =>
      h(EmojiPickerPopover, { storage: memoryStorageBroker(), 'onUpdate:modelValue': () => onChange(variant) }),
    control: 'button[aria-haspopup]',
    opens: '[role=dialog]',
    hasSurface: false,
  },
};

describe.each(Object.entries(Controls))(
  'read-only %s',
  (_name, { make, control, opens, hasSurface = true, hasHoverBorder = true }) => {
    const pick = async (): Promise<{ normal: HTMLElement; readOnly: HTMLElement; root: HTMLElement }> => {
      changes.length = 0;
      const root = await mountPair((variant) => make(variant, (changed) => changes.push(changed)));
      const [normal, readOnly] = Array.from(root.querySelectorAll<HTMLElement>(control));
      return { normal: normal!, readOnly: readOnly!, root };
    };
    const panelOpen = (): boolean => document.querySelector(opens ?? '[role=dialog]') !== null;

    it('stays focusable, and is described as read only rather than marked with an invalid aria-readonly', async () => {
      const { normal, readOnly } = await pick();
      expect((readOnly as HTMLButtonElement).disabled).toBe(false);
      expect(readOnly.hasAttribute('aria-disabled')).toBe(false);
      expect(readOnly.hasAttribute('aria-readonly')).toBe(false);
      expect(readOnly.hasAttribute('data-readonly')).toBe(true);
      expect(descriptionOf(readOnly)).toBe('Read only');
      expect(normal.hasAttribute('data-readonly')).toBe(false);
      expect(descriptionOf(normal)).toBe('');
      await tabTo(readOnly);
    });

    it('passes the ARIA validity rules, normal and read-only alike', async () => {
      const { root } = await pick();
      expect(await ariaViolations(root)).toEqual([]);
    });

    it('opens when normal', async () => {
      const { normal } = await pick();
      await userEvent.click(normal);
      await expect.poll(panelOpen).toBe(true);
    });

    it('neither opens nor changes when read-only, on a click or a key', async () => {
      const { readOnly } = await pick();
      await userEvent.click(readOnly);
      // One keyboard call keeps real input to a minimum: Enter and Space click a button, the arrows open a combobox.
      readOnly.focus();
      await userEvent.keyboard('{Enter} {ArrowDown}{ArrowUp}');
      await settle();
      expect(panelOpen()).toBe(false);
      expect(readOnly.getAttribute('aria-expanded')).not.toBe('true');
      expect(document.activeElement).toBe(readOnly);
      expect(changes).toEqual([]);
    });

    it('shows a default cursor', async () => {
      const { normal, readOnly } = await pick();
      expect(cursorOf(readOnly)).toBe('default');
      expect(cursorOf(normal)).not.toBe('not-allowed');
    });

    it.skipIf(isForcedColors || !hasSurface)('takes the muted surface and text of a disabled control', async () => {
      const { normal, readOnly, root } = await pick();
      expect(bg(readOnly)).toBe(tokenColor(root, 'background-color', '--color-muted'));
      expect(textColor(readOnly)).toBe(tokenColor(root, 'color', '--color-muted-foreground'));
      expect(bg(normal)).not.toBe(bg(readOnly));
      await userEvent.hover(readOnly);
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(bg(readOnly)).toBe(tokenColor(root, 'background-color', '--color-muted'));
    });

    it.skipIf(isForcedColors || !hasSurface || !hasHoverBorder)('shows no hover border emphasis', async () => {
      const { normal, readOnly } = await pick();
      const resting = getComputedStyle(readOnly).borderTopColor;
      await userEvent.hover(normal);
      await expect
        .poll(() => getComputedStyle(normal).borderTopColor)
        .not.toBe(getComputedStyle(readOnly).borderTopColor);
      await userEvent.hover(readOnly);
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(getComputedStyle(readOnly).borderTopColor).toBe(resting);
    });

    it.skipIf(!hasSurface)('keeps a minimal accessible focus indicator', async () => {
      const { readOnly } = await pick();
      await tabTo(readOnly);
      const style = getComputedStyle(readOnly);
      if (isForcedColors) {
        expect(style.outlineStyle).not.toBe('none');
        return;
      }
      expect(style.boxShadow).toMatch(/0px 0px 0px 1px/);
      expect(style.boxShadow).not.toMatch(/0px 0px 0px 2px/);
    });
  },
);

describe('read-only FilePicker', () => {
  const pick = async (): Promise<{ normal: HTMLButtonElement; readOnly: HTMLButtonElement; root: HTMLElement }> => {
    changes.length = 0;
    const root = await mountPair((variant) =>
      h(FilePicker, { label: 'Choose file', 'onFiles-change': () => changes.push(variant) }),
    );
    const [normal, readOnly] = Array.from(root.querySelectorAll<HTMLButtonElement>('button'));
    return { normal: normal!, readOnly: readOnly!, root };
  };

  it('keeps its button focusable, described as read only, with the native input disabled', async () => {
    const { normal, readOnly, root } = await pick();
    expect(readOnly.disabled).toBe(false);
    expect(readOnly.hasAttribute('aria-readonly')).toBe(false);
    expect(readOnly.hasAttribute('data-readonly')).toBe(true);
    expect(descriptionOf(readOnly)).toBe('Read only');
    expect(descriptionOf(normal)).toBe('');
    const inputs = root.querySelectorAll<HTMLInputElement>('input[type=file]');
    expect(inputs[0]!.disabled).toBe(false);
    // A label click reaches the file input, so a read-only picker leaves it disabled: no system dialog can open.
    expect(inputs[1]!.disabled).toBe(true);
    await tabTo(readOnly);
  });

  it('passes the ARIA validity rules', async () => {
    const { root } = await pick();
    expect(await ariaViolations(root)).toEqual([]);
  });

  it('opens the system dialog when normal, never when read-only', async () => {
    const { normal, readOnly } = await pick();
    const open = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    try {
      await userEvent.click(normal);
      expect(open).toHaveBeenCalledTimes(1);
      open.mockClear();
      await userEvent.click(readOnly);
      readOnly.focus();
      await userEvent.keyboard('{Enter} ');
      expect(open).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(readOnly);
    } finally {
      open.mockRestore();
    }
    expect(changes).toEqual([]);
  });

  it('ignores files handed to its input', async () => {
    const { root } = await pick();
    const [normal, readOnly] = Array.from(root.querySelectorAll<HTMLInputElement>('input[type=file]'));
    const transfer = new DataTransfer();
    transfer.items.add(new File(['x'], 'a.txt'));
    for (const input of [normal!, readOnly!]) {
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await nextTick();
    expect(changes).toEqual(['normal']);
  });

  it.skipIf(isForcedColors)('takes the muted look', async () => {
    const { normal, readOnly, root } = await pick();
    expect(cursorOf(readOnly)).toBe('default');
    expect(bg(readOnly)).toBe(tokenColor(root, 'background-color', '--color-muted'));
    expect(textColor(readOnly)).toBe(tokenColor(root, 'color', '--color-muted-foreground'));
    expect(bg(normal)).not.toBe(bg(readOnly));
  });
});

describe('read-only FileUploadPicker', () => {
  const pick = async (): Promise<{ normal: HTMLElement; readOnly: HTMLElement; root: HTMLElement }> => {
    changes.length = 0;
    const root = await mountPair((variant) => h(FileUploadPicker, { 'onFiles-change': () => changes.push(variant) }));
    const [normal, readOnly] = Array.from(root.querySelectorAll<HTMLElement>('[role=button]'));
    return { normal: normal!, readOnly: readOnly!, root };
  };

  it('keeps its drop zone focusable, described as read only, rather than marked disabled', async () => {
    const { normal, readOnly } = await pick();
    expect(readOnly.getAttribute('tabindex')).toBe('0');
    expect(readOnly.hasAttribute('aria-disabled')).toBe(false);
    expect(readOnly.hasAttribute('aria-readonly')).toBe(false);
    expect(readOnly.hasAttribute('data-readonly')).toBe(true);
    expect(descriptionOf(readOnly)).toBe('Read only');
    expect(descriptionOf(normal)).toBe('');
    await tabTo(readOnly);
  });

  it('passes the ARIA validity rules', async () => {
    const { root } = await pick();
    expect(await ariaViolations(root)).toEqual([]);
  });

  it('opens the system dialog and takes drops when normal, never when read-only', async () => {
    const { normal, readOnly } = await pick();
    const open = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    try {
      await userEvent.click(normal);
      expect(open).toHaveBeenCalledTimes(1);
      open.mockClear();
      await userEvent.click(readOnly);
      readOnly.focus();
      await userEvent.keyboard('{Enter} ');
      expect(open).not.toHaveBeenCalled();
    } finally {
      open.mockRestore();
    }

    for (const zone of [normal, readOnly]) {
      const transfer = new DataTransfer();
      transfer.items.add(new File(['x'], 'a.txt', { type: 'text/plain' }));
      zone.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }));
    }
    await nextTick();
    expect(changes).toEqual(['normal']);
    expect(document.activeElement).toBe(readOnly);
  });

  it.skipIf(isForcedColors)('takes the muted look and shows no hover emphasis', async () => {
    const { normal, readOnly, root } = await pick();
    expect(cursorOf(readOnly)).toBe('default');
    expect(bg(readOnly)).toBe(tokenColor(root, 'background-color', '--color-muted'));
    expect(bg(normal)).not.toBe(bg(readOnly));
    const resting = getComputedStyle(readOnly).borderTopColor;
    await userEvent.hover(readOnly);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(getComputedStyle(readOnly).borderTopColor).toBe(resting);
    expect(bg(readOnly)).toBe(tokenColor(root, 'background-color', '--color-muted'));
  });
});

describe('read-only KeyboardShortcutPicker', () => {
  const pick = async (): Promise<{ normal: HTMLButtonElement; readOnly: HTMLButtonElement; root: HTMLElement }> => {
    changes.length = 0;
    const root = await mountPair((variant) =>
      h(KeyboardShortcutPicker, { 'aria-label': 'Shortcut', 'onUpdate:modelValue': () => changes.push(variant) }),
    );
    const [normal, readOnly] = Array.from(root.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'));
    return { normal: normal!, readOnly: readOnly!, root };
  };

  it('stays focusable and is described as read only rather than disabled', async () => {
    const { normal, readOnly } = await pick();
    expect(readOnly.disabled).toBe(false);
    expect(readOnly.hasAttribute('aria-readonly')).toBe(false);
    expect(readOnly.hasAttribute('data-readonly')).toBe(true);
    expect(descriptionOf(readOnly)).toBe('Read only');
    expect(descriptionOf(normal)).toBe('');
    await tabTo(readOnly);
  });

  it('passes the ARIA validity rules', async () => {
    const { root } = await pick();
    expect(await ariaViolations(root)).toEqual([]);
  });

  it('records a chord when normal', async () => {
    const { normal } = await pick();
    await userEvent.click(normal);
    expect(normal.getAttribute('aria-pressed')).toBe('true');
    await userEvent.keyboard('{Control>}k{/Control}');
    await expect.poll(() => changes).toEqual(['normal']);
  });

  it('never starts recording or changes when read-only', async () => {
    const { readOnly } = await pick();
    await userEvent.click(readOnly);
    readOnly.focus();
    await userEvent.keyboard('{Enter} ');
    expect(readOnly.getAttribute('aria-pressed')).toBe('false');
    // Synthetic key events: WebKit navigates back on a real Backspace that no handler consumed.
    for (const key of ['k', 'Backspace']) {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key, ctrlKey: key === 'k', bubbles: true, cancelable: true }),
      );
    }
    expect(changes).toEqual([]);
    expect(document.activeElement).toBe(readOnly);
  });

  it.skipIf(isForcedColors)('takes the muted look, with no hover emphasis', async () => {
    const { normal, readOnly, root } = await pick();
    expect(cursorOf(readOnly)).toBe('default');
    expect(bg(readOnly)).toBe(tokenColor(root, 'background-color', '--color-muted'));
    expect(textColor(readOnly)).toBe(tokenColor(root, 'color', '--color-muted-foreground'));
    expect(bg(normal)).not.toBe(bg(readOnly));
    await userEvent.hover(readOnly);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(bg(readOnly)).toBe(tokenColor(root, 'background-color', '--color-muted'));
  });
});

describe('read-only IconPicker', () => {
  const pick = async (): Promise<{
    normal: HTMLElement;
    readOnly: HTMLElement;
    normalButton: HTMLButtonElement;
    readOnlyButton: HTMLButtonElement;
    root: HTMLElement;
  }> => {
    changes.length = 0;
    const root = await mountPair((variant) =>
      h(IconPicker, {
        defaultValue: 'star',
        // A short set keeps the tab sequence to the search field and two icons.
        icons: { star: Star, bell: Bell },
        'onUpdate:modelValue': () => changes.push(variant),
      }),
    );
    const [normal, readOnly] = Array.from(root.querySelectorAll<HTMLElement>('[role=group]'));
    const pressed = (group: HTMLElement | undefined): HTMLButtonElement =>
      group!.querySelector<HTMLButtonElement>('button[aria-label=bell]')!;
    return {
      normal: normal!,
      readOnly: readOnly!,
      normalButton: pressed(normal),
      readOnlyButton: pressed(readOnly),
      root,
    };
  };

  it('describes the grid as read only and keeps every icon focusable', async () => {
    const { normal, readOnly, readOnlyButton } = await pick();
    expect(readOnly.hasAttribute('aria-readonly')).toBe(false);
    expect(descriptionOf(readOnly)).toBe('Read only');
    expect(descriptionOf(normal)).toBe('');
    expect(readOnlyButton.disabled).toBe(false);
    expect(readOnly.querySelector('button[aria-label=star]')!.getAttribute('aria-pressed')).toBe('true');
    await tabTo(readOnlyButton);
  });

  it('passes the ARIA validity rules', async () => {
    const { root } = await pick();
    expect(await ariaViolations(root)).toEqual([]);
  });

  it('picks an icon when normal, and never changes when read-only', async () => {
    const { normalButton, readOnlyButton } = await pick();
    await userEvent.click(normalButton);
    expect(changes).toEqual(['normal']);
    changes.length = 0;
    await userEvent.click(readOnlyButton);
    readOnlyButton.focus();
    await userEvent.keyboard('{Enter} ');
    expect(changes).toEqual([]);
    expect(readOnlyButton.getAttribute('aria-pressed')).toBe('false');
    expect(document.activeElement).toBe(readOnlyButton);
  });

  it.skipIf(isForcedColors)('takes the muted look, a default cursor and a neutral 1px focus ring', async () => {
    const { normal, readOnly, readOnlyButton, root } = await pick();
    expect(bg(readOnly.parentElement!)).toBe(tokenColor(root, 'background-color', '--color-muted'));
    expect(bg(normal.parentElement!)).not.toBe(bg(readOnly.parentElement!));
    expect(cursorOf(readOnlyButton)).toBe('default');
    await tabTo(readOnlyButton);
    const style = getComputedStyle(readOnlyButton);
    expect(style.boxShadow).toMatch(/0px 0px 0px 1px/);
    expect(style.boxShadow).toContain(tokenColor(root, 'color', '--color-muted-foreground'));
  });
});

describe('read-only GradientPicker', () => {
  const pick = async (): Promise<{ normal: HTMLElement; readOnly: HTMLElement; root: HTMLElement }> => {
    changes.length = 0;
    const root = await mountPair((variant) =>
      h(GradientPicker, { 'onUpdate:modelValue': () => changes.push(variant) }),
    );
    const [normal, readOnly] = Array.from(root.querySelectorAll<HTMLElement>('[role=group]'));
    return { normal: normal!, readOnly: readOnly!, root };
  };

  it('describes the editor as read only and keeps its fields focusable', async () => {
    const { normal, readOnly } = await pick();
    expect(readOnly.hasAttribute('aria-readonly')).toBe(false);
    expect(descriptionOf(readOnly)).toBe('Read only');
    expect(descriptionOf(normal)).toBe('');
    const text = readOnly.querySelector<HTMLInputElement>('input[type=text]')!;
    expect(text.readOnly).toBe(true);
    expect(text.disabled).toBe(false);
    expect(readOnly.querySelector<HTMLInputElement>('input[type=number]')!.readOnly).toBe(true);
    expect(readOnly.querySelector<HTMLInputElement>('input[type=color]')!.disabled).toBe(false);
    expect(readOnly.querySelector<HTMLButtonElement>('button[role=radio]')!.disabled).toBe(false);
    text.focus();
    expect(document.activeElement).toBe(text);
  });

  it('passes the ARIA validity rules', async () => {
    const { root } = await pick();
    expect(await ariaViolations(root)).toEqual([]);
  });

  it('edits when normal, and neither edits nor opens the colour picker when read-only', async () => {
    const { normal, readOnly } = await pick();
    const hex = (group: HTMLElement): HTMLInputElement => group.querySelector<HTMLInputElement>('input[type=text]')!;
    await userEvent.click(hex(normal));
    await userEvent.keyboard('{Backspace}');
    await expect.poll(() => changes).toEqual(['normal']);
    changes.length = 0;

    await userEvent.click(hex(readOnly));
    await userEvent.keyboard('zz');
    await userEvent.click(readOnly.querySelector<HTMLButtonElement>('button[role=radio]:not([aria-checked=true])')!);
    await settle();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    readOnly.querySelector<HTMLInputElement>('input[type=color]')!.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(changes).toEqual([]);
    expect(readOnly.querySelectorAll('button:disabled').length).toBeGreaterThan(0);
  });

  it.skipIf(isForcedColors)('takes the muted surface', async () => {
    const { normal, readOnly, root } = await pick();
    expect(bg(readOnly)).toBe(tokenColor(root, 'background-color', '--color-muted'));
    expect(bg(normal)).not.toBe(bg(readOnly));
  });
});

describe('read-only ColorSwatchPicker', () => {
  const pick = async (): Promise<{ normal: HTMLElement; readOnly: HTMLElement; root: HTMLElement }> => {
    changes.length = 0;
    const root = await mountPair((variant) =>
      h(ColorSwatchPicker, {
        colors: ['#ff0000', '#00ff00'],
        defaultValue: '#ff0000',
        'onUpdate:modelValue': () => changes.push(variant),
      }),
    );
    const [normal, readOnly] = Array.from(root.querySelectorAll<HTMLElement>('[role=group]'));
    return { normal: normal!, readOnly: readOnly!, root };
  };

  it('describes the palette as read only and keeps every swatch focusable', async () => {
    const { normal, readOnly } = await pick();
    expect(descriptionOf(readOnly)).toBe('Read only');
    expect(descriptionOf(normal)).toBe('');
    const swatches = Array.from(readOnly.querySelectorAll<HTMLButtonElement>('button'));
    expect(swatches.every((swatch) => !swatch.disabled)).toBe(true);
    expect(cursorOf(swatches[0]!)).toBe('default');
    await tabTo(swatches[0]!);
  });

  it('passes the ARIA validity rules', async () => {
    const { root } = await pick();
    expect(await ariaViolations(root)).toEqual([]);
  });

  it('picks a swatch when normal, and never changes when read-only', async () => {
    const { normal, readOnly } = await pick();
    await userEvent.click(normal.querySelectorAll<HTMLButtonElement>('button')[1]!);
    expect(changes).toEqual(['normal']);
    changes.length = 0;
    const [first, second] = Array.from(readOnly.querySelectorAll<HTMLButtonElement>('button'));
    first!.focus();
    await userEvent.keyboard('{ArrowRight}{Enter} ');
    await userEvent.click(second!);
    await settle();
    expect(changes).toEqual([]);
  });
});

describe('read-only RadioInput', () => {
  const pick = async (): Promise<{ normal: HTMLInputElement; readOnly: HTMLInputElement; root: HTMLElement }> => {
    changes.length = 0;
    const root = await mountPair((variant) =>
      // Radios sharing a name are one tab stop, so each variant names its own.
      h(RadioInput, { name: `size-${variant}`, 'onUpdate:modelValue': () => changes.push(variant) }),
    );
    const [normal, readOnly] = Array.from(root.querySelectorAll<HTMLInputElement>('input[type=radio]'));
    return { normal: normal!, readOnly: readOnly!, root };
  };

  it('is described as read only, since a radio has no aria-readonly', async () => {
    const { normal, readOnly } = await pick();
    expect(readOnly.hasAttribute('aria-readonly')).toBe(false);
    expect(readOnly.disabled).toBe(false);
    expect(descriptionOf(readOnly)).toBe('Read only');
    expect(descriptionOf(normal)).toBe('');
    await tabTo(readOnly);
  });

  it('passes the ARIA validity rules', async () => {
    const { root } = await pick();
    expect(await ariaViolations(root)).toEqual([]);
  });

  it('checks when normal, and never changes when read-only', async () => {
    const { normal, readOnly } = await pick();
    await userEvent.click(normal);
    expect(changes).toEqual(['normal']);
    changes.length = 0;
    await userEvent.click(readOnly);
    readOnly.focus();
    await userEvent.keyboard(' ');
    await settle();
    expect(readOnly.checked).toBe(false);
    expect(changes).toEqual([]);
    expect(cursorOf(readOnly)).toBe('default');
  });
});

describe('read-only SignatureInput', () => {
  it('is described as read only with a default cursor, and takes no stroke', async () => {
    changes.length = 0;
    const root = await mountPair((variant) =>
      h(SignatureInput, { 'aria-label': 'Signature', 'onUpdate:modelValue': () => changes.push(variant) }),
    );
    const [normal, readOnly] = Array.from(root.querySelectorAll<HTMLCanvasElement>('canvas'));
    expect(descriptionOf(readOnly!)).toBe('Read only');
    expect(descriptionOf(normal!)).toBe('');
    expect(cursorOf(readOnly!)).toBe('default');
    expect(cursorOf(normal!)).toBe('crosshair');
    expect(await ariaViolations(root)).toEqual([]);
    for (const canvas of [normal!, readOnly!]) {
      const box = canvas.getBoundingClientRect();
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', { pointerId: 1, clientX: box.left + 10, clientY: box.top + 10, bubbles: true }),
      );
      canvas.dispatchEvent(
        new PointerEvent('pointermove', { pointerId: 1, clientX: box.left + 40, clientY: box.top + 30, bubbles: true }),
      );
      canvas.dispatchEvent(
        new PointerEvent('pointerup', { pointerId: 1, clientX: box.left + 40, clientY: box.top + 30, bubbles: true }),
      );
    }
    await nextTick();
    expect(changes).toEqual(['normal']);
  });
});
