import { animate, motionValue } from 'motion';
import { emit, register } from './lifecycle';

type Icon = Node | string | number | boolean | null;
type Size = 'sm' | 'md' | 'lg';
type Options = { checked?: boolean | null; defaultChecked?: boolean; size?: Size; disabled?: boolean; label?: string; onIcon?: Icon; offIcon?: Icon; onCheckedChange?: (checked: boolean) => void };
type Gesture = { pointerId: number; originClientX: number; originKnobX: number; dragging: boolean; samples: Array<{ x: number; time: number }> };
const sizes = { sm: [32, 18, 8], md: [44, 24, 10], lg: [56, 30, 12] } as const;
const spring = { type: 'spring' as const, stiffness: 500, damping: 30, reduceMotion: false };
const iconSpring = { type: 'spring' as const, stiffness: 260, damping: 22, reduceMotion: false };
const clamp = (value: number, maximum: number): number => Math.min(Math.max(value, 0), maximum);

class AnimatedSwitch {
  private readonly knob: HTMLElement;
  private readonly events = new AbortController();
  private readonly motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly reduced: boolean;
  private readonly icons = new Map<string, { element: HTMLElement; content?: Icon; animation?: ReturnType<typeof animate> }>();
  private options: Options;
  private internalChecked: boolean;
  private controlled: boolean;
  private pressed = false;
  private dragX: number | null = null;
  private gesture: Gesture | null = null;
  private suppressClick = false;
  private knobAnimation?: ReturnType<typeof animate>;
  private activeKey?: string;
  private shell?: HTMLElement;
  private lastKnob?: string;

  constructor(private readonly element: HTMLButtonElement) {
    this.knob = element.querySelector('[data-switch-knob]')!;
    this.reduced = this.motion.matches;
    this.internalChecked = element.dataset.defaultChecked === 'true';
    this.controlled = element.dataset.controlled === 'true';
    this.options = { size: element.dataset.size as Size, checked: this.controlled ? element.dataset.checked === 'true' : undefined, disabled: element.disabled };
    for (const key of ['on', 'off'] as const) {
      const template = element.querySelector<HTMLTemplateElement>(`template[data-icon-${key}]`);
      if (template) this.options[key === 'on' ? 'onIcon' : 'offIcon'] = template.content.cloneNode(true);
    }
    const listeners = { signal: this.events.signal };
    this.shell = this.knob.querySelector<HTMLElement>('.animated-switch__icons') ?? undefined;
    const initialIcon = this.shell?.querySelector<HTMLElement>('[data-icon-key]');
    if (initialIcon) {
      this.activeKey = initialIcon.dataset.iconKey;
      this.icons.set(this.activeKey!, { element: initialIcon });
    }
    element.addEventListener('click', () => {
      if (element.disabled) return;
      if (this.suppressClick) { this.suppressClick = false; return; }
      this.commit(!this.checked);
    }, listeners);
    element.addEventListener('pointerdown', (event) => {
      if (element.disabled || !event.isPrimary) return;
      this.suppressClick = false;
      element.setPointerCapture(event.pointerId);
      const dimensions = this.dimensions;
      const width = this.reduced ? dimensions.knob : dimensions.stretched;
      this.gesture = { pointerId: event.pointerId, originClientX: event.clientX, originKnobX: this.checked ? dimensions.inner - width : 0, dragging: false, samples: [{ x: event.clientX, time: event.timeStamp }] };
      this.pressed = true;
      this.render();
    }, listeners);
    element.addEventListener('pointermove', (event) => {
      const gesture = this.gesture;
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      gesture.samples.push({ x: event.clientX, time: event.timeStamp });
      if (gesture.samples.length > 5) gesture.samples.shift();
      const delta = event.clientX - gesture.originClientX;
      if (!gesture.dragging && Math.abs(delta) < 3) return;
      gesture.dragging = true;
      this.dragX = gesture.originKnobX + delta;
      this.render();
    }, listeners);
    element.addEventListener('pointerup', (event) => {
      const gesture = this.gesture;
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      if (gesture.dragging) {
        this.suppressClick = true;
        const dimensions = this.dimensions;
        const width = this.reduced ? dimensions.knob : dimensions.stretched;
        const end = clamp(gesture.originKnobX + event.clientX - gesture.originClientX, dimensions.inner - width);
        const oldest = gesture.samples[0];
        const elapsed = event.timeStamp - oldest.time;
        const velocity = elapsed > 0 ? (event.clientX - oldest.x) / elapsed * 1000 : 0;
        const next = Math.abs(velocity) >= 250 ? velocity > 0 : end + width / 2 > dimensions.inner / 2;
        if (next !== this.checked) this.commit(next, false);
      }
      this.endGesture(event);
    }, listeners);
    element.addEventListener('pointercancel', (event) => this.endGesture(event), listeners);
    this.render(true);
  }

  private get checked(): boolean { return this.options.checked ?? this.internalChecked; }

  private get dimensions(): { width: number; height: number; icon: number; knob: number; stretched: number; inner: number } {
    const [width, height, icon] = sizes[this.options.size ?? 'md'];
    return { width, height, icon, knob: height - 4, stretched: Math.round((height - 4) * 1.35), inner: width - 4 };
  }

  private commit(next: boolean, render = true): void {
    if (!this.controlled) this.internalChecked = next;
    if (render) this.render();
    this.options.onCheckedChange?.(next);
    emit(this.element, 'mautic:animated-switch:change', { checked: next });
  }

  private endGesture(event: PointerEvent): void {
    this.gesture = null;
    if (this.element.hasPointerCapture(event.pointerId)) this.element.releasePointerCapture(event.pointerId);
    this.pressed = false;
    this.dragX = null;
    this.render();
  }

  update(options: Options): void {
    this.options = { ...this.options, ...options };
    if ('checked' in options) this.controlled = options.checked !== undefined;
    if ('disabled' in options) this.element.disabled = options.disabled ?? false;
    if (options.label !== undefined) this.element.setAttribute('aria-label', options.label);
    this.render();
  }

  private render(initial = false): void {
    const dimensions = this.dimensions;
    this.element.style.width = `${dimensions.width}px`;
    this.element.style.height = `${dimensions.height}px`;
    this.element.dataset.checked = String(this.checked);
    this.element.setAttribute('aria-checked', String(this.checked));
    const width = this.pressed && !this.reduced ? dimensions.stretched : dimensions.knob;
    const maximum = dimensions.inner - width;
    const position = this.dragX !== null ? clamp(this.dragX, maximum) : this.checked ? maximum : 0;
    this.knob.style.height = `${dimensions.knob}px`;
    const target = `${position}:${width}`;
    if (target !== this.lastKnob) {
      if (initial) { this.knob.style.width = `${width}px`; this.knob.style.transform = position ? `translateX(${position}px)` : 'none'; }
      else this.knobAnimation = animate(this.knob, { x: position, width }, this.reduced ? { duration: 0 } : spring);
      this.lastKnob = target;
    }
    this.renderIcons(initial);
  }

  private renderIcons(initial: boolean): void {
    const hasIcons = this.options.onIcon != null || this.options.offIcon != null;
    if (!hasIcons) {
      for (const icon of this.icons.values()) icon.animation?.stop();
      this.icons.clear();
      this.shell?.remove();
      this.shell = undefined;
      this.activeKey = undefined;
      return;
    }
    const fresh = !this.shell;
    if (!this.shell) {
      this.shell = document.createElement('span');
      this.shell.className = 'animated-switch__icons';
      this.knob.append(this.shell);
    }
    const content = this.checked ? this.options.onIcon : this.options.offIcon;
    const key = content != null ? (this.checked ? 'on' : 'off') : undefined;
    const previous = this.activeKey;
    this.activeKey = key;
    if (previous !== key && previous !== undefined) {
      const icon = this.icons.get(previous)!;
      const animation = this.reduced ? this.instantOpacity(icon, 0) : animate(icon.element, { opacity: 0, rotate: 45, scale: .5 }, iconSpring);
      icon.animation = animation;
      animation.then(() => {
        if (this.activeKey !== previous && icon.animation === animation) { icon.element.remove(); this.icons.delete(previous); }
      });
    }
    if (key !== undefined) {
      let icon = this.icons.get(key);
      const entering = !icon;
      if (!icon) {
        const element = document.createElement('span');
        element.className = 'animated-switch__icon';
        this.shell.append(element);
        icon = { element };
        this.icons.set(key, icon);
      }
      if (icon.content !== content) {
        icon.element.replaceChildren(content instanceof Node ? content.cloneNode(true) : document.createTextNode(typeof content === 'boolean' ? '' : String(content)));
        icon.content = content;
      }
      const size = `${this.dimensions.icon}px`;
      Object.assign(icon.element.style, { width: size, height: size, fontSize: size, lineHeight: '1' });
      if (initial || fresh) { icon.element.style.opacity = '1'; icon.element.style.transform = 'none'; }
      else if (previous !== key) {
        if (entering) { icon.element.style.opacity = '0'; icon.element.style.transform = this.reduced ? 'none' : 'rotate(-45deg) scale(0.5)'; }
        icon.animation = this.reduced ? this.instantOpacity(icon, 1) : animate(icon.element, entering ? { opacity: [0, 1], rotate: [-45, 0], scale: [.5, 1] } : { opacity: 1, rotate: 0, scale: 1 }, iconSpring);
      }
    }
  }

  private instantOpacity(icon: { element: HTMLElement; animation?: ReturnType<typeof animate> }, opacity: number): ReturnType<typeof animate> {
    icon.animation?.stop();
    return animate(motionValue(Number(icon.element.style.opacity)), opacity, { duration: 0, onUpdate: (value) => { icon.element.style.opacity = String(value); } });
  }

  destroy(): void {
    this.events.abort();
    this.knobAnimation?.stop();
    for (const icon of this.icons.values()) icon.animation?.stop();
  }
}

register('AnimatedSwitch', '[data-component="animated-switch"]', (element) => new AnimatedSwitch(element as HTMLButtonElement));
