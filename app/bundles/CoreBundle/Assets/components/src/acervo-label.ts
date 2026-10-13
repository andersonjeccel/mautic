import { register } from './lifecycle';
type Options = { htmlFor?: string; onMouseDown?: (event: MouseEvent) => void };
class AcervoLabel {
  private readonly events = new AbortController();
  private options: Options = {};
  constructor(private readonly element: HTMLElement) {
    element.addEventListener('mousedown', (event) => {
      if ((event.target as Element).closest('button, input, select, textarea')) return;
      this.options.onMouseDown?.(event);
      if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
    }, { signal: this.events.signal });
  }
  update(options: Options): void {
    this.options = { ...this.options, ...options };
    if ('htmlFor' in options) {
      if (options.htmlFor === undefined) this.element.removeAttribute('for');
      else this.element.setAttribute('for', options.htmlFor);
    }
  }
  destroy(): void { this.events.abort(); }
}
register('AcervoLabel', '[data-component="acervo-label"]', (element) => new AcervoLabel(element));
