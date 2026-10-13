import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { StreamingText } from './src/components/spectrum-ui/components/blocks/ai-assistants/streaming-text';
const root = createRoot(document.querySelector('#reference')!);
let options = (window as any).referenceOptions;
(window as any).followUps = [];
(window as any).referenceUpdate = (next: any) => {
  options = { ...options, ...next };
  flushSync(() =>
    root.render(
      <StreamingText
        {...options}
        onFollowUp={(prompt) => (window as any).followUps.push(prompt)}
      />,
    ),
  );
};
(window as any).referenceUpdate({});
