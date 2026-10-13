import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { DiffView } from './src/components/spectrum-ui/components/blocks/ai-assistants/diff-view';
let root = createRoot(document.querySelector('#reference')!);
let options = (window as any).referenceOptions;
(window as any).events = [];
const observe = (decision: string, id: string) =>
  (window as any).events.push({
    decision,
    id,
    buttons: document.querySelectorAll('button').length,
  });
(window as any).referenceUpdate = (next: any) => {
  options = { ...options, ...next };
  flushSync(() =>
    root.render(
      <DiffView
        {...options}
        onAccept={
          options.hasCallback === false
            ? undefined
            : (id) => observe('accepted', id)
        }
        onReject={
          options.hasCallback === false
            ? undefined
            : (id) => observe('rejected', id)
        }
      />,
    ),
  );
};
(window as any).referenceRemount = () => {
  flushSync(() => root.unmount());
  root = createRoot(document.querySelector('#reference')!);
  (window as any).referenceUpdate({});
};
(window as any).referenceUpdate({});
