import { emit, register } from './lifecycle';
type Line = { type: 'context' | 'add' | 'remove'; text: string };
type File = {
  id: string;
  path: string;
  additions: number;
  deletions: number;
  lines: Line[];
};
type Options = {
  diffs: File[];
  variant?: 'Default' | 'Summary';
  className?: string;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
};
type Card = {
  element: HTMLElement;
  actions?: HTMLElement;
  badge?: HTMLElement;
  lines?: HTMLElement;
};
class DiffView {
  private options: Options;
  private decided: Record<string, 'accepted' | 'rejected'> = {};
  private cards = new Map<string, Card>();
  private labels: Record<string, string>;
  private click = (event: Event): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      '[data-accept],[data-reject]',
    );
    if (!button || !this.element.contains(button)) return;
    const decision = button.hasAttribute('data-accept')
      ? 'accepted'
      : 'rejected';
    const id = button.dataset[decision === 'accepted' ? 'accept' : 'reject']!;
    this.decided = { ...this.decided, [id]: decision };
    try {
      (decision === 'accepted'
        ? this.options.onAccept
        : this.options.onReject)?.(id);
      emit(this.element, `mautic:diff-view:${decision}`, { id });
    } finally {
      this.render();
    }
  };
  constructor(private element: HTMLElement) {
    this.options = JSON.parse(element.dataset.options!) as Options;
    this.labels = JSON.parse(element.dataset.labels!);
    for (const node of element.querySelectorAll(':scope>.diff-view__card'))
      node.remove();
    element.className = `diff-view ${this.options.className ?? ''}`;
    element.addEventListener('click', this.click);
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
  private count(element: Element, sign: string, value: number): void {
    if (!element.firstChild)
      element.append(
        document.createTextNode(sign),
        document.createTextNode(String(value)),
      );
    else if (element.lastChild!.nodeValue !== String(value))
      element.lastChild!.nodeValue = String(value);
  }
  private render(): void {
    const ids = new Set(this.options.diffs.map((diff) => diff.id));
    for (const [id, card] of this.cards)
      if (!ids.has(id)) {
        card.element.remove();
        this.cards.delete(id);
      }
    const positions = new Map(
      [...this.element.querySelectorAll(':scope>.diff-view__card')].map(
        (node, index) => [node, index],
      ),
    );
    const ordered = this.options.diffs.map((diff) => {
      let card = this.cards.get(diff.id);
      if (!card) {
        card = { element: this.clone('card') };
        this.cards.set(diff.id, card);
      }
      this.text(card.element.querySelector('[data-path]')!, diff.path);
      this.count(
        card.element.querySelector('[data-additions]')!,
        '+',
        diff.additions,
      );
      this.count(
        card.element.querySelector('[data-deletions]')!,
        '−',
        diff.deletions,
      );
      const decision = this.decided[diff.id];
      const tools = card.element.querySelector('.diff-view__tools')!;
      card.element.dataset.decision =
        typeof decision === 'string' ? decision : '';
      if (decision) {
        card.actions?.remove();
        card.actions = undefined;
        if (!card.badge) {
          card.badge = this.clone('decision');
          tools.append(card.badge);
        }
        card.badge.dataset.decision =
          typeof decision === 'string' ? decision : '';
        this.text(
          card.badge,
          typeof decision === 'string' ? this.labels[decision] : '',
        );
      } else {
        card.badge?.remove();
        card.badge = undefined;
        if (!card.actions) {
          card.actions = this.clone('actions');
          tools.append(card.actions);
        }
        for (const action of ['accept', 'reject']) {
          const button = card.actions.querySelector<HTMLElement>(
            `[data-${action}]`,
          )!;
          button.dataset[action] = diff.id;
          button.setAttribute(
            'aria-label',
            this.labels[action].replace('%path%', () => diff.path),
          );
        }
      }
      if (
        this.options.variant === undefined ||
        this.options.variant === 'Default'
      ) {
        if (!card.lines) {
          card.lines = this.clone('lines');
          card.element.append(card.lines);
        }
        while (card.lines.children.length > diff.lines.length)
          card.lines.lastElementChild!.remove();
        diff.lines.forEach((line, index) => {
          let node = card!.lines!.children[index] as HTMLElement | undefined;
          if (!node) {
            node = this.clone('line');
            card!.lines!.append(node);
          }
          node.dataset.type = line.type;
          const sign = node.firstElementChild!;
          this.text(sign, { context: ' ', add: '+', remove: '-' }[line.type]);
          const text = sign.nextSibling;
          if (line.text === '') text?.remove();
          else if (text) {
            if (text.nodeValue !== line.text) text.nodeValue = line.text;
          } else node.append(document.createTextNode(line.text));
        });
      } else {
        card.lines?.remove();
        card.lines = undefined;
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
      this.element.classList.add('diff-view');
    }
    this.render();
  }
  destroy(): void {
    this.element.removeEventListener('click', this.click);
  }
}
register(
  'DiffView',
  '[data-component="diff-view"]',
  (element) => new DiffView(element),
);
