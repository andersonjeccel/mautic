import { register } from './lifecycle';
type Usage = { promptTokens: number; completionTokens: number; contextWindow: number; estimatedCostUsd?: number };
type Options = { usage?: Usage; variant?: 'Bar' | 'Inline'; className?: string };
const formatTokens = (count: number): string => count < 1000 ? String(count) : `${(count / 1000).toFixed(1)}k`;
class UsageMeter {
  private usage: Usage;
  private variant: string;
  private className: string;
  constructor(private readonly element: HTMLElement) { this.usage = JSON.parse(element.dataset.usage!) as Usage; this.variant = element.dataset.variant!; this.className = element.dataset.className ?? ''; const fill = element.querySelector<HTMLElement>('[data-fill]')!; fill.style.transition = 'none'; this.render(); fill.getBoundingClientRect(); fill.style.removeProperty('transition'); }
  private node(tag: string, className: string, marker?: string): HTMLElement { const node = document.createElement(tag); node.className = className; if (marker) node.setAttribute(marker, ''); return node; }
  private text(element: Element, parts: string[]): void { if (element.childNodes.length !== parts.length) element.replaceChildren(...parts.map(part => document.createTextNode(part))); else parts.forEach((part, index) => { if (element.childNodes[index].nodeValue !== part) element.childNodes[index].nodeValue = part; }); }
  private structure(): void {
    this.element.replaceChildren(); const track = this.node(this.variant === 'Inline' ? 'span' : 'div', 'usage-meter__track', 'data-track'); track.append(this.node('span', 'usage-meter__fill', 'data-fill'));
    const summary = this.node('span', this.variant === 'Inline' ? '' : 'usage-meter__summary', 'data-summary');
    if (this.variant === 'Inline') { track.setAttribute('aria-hidden', 'true'); this.element.append(track, summary); }
    else { const header = this.node('div', 'usage-meter__header'); const title = this.node('span', 'usage-meter__title'); title.textContent = this.element.dataset.title!; header.append(title, summary); const footer = this.node('div', 'usage-meter__footer'); footer.append(this.node('span', '', 'data-breakdown')); this.element.append(header, track, footer); }
  }
  private render(): void {
    const usage = this.usage; const used = usage.promptTokens + usage.completionTokens; const ratio = Math.min(1, used / usage.contextWindow); const percent = Math.round(ratio * 100);
    const fill = this.element.querySelector<HTMLElement>('[data-fill]')!; fill.style.width = `${percent}%`; fill.classList.toggle('usage-meter__fill--amber', ratio > .75 && ratio <= .9); fill.classList.toggle('usage-meter__fill--red', ratio > .9);
    this.text(this.element.querySelector('[data-summary]')!, [formatTokens(used), ' / ', formatTokens(usage.contextWindow), ...(this.variant === 'Inline' ? [] : [' \u00b7 ', String(percent), '%'])]);
    if (this.variant !== 'Inline') { const track = this.element.querySelector('[data-track]')!; track.setAttribute('role', 'meter'); track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', String(usage.contextWindow)); track.setAttribute('aria-valuenow', String(used)); track.setAttribute('aria-label', this.element.dataset.meterLabel!); this.text(this.element.querySelector('[data-breakdown]')!, this.element.dataset.breakdownPattern!.replace('%separator%', '\u00b7').split(/(%prompt%|%completion%)/).filter(Boolean).map(part => part === '%prompt%' ? formatTokens(usage.promptTokens) : part === '%completion%' ? formatTokens(usage.completionTokens) : part)); }
    let cost = this.element.querySelector('[data-cost]');
    if (usage.estimatedCostUsd !== undefined) { if (!cost) { cost = this.node('span', this.variant === 'Inline' ? 'usage-meter__cost' : '', 'data-cost'); (this.variant === 'Inline' ? this.element : this.element.querySelector('.usage-meter__footer')!).append(cost); } this.text(cost, [this.variant === 'Inline' ? '$' : '\u2248 $', usage.estimatedCostUsd.toFixed(4)]); } else cost?.remove();
  }
  update(options: Options): void {
    if ('usage' in options) this.usage = options.usage!;
    if ('className' in options) { for (const name of this.className.split(/\s+/).filter(Boolean)) this.element.classList.remove(name); this.className = options.className ?? ''; for (const name of this.className.split(/\s+/).filter(Boolean)) this.element.classList.add(name); this.element.classList.add('usage-meter'); }
    if ('variant' in options) { const variant = options.variant ?? 'Bar'; if ((variant === 'Inline') !== (this.variant === 'Inline')) { this.variant = variant; this.element.dataset.variant = variant; this.structure(); } else { this.variant = variant; this.element.dataset.variant = variant; } }
    this.render();
  }
  destroy(): void {}
}
register('UsageMeter', '[data-component="usage-meter"]', (element) => new UsageMeter(element));
