import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ToolChips } from './src/components/spectrum-ui/components/blocks/ai-assistants/tool-chips';
let root = createRoot(document.querySelector('#reference')!);
let options = (window as any).referenceOptions;
(window as any).referenceUpdate = (next: any) => {
  options = { ...options, ...next };
  flushSync(() => root.render(<ToolChips {...options} />));
};
(window as any).referenceRemount = () => {
  flushSync(() => root.unmount());
  root = createRoot(document.querySelector('#reference')!);
  (window as any).referenceUpdate({});
};
(window as any).referenceUpdate({});
