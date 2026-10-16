import { formsExamples } from './FormsExamples';
import { overlaysExamples } from './OverlaysExamples';
import { layoutExamples } from './LayoutExamples';
import { feedbackExamples } from './FeedbackExamples';
import { actionsExamples } from './ActionsExamples';
import { displayExamples } from './DisplayExamples';
import { navExamples } from './NavExamples';

export const componentExamples = [
  ...formsExamples,
  ...overlaysExamples,
  ...layoutExamples,
  ...feedbackExamples,
  ...actionsExamples,
  ...displayExamples,
  ...navExamples,
];

export function findComponentExample(name: string) {
  return componentExamples.find((example) => example.name === name);
}
