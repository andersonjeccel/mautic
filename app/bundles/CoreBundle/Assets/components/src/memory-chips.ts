import { emit, register } from './lifecycle';
type Memory = { id: string; fact: string };
type Options = {
  memories: Memory[];
  title?: string;
  variant?: 'Panel' | 'Row';
  className?: string;
  onRemove?: (id: string) => void;
  onAdd?: () => void;
};
class MemoryChips {
  private options: Options;
  private removed = new Set<string>();
  private nodes = new Map<string, HTMLElement>();
  private list: HTMLElement | null = null;
  private header: HTMLElement | null = null;
  private empty: HTMLElement | null = null;
  private add: HTMLElement | null = null;
  private row = false;
  private labels: Record<string, string>;
  private click = (event: Event): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      'button',
    );
    if (!button || !this.element.contains(button)) return;
    if (button.hasAttribute('data-remove')) {
      const id = button.dataset.remove!;
      this.removed.add(id);
      try {
        this.options.onRemove?.(id);
        emit(this.element, 'mautic:memory-chips:remove', { id });
      } finally {
        this.render();
      }
    } else if (button.hasAttribute('data-add')) {
      this.options.onAdd?.();
      emit(this.element, 'mautic:memory-chips:add', {});
    }
  };
  constructor(private element: HTMLElement) {
    const options = JSON.parse(element.dataset.options!) as Options & {
      hasAdd?: boolean;
    };
    this.options = { ...options, onAdd: options.hasAdd ? () => {} : undefined };
    this.labels = JSON.parse(element.dataset.labels!);
    for (const node of element.querySelectorAll(
      ':scope>div,:scope>ul,:scope>p',
    ))
      node.remove();
    element.className = `memory-chips ${options.className ?? ''}`;
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
  private clear(): void {
    this.list?.remove();
    this.list = null;
    this.nodes.clear();
    this.add = null;
  }
  private render(): void {
    const row = this.options.variant === 'Row';
    if (this.row !== row) this.clear();
    this.row = row;
    this.element.dataset.variant = row ? 'Row' : 'Panel';
    const memories = this.options.memories.filter(
      (memory) => !this.removed.has(memory.id),
    );
    if (!row) {
      if (!this.header) {
        this.header = this.clone('header');
        this.element.append(this.header);
      }
      const title = this.options.title === undefined ? this.labels.title : this.options.title ?? '';
      const heading = this.header.querySelector('[data-title]')!;
      if (heading.textContent !== title) heading.textContent = title;
      const count = this.header.querySelector('[data-count]')!;
      if (!count.firstChild) count.append(document.createTextNode(String(memories.length)), document.createTextNode(` ${this.labels.saved}`));
      else if (count.firstChild.nodeValue !== String(memories.length)) count.firstChild.nodeValue = String(memories.length);
    } else {
      this.header?.remove();
      this.header = null;
    }
    if (!row && !memories.length) {
      this.clear();
      if (!this.empty) {
        this.empty = this.clone('empty');
        this.element.append(this.empty);
      }
      return;
    }
    this.empty?.remove();
    this.empty = null;
    if (!this.list) {
      this.list = this.clone('list');
      this.element.append(this.list);
    }
    const ids = new Set(memories.map((memory) => memory.id));
    for (const [id, node] of this.nodes)
      if (!ids.has(id)) {
        node.remove();
        this.nodes.delete(id);
      }
    const positions = new Map(
      [...this.list.children].map((node, index) => [node, index]),
    );
    const ordered = memories.map((memory, index) => {
      let node = this.nodes.get(memory.id);
      if (!node) {
        node = this.clone('chip');
        this.nodes.set(memory.id, node);
      }
      const fact = node.querySelector('.memory-chips__fact')!;
      const text = fact.firstChild?.nodeType === Node.TEXT_NODE ? fact.firstChild : null;
      if (memory.fact === '') text?.remove();
      else if (text) {
        if (text.nodeValue !== memory.fact) text.nodeValue = memory.fact;
      } else fact.prepend(document.createTextNode(memory.fact));

      node.style.animationDelay = `${Math.min(index, 5) * 40}ms`;
      const button = node.querySelector<HTMLElement>('[data-remove]')!;
      button.dataset.remove = memory.id;
      button.setAttribute(
        'aria-label',
        this.labels.forget.replace('%fact%', () => memory.fact),
      );
      return node;
    });
    if (this.options.onAdd) {
      if (!this.add) this.add = this.clone('add');
      ordered.push(this.add);
    } else {
      this.add?.remove();
      this.add = null;
    }
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
      this.list!.insertBefore(node, sibling ?? null);
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
      this.element.classList.add('memory-chips');
    }
    this.render();
  }
  destroy(): void {
    this.element.removeEventListener('click', this.click);
  }
}
register(
  'MemoryChips',
  '[data-component="memory-chips"]',
  (element) => new MemoryChips(element),
);
