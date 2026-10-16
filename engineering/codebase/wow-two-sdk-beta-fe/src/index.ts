/** Convenience exports; optional vendor adapters remain available through dedicated subpaths. */

// Foundation — preferred via subpath imports, also namespaced from root for convenience
export * as styles from './foundation/styles';
export * as dom from './foundation/dom';
export * as optionals from './foundation/optionals';
export * as state from './foundation/state';
export * as numbers from './foundation/numbers';
export * as json from './foundation/json';
export * as icons from './foundation/icons';
export * as primitives from './foundation/primitives';
export * as themes from './foundation/themes';
export * as color from './domain/color';
export * as emoji from './domain/emoji';

// Presentation components
export * from './presentation/actions';
export * from './presentation/display';
export * from './presentation/feedback';
export * from './presentation/forms';
export * from './presentation/layout';
export * from './presentation/nav';
export * from './presentation/overlays';
