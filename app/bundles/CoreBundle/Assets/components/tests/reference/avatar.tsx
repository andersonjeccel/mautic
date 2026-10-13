import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Avatar, AvatarImage, AvatarFallback } from './src/components/shadcn-ui/primitives/avatar';
const root=createRoot(document.querySelector('#reference')!);
let options=(window as any).referenceOptions;
(window as any).statuses=[];
(window as any).referenceUpdate=(next:any)=>{
 options={...options,...next};
 const image=<AvatarImage src={options.src} alt={options.alt} crossOrigin={options.crossOrigin} referrerPolicy={options.referrerPolicy} asChild={options.imageAsChild} {...options.imageAttributes} onLoadingStatusChange={(status)=>(window as any).statuses.push(status)}>{options.imageAsChild ? <span {...options.imageChildAttributes}/> : undefined}</AvatarImage>;
 const fallback=<AvatarFallback delayMs={options.delayMs} asChild={options.fallbackAsChild} {...options.fallbackAttributes}>{options.fallbackAsChild ? <em {...options.fallbackChildAttributes}>{options.children}</em> : options.children}</AvatarFallback>;
 flushSync(()=>root.render(<Avatar asChild={options.asChild} {...options.attributes}>{options.asChild ? <a {...options.childAttributes}>{image}{fallback}</a> : <>{image}{fallback}</>}</Avatar>));
};
(window as any).referenceUpdate({});
