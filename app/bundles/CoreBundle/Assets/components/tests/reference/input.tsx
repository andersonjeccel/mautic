import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Input } from './src/components/shadcn-ui/primitives/input';

const root = createRoot(document.querySelector('#reference')!);
let options = (window as any).referenceOptions ?? {};
(window as any).changes = [];
(window as any).referenceUpdate = (next: Record<string, unknown>) => {
  options = { ...options, ...next };
  flushSync(() => root.render(<Input aria-label="Field" onChange={(event) => (window as any).changes.push(event.target.value)} {...options} />));
};
(window as any).referenceUpdate({});
