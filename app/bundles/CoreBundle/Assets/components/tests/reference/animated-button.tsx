import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Button } from './src/components/animate-ui/components/buttons/button';
import { Button as Primitive } from './src/components/animate-ui/primitives/buttons/button';
const root=createRoot(document.querySelector('#reference')!);
let options=(window as any).referenceOptions;
(window as any).referenceUpdate=(next:any)=>{
 options={...options,...next};
 const {tag='a',childAttributes={},childClassName,children='Button',attributes,primitive,...props}=options;
 const Component=primitive?Primitive:Button;
 flushSync(()=>root.render(<Component {...attributes} {...props}>{options.asChild?React.createElement(tag,{...childAttributes,className:childClassName},children):children}</Component>));
};
(window as any).referenceUpdate({});
