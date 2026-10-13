import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ChatEmptyState } from './src/components/spectrum-ui/components/blocks/ai-assistants/chat-empty-state';
let root = createRoot(document.querySelector('#reference')!);
let options = (window as any).referenceOptions;
(window as any).events = [];
(window as any).referenceUpdate = (next: any) => {
  options = { ...options, ...next };
  (window as any).currentPrompts = options.prompts ?? [];
  flushSync(() =>
    root.render(
      <ChatEmptyState
        {...options}
        onSelectPrompt={
          options.hasCallback === false
            ? undefined
            : (prompt: any) =>
                (window as any).events.push({
                  prompt,
                  same:
                    prompt ===
                    (window as any).currentPrompts.find(
                      (value: any) => value.id === prompt.id,
                    ),
                })
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
