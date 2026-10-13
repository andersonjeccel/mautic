import { emit, register } from './lifecycle';
type ToolCall = {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  description?: string;
  content?: unknown;
  children?: ToolCall[];
  parallel?: boolean;
  args?: Record<string, unknown>;
  result?: string;
  startedAt?: number;
  completedAt?: number;
};
type Options = {
  calls: ToolCall[];
  variant?: 'Row' | 'Stack';
  className?: string;
};
class ToolChips {
  private options: Options;
  private openId: string | null = null;
  private readonly nodes = new Map<string, HTMLElement>();
  private readonly list: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly overflow: HTMLElement;
  private readonly click = (event: Event): void => {
    const button = (event.target as Element).closest<HTMLElement>(
      '[data-call]',
    );
    if (!button || !this.list.contains(button)) return;
    const id = button.dataset.call!;
    this.openId = this.openId === id ? null : id;
    this.render();
    emit(this.element, 'mautic:tool-chips:toggle', { openId: this.openId });
  };
  constructor(private readonly element: HTMLElement) {
    this.options = JSON.parse(element.dataset.options!) as Options;
    element.dataset.variant = this.options.variant ?? 'Row';
    element.className = `tool-chips ${this.options.className ?? ''}`;
    this.list = element.querySelector('[data-list]')!;
    this.grid = element.querySelector('[data-grid]')!;
    this.overflow = element.querySelector('[data-overflow]')!;
    this.list.replaceChildren();
    this.overflow.replaceChildren();
    this.grid.style.gridTemplateRows = '0fr';
    element.addEventListener('click', this.click);
    this.render();
  }
  private text(element: Element, value: string): void {
    if (element.textContent !== value) element.textContent = value;
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
  private render(): void {
    const ids = new Set(this.options.calls.map((call) => call.id));
    for (const [id, node] of this.nodes)
      if (!ids.has(id)) {
        node.remove();
        this.nodes.delete(id);
      }
    const positions = new Map(
      [...this.list.children].map((node, index) => [node, index]),
    );
    const ordered = this.options.calls.map((call) => {
      let button = this.nodes.get(call.id);
      if (!button) {
        button = this.clone('chip');
        button.dataset.call = call.id;
        this.nodes.set(call.id, button);
      }
      button.setAttribute('aria-expanded', String(call.id === this.openId));
      button.querySelector<HTMLElement>('[data-dot]')!.dataset.status =
        call.status;
      this.text(button.querySelector('[data-name]')!, call.name);
      const running = call.status === 'running';
      const elapsed =
        call.startedAt && call.completedAt
          ? this.element.dataset.duration!.replace(
              '%duration%',
              ((call.completedAt - call.startedAt) / 1000).toFixed(1),
            )
          : undefined;
      let label = button.querySelector<HTMLElement>('[data-elapsed]');
      if (running || elapsed) {
        if (!label) {
          label = document.createElement('span');
          label.dataset.elapsed = '';
          label.className = 'tool-chips__elapsed';
          button.append(label);
        }
        label.toggleAttribute('data-running', running);
        this.text(label, running ? this.element.dataset.running! : elapsed!);
      } else label?.remove();
      return button;
    });
    let lastPlaced = 0;
    const placements = ordered.map((node) => {
      const previous = positions.get(node);
      if (previous === undefined || previous < lastPlaced) return true;
      lastPlaced = previous;
      return false;
    });
    ordered.forEach((node, index) => {
      if (!placements[index]) return;
      const sibling = ordered
        .slice(index + 1)
        .find((candidate, offset) => !placements[index + 1 + offset]);
      this.list.insertBefore(node, sibling ?? null);
    });
    const open = this.options.calls.find((call) => call.id === this.openId);
    this.grid.style.gridTemplateRows = open?.result ? '1fr' : '0fr';
    if (!open?.result) {
      this.overflow.replaceChildren();
      return;
    }
    let panel = this.overflow.firstElementChild as HTMLElement | null;
    if (!panel) {
      panel = this.clone('result');
      this.overflow.append(panel);
    }
    let args = panel.querySelector<HTMLElement>('[data-args]');
    if (open.args) {
      if (!args) {
        args = document.createElement('p');
        args.dataset.args = '';
        args.className = 'tool-chips__args';
        panel.prepend(args);
      }
      this.text(args, JSON.stringify(open.args));
    } else args?.remove();
    this.text(panel.querySelector('[data-result]')!, open.result);
  }
  update(options: Partial<Options>): void {
    const old = this.options;
    this.options = { ...old, ...options };
    this.element.dataset.variant = this.options.variant ?? 'Row';
    if ('className' in options) {
      for (const name of (old.className ?? '').split(/\s+/).filter(Boolean))
        this.element.classList.remove(name);
      for (const name of (this.options.className ?? '')
        .split(/\s+/)
        .filter(Boolean))
        this.element.classList.add(name);
      this.element.classList.add('tool-chips');
    }
    this.render();
  }
  destroy(): void {
    this.element.removeEventListener('click', this.click);
  }
}
register(
  'ToolChips',
  '[data-component="tool-chips"]',
  (element) => new ToolChips(element),
);
