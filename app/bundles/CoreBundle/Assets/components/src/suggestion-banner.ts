import { emit, register } from './lifecycle';
type State = 'open' | 'applied' | 'dismissed';
type Options = {
  suggestion?: string;
  detail?: string;
  applyLabel?: string;
  state?: State;
  variant?: 'Inline' | 'Floating';
  className?: string;
  onApply?: () => void;
  onDismiss?: () => void;
};
class SuggestionBanner {
  private options: Options;
  private internalState: State = 'open';
  private root?: HTMLElement;
  private readonly click = (event: Event): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      'button[data-action]',
    );
    if (!button || !this.root?.contains(button)) return;
    const apply = button.dataset.action === 'apply';
    this.internalState = apply ? 'applied' : 'dismissed';
    try {
      (apply ? this.options.onApply : this.options.onDismiss)?.();
      emit(
        this.element,
        `mautic:suggestion-banner:${apply ? 'apply' : 'dismiss'}`,
        { state: this.internalState },
      );
    } finally {
      this.render();
    }
  };
  constructor(private readonly element: HTMLElement) {
    this.options = JSON.parse(element.dataset.options!) as Options;
    this.root =
      element.querySelector<HTMLElement>('[data-banner]') ?? undefined;
    element.addEventListener('click', this.click);
    this.render();
  }
  private get suggestion(): string {
    return this.options.suggestion === undefined
      ? this.element.dataset.defaultSuggestion!
      : this.options.suggestion;
  }
  private get detail(): string {
    return this.options.detail === undefined
      ? this.element.dataset.defaultDetail!
      : this.options.detail;
  }
  private render(): void {
    const state =
      this.options.state !== undefined
        ? this.options.state
        : this.internalState;
    if (state === 'dismissed') {
      this.root?.remove();
      this.root = undefined;
      return;
    }
    const mode = state === 'applied' ? 'applied' : 'open';
    if (!this.root || this.root.dataset.mode !== mode) {
      const template = this.element.querySelector<HTMLTemplateElement>(
        `template[data-view="${mode}"]`,
      )!;
      const prototype = (template.content.cloneNode(true) as DocumentFragment)
        .firstElementChild as HTMLElement;
      if (this.root) {
        this.root.replaceChildren(...prototype.childNodes);
        this.root.dataset.mode = mode;
      } else {
        this.root = prototype;
        this.element.prepend(this.root);
      }
    }
    this.root.className = `suggestion-banner suggestion-banner--${mode} ${mode === 'open' && this.options.variant === 'Floating' ? 'suggestion-banner--floating' : ''} ${this.options.className ?? ''}`;
    if (mode === 'applied') {
      this.root.setAttribute('role', 'status');
      const caption =
        this.suggestion.charAt(0).toLowerCase() + this.suggestion.slice(1);
      const parts = caption
        ? [this.element.dataset.appliedPrefix!, caption]
        : [this.element.dataset.appliedPrefix!];
      const texts = [...this.root.childNodes].filter(
        (node) => node.nodeType === Node.TEXT_NODE,
      );
      if (texts.length !== parts.length) {
        for (const node of texts) node.remove();
        for (const part of parts)
          this.root.append(document.createTextNode(part));
      } else
        parts.forEach((part, index) => {
          if (texts[index].nodeValue !== part) texts[index].nodeValue = part;
        });
      return;
    }
    this.root.removeAttribute('role');
    const suggestion =
      this.root.querySelector<HTMLElement>('[data-suggestion]')!;
    if (suggestion.textContent !== this.suggestion)
      suggestion.textContent = this.suggestion;
    let detail = this.root.querySelector<HTMLElement>('[data-detail]');
    if (this.detail) {
      if (!detail) {
        detail = document.createElement('p');
        detail.dataset.detail = '';
        detail.className = 'suggestion-banner__detail';
        suggestion.after(detail);
      }
      if (detail.textContent !== this.detail) detail.textContent = this.detail;
    } else detail?.remove();
    const button = this.root.querySelector<HTMLElement>('[data-action=apply]')!;
    const label =
      this.options.applyLabel === undefined
        ? this.element.dataset.defaultApply!
        : this.options.applyLabel;
    if (button.textContent !== label) button.textContent = label;
  }
  update(options: Partial<Options>): void {
    this.options = { ...this.options, ...options };
    this.render();
  }
  destroy(): void {
    this.element.removeEventListener('click', this.click);
  }
}
register(
  'SuggestionBanner',
  '[data-component="suggestion-banner"]',
  (element) => new SuggestionBanner(element),
);
