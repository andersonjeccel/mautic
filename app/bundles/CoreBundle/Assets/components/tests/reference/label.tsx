import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Label } from './src/components/shadcn-ui/primitives/label';
const options = (window as any).referenceOptions;
const { tag = 'span', childAttributes = {}, childClassName, children = 'Field label', attributes, ...props } = options;
createRoot(document.querySelector('#reference')!).render(<><input id="field" className="peer" disabled={(window as any).referenceDisabled}/><Label {...attributes} {...props} onMouseDown={(event: React.MouseEvent) => (window as any).events.push(event.detail)}>{options.asChild ? React.createElement(tag,{...childAttributes,className:childClassName},children) : children}</Label></>);
