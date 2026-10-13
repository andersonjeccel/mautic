import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { AnimatedSwitch } from './src/components/spectrum-ui/components/animated-switch';

const root = createRoot(document.querySelector('#reference')!);
let options = (window as any).referenceOptions ?? {};
(window as any).changes = [];
(window as any).referenceUpdate = (next: Record<string, unknown>) => {
  options = { ...options, ...next };
  const icon = (value: any) => value === 'fixture:svg' ? React.createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }, React.createElement('path', { d: 'M5 12h14M12 5v14' })) : value;
  flushSync(() => root.render(<AnimatedSwitch onCheckedChange={(checked) => (window as any).changes.push(checked)} {...options} onIcon={icon(options.onIcon)} offIcon={icon(options.offIcon)} />));
};
(window as any).referenceUpdate({});
