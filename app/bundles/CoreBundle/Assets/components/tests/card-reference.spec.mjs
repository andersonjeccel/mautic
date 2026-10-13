import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { render } from './render.mjs';
const reference=await build({entryPoints:['tests/reference/card.tsx'],bundle:true,write:false,format:'iife',jsx:'automatic',alias:{'@':resolve('tests/reference/src')},define:{'process.env.NODE_ENV':'"production"'}});
const theme=readFileSync('tests/reference/card.generated.css','utf8');const css=readFileSync('../css/99.acervo-card.css','utf8');const font=readFileSync('../css/fonts/acervo-manrope-400.ttf').toString('base64');
export const composition=String.raw`{% embed '@MauticCore/Components/acervo-card.html.twig' with {attributes:{style:'width:'~width~'px'}} %}{% block card_children %}{% embed '@MauticCore/Components/acervo-card-header.html.twig' with {attributes:{}} %}{% block card_header %}{% include '@MauticCore/Components/acervo-card-title.html.twig' with {children:'Card title',attributes:{}} only %}{% include '@MauticCore/Components/acervo-card-description.html.twig' with {children:'Description with a long line that wraps on narrow screens.',attributes:{}} only %}{% endblock %}{% endembed %}{% embed '@MauticCore/Components/acervo-card-content.html.twig' with {attributes:{}} %}{% block card_content %}<p>Content <strong>with nested text</strong>.</p>{% endblock %}{% endembed %}{% embed '@MauticCore/Components/acervo-card-footer.html.twig' with {attributes:{}} %}{% block card_footer %}<span>Footer</span><span> action</span>{% endblock %}{% endembed %}{% endblock %}{% endembed %}`;
function renderComposition(width){const php=String.raw`require $argv[1];$loader=new \Twig\Loader\FilesystemLoader();$loader->addPath($argv[2],'MauticCore');$twig=new \Twig\Environment($loader,['autoescape'=>'html','strict_variables'=>true]);$twig->addFilter(new \Twig\TwigFilter('trans',static fn($text)=>$text));echo $twig->createTemplate($argv[3])->render(['width'=>(int)$argv[4]]);`;return execFileSync('php',['-r',php,process.env.MAUTIC_VENDOR_AUTOLOAD??resolve('../../../../../vendor/autoload.php'),resolve('../../Resources/views'),composition,String(width)],{encoding:'utf8'});}
async function scene(page,original,options,dark){const common=`${theme}@font-face{font-family:Manrope;src:url(data:font/ttf;base64,${font})}@font-face{font-family:"Acervo Manrope";src:url(data:font/ttf;base64,${font})}body{margin:0;padding:32px}#reference{display:contents}`;
 await page.setContent(`<html class="${dark?'dark':''}"><style>${common}${original?'':css}</style><body>${original?'<div id="reference"></div>':options.part?render('acervo-card'+(options.part==='card'?'':'-'+options.part),options):renderComposition(options.width)}</body></html>`);await page.evaluate((options)=>window.referenceOptions=options,options);if(original)await page.addScriptTag({content:reference.outputFiles[0].text});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(20);
}
test.describe.configure({mode:'parallel'});
for(const dark of[false,true])for(const viewport of[375,1024])test(`card composition ${dark} ${viewport}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width:viewport,height:500}});const original=await context.newPage(),native=await context.newPage();const options={width:Math.min(viewport-64,640)};await scene(original,true,options,dark);await scene(native,false,options,dark);
 const left=PNG.sync.read(await original.screenshot()),right=PNG.sync.read(await native.screenshot());expect(pixelmatch(left.data,right.data,null,left.width,left.height,{threshold:.05})).toBe(0);
 const geometry=(element)=>[element.offsetWidth,element.offsetHeight,getComputedStyle(element).fontSize,getComputedStyle(element).borderRadius,getComputedStyle(element).letterSpacing];expect(await native.locator('[data-slot=card]').evaluate(geometry)).toEqual(await original.locator('#reference>div').evaluate(geometry));await context.close();
});
for(const part of['card','header','title','description','content','footer'])test(`card part ${part}`,async({browser})=>{
 const context=await browser.newContext();const original=await context.newPage(),native=await context.newPage();await scene(original,true,{part,children:'Part content'},false);await scene(native,false,{part,children:'Part content'},false);
 const left=PNG.sync.read(await original.screenshot()),right=PNG.sync.read(await native.screenshot());expect(pixelmatch(left.data,right.data,null,left.width,left.height,{threshold:.05})).toBe(0);await context.close();
});
for(const children of[0,'0',false,true,'<script>&','First\nSecond'])test(`card content preservation ${JSON.stringify(children)}`,async({browser})=>{
 const context=await browser.newContext();const original=await context.newPage(),native=await context.newPage();const options={part:'title',children,attributes:{role:'heading','aria-level':2,'aria-hidden':false,hidden:false}};await scene(original,true,options,false);await scene(native,false,options,false);expect(await native.locator('[data-slot]').textContent()).toBe(await original.locator('#reference>div').textContent());await expect(native.locator('[data-slot]')).not.toHaveAttribute('hidden',/.*/);await expect(native.locator('[data-slot]')).toHaveAttribute('aria-hidden','false');await expect(native.locator('[data-slot]')).toHaveAttribute('role','heading');await context.close();
});
