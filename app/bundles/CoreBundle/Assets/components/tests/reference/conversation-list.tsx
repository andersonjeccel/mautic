import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ConversationList } from './src/components/spectrum-ui/components/blocks/ai-assistants/conversation-list';
let root = createRoot(document.querySelector('#reference')!);
let options = (window as any).referenceOptions;
(window as any).events = [];
const observe = (kind: string, id: string) =>
  (window as any).events.push({
    kind,
    id,
    active: document.querySelector('[aria-current]')?.textContent ?? null,
    pins: [...document.querySelectorAll('[aria-pressed]')].map((node) =>
      node.getAttribute('aria-pressed'),
    ),
  });
(window as any).referenceUpdate = (next: any) => {
  options = { ...options, ...next };
  flushSync(() =>
    root.render(
      <ConversationList
        {...options}
        onSelect={
          options.hasCallback === false
            ? undefined
            : (id) => observe('select', id)
        }
        onTogglePin={
          options.hasCallback === false ? undefined : (id) => observe('pin', id)
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
