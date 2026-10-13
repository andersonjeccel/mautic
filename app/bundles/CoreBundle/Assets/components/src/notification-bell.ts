import { animate, press } from 'motion';
import { emit, reducedMotion, register } from './lifecycle';
type Options = { count?: number; max?: number; dot?: boolean; ringOnMount?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string; ariaLabel?: string | null; announcement?: string | null; onClick?: (event: MouseEvent) => void };
const badgeSpring = { type: 'spring' as const, stiffness: 500, damping: 22, reduceMotion: false };
const countSpring = { type: 'spring' as const, stiffness: 400, damping: 30, reduceMotion: false };
const tapSpring = { type: 'spring' as const, stiffness: 500, damping: 30, reduceMotion: false };
const times = [0, .1, .26, .42, .58, .74, .88, 1];
class NotificationBell {
  private options: Options;
  private indicator?: HTMLElement;
  private digit?: HTMLElement;
  private readonly exiting = new Map<boolean, HTMLElement>();
  private direction = 1;
  private ringing = false;
  private bellAnimations: ReturnType<typeof animate>[] = [];

  private readonly animations = new Set<ReturnType<typeof animate>>();
  private readonly stops: (() => void)[] = [];
  private readonly click = (event: Event) => { this.options.onClick?.(event as MouseEvent); emit(this.element, 'mautic:notification-bell:click', { count: this.options.count ?? 0 }); };
  constructor(private readonly element: HTMLElement) {
    this.options = { className: element.dataset.className, size: element.dataset.size as Options['size'], count: Number(element.dataset.count), max: Number(element.dataset.max), dot: element.dataset.dot === 'true', ringOnMount: element.dataset.ringOnMount === 'true', ariaLabel: element.dataset.customLabel, announcement: element.dataset.customAnnouncement };
    this.element.addEventListener('click', this.click);
    this.stops.push(press(element, () => { if (!reducedMotion()) this.track(animate(element, { scale: .94 }, tapSpring)); return () => { if (!reducedMotion()) this.track(animate(element, { scale: 1 }, tapSpring)); }; }));
    this.indicator = element.querySelector<HTMLElement>('[data-bell-indicator]') ?? undefined;
    this.digit = this.indicator?.querySelector<HTMLElement>('.notification-bell__digit') ?? undefined;
    if (this.digit) this.digit.dataset.value = this.digit.textContent!;
    if (this.indicator) this.indicator.dataset.initial = 'true';
    this.render(true);
    if (this.options.ringOnMount) this.ring();
  }
  private track(animation: ReturnType<typeof animate>): void { this.animations.add(animation); animation.then(() => this.animations.delete(animation)); }
  private rotate(element: HTMLElement | SVGElement, values: number[]): ReturnType<typeof animate> {
    const animation = animate(0, values, { duration: .9, times, ease: 'easeInOut', onUpdate: (value) => { element.style.transform = value === 0 ? 'none' : `rotate(${value}deg)`; } });
    this.track(animation); return animation;
  }
  private ring(): void {
    this.ringing = true;
    if (reducedMotion()) return;
    for (const animation of this.bellAnimations) { animation.stop(); this.animations.delete(animation); }
    const previous = this.element.querySelector<HTMLElement>('[data-bell]')!;
    const bell = previous.cloneNode(true) as HTMLElement;
    bell.style.transform = 'none'; bell.querySelector<SVGElement>('[data-clapper]')!.style.transform = 'none'; previous.replaceWith(bell);
    bell.querySelector<SVGElement>('[data-clapper]')!.style.transformOrigin = '50% 50%';
    this.bellAnimations = [this.rotate(bell, [0, 15, -12, 8, -5, 3, -1.5, 0]), this.rotate(bell.querySelector<SVGElement>('[data-clapper]')!, [0, -17, 14, -10, 6, -3.5, 2, 0])];
    this.ping();
  }
  private ping(): void {
    if (!this.indicator || !this.options.dot || !this.ringing || reducedMotion()) return;
    this.indicator.querySelector('.notification-bell__ping')?.remove();
    const halo = document.createElement('span'); halo.className = 'notification-bell__ping'; halo.style.opacity = '.6'; this.indicator.prepend(halo);
    if (this.indicator.dataset.initial === 'true') { halo.style.opacity = '0'; halo.style.transform = 'scale(2)'; return; }
    this.track(animate(halo, { scale: [1, 2], opacity: [.6, 0] }, { duration: .9, ease: 'easeOut', reduceMotion: false }));
  }
  private createIndicator(initial: boolean): void {
    const exiting = this.exiting.get(Boolean(this.options.dot));
    if (exiting) {
      this.exiting.delete(Boolean(this.options.dot)); this.indicator = exiting;
      this.digit = exiting.querySelector<HTMLElement>('.notification-bell__digit:not(.notification-bell__digit--exit)') ?? undefined;
      this.track(animate(exiting, { scale: 1 }, badgeSpring));
      if (!this.options.dot) this.renderDigit(false);
      return;
    }
    const indicator = document.createElement('span'); indicator.setAttribute('aria-hidden', 'true'); indicator.dataset.bellIndicator = '';
    indicator.className = this.options.dot ? 'notification-bell__dot' : 'notification-bell__badge';
    this.indicator = indicator; this.digit = undefined;
    if (this.options.dot) { const core = document.createElement('span'); core.className = 'notification-bell__dot-core'; indicator.append(core); }
    else { const wrapper = document.createElement('span'); wrapper.className = 'notification-bell__digits'; indicator.append(wrapper); this.renderDigit(true); }
    this.element.insertBefore(indicator, this.element.querySelector('[role="status"]'));
    if (!initial && !reducedMotion()) { indicator.style.transform = 'scale(0)'; this.track(animate(indicator, { scale: [0, 1] }, badgeSpring)); }
    if (this.options.dot) this.ping();
  }
  private renderDigit(initial: boolean): void {
    const count = this.options.count ?? 0; const max = this.options.max ?? 99;
    const value = count > max ? `${max}+` : String(count);
    if (this.digit?.textContent === value) return;
    const previous = this.digit;
    const wrapper = this.indicator!.querySelector<HTMLElement>('.notification-bell__digits')!;
    if (previous) {
      previous.classList.add('notification-bell__digit--exit'); previous.dataset.complete = 'false';
      if (reducedMotion()) previous.remove();
      else this.track(animate(previous, { y: this.direction * -10, opacity: 0 }, { ...countSpring, onComplete: () => { if (previous.classList.contains('notification-bell__digit--exit')) { previous.dataset.complete = 'true'; const exits = [...wrapper.querySelectorAll<HTMLElement>('.notification-bell__digit--exit')]; if (exits.every(element => element.dataset.complete === 'true')) for (const element of exits) element.remove(); } } }));
    }
    const existing = [...wrapper.querySelectorAll<HTMLElement>('.notification-bell__digit--exit')].find(element => element.dataset.value === value);
    const digit = existing ?? document.createElement('span'); digit.className = 'notification-bell__digit'; digit.textContent = value; digit.dataset.value = value; if (!existing) wrapper.append(digit); this.digit = digit;
    if (existing && !reducedMotion()) { this.track(animate(digit, { y: 0, opacity: 1 }, countSpring)); return; }
    if (!initial && !reducedMotion()) { digit.style.opacity = '0'; digit.style.transform = `translateY(${this.direction * 10}px)`; this.track(animate(digit, { y: [this.direction * 10, 0], opacity: [0, 1] }, countSpring)); }
  }
  private render(initial = false): void {
    const count = this.options.count ?? 0;
    this.element.setAttribute('aria-label', this.options.ariaLabel ?? (count > 0 ? this.element.dataset.labelUnread!.replace('%count%', String(count)) : this.element.dataset.labelZero!));
    this.element.querySelector('[role="status"]')!.textContent = this.options.announcement ?? (count > 0 ? (count === 1 ? this.element.dataset.announceOne! : this.element.dataset.announceMany!).replace('%count%', String(count)) : '');
    if (this.indicator && (count <= 0 || this.indicator.classList.contains('notification-bell__dot') !== Boolean(this.options.dot))) {
      const previous = this.indicator; delete previous.dataset.initial; const key = previous.classList.contains('notification-bell__dot'); this.exiting.set(key, previous); this.indicator = undefined; this.digit = undefined;
      if (reducedMotion()) { previous.remove(); this.exiting.delete(key); } else this.track(animate(previous, { scale: 0 }, { ...badgeSpring, onComplete: () => { if (this.exiting.get(key) === previous) { previous.remove(); this.exiting.delete(key); } } }));
    }
    if (count > 0) { if (!this.indicator) this.createIndicator(initial); else if (!this.options.dot) this.renderDigit(false); }
  }
  update(options: Options): void {
    const previous = this.options.count ?? 0; const oldSize = this.options.size ?? 'md'; const oldClassName = this.options.className ?? ''; this.options = { ...this.options, ...options };
    if ('className' in options) { for (const name of oldClassName.split(/\s+/).filter(Boolean)) this.element.classList.remove(name); for (const name of (this.options.className ?? '').split(/\s+/).filter(Boolean)) this.element.classList.add(name); this.element.classList.add('notification-bell', `notification-bell--${this.options.size ?? 'md'}`); }
    const count = this.options.count ?? 0; this.direction = count >= previous ? 1 : -1;
    if ('size' in options) { const size = this.options.size ?? 'md'; this.element.classList.remove(`notification-bell--${oldSize}`); this.element.classList.add(`notification-bell--${size}`); const icon = size === 'sm' ? 16 : size === 'lg' ? 24 : 20; const svg = this.element.querySelector('svg')!; svg.setAttribute('width', String(icon)); svg.setAttribute('height', String(icon)); }
    this.render(); if (count > previous) this.ring();
  }
  destroy(): void { for (const animation of this.animations) animation.stop(); for (const stop of this.stops) stop(); this.element.removeEventListener('click', this.click); }
}
register('NotificationBell', '[data-component="notification-bell"]', (element) => new NotificationBell(element));
