import { register } from './lifecycle';
type Insight = {
  id: string;
  label: string;
  value: string;
  change?: number | null;
  spark?: number[];
  note?: string;
};
type Options = {
  insights: Insight[];
  variant?: 'Grid' | 'Row';
  className?: string;
};
type Card = {
  element: HTMLElement;
  spark?: HTMLElement;
  trend?: HTMLElement;
  positive?: boolean;
  note?: HTMLElement;
};
class InsightCards {
  private options: Options;
  private cards = new Map<string, Card>();
  constructor(private element: HTMLElement) {
    this.options = JSON.parse(element.dataset.options!) as Options;
    for (const node of element.querySelectorAll(':scope>.insight-cards__card'))
      node.remove();
    element.className = `insight-cards ${this.options.className ?? ''}`;
    this.render();
  }
  private clone(name: string): HTMLElement {
    return (
      this.element
        .querySelector<HTMLTemplateElement>(
          `template[data-prototype="${name}"]`,
        )!
        .content.cloneNode(true) as DocumentFragment
    ).firstElementChild as HTMLElement;
  }
  private text(element: Element, value: string): void {
    if (element.textContent !== value) element.textContent = value;
  }
  private render(): void {
    this.element.dataset.variant =
      this.options.variant === undefined || this.options.variant === 'Grid'
        ? 'Grid'
        : 'Row';
    const ids = new Set(this.options.insights.map((insight) => insight.id));
    for (const [id, card] of this.cards)
      if (!ids.has(id)) {
        card.element.remove();
        this.cards.delete(id);
      }
    const positions = new Map(
      [...this.element.querySelectorAll(':scope>.insight-cards__card')].map(
        (node, index) => [node, index],
      ),
    );
    const ordered = this.options.insights.map((insight) => {
      let card = this.cards.get(insight.id);
      if (!card) {
        card = { element: this.clone('card') };
        this.cards.set(insight.id, card);
      }
      this.text(card.element.querySelector('[data-label]')!, insight.label);
      this.text(card.element.querySelector('[data-value]')!, insight.value);
      if (insight.spark && insight.spark.length) {
        if (!card.spark) {
          card.spark = this.clone('spark');
          card.element
            .querySelector('.insight-cards__header')!
            .append(card.spark);
        }
        while (card.spark.children.length > insight.spark.length)
          card.spark.lastElementChild!.remove();
        insight.spark.forEach((point, index) => {
          let bar = card!.spark!.children[index] as HTMLElement | undefined;
          if (!bar) {
            bar = this.clone('bar');
            card!.spark!.append(bar);
          }
          bar.style.height = `${Math.max(12, Math.min(100, point))}%`;
          bar.style.animationDelay = `${index * 30}ms`;
          bar.toggleAttribute('data-last', index === insight.spark!.length - 1);
        });
      } else {
        card.spark?.remove();
        card.spark = undefined;
      }
      if (insight.change !== undefined) {
        const positive = (insight.change ?? 0) >= 0;
        if (!card.trend) {
          card.trend = this.clone('trend');
          card.trend.append(document.createTextNode('%'));
          card.element
            .querySelector('.insight-cards__header')!
            .after(card.trend);
        }
        if (card.positive !== positive) {
          card.trend.querySelector('svg')?.remove();
          card.trend.prepend(this.clone(positive ? 'up' : 'down'));
          card.positive = positive;
        }
        card.trend.toggleAttribute('data-positive', positive);
        const svg = card.trend.querySelector('svg')!;
        let sign = svg.nextSibling;
        if (positive) {
          if (!sign || sign.nodeValue !== '+') {
            sign = document.createTextNode('+');
            svg.after(sign);
          }
        } else if (sign?.nodeValue === '+') {
          sign.remove();
        }
        const percent = card.trend.lastChild!;
        const number = positive
          ? svg.nextSibling!.nextSibling
          : svg.nextSibling;
        const value = insight.change === null ? null : String(insight.change);
        if (value === null) {
          if (number !== percent) number?.remove();
        } else if (number === percent || !number) {
          percent.before(document.createTextNode(value));
        } else if (number.nodeValue !== value) number.nodeValue = value;
      } else {
        card.trend?.remove();
        card.trend = undefined;
        card.positive = undefined;
      }
      if (insight.note) {
        if (!card.note) {
          card.note = this.clone('note');
          card.note.append(document.createTextNode(insight.note));
          card.element.append(card.note);
        } else if (card.note.lastChild!.nodeValue !== insight.note)
          card.note.lastChild!.nodeValue = insight.note;
      } else {
        card.note?.remove();
        card.note = undefined;
      }
      return card.element;
    });
    let lastPlaced = 0;
    const placement = ordered.map((node) => {
      const previous = positions.get(node);
      if (previous === undefined || previous < lastPlaced) return true;
      lastPlaced = previous;
      return false;
    });
    ordered.forEach((node, index) => {
      if (!placement[index]) return;
      const sibling = ordered
        .slice(index + 1)
        .find((node, offset) => !placement[index + 1 + offset]);
      this.element.insertBefore(node, sibling ?? null);
    });
  }
  update(options: Partial<Options>): void {
    const previous = this.options;
    this.options = { ...previous, ...options };
    if ('className' in options) {
      for (const name of (previous.className ?? '')
        .split(/\s+/)
        .filter(Boolean))
        this.element.classList.remove(name);
      for (const name of (this.options.className ?? '')
        .split(/\s+/)
        .filter(Boolean))
        this.element.classList.add(name);
      this.element.classList.add('insight-cards');
    }
    this.render();
  }
  destroy(): void {}
}
register(
  'InsightCards',
  '[data-component="insight-cards"]',
  (element) => new InsightCards(element),
);
