import { animate, hover, press } from 'motion';
import { register } from './lifecycle';
type Options = { hoverScale?: number; tapScale?: number; disabled?: boolean };
const spring = { type: 'spring' as const, stiffness: 550, damping: 30, restSpeed: 10, reduceMotion: false };
class AnimatedButton {
  private options: Options;
  private hovering = false;
  private pressing = false;

  private readonly disposers: (() => void)[];
  private animation?: ReturnType<typeof animate>;
  constructor(private readonly element: HTMLElement) {
    this.options = { hoverScale: Number(element.dataset.hoverScale), tapScale: Number(element.dataset.tapScale) };
    this.disposers = [
      hover(element, () => { this.hovering = true; this.render(); return () => { this.hovering = false; this.render(); }; }),
      press(element, () => { this.pressing = true; this.render(); return () => { this.pressing = false; this.render(); }; })
    ];
  }
  private render(): void {
    const target = this.pressing ? this.options.tapScale : this.hovering ? this.options.hoverScale : 1;

    this.animation = animate(this.element, { scale: target ?? 1 }, { ...spring, damping: target === 0 ? 2 * Math.sqrt(spring.stiffness) : spring.damping });
  }
  update(options: Options): void {
    this.options = { ...this.options, ...options };
    if ('disabled' in options) {
      if (options.disabled) this.element.setAttribute('disabled', '');
      else this.element.removeAttribute('disabled');
    }
    if (this.hovering || this.pressing) this.render();
  }
  destroy(): void { for (const dispose of this.disposers) dispose(); this.animation?.stop(); }
}
register('AnimatedButton', '[data-component="animated-button"]', (element) => new AnimatedButton(element));
