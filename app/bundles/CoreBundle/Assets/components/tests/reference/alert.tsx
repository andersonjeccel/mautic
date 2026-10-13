import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Alert, AlertTitle, AlertDescription } from './src/components/shadcn-ui/primitives/alert';
const options=(window as any).referenceOptions;
const svg=<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3 22 21H2Z"/><path d="M12 9v4m0 4h.01"/></svg>;
const parts={root:Alert,title:AlertTitle,description:AlertDescription};
const Part=parts[options.part as keyof typeof parts]??Alert;
createRoot(document.querySelector('#reference')!).render(options.part ? <Part variant={options.variant} {...options.attributes}>{options.children}</Part> : <Alert variant={options.variant} {...options.attributes}>{options.icon?svg:null}{options.layout==='descriptionOnly'?<AlertDescription><p>Detailed message with <strong>nested text</strong> and a line that wraps at narrow widths.</p><p>Second paragraph.</p></AlertDescription>:<><AlertTitle>Attention needed</AlertTitle><AlertDescription><p>Detailed message with <strong>nested text</strong> and a line that wraps at narrow widths.</p><p>Second paragraph.</p></AlertDescription></>}</Alert>);
