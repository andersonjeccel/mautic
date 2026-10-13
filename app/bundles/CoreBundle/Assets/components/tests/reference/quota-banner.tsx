import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { QuotaBanner } from './src/components/spectrum-ui/components/blocks/ai-assistants/quota-banner';
const root = createRoot(document.querySelector('#reference')!);
let options = (window as any).referenceOptions;
(window as any).upgrades = 0;
(window as any).referenceUpdate = (next: any) => {
  options = { ...options, ...next };
  flushSync(() =>
    root.render(
      <QuotaBanner {...options} onUpgrade={() => (window as any).upgrades++} />,
    ),
  );
};
(window as any).referenceMountSecond = (props: any) => {
  const container = document.createElement('div');
  container.style.display = 'contents';
  document.body.append(container);
  const second = createRoot(container);
  flushSync(() => second.render(<QuotaBanner {...props} />));
};
(window as any).referenceUnmount = () => flushSync(() => root.unmount());
(window as any).referenceUpdate({});
