import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { DotExpandButton } from './src/components/spectrum-ui/components/dot-expand-button';
const root=createRoot(document.querySelector('#reference')!);
let options=(window as any).referenceOptions;
(window as any).referenceUpdate=(next:any)=>{options={...options,...next};flushSync(()=>root.render(<DotExpandButton {...options} {...options.attributes} />));};
(window as any).referenceUpdate({});
