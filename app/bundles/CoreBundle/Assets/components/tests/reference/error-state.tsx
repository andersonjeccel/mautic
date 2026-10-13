import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {ErrorState} from './src/components/spectrum-ui/components/blocks/ai-assistants/error-state';
const root=createRoot(document.querySelector('#reference')!);
let options=(window as any).referenceOptions;
(window as any).retries=[];
(window as any).referenceUpdate=(next:any)=>{options={...options,...next};flushSync(()=>root.render(<ErrorState {...options} onRetry={()=>{(window as any).retries.push({disabled:document.querySelector('button')!.disabled,label:document.querySelector('button')!.textContent});}}/>));};
(window as any).referenceUpdate({});
