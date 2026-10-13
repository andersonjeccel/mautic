import { emit, register } from './lifecycle';
type Note = string | number | boolean | null | undefined | Node | Note[];
type Task = {
  id: string;
  title: string;
  detail?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  note?: Note;
};
type Options = {
  tasks: Task[];
  variant?: 'Default' | 'Compact';
  className?: string;
};
class TaskRows {
  private options: Options;
  private openId: string | null = null;
  private nodes = new Map<string, HTMLElement>();
  private notes = new Map<string, Note>();
  private labels: Record<string, string>;
  private click = (event: Event): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      '[data-task]',
    );
    if (!button || button.disabled || !this.element.contains(button)) return;
    this.openId =
      this.openId === button.dataset.task ? null : button.dataset.task!;
    this.render();
    emit(this.element, 'mautic:task-rows:toggle', { openId: this.openId });
  };
  constructor(private element: HTMLElement) {
    this.options = JSON.parse(element.dataset.options!) as Options;
    this.labels = JSON.parse(element.dataset.labels!);
    element.dataset.variant = this.options.variant ?? 'Default';
    element.className = `task-rows ${this.options.className ?? ''}`;
    for (const node of element.querySelectorAll(':scope>li')) node.remove();
    for (const slot of element.querySelectorAll<HTMLTemplateElement>(
      '[data-note-slot]',
    )) {
      const task = this.options.tasks.find(
        (task) => task.id === slot.dataset.noteSlot,
      );
      if (
        task &&
        (slot.hasAttribute('data-rich-note') ||
          (typeof task.note === 'object' &&
            task.note !== null &&
            !Array.isArray(task.note)))
      )
        task.note = slot.content.cloneNode(true);
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
  private text(node: Element, text: string): void {
    if (node.textContent !== text) node.textContent = text;
  }
  private content(note: Note): Node[] {
    if (note instanceof Node) return [note.cloneNode(true)];
    if (Array.isArray(note))
      return note.flatMap((value) => this.content(value));
    if (typeof note === 'boolean' || note === null || note === undefined)
      return [];
    return [document.createTextNode(String(note))];
  }
  private render(): void {
    const compact = this.options.variant === 'Compact';
    const ids = new Set(this.options.tasks.map((task) => task.id));
    for (const [id, node] of this.nodes)
      if (!ids.has(id)) {
        node.remove();
        this.nodes.delete(id);
        this.notes.delete(id);
      }
    const positions = new Map(
      [...this.element.querySelectorAll(':scope>li')].map((node, index) => [
        node,
        index,
      ]),
    );
    const ordered = this.options.tasks.map((task) => {
      let row = this.nodes.get(task.id);
      if (!row) {
        row = this.clone('row');
        this.nodes.set(task.id, row);
      }
      const button = row.querySelector<HTMLButtonElement>('[data-task]')!;
      button.dataset.task = task.id;
      const previous = button.dataset.status;
      const terminal = task.status === 'completed' || task.status === 'failed';
      const oldTerminal = previous === 'completed' || previous === 'failed';
      if (previous !== task.status) {
        const prototype = this.clone(task.status);
        if (terminal && oldTerminal) {
          button
            .querySelector('.task-rows__terminal')!
            .replaceChildren(...prototype.childNodes);
        } else {
          button
            .querySelector(
              ':scope>.task-rows__icon,:scope>.task-rows__terminal',
            )
            ?.remove();
          button.prepend(prototype);
        }
      }
      button.dataset.status = task.status;
      this.text(button.querySelector('[data-title]')!, task.title);
      const badge = button.querySelector('[data-badge]')!;
      this.text(badge, this.labels[task.status]);
      let detail = button.querySelector<HTMLElement>('[data-detail]');
      if (task.detail) {
        if (!detail) {
          detail = document.createElement('span');
          detail.dataset.detail = '';
          detail.className = 'task-rows__detail';
          badge.before(detail);
        }
        this.text(detail, task.detail);
      } else detail?.remove();
      const expandable = !compact && Boolean(task.note);
      button.disabled = !expandable;
      let chevron = button.querySelector('.task-rows__chevron');
      let grid = row.querySelector<HTMLElement>('[data-grid]');
      if (expandable) {
        button.setAttribute('aria-expanded', String(task.id === this.openId));
        if (!chevron) {
          chevron = this.clone('chevron');
          button.append(chevron);
        }
        if (!grid) {
          grid = this.clone('grid');
          row.append(grid);
          this.notes.delete(task.id);
        }
        grid.style.gridTemplateRows = task.id === this.openId ? '1fr' : '0fr';
        if (!this.notes.has(task.id) || this.notes.get(task.id) !== task.note) {
          grid
            .querySelector('[data-note]')!
            .replaceChildren(...this.content(task.note));
          this.notes.set(task.id, task.note);
        }
      } else {
        button.removeAttribute('aria-expanded');
        chevron?.remove();
        grid?.remove();
        this.notes.delete(task.id);
      }
      return row;
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
    const old = this.options;
    this.options = { ...old, ...options };
    this.element.dataset.variant = this.options.variant ?? 'Default';
    if ('className' in options) {
      for (const name of (old.className ?? '').split(/\s+/).filter(Boolean))
        this.element.classList.remove(name);
      for (const name of (this.options.className ?? '')
        .split(/\s+/)
        .filter(Boolean))
        this.element.classList.add(name);
      this.element.classList.add('task-rows');
    }
    this.render();
  }
  destroy(): void {
    this.element.removeEventListener('click', this.click);
  }
}
register(
  'TaskRows',
  '[data-component="task-rows"]',
  (element) => new TaskRows(element),
);
