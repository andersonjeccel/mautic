import { emit, register } from './lifecycle';
type Status = 'idle' | 'loading' | 'loaded' | 'error';
type Options = { src?: string; alt?: string; crossOrigin?: string | null; referrerPolicy?: ReferrerPolicy; delayMs?: number; onLoadingStatusChange?: (status: Status) => void };
class AcervoAvatar {
  private options: Options;
  private status: Status = 'idle';
  private canRender: boolean;
  private timer?: number;
  private loader?: HTMLImageElement;
  private generation = 0;
  private disposed = false;
  private readonly imageTemplate: HTMLTemplateElement;
  private readonly fallbackTemplate: HTMLTemplateElement;
  constructor(private readonly element: HTMLElement) {
    this.imageTemplate = element.querySelector('template[data-avatar-image]')!;
    this.fallbackTemplate = element.querySelector('template[data-avatar-fallback]')!;
    this.options = { src: element.dataset.src, delayMs: element.dataset.delayMs === undefined ? undefined : Number(element.dataset.delayMs), crossOrigin: element.dataset.crossOrigin, referrerPolicy: element.dataset.referrerPolicy as ReferrerPolicy | undefined };
    this.canRender = this.options.delayMs === undefined;
    this.scheduleFallback();
    this.load();
  }
  update(options: Options): void {
    const previous = this.options;
    this.options = { ...previous, ...options };
    if ('alt' in options) {
      const image = this.imageTemplate.content.firstElementChild!;
      if (options.alt === undefined) image.removeAttribute('alt'); else image.setAttribute('alt', options.alt);
      this.element.querySelector('img')?.setAttribute('alt', options.alt ?? '');
    }
    if (previous.delayMs !== this.options.delayMs) this.scheduleFallback();
    if (previous.src !== this.options.src || previous.crossOrigin !== this.options.crossOrigin || previous.referrerPolicy !== this.options.referrerPolicy) this.load();
  }
  private scheduleFallback(): void {
    window.clearTimeout(this.timer);
    if (this.options.delayMs !== undefined) this.timer = window.setTimeout(() => { this.canRender = true; this.render(); }, this.options.delayMs);
  }
  private load(): void {
    const generation = ++this.generation;
    if (this.loader) { this.loader.onload = null; this.loader.onerror = null; }
    if (!this.options.src) { this.setStatus('error'); return; }
    const image = new Image(); this.loader = image;
    image.onload = () => { if (!this.disposed && generation === this.generation) this.setStatus(image.naturalWidth > 0 ? 'loaded' : 'error'); };
    image.onerror = () => { if (!this.disposed && generation === this.generation) this.setStatus('error'); };
    if (this.options.referrerPolicy) image.referrerPolicy = this.options.referrerPolicy;
    image.crossOrigin = this.options.crossOrigin ?? null;
    image.src = this.options.src;
    this.setStatus(image.complete ? image.naturalWidth > 0 ? 'loaded' : 'error' : 'loading');
  }
  private setStatus(status: Status): void {
    const changed = status !== this.status; this.status = status; this.render();
    if (changed) { this.options.onLoadingStatusChange?.(status); emit(this.element, 'mautic:avatar:loading-status', { status }); }
  }
  private render(): void {
    const image = this.element.querySelector<HTMLImageElement>(':scope > [data-slot="avatar-image"]');
    if (this.status === 'loaded') {
      const display = image ?? this.imageTemplate.content.firstElementChild!.cloneNode(true) as HTMLImageElement;
      display.setAttribute('src', this.options.src!);
      if (this.options.crossOrigin != null) display.setAttribute('crossorigin', this.options.crossOrigin); else display.removeAttribute('crossorigin');
      if (this.options.referrerPolicy) display.setAttribute('referrerpolicy', this.options.referrerPolicy); else display.removeAttribute('referrerpolicy');
      if (!image) this.element.prepend(display);
    } else image?.remove();
    const fallback = this.element.querySelector(':scope > [data-slot="avatar-fallback"]');
    if (this.canRender && this.status !== 'loaded') { if (!fallback) this.element.append(this.fallbackTemplate.content.firstElementChild!.cloneNode(true)); }
    else fallback?.remove();
  }
  destroy(): void { this.disposed = true; this.generation++; window.clearTimeout(this.timer); if (this.loader) { this.loader.onload = null; this.loader.onerror = null; } }
}
register('AcervoAvatar', '[data-component="acervo-avatar"]', (element) => new AcervoAvatar(element));
