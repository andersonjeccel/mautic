import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {ThinkingDots} from './src/components/spectrum-ui/components/blocks/ai-assistants/thinking-dots';
const root=createRoot(document.querySelector('#reference')!);
let options=(window as any).referenceOptions;
(window as any).referenceUpdate=(next:any)=>{options={...options,...next};flushSync(()=>root.render(<ThinkingDots {...options}/>));};
(window as any).referenceUpdate({});
