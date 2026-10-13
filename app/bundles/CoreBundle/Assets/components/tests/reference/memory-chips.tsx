import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { MemoryChips } from './src/components/spectrum-ui/components/blocks/ai-assistants/memory-chips';
let root = createRoot(document.querySelector('#reference')!);
let options = (window as any).referenceOptions;
(window as any).events = [];
const remove = (id: string) =>
  (window as any).events.push({
    id,
    count: document.querySelectorAll('ul li').length,
  });
const add = () => (window as any).events.push({ add: true });
(window as any).referenceUpdate = (next: any) => {
  options = { ...options, ...next };
  flushSync(() =>
    root.render(
      <MemoryChips
        {...options}
        onRemove={remove}
        onAdd={options.hasAdd ? add : undefined}
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
