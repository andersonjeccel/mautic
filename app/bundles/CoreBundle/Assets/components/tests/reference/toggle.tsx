import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Toggle } from './src/components/animate-ui/components/radix/toggle';
import { useToggle, Toggle as Root, ToggleItem as Item, ToggleHighlight as Highlight } from './src/components/animate-ui/primitives/radix/toggle';

function Content({ children }: { children: any }) {
  (window as any).referenceContext = useToggle();
  return children;
}
const root = createRoot(document.querySelector('#reference')!);
let options = (window as any).referenceOptions ?? {};
(window as any).changes = [];
(window as any).referenceUpdate = (next: Record<string, unknown>) => {
  options = { ...options, ...next };
  const { primitive, itemEnabled, ...props } = options;
  const onPressedChange = (pressed: boolean) => (window as any).changes.push(pressed);
  flushSync(() => root.render(primitive ? <Root onPressedChange={onPressedChange} {...props}>{itemEnabled ? <><Highlight/><Item><Content>{options.children ?? 'B'}</Content></Item></> : <Content>{options.children ?? 'B'}</Content>}</Root> : <Toggle onPressedChange={onPressedChange} {...props}><Content>{options.children ?? 'B'}</Content></Toggle>));
};
(window as any).referenceUpdate({});
