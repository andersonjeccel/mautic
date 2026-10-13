import { register } from './lifecycle';
type Content = string | number | boolean | null | undefined | Node | Content[];
type Step = {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  description?: string;
  content?: Content;
  args?: Record<string, unknown>;
  result?: string;
  startedAt?: number;
  completedAt?: number;
  children?: Step[];
  parallel?: boolean;
};
type Options = {
  steps: Step[];
  variant?: 'Default' | 'Compact';
  className?: string;
};
type Row = {
  element: HTMLElement;
  open: boolean;
  kind?: string;
  status?: string;
  content?: Content;
  zero?: Text;
  children: Map<string, HTMLElement>;
};
class AgentSteps {
  private options: Options;
  private rows = new Map<string, Row>();
  private labels: Record<string, string>;
  private click = (event: Event): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      '.agent-steps__button',
    );
    if (
      !button ||
      !this.element.contains(button) ||
      !button.hasAttribute('data-expandable')
    )
      return;
    const row = this.rows.get(button.dataset.id!)!;
    row.open = !row.open;
    this.render();
  };
  constructor(private element: HTMLElement) {
    this.options = JSON.parse(element.dataset.options!) as Options;
    this.labels = JSON.parse(element.dataset.labels!);
    element.className = `agent-steps ${this.options.className ?? ''}`;
    for (const node of element.querySelectorAll(':scope>li')) node.remove();
    for (const slot of element.querySelectorAll<HTMLTemplateElement>(
      '[data-rich-content]',
    )) {
      const step = this.options.steps.find(
        (step) => step.id === slot.dataset.contentSlot,
      );
      if (step) step.content = slot.content.cloneNode(true);
    }
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
  private text(node: Element, value: string): void {
    if (node.textContent !== value) node.textContent = value;
  }
  private optional(
    parent: Element,
    selector: string,
    tag: string,
    className: string,
    value: string | undefined,
    before?: Element | null,
  ): void {
    let node = parent.querySelector<HTMLElement>(`:scope>.${selector}`);
    if (value !== undefined) {
      if (!node) {
        node = document.createElement(tag);
        node.className = className;
        parent.insertBefore(node, before ?? null);
      }
      this.text(node, value);
    } else node?.remove();
  }
  private nodes(content: Content): Node[] {
    if (content instanceof Node) return [content.cloneNode(true)];
    if (Array.isArray(content))
      return content.flatMap((value) => this.nodes(value));
    if (
      content === null ||
      content === undefined ||
      typeof content === 'boolean'
    )
      return [];
    return [document.createTextNode(String(content))];
  }
  private place(
    parent: Element,
    ordered: HTMLElement[],
    positions: Map<Element, number>,
  ): void {
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
      parent.insertBefore(node, sibling ?? null);
    });
  }
  private render(): void {
    const compact = this.options.variant === 'Compact';
    const ids = new Set(this.options.steps.map((step) => step.id));
    for (const [id, row] of this.rows)
      if (!ids.has(id)) {
        row.element.remove();
        this.rows.delete(id);
      }
    const positions = new Map(
      [...this.element.querySelectorAll(':scope>li')].map((node, index) => [
        node,
        index,
      ]),
    );
    const ordered = this.options.steps.map((step, index) => {
      let row = this.rows.get(step.id);
      if (!row) {
        row = { element: this.clone('row'), open: false, children: new Map() };
        this.rows.set(step.id, row);
      }
      const node = row.element;
      node.toggleAttribute('data-compact', compact);
      node.toggleAttribute(
        'data-last',
        index === this.options.steps.length - 1,
      );
      const rail = node.querySelector('.agent-steps__rail')!;
      let connector = rail.querySelector('.agent-steps__connector');
      if (index !== this.options.steps.length - 1) {
        if (!connector) {
          connector = document.createElement('span');
          connector.className = 'agent-steps__connector';
          rail.append(connector);
        }
      } else connector?.remove();
      const status = node.querySelector('.agent-steps__status')!;
      const kind =
        step.status === 'success' || step.status === 'error'
          ? 'terminal'
          : step.status === 'pending'
            ? 'pending'
            : 'dot';
      if (row.kind !== kind) {
        let icon: HTMLElement;
        if (kind === 'dot') {
          icon = document.createElement('span');
          icon.className = 'agent-steps__dot';
        } else icon = this.clone(step.status);
        status.replaceChildren(icon);
        row.kind = kind;
      } else if (kind === 'terminal' && row.status !== step.status)
        status.firstElementChild!.replaceChildren(
          ...this.clone(step.status).childNodes,
        );
      (status.firstElementChild as HTMLElement).dataset.status = step.status;
      row.status = step.status;
      const body = node.querySelector('.agent-steps__body')!;
      const button = body.querySelector<HTMLButtonElement>('button')!;
      button.dataset.id = step.id;
      this.text(button.querySelector('.agent-steps__name')!, step.name);
      const meta = button.querySelector('.agent-steps__meta')!;
      this.optional(
        button,
        'agent-steps__state',
        'span',
        'agent-steps__state',
        step.status === 'running' || step.status === 'pending'
          ? this.labels[step.status]
          : undefined,
        meta,
      );
      const state = button.querySelector<HTMLElement>('.agent-steps__state');
      if (state) state.dataset.status = step.status;
      const elapsed =
        step.startedAt && step.completedAt
          ? `${((step.completedAt - step.startedAt) / 1000).toFixed(1)}s`
          : undefined;
      this.optional(
        meta,
        'agent-steps__elapsed',
        'span',
        'agent-steps__elapsed',
        elapsed,
        meta.querySelector('.agent-steps__chevron'),
      );
      const expandable =
        !compact &&
        Boolean(step.result || step.content || step.children?.length);
      button.toggleAttribute('data-expandable', expandable);
      let grid = body.querySelector<HTMLElement>('.agent-steps__grid');
      let chevron = meta.querySelector<HTMLElement>('.agent-steps__chevron');
      if (expandable) {
        button.setAttribute('aria-expanded', String(row.open));
        if (!chevron) {
          chevron = this.clone('chevron');
          meta.append(chevron);
        }
        chevron.toggleAttribute('data-open', row.open);
        if (!grid) {
          grid = this.clone('grid');
          body.append(grid);
          row.content = undefined;
          row.children.clear();
        }
        grid.style.gridTemplateRows = row.open ? '1fr' : '0fr';
        const overflow = grid.firstElementChild!;
        let content = overflow.querySelector<HTMLElement>(
          '.agent-steps__content',
        );
        if (step.content) {
          if (!content) {
            content = document.createElement('div');
            content.className = 'agent-steps__content';
            overflow.prepend(content);
            row.content = undefined;
          }
          if (row.content !== step.content) {
            content.replaceChildren(...this.nodes(step.content));
            row.content = step.content;
          }
        } else {
          content?.remove();
          row.content = undefined;
        }
        this.optional(
          overflow,
          'agent-steps__result',
          'p',
          'agent-steps__result',
          step.result ? step.result : undefined,
          overflow.querySelector('.agent-steps__children'),
        );
        let children = overflow.querySelector<HTMLElement>(
          '.agent-steps__children',
        );
        if (step.children?.length) {
          if (!children) {
            children = document.createElement('div');
            children.className = 'agent-steps__children';
            overflow.append(children);
          }
          const childIds = new Set(step.children.map((child) => child.id));
          for (const [id, node] of row.children)
            if (!childIds.has(id)) {
              node.remove();
              row.children.delete(id);
            }
          const positions = new Map(
            [...children.children].map((node, index) => [node, index]),
          );
          const childrenOrdered = step.children.map((child) => {
            let node = row!.children.get(child.id);
            if (!node) {
              node = this.clone('child');
              row!.children.set(child.id, node);
            }
            node.querySelector<HTMLElement>(
              '.agent-steps__dot',
            )!.dataset.status = child.status;
            this.text(
              node.querySelector('.agent-steps__child-name')!,
              child.name,
            );
            this.optional(
              node.querySelector('.agent-steps__child-header')!,
              'agent-steps__parallel',
              'span',
              'agent-steps__parallel',
              child.parallel ? this.labels.parallel : undefined,
            );
            this.optional(
              node,
              'agent-steps__child-result',
              'p',
              'agent-steps__child-result',
              child.result ? child.result : undefined,
            );
            return node;
          });
          this.place(children, childrenOrdered, positions);
        } else {
          children?.remove();
          row.children.clear();
        }
        if (step.content === 0) {
          if (!row.zero) {
            row.zero = document.createTextNode('0');
            overflow.prepend(row.zero);
          }
        } else {
          row.zero?.remove();
          row.zero = undefined;
        }
      } else {
        button.removeAttribute('aria-expanded');
        chevron?.remove();
        grid?.remove();
        grid = null;
        row.zero = undefined;
        row.content = undefined;
        row.children.clear();
      }
      this.optional(
        body,
        'agent-steps__description',
        'p',
        'agent-steps__description',
        !compact && step.description ? step.description : undefined,
        body.querySelector('.agent-steps__args') ?? grid,
      );
      this.optional(
        body,
        'agent-steps__args',
        'p',
        'agent-steps__args',
        !compact && step.args ? JSON.stringify(step.args) : undefined,
        grid,
      );
      return node;
    });
    this.place(this.element, ordered, positions);
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
      this.element.classList.add('agent-steps');
    }
    this.render();
  }
  destroy(): void {
    this.element.removeEventListener('click', this.click);
  }
}
register(
  'AgentSteps',
  '[data-component="agent-steps"]',
  (element) => new AgentSteps(element),
);
