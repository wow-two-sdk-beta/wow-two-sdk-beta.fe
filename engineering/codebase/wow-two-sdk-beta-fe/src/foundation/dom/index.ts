// dom capability: explicitly owned helpers and contracts.

export { composeEventHandlers } from './ComposeEventHandlers';
export { dataAttr } from './DataAttr';
export type { ElementType, PolymorphicProps, PolymorphicPropsWithoutRef, PolymorphicRef } from './Polymorphic';
export { PressExtensions, type PressEvent } from './PressExtensions';
export { HtmlElement, ButtonType } from './enums/HtmlValues';
export { Key } from './enums/Key';
export { ElementTag } from './enums/ElementTag';
export { AriaAttribute } from './enums/AriaAttribute';
export { AttributeValue } from './enums/AttributeValue';
export { DomEvent, type HandlerProp } from './enums/DomEvent';
export { UrlExtensions } from './UrlExtensions';

export * from './hooks/UseEventListener';
export * from './hooks/UseOutsideClick';
export * from './hooks/UseFocusTrap';
export * from './hooks/UseScrollLock';
export * from './hooks/UseScrollActivity';

export { DomOrderExtensions } from './DomOrderExtensions';
export { resolveElement } from './ResolveElement';
export { ScrollRegionAttribute, findScrollRegions } from './ScrollRegion';
