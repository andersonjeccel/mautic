import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { TaskCheckbox } from './src/components/spectrum-ui/components/task-checkbox';

const root = createRoot(document.querySelector('#reference')!);
let options = (window as any).referenceOptions ?? {};
(window as any).changes = [];
(window as any).referenceUpdate = (next: Record<string, unknown>) => {
  options = { ...options, ...next };
  flushSync(() => root.render(<TaskCheckbox onCheckedChange={(checked) => (window as any).changes.push(checked)} {...options} />));
};
(window as any).referenceUpdate({});
