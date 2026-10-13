import { animate, motionValue, press, visualElementStore } from 'motion';
import { emit, register } from './lifecycle';

type Content = Node | string | number | boolean | null;
type Size = 'sm' | 'md' | 'lg';
type Options = { checked?: boolean | null; defaultChecked?: boolean; disabled?: boolean; size?: Size; label?: Content; description?: Content; onCheckedChange?: (checked: boolean) => void };
const spring = { type: 'spring' as const, stiffness: 500, damping: 30, reduceMotion: false };
const sizes = { sm: 16, md: 20, lg: 24 };

class TaskCheckbox {
  private readonly button: HTMLButtonElement;
  private readonly box: HTMLElement;
  private readonly fill: HTMLElement;
  private readonly path: SVGElement;
  private readonly strike: HTMLElement;
  private readonly text: HTMLElement;
  private readonly label: HTMLElement;
  private readonly descriptionId: string;
  private readonly events = new AbortController();
  private readonly reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly disposePress: () => void;
  private readonly animations = new Map<string, ReturnType<typeof animate>>();
  private readonly particles: Array<ReturnType<typeof animate>> = [];
  private options: Options;
  private internalChecked: boolean;
  private controlled: boolean;
  private lastChecked: boolean;
  private firstStroke = true;
  private burstId = 0;
  private burst?: HTMLElement;

  constructor(private readonly element: HTMLElement) {
    this.button = element.querySelector('button')!;
    this.box = element.querySelector('[data-task-box]')!;
    this.fill = element.querySelector('[data-task-fill]')!;
    this.path = element.querySelector('path')!;
    this.strike = element.querySelector('[data-task-strike]')!;
    this.text = element.querySelector('[data-task-text]')!;
    this.label = element.querySelector('[data-task-label]')!;
    this.descriptionId = this.button.getAttribute('aria-describedby') ?? `${this.label.id.replace(/-label$/, '')}-description`;
    this.internalChecked = element.dataset.defaultChecked === 'true';
    this.controlled = element.dataset.controlled === 'true';
    this.options = { size: element.dataset.size as Size, checked: this.controlled ? element.dataset.checked === 'true' : undefined, disabled: this.button.disabled };
    this.lastChecked = this.checked;
    this.button.addEventListener('click', () => this.toggle(), { signal: this.events.signal });
    this.text.addEventListener('click', () => this.toggle(), { signal: this.events.signal });
    this.disposePress = this.reduced ? () => undefined : press(this.button, () => {
      if (this.button.disabled) return;
      this.animations.set('press', animate(this.button, { scale: .9 }, spring));
      return () => this.animations.set('press', animate(this.button, { scale: 1 }, spring));
    });
  }

  private get checked(): boolean { return this.options.checked ?? this.internalChecked; }

  private toggle(): void {
    if (this.button.disabled) return;
    const next = !this.checked;
    if (!this.controlled) this.internalChecked = next;
    this.options.onCheckedChange?.(next);
    this.render();
    if (next && !this.reduced) this.celebrate();
    emit(this.element, 'mautic:task-checkbox:change', { checked: next });
  }

  update(options: Options): void {
    const previousSize = this.options.size;
    this.options = { ...this.options, ...options };
    if ('checked' in options) this.controlled = options.checked !== undefined;
    if ('disabled' in options) this.button.disabled = options.disabled ?? false;
    if ('label' in options) this.content(this.element.querySelector('[data-task-label-content]')!, options.label);
    if ('description' in options) {
      this.text.querySelector('[data-task-description]')?.remove();
      this.text.querySelector('[data-task-zero]')?.remove();
      this.button.removeAttribute('aria-describedby');
      if (options.description) {
        const description = document.createElement('span');
        description.className = 'task-checkbox__description';
        description.dataset.taskDescription = '';
        description.id = this.descriptionId;
        this.content(description, options.description);
        this.text.append(description);
        this.button.setAttribute('aria-describedby', description.id);
      } else if (options.description === 0) {
        const zero = document.createElement('span');
        zero.dataset.taskZero = '';
        zero.textContent = '0';
        this.text.append(zero);
      }
    }
    this.render();
    if (this.burst && previousSize !== this.options.size) this.resizeBurst();
  }

  private content(element: Element, content?: Content): void {
    element.replaceChildren(content instanceof Node ? content.cloneNode(true) : document.createTextNode(content == null || typeof content === 'boolean' ? '' : String(content)));
  }

  private render(): void {
    this.element.dataset.size = this.options.size ?? 'md';
    this.element.dataset.disabled = String(this.button.disabled);
    this.element.dataset.checked = String(this.checked);
    this.button.setAttribute('aria-checked', String(this.checked));
    this.strike.style.transformOrigin = this.checked ? '0% 50%' : '100% 50%';
    if (this.lastChecked === this.checked) return;
    const before = this.lastChecked ? 1 : 0;
    const target = this.checked ? 1 : 0;
    this.animations.set('box', animate(this.box, { scale: this.checked && !this.reduced ? [1, .9, 1.05, 1] : 1 }, this.checked && !this.reduced ? { duration: .4, times: [0, .3, .7, 1], ease: 'easeOut' } : { duration: .15 }));
    this.animations.set('fill', animate(this.fill, { scale: target }, this.reduced ? { duration: 0 } : this.checked ? spring : { duration: .15, ease: 'easeOut' }));
    this.animations.set('strike', animate(this.strike, { scaleX: target }, this.reduced ? { duration: 0 } : { duration: this.checked ? .25 : .15, ease: [.22, 1, .36, 1] }));
    const transition = this.reduced ? { duration: 0 } : this.checked ? { pathLength: { delay: .06, duration: .2, ease: 'easeOut' as const }, opacity: { delay: .06, duration: .01 } } : { duration: .1 };
    if (this.reduced) {
      this.animations.get('stroke')?.stop();
      this.animations.set('stroke', animate(motionValue(before), target, { duration: 0, onUpdate: (value) => {
        this.path.setAttribute('opacity', String(value));
        this.path.setAttribute('stroke-dasharray', `${value}px 1px`);
      } }));
    } else this.animations.set('stroke', animate(this.path, { pathLength: this.firstStroke ? [before, target] : target, opacity: this.firstStroke ? [before, target] : target }, transition));
    if (this.firstStroke && !this.reduced) {
      const visual = visualElementStore.get(this.path);
      visual?.getValue('opacity')?.set(before);
      visual?.getValue('pathLength')?.set(before);
      this.firstStroke = false;
    }
    this.lastChecked = this.checked;
  }

  private celebrate(): void {
    for (const [key, animation] of this.animations) if (key.startsWith('particle-')) { animation.stop(); this.animations.delete(key); }
    for (const animation of this.particles) animation.stop();
    this.particles.length = 0;
    this.burst?.remove();
    const id = ++this.burstId;
    this.burst = document.createElement('span');
    this.burst.className = 'task-checkbox__confetti';
    this.burst.setAttribute('aria-hidden', 'true');
    this.box.append(this.burst);
    const size = sizes[this.options.size ?? 'md'];
    for (let index = 0; index < 6; index++) {
      const dot = document.createElement('span');
      dot.className = 'task-checkbox__particle';
      const diameter = Math.max(3, Math.round(size * .2));
      Object.assign(dot.style, { width: `${diameter}px`, height: `${diameter}px`, backgroundColor: index % 2 === 0 ? '#a3a3a3' : '#10b981', opacity: '1', transform: 'scale(0)' });
      this.burst.append(dot);
      const angle = index / 6 * Math.PI * 2 - Math.PI / 2;
      const distance = size * (index % 2 === 0 ? 1.6 : 1.25);
      const animation = animate(dot, { x: [0, Math.cos(angle) * distance], y: [0, Math.sin(angle) * distance], scale: [0, 1, .3], opacity: [1, 1, 0] }, { duration: .5, ease: 'easeOut' });
      this.particles.push(animation);
      if (index === 5) animation.then(() => {
        if (this.burstId === id && !this.events.signal.aborted) { this.burst?.remove(); this.burst = undefined; }
      });
    }
  }

  private resizeBurst(): void {
    const size = sizes[this.options.size ?? 'md'];
    const id = this.burstId;
    [...this.burst!.children].forEach((element, index) => {
      const dot = element as HTMLElement;
      const diameter = `${Math.max(3, Math.round(size * .2))}px`;
      Object.assign(dot.style, { width: diameter, height: diameter });
      const angle = index / 6 * Math.PI * 2 - Math.PI / 2;
      const distance = size * (index % 2 === 0 ? 1.6 : 1.25);
      const animation = animate(dot, { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance }, { duration: .5, ease: 'easeOut' });
      this.animations.set(`particle-${index}`, animation);
      if (index === 5) animation.then(() => {
        if (this.burstId === id && !this.events.signal.aborted) { this.burst?.remove(); this.burst = undefined; }
      });
    });
  }

  destroy(): void {
    this.events.abort();
    this.disposePress();
    for (const animation of this.animations.values()) animation.stop();
    for (const animation of this.particles) animation.stop();
  }
}

register('TaskCheckbox', '[data-component="task-checkbox"]', (element) => new TaskCheckbox(element));
