import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { TaskRows } from './src/components/spectrum-ui/components/blocks/ai-assistants/task-rows';
let root = createRoot(document.querySelector('#reference')!);
let options = (window as any).referenceOptions;
(window as any).referenceUpdate = (next: any) => {
  options = { ...options, ...next };
  flushSync(() => root.render(<TaskRows {...options} />));
};
(window as any).referenceRichNote = (tasks: any) => {
  tasks[0].note = <p>Note <strong>bold</strong> <input aria-label="Note input" defaultValue="kept" /></p>;
  (window as any).richTasks = tasks;
  (window as any).referenceUpdate({tasks});
};
(window as any).referenceRemount = () => {
  flushSync(() => root.unmount());
  root = createRoot(document.querySelector('#reference')!);
  (window as any).referenceUpdate({});
};
(window as any).referenceUpdate({});
