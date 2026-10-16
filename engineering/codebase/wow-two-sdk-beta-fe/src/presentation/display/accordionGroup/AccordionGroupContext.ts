import { inject, type InjectionKey } from 'vue';

/** Defines the AccordionGroup selection mode. */
export const AccordionGroupType = {
  /** Refers to allowing one open panel at a time. */
  Single: 'single',
  /** Refers to allowing multiple open panels. */
  Multiple: 'multiple',
} as const;

export type AccordionGroupType = (typeof AccordionGroupType)[keyof typeof AccordionGroupType];

/** The open-set state an `AccordionGroup` root shares with its items. */
export interface AccordionGroupContextValue {
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
  disabled: boolean;
}

export const AccordionGroupKey: InjectionKey<AccordionGroupContextValue> = Symbol('wow-two.accordion');

/** Reads the enclosing `AccordionGroup` state. */
export function useAccordionContext(): AccordionGroupContextValue {
  const context = inject(AccordionGroupKey, null);
  if (!context) throw new Error('AccordionGroup.* must be used inside <AccordionGroup>');
  return context;
}

/** The per-item state an `AccordionGroupItem` shares with its trigger and content. */
export interface AccordionGroupItemContextValue {
  value: string;
  open: boolean;
  contentId: string;
  triggerId: string;
  disabled: boolean;
}

export const AccordionGroupItemKey: InjectionKey<AccordionGroupItemContextValue> = Symbol('wow-two.accordionItem');

/** Reads the enclosing `AccordionGroupItem` state. */
export function useAccordionItemContext(): AccordionGroupItemContextValue {
  const context = inject(AccordionGroupItemKey, null);
  if (!context) throw new Error('AccordionGroup.Trigger / Content must be used inside <AccordionGroup.Item>');
  return context;
}
