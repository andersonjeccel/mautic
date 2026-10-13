import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { InsightCards } from './src/components/spectrum-ui/components/blocks/ai-assistants/insight-cards';
let root = createRoot(document.querySelector('#reference')!);
let options = (window as any).referenceOptions;
(window as any).referenceUpdate = (next: any) => {
  options = { ...options, ...next };
  flushSync(() => root.render(<InsightCards {...options} />));
};
(window as any).referenceRemount = () => {
  flushSync(() => root.unmount());
  root = createRoot(document.querySelector('#reference')!);
  (window as any).referenceUpdate({});
};
(window as any).referenceUpdate({});
