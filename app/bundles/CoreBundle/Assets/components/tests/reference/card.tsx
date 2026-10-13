import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './src/components/shadcn-ui/primitives/card';
const options=(window as any).referenceOptions;
const parts={card:Card,header:CardHeader,title:CardTitle,description:CardDescription,content:CardContent,footer:CardFooter};
const Part=parts[options.part as keyof typeof parts]??Card;
createRoot(document.querySelector('#reference')!).render(options.part ? <Part {...options.attributes}>{options.children}</Part> : <Card style={{width:options.width}}><CardHeader><CardTitle>Card title</CardTitle><CardDescription>Description with a long line that wraps on narrow screens.</CardDescription></CardHeader><CardContent><p>Content <strong>with nested text</strong>.</p></CardContent><CardFooter><span>Footer</span><span> action</span></CardFooter></Card>);
