import { emit, register } from './lifecycle';
type Conversation = {
  id: string;
  title: string;
  group: string;
  pinned?: boolean;
};
type Options = {
  conversations: Conversation[];
  activeId?: string | null;
  variant?: 'Default' | 'Compact';
  className?: string;
  onSelect?: (id: string) => void;
  onTogglePin?: (id: string) => void;
};
type Group = { element: HTMLElement; rows: Map<string, HTMLElement> };
class ConversationList {
  private options: Options;
  private activeState: string | undefined;
  private pins: Set<string>;
  private groups = new Map<string, Group>();
  private labels: Record<string, string>;
  private click = (event: Event): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      'button',
    );
    if (!button || !this.element.contains(button)) return;
    if (button.hasAttribute('data-select')) {
      const id = button.dataset.select!;
      this.activeState = id;
      try {
        this.options.onSelect?.(id);
        emit(this.element, 'mautic:conversation-list:select', { id });
      } finally {
        this.render();
      }
    } else if (button.hasAttribute('data-pin')) {
      const id = button.dataset.pin!;
      if (this.pins.has(id)) this.pins.delete(id);
      else this.pins.add(id);
      try {
        this.options.onTogglePin?.(id);
        emit(this.element, 'mautic:conversation-list:pin', { id });
      } finally {
        this.render();
      }
    }
  };
  constructor(private element: HTMLElement) {
    this.options = JSON.parse(element.dataset.options!) as Options;
    this.labels = JSON.parse(element.dataset.labels!);
    this.activeState = this.options.conversations[0]?.id;
    this.pins = new Set(
      this.options.conversations
        .filter((conversation) => conversation.pinned)
        .map((conversation) => conversation.id),
    );
    for (const node of element.querySelectorAll(
      ':scope>.conversation-list__group',
    ))
      node.remove();
    element.className = `conversation-list ${this.options.className ?? ''}`;
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
  private place(
    parent: HTMLElement,
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
    this.element.dataset.variant =
      this.options.variant === 'Compact' ? 'Compact' : 'Default';
    const active =
      this.options.activeId !== undefined
        ? this.options.activeId
        : this.activeState;
    const names = [
      ...new Set(
        this.options.conversations.map((conversation) => conversation.group),
      ),
    ];
    for (const [name, group] of this.groups)
      if (!names.includes(name)) {
        group.element.remove();
        this.groups.delete(name);
      }
    const groupPositions = new Map(
      [
        ...this.element.querySelectorAll(':scope>.conversation-list__group'),
      ].map((node, index) => [node, index]),
    );
    const orderedGroups = names.map((name) => {
      let group = this.groups.get(name);
      if (!group) {
        group = { element: this.clone('group'), rows: new Map() };
        this.groups.set(name, group);
      }
      this.text(group.element.querySelector('[data-heading]')!, name);
      const list = group.element.querySelector('ul')!;
      const conversations = this.options.conversations.filter(
        (conversation) => conversation.group === name,
      );
      const ids = new Set(conversations.map((conversation) => conversation.id));
      for (const [id, node] of group.rows)
        if (!ids.has(id)) {
          node.remove();
          group.rows.delete(id);
        }
      const positions = new Map(
        [...list.children].map((node, index) => [node, index]),
      );
      const ordered = conversations.map((conversation) => {
        let node = group!.rows.get(conversation.id);
        if (!node) {
          node = this.clone('row');
          group!.rows.set(conversation.id, node);
        }
        const select = node.querySelector<HTMLElement>('[data-select]')!;
        select.dataset.select = conversation.id;
        if (conversation.id === active)
          select.setAttribute('aria-current', 'true');
        else select.removeAttribute('aria-current');
        this.text(node.querySelector('[data-title]')!, conversation.title);
        const pin = node.querySelector<HTMLElement>('[data-pin]')!;
        pin.dataset.pin = conversation.id;
        const pinned = this.pins.has(conversation.id);
        pin.setAttribute('aria-pressed', String(pinned));
        pin.setAttribute(
          'aria-label',
          (pinned ? this.labels.unpin : this.labels.pin).replace(
            '%title%',
            () => conversation.title,
          ),
        );
        return node;
      });
      this.place(list, ordered, positions);
      return group.element;
    });
    this.place(this.element, orderedGroups, groupPositions);
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
      this.element.classList.add('conversation-list');
    }
    this.render();
  }
  destroy(): void {
    this.element.removeEventListener('click', this.click);
  }
}
register(
  'ConversationList',
  '[data-component="conversation-list"]',
  (element) => new ConversationList(element),
);
