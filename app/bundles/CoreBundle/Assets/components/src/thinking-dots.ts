import { register } from './lifecycle';
type Options = { label?: string; variant?: 'Dots' | 'Bar'; className?: string };
class ThinkingDots {
  private variant: string;
  private className: string;
  constructor(private readonly element: HTMLElement) { this.variant = element.dataset.variant!; this.className = element.dataset.className ?? ''; }
  update(options: Options): void {
    if ('label' in options) { const label = options.label ?? this.element.dataset.defaultLabel!; this.element.setAttribute('aria-label', label); this.element.querySelector('[data-label]')!.textContent = label; }
    if ('className' in options) { for (const name of this.className.split(/\s+/).filter(Boolean)) this.element.classList.remove(name); this.className = options.className ?? ''; for (const name of this.className.split(/\s+/).filter(Boolean)) this.element.classList.add(name); this.element.classList.add('thinking-dots'); }
    if ('variant' in options) {
      const variant = options.variant ?? 'Dots';
      if ((this.variant === 'Dots') !== (variant === 'Dots')) {
        const indicator = this.element.querySelector<HTMLElement>('[data-indicator]')!; indicator.className = variant === 'Dots' ? 'thinking-dots__dots' : 'thinking-dots__track'; indicator.replaceChildren();
        for (let index = 0; index < (variant === 'Dots' ? 3 : 1); index++) { const node = document.createElement('span'); node.className = variant === 'Dots' ? 'thinking-dots__dot' : 'thinking-dots__bar'; node.style.animation = variant === 'Dots' ? `core-thinking-dot 1.2s ease-in-out ${index * 160}ms infinite` : 'core-thinking-bar 1.1s ease-in-out infinite'; indicator.append(node); }
      }
      this.variant = variant; this.element.dataset.variant = variant;
    }
  }
  destroy(): void {}
}
register('ThinkingDots', '[data-component="thinking-dots"]', (element) => new ThinkingDots(element));
