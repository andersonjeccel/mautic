import { animate } from 'motion';
import { emit, reducedMotion, register } from './lifecycle';

type Options = {
  value?: number | null;
  max?: number;
  transition?: Parameters<typeof animate>[2];
  getValueLabel?: (value: number, max: number) => string;
};

class AnimatedProgress {
  private readonly indicator: HTMLElement;
  private value: number | null;
  private maximum: number;
  private transition: Options['transition'];
  private getValueLabel?: Options['getValueLabel'];
  private animation?: { stop(): void };

  constructor(private readonly element: HTMLElement) {
    this.indicator = element.querySelector('[data-slot="progress-indicator"]')!;
    this.value = element.dataset.value === '' ? null : Number(element.dataset.value);
    this.maximum = Number(element.dataset.max);
    this.transition = JSON.parse(element.dataset.transition!);
    this.render();
  }

  update(options: Options): void {
    if (options.max !== undefined) this.maximum = Number.isFinite(options.max) && options.max > 0 ? options.max : 100;
    if ('value' in options) this.value = options.value ?? null;
    if (options.transition !== undefined) this.transition = options.transition;
    if ('getValueLabel' in options) this.getValueLabel = options.getValueLabel;
    if (this.value !== null && (!Number.isFinite(this.value) || this.value < 0 || this.value > this.maximum)) this.value = null;
    this.render();
    emit(this.element, 'mautic:animated-progress:change', { value: this.value, max: this.maximum });
  }

  private render(): void {
    const state = this.value === null ? 'indeterminate' : this.value === this.maximum ? 'complete' : 'loading';
    this.element.dataset.state = state;
    this.element.dataset.value = this.value === null ? '' : String(this.value);
    this.element.dataset.max = String(this.maximum);
    this.indicator.dataset.state = state;
    this.indicator.dataset.max = String(this.maximum);
    this.element.setAttribute('aria-valuemax', String(this.maximum));
    if (this.value === null) {
      this.element.removeAttribute('aria-valuenow');
      this.element.removeAttribute('aria-valuetext');
      delete this.indicator.dataset.value;
    } else {
      this.indicator.dataset.value = String(this.value);
      this.element.setAttribute('aria-valuenow', String(this.value));
      this.element.setAttribute('aria-valuetext', this.getValueLabel?.(this.value, this.maximum) ?? `${Math.round(this.value / this.maximum * 100)}%`);
    }
    this.animation?.stop();
    this.animation = animate(this.indicator, { x: `-${100 - (this.value || 0)}%` }, reducedMotion() ? { duration: 0 } : this.transition);
  }

  destroy(): void {
    this.animation?.stop();
  }
}

register('AnimatedProgress', '[data-component="animated-progress"]', (element) => new AnimatedProgress(element));
