import { register } from './lifecycle';
type Options = { label?: string; variant?: 'Drive' | 'Dots' | 'Orbit'; className?: string };
class LoadingState {
  private deciseconds = 0;
  private readonly interval: number;
  private className: string;
  constructor(private readonly element: HTMLElement) { this.className = element.dataset.className ?? ''; const initialTimer = element.querySelector('[role="timer"]')!; initialTimer.textContent = '0.0s'; initialTimer.setAttribute('aria-label', element.dataset.elapsedLabel!.replace('%elapsed%', '0.0s')); this.interval = window.setInterval(() => { this.deciseconds++; const total = this.deciseconds / 10; const elapsed = total < 60 ? `${total.toFixed(1)}s` : `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`; const timer = this.element.querySelector('[role="timer"]')!; timer.textContent = elapsed; timer.setAttribute('aria-label', this.element.dataset.elapsedLabel!.replace('%elapsed%', elapsed)); }, 100); }
  update(options: Options): void {
    if ('label' in options) this.element.querySelector('[data-label]')!.textContent = options.label ?? this.element.dataset.defaultLabel!;
    if ('className' in options) { for (const name of this.className.split(/\s+/).filter(Boolean)) this.element.classList.remove(name); this.className = options.className ?? ''; for (const name of this.className.split(/\s+/).filter(Boolean)) this.element.classList.add(name); this.element.classList.add('loading-state'); }
    if ('variant' in options) { const variant = options.variant ?? 'Drive'; this.element.dataset.variant = variant; const delays = variant === 'Orbit' ? [0,110,220,770,null,330,660,550,440] : [90,180,270,0,90,180,90,180,270]; this.element.querySelectorAll<HTMLElement>('.loading-state__pixel').forEach((pixel, index) => { const delay = delays[index]; pixel.style.opacity = delay === null ? '.07' : '.15'; pixel.style.animation = delay === null ? 'none' : `core-loading-pixel ${variant === 'Orbit' ? 950 : 650}ms ease-in-out ${delay}ms infinite`; }); }
  }
  destroy(): void { window.clearInterval(this.interval); }
}
register('LoadingState', '[data-component="loading-state"]', (element) => new LoadingState(element));
