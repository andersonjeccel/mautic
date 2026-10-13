import { emit, register } from './lifecycle';
type Options = {
  used: number;
  limit: number;
  resetsInSeconds?: number;
  upgradeLabel?: string;
  variant?: 'Banner' | 'Compact';
  className?: string;
  onUpgrade?: (event: MouseEvent) => void;
};
const zap =
  'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z';
class QuotaBanner {
  private options: Options;
  private remaining = 0;
  private interval?: number;
  private readonly upgrade = (event: Event): void => {
    if (!(event.target as Element).closest('[data-upgrade]')) return;
    this.options.onUpgrade?.(event as MouseEvent);
    emit(this.element, 'mautic:quota-banner:upgrade', {
      used: this.options.used,
      limit: this.options.limit,
    });
  };
  constructor(private readonly element: HTMLElement) {
    this.options = JSON.parse(element.dataset.options!) as Options;
    this.element.addEventListener('click', this.upgrade);
    const fill = element.querySelector<HTMLElement>('[data-fill]')!;
    fill.style.transition = 'none';
    this.countdown();
    this.render();
    fill.getBoundingClientRect();
    fill.style.removeProperty('transition');
  }
  private node(tag: string, className: string, marker?: string): HTMLElement {
    const node = document.createElement(tag);
    node.className = className;
    if (marker) node.setAttribute(marker, '');
    return node;
  }
  private texts(element: Element, parts: string[]): void {
    const nodes = [...element.childNodes].filter(
      (node) => node.nodeType === Node.TEXT_NODE,
    );
    if (nodes.length !== parts.length) {
      for (const node of nodes) node.remove();
      const anchor = element.querySelector('[data-countdown]');
      for (const part of parts)
        element.insertBefore(document.createTextNode(part), anchor);
    } else
      parts.forEach((part, index) => {
        if (nodes[index].nodeValue !== part) nodes[index].nodeValue = part;
      });
  }
  private structure(): void {
    this.element.replaceChildren();
    const track = this.node('span', 'quota-banner__track', 'data-track');
    track.setAttribute('aria-hidden', 'true');
    track.append(this.node('span', 'quota-banner__fill', 'data-fill'));
    if (this.options.variant === 'Compact') {
      this.element.removeAttribute('role');
      this.element.append(
        this.node('span', 'quota-banner__usage', 'data-usage'),
        track,
      );
    } else {
      this.element.setAttribute('role', 'status');
      const badge = this.node('span', 'quota-banner__badge');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (const [name, value] of Object.entries({
        xmlns: 'http://www.w3.org/2000/svg',
        width: '24',
        height: '24',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true',
        class: 'quota-banner__icon',
      }))
        svg.setAttribute(name, value);
      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path',
      );
      path.setAttribute('d', zap);
      svg.append(path);
      badge.append(svg);
      const copy = this.node('div', 'quota-banner__copy');
      const meta = this.node('p', 'quota-banner__meta', 'data-meta');
      meta.append(track);
      copy.append(
        this.node('p', 'quota-banner__heading', 'data-heading'),
        meta,
      );
      const button = this.node(
        'button',
        'quota-banner__upgrade',
        'data-upgrade',
      ) as HTMLButtonElement;
      button.type = 'button';
      this.element.append(badge, copy, button);
    }
  }
  private countdown(): void {
    if (this.interval !== undefined) window.clearInterval(this.interval);
    this.interval = undefined;
    this.remaining = this.options.resetsInSeconds ?? 0;
    if (this.options.resetsInSeconds)
      this.interval = window.setInterval(() => {
        const next = Math.max(0, this.remaining - 1);
        if (!Object.is(next, this.remaining)) {
          this.remaining = next;
          this.render();
        }
      }, 1000);
  }
  private render(): void {
    const compact = this.options.variant === 'Compact';
    const exhausted = this.options.used >= this.options.limit;
    this.element.dataset.exhausted = String(exhausted);
    this.element.querySelector<HTMLElement>('[data-fill]')!.style.width =
      `${Math.min(1, this.options.used / this.options.limit) * 100}%`;
    const usage = this.element.querySelector(
      compact ? '[data-usage]' : '[data-meta]',
    )!;
    this.texts(usage, [
      String(this.options.used),
      '/',
      String(this.options.limit),
    ]);
    const heading = this.element.querySelector('[data-heading]');
    if (heading) {
      const label = exhausted
        ? this.element.dataset.reached!
        : this.element.dataset.left!.replace(
            '%remaining%',
            String(this.options.limit - this.options.used),
          );
      if (heading.textContent !== label) heading.textContent = label;
    }
    const button = this.element.querySelector('[data-upgrade]');
    const upgradeLabel =
      this.options.upgradeLabel ?? this.element.dataset.defaultUpgrade!;
    if (button && button.textContent !== upgradeLabel)
      button.textContent = upgradeLabel;
    let counter = this.element.querySelector('[data-countdown]');
    if (this.options.resetsInSeconds !== undefined) {
      if (!counter) {
        counter = this.node(
          'span',
          compact ? 'quota-banner__countdown' : '',
          'data-countdown',
        );
        (compact ? this.element : usage).append(counter);
      }
      const value = `${Math.floor(this.remaining / 60)}:${String(this.remaining % 60).padStart(2, '0')}`;
      this.texts(
        counter,
        compact
          ? [value]
          : [
              this.element.dataset.resetPrefix!.replace(
                '%separator%',
                '\u00b7',
              ),
              value,
            ],
      );
    } else counter?.remove();
  }
  update(options: Partial<Options>): void {
    const old = this.options;
    this.options = { ...old, ...options };
    if ('className' in options) {
      for (const name of (old.className ?? '').split(/\s+/).filter(Boolean))
        this.element.classList.remove(name);
      for (const name of (this.options.className ?? '')
        .split(/\s+/)
        .filter(Boolean))
        this.element.classList.add(name);
      this.element.classList.add('quota-banner');
    }
    if ((old.variant === 'Compact') !== (this.options.variant === 'Compact')) {
      this.element.dataset.variant = this.options.variant ?? 'Banner';
      this.structure();
    }
    if (!Object.is(old.resetsInSeconds, this.options.resetsInSeconds))
      this.countdown();
    this.render();
  }
  destroy(): void {
    if (this.interval !== undefined) window.clearInterval(this.interval);
    this.element.removeEventListener('click', this.upgrade);
  }
}
register(
  'QuotaBanner',
  '[data-component="quota-banner"]',
  (element) => new QuotaBanner(element),
);
