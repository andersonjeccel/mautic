import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { SuggestionBanner } from './src/components/spectrum-ui/components/blocks/ai-assistants/suggestion-banner';
const root = createRoot(document.querySelector('#reference')!);
let options = (window as any).referenceOptions;
(window as any).calls = [];
const record = (action: string) =>
  (window as any).calls.push({
    action,
    role: document.querySelector('#reference>div')?.getAttribute('role'),
    buttons: document.querySelectorAll('#reference button').length,
  });
(window as any).referenceUpdate = (next: any) => {
  options = { ...options, ...next };
  flushSync(() =>
    root.render(
      <SuggestionBanner
        {...options}
        onApply={() => record('apply')}
        onDismiss={() => record('dismiss')}
      />,
    ),
  );
};
(window as any).referenceUpdate({});
