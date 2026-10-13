import { emit, register } from './lifecycle';
type Prompt = { id: string; label: string; prompt?: string };
type Options = {
  title?: string | null;
  subtitle?: string | null;
  prompts?: Prompt[];
  variant?: 'Default' | 'Centered';
  className?: string;
  onSelectPrompt?: (prompt: Prompt) => void;
};
class ChatEmptyState {
  private options: Options;
  private labels: Record<string, string>;
  private nodes = new Map<string, HTMLButtonElement>();
  private prompts: HTMLElement | null = null;
  private click = (event: Event): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      '[data-prompt]',
    );
    if (!button || !this.element.contains(button)) return;
    const prompt = (this.options.prompts ?? []).find(
      (prompt) => prompt.id === button.dataset.prompt,
    );
    if (!prompt) return;
    this.options.onSelectPrompt?.(prompt);
    emit(this.element, 'mautic:chat-empty-state:select', { prompt });
  };
  constructor(private element: HTMLElement) {
    this.options = JSON.parse(element.dataset.options!) as Options;
    this.labels = JSON.parse(element.dataset.labels!);
    element.className = `chat-empty-state ${this.options.className ?? ''}`;
    element.querySelector(':scope>.chat-empty-state__prompts')?.remove();
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
  private render(): void {
    this.element.dataset.variant =
      this.options.variant === 'Centered' ? 'Centered' : 'Default';
    this.text(
      this.element.querySelector('[data-title]')!,
      this.options.title === undefined
        ? this.labels.title
        : (this.options.title ?? ''),
    );
    this.text(
      this.element.querySelector('[data-subtitle]')!,
      this.options.subtitle === undefined
        ? this.labels.subtitle
        : (this.options.subtitle ?? ''),
    );
    const prompts = this.options.prompts ?? [];
    if (!prompts.length) {
      this.prompts?.remove();
      this.prompts = null;
      this.nodes.clear();
      return;
    }
    if (!this.prompts) {
      this.prompts = this.clone('prompts');
      this.element.append(this.prompts);
    }
    const ids = new Set(prompts.map((prompt) => prompt.id));
    for (const [id, node] of this.nodes)
      if (!ids.has(id)) {
        node.remove();
        this.nodes.delete(id);
      }
    const positions = new Map(
      [...this.prompts.children].map((node, index) => [node, index]),
    );
    const ordered = prompts.map((prompt, index) => {
      let node = this.nodes.get(prompt.id);
      if (!node) {
        node = this.clone('prompt') as HTMLButtonElement;
        this.nodes.set(prompt.id, node);
      }
      node.dataset.prompt = prompt.id;
      this.text(node, prompt.label);
      node.style.animationDelay = `${Math.min(index, 5) * 50}ms`;
      return node;
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
      this.prompts!.insertBefore(node, sibling ?? null);
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
      this.element.classList.add('chat-empty-state');
    }
    this.render();
  }
  destroy(): void {
    this.element.removeEventListener('click', this.click);
  }
}
register(
  'ChatEmptyState',
  '[data-component="chat-empty-state"]',
  (element) => new ChatEmptyState(element),
);
