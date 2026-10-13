import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { VoiceInput, VoiceVisualizer, VoiceTimer } from './src/components/spectrum-ui/components/blocks/ai-assistants/voice-input';
const root=createRoot(document.querySelector('#reference')!);
let options=(window as any).referenceOptions;
(window as any).callbacks=[];
(window as any).referenceUpdate=(next:any)=>{options={...options,...next};flushSync(()=>root.render(options.part==='visualizer'?<VoiceVisualizer {...options}/>:options.part==='timer'?<VoiceTimer {...options}/>:<VoiceInput {...options} onStart={()=>(window as any).callbacks.push('start')} onConfirm={()=>(window as any).callbacks.push('confirm')} onCancel={()=>(window as any).callbacks.push('cancel')}/>));};
(window as any).referenceUpdate({});
