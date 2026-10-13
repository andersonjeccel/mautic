import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Badge } from './src/components/shadcn-ui/primitives/badge';
const root=createRoot(document.querySelector('#reference')!);
let options=(window as any).referenceOptions;
(window as any).referenceUpdate=(next:any)=>{
  options={...options,...next};
  const {tag='span',childAttributes={},childClassName,children='Badge',attributes,...props}=options;
  flushSync(()=>root.render(<Badge {...attributes} {...props}>{options.asChild?React.createElement(tag,{...childAttributes,className:childClassName},children):children}</Badge>));
};
(window as any).referenceUpdate({});
