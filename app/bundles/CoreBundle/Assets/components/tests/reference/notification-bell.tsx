import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { NotificationBell } from './src/components/spectrum-ui/components/notification-bell';
const root=createRoot(document.querySelector('#reference')!);
let options=(window as any).referenceOptions;
(window as any).clicks=0;
(window as any).referenceUpdate=(next:any)=>{options={...options,...next};flushSync(()=>root.render(<NotificationBell {...options} onClick={()=>(window as any).clicks++}/>));};
(window as any).referenceUpdate({});
