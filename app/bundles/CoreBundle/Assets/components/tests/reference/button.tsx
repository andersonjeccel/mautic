import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Button } from './src/components/shadcn-ui/primitives/button';
const root=createRoot(document.querySelector('#reference')!);
let options=(window as any).referenceOptions;
(window as any).referenceUpdate=(next:any)=>{
 options={...options,...next};
 const {tag='a',childAttributes={},childClassName,children='Button',attributes,...props}=options;
 flushSync(()=>root.render(<Button {...attributes} {...props}>{options.asChild?React.createElement(tag,{...childAttributes,className:childClassName},children):children}</Button>));
};
(window as any).referenceUpdate({});
