import { animate, press } from 'motion';
import { emit, register } from './lifecycle';

type Options = { pressed?: boolean | null; defaultPressed?: boolean; disabled?: boolean; size?: 'default' | 'sm' | 'lg' | 'icon' | null; variant?: 'default' | 'outline' | null; onPressedChange?: (pressed: boolean) => void; onClick?: (event: Event) => void };
const spring = { type: 'spring' as const, stiffness: 550, damping: 30, restSpeed: 10, reduceMotion: false };
const fade = { duration: .3, ease: [.25, .1, .35, 1] as [number, number, number, number], reduceMotion: false };

class AnimatedToggle {
  private readonly events = new AbortController();
  private readonly items: HTMLElement[];
  private readonly template: HTMLTemplateElement | null;
  private readonly disposePress: () => void;
  private options: Options;
  private internalRoot: boolean;
  private contextPressed: boolean | null | undefined;
  private controlled: boolean;
  private highlight?: HTMLElement;
  private highlightAnimation?: ReturnType<typeof animate>;
  private pressAnimation?: ReturnType<typeof animate>;
  private showing = false;

  constructor(private readonly element: HTMLButtonElement) {
    this.items = [...element.querySelectorAll<HTMLElement>('[data-slot="toggle-item"]')];
    this.template = element.querySelector('template[data-toggle-highlight-template]');
    this.controlled = element.dataset.controlled === 'true';
    this.internalRoot = element.dataset.defaultPressed === 'true';
    this.contextPressed = element.dataset.contextDefined === 'true' ? element.dataset.contextNull === 'true' ? null : element.dataset.contextPressed === 'true' : undefined;
    this.options = { pressed: this.controlled ? element.hasAttribute('aria-pressed') ? element.dataset.rootPressed === 'true' : null : undefined, disabled: element.dataset.disabledDefined === 'true' ? element.disabled : undefined };
    this.highlight = element.querySelector<HTMLElement>('[data-slot="toggle-highlight"]') ?? undefined;
    this.showing = Boolean(this.highlight);
    const listeners = { signal: this.events.signal };
    for (const item of this.items) item.addEventListener('click', (event) => this.options.onClick?.(event), listeners);
    element.addEventListener('click', (event) => {
      if (!this.items.length) this.options.onClick?.(event);
      if (event.defaultPrevented || element.disabled) return;
      const next = !this.rootPressed;
      if (!this.controlled) this.internalRoot = next;
      this.setContext(next);
    }, listeners);
    this.disposePress = press(element, () => {
      if (element.disabled) return;
      this.pressAnimation = animate(element, { scale: .95 }, spring);
      return () => { this.pressAnimation = animate(element, { scale: 1 }, spring); };
    });
    if (this.highlight) this.highlightAnimation = animate(this.highlight, { opacity: [0, 1] }, fade);
  }

  private get rootPressed(): boolean | null { return this.controlled ? this.options.pressed ?? null : this.internalRoot; }

  getContext(): { isPressed: boolean | null | undefined; disabled?: boolean; setIsPressed: (pressed: boolean) => void } {
    return { isPressed: this.contextPressed, disabled: this.options.disabled, setIsPressed: (pressed) => this.setContext(pressed) };
  }

  private setContext(pressed: boolean): void {
    this.contextPressed = pressed;
    this.render();
    this.options.onPressedChange?.(pressed);
    emit(this.element, 'mautic:animated-toggle:change', { pressed });
  }

  update(options: Options): void {
    const previousPressed = this.options.pressed;
    this.options = { ...this.options, ...options };
    if ('pressed' in options) {
      this.controlled = options.pressed !== undefined;
      if (options.pressed !== undefined && options.pressed !== previousPressed) this.contextPressed = options.pressed;
    }
    if ('disabled' in options) this.element.disabled = options.disabled ?? false;
    if ('size' in options) this.element.dataset.size = options.size === null ? 'none' : options.size ?? 'default';
    if ('variant' in options) this.element.dataset.variant = options.variant === null ? 'none' : options.variant ?? 'default';
    this.render();
  }

  private render(): void {
    const root = this.rootPressed;
    if (root === null) this.element.removeAttribute('aria-pressed');
    else this.element.setAttribute('aria-pressed', String(root));
    this.element.dataset.state = root ? 'on' : 'off';
    if (this.element.disabled) this.element.dataset.disabled = '';
    else this.element.removeAttribute('data-disabled');
    for (const item of this.items) {
      if (this.contextPressed == null) item.removeAttribute('aria-pressed');
      else item.setAttribute('aria-pressed', String(this.contextPressed));
      item.dataset.state = this.contextPressed ? 'on' : 'off';
      if (this.options.disabled !== undefined) item.dataset.disabled = String(this.element.disabled);
      else item.removeAttribute('data-disabled');
    }
    const target = Boolean(this.contextPressed);
    if (target && !this.highlight && this.template) {
      this.highlight = this.template.content.firstElementChild!.cloneNode(true) as HTMLElement;
      this.element.prepend(this.highlight);
      this.highlight.style.opacity = '0';
    }
    if (target && this.highlight) {
      if (this.options.disabled !== undefined) this.highlight.dataset.disabled = String(this.element.disabled);
      else this.highlight.removeAttribute('data-disabled');
    }
    if (target === this.showing) return;
    this.showing = target;
    if (!this.highlight) return;
    const element = this.highlight!;
    const animation = animate(element, { opacity: target ? 1 : 0 }, fade);
    this.highlightAnimation = animation;
    if (!target) animation.then(() => {
      if (!this.showing && this.highlightAnimation === animation && !this.events.signal.aborted) { element.remove(); this.highlight = undefined; }
    });
  }

  destroy(): void {
    this.events.abort();
    this.disposePress();
    this.highlightAnimation?.stop();
    this.pressAnimation?.stop();
  }
}

register('AnimatedToggle', '[data-component="animated-toggle"]', (element) => new AnimatedToggle(element as HTMLButtonElement));
