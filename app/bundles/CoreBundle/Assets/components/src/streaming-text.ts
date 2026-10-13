import { emit, register } from './lifecycle';
type Citation = {
  id: string;
  index: number;
  url: string;
  title: string;
  snippet?: string;
  favicon?: string;
};
type SuggestedPrompt = { id: string; label: string; prompt?: string };
type Options = {
  text: string;
  streaming?: boolean;
  citations?: Citation[];
  followUps?: SuggestedPrompt[];
  onFollowUp?: (prompt: SuggestedPrompt) => void;
  variant?: 'Answer' | 'Sources';
  className?: string;
};
class StreamingText {
  private options: Options;
  private readonly paragraph: HTMLElement;
  private sources?: HTMLElement;
  private sourceMode?: boolean;
  private followups?: HTMLElement;
  private readonly citationNodes = new Map<string, HTMLElement>();
  private readonly promptNodes = new Map<string, HTMLElement>();
  private readonly click = (event: Event): void => {
    const button = (event.target as Element).closest<HTMLElement>(
      '[data-followup]',
    );
    if (!button || !this.element.contains(button)) return;
    const prompt = (this.options.followUps ?? []).find(
      (item) => item.id === button.dataset.followup,
    );
    if (prompt) {
      this.options.onFollowUp?.(prompt);
      emit(this.element, 'mautic:streaming-text:followup', prompt);
    }
  };
  constructor(private readonly element: HTMLElement) {
    this.options = JSON.parse(element.dataset.options!) as Options;
    this.paragraph = element.querySelector('[data-answer]')!;
    element.addEventListener('click', this.click);
    this.render();
  }
  private node(tag: string, className: string): HTMLElement {
    const node = document.createElement(tag);
    node.className = className;
    return node;
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
  private keyed<Item extends { id: string }>(
    list: HTMLElement,
    items: Item[],
    nodes: Map<string, HTMLElement>,
    prototype: string,
    update: (node: HTMLElement, item: Item, index: number) => void,
  ): void {
    const keys = new Set(items.map((item) => item.id));
    for (const [key, node] of nodes)
      if (!keys.has(key)) {
        node.remove();
        nodes.delete(key);
      }
    items.forEach((item, index) => {
      let node = nodes.get(item.id);
      if (!node) {
        node = this.clone(prototype);
        nodes.set(item.id, node);
      }
      update(node, item, index);
      if (list.children[index] !== node)
        list.insertBefore(node, list.children[index] ?? null);
    });
  }
  private answer(): void {
    const parts = this.options.text
      .split(/(\*\*[^*]+\*\*|\[\d+\])/g)
      .filter(Boolean);
    const old = [
      ...this.paragraph.querySelectorAll<HTMLElement>(':scope>[data-part]'),
    ];
    parts.forEach((part, index) => {
      const strong = part.startsWith('**') && part.endsWith('**');
      const citation = /^\[\d+\]$/.test(part);
      const tag = strong ? 'STRONG' : citation ? 'SUP' : 'SPAN';
      let node = old[index];
      if (!node || node.tagName !== tag) {
        const replacement = document.createElement(tag.toLowerCase());
        replacement.dataset.part = '';
        if (node) node.replaceWith(replacement);
        else
          this.paragraph.insertBefore(
            replacement,
            this.paragraph.querySelector('[data-caret]'),
          );
        node = replacement;
      }
      this.text(
        node,
        strong ? part.slice(2, -2) : citation ? part.slice(1, -1) : part,
      );
    });
    for (const node of old.slice(parts.length)) node.remove();
    let caret = this.paragraph.querySelector<HTMLElement>('[data-caret]');
    if (this.options.streaming) {
      this.paragraph.setAttribute('aria-hidden', 'true');
      if (!caret) {
        caret = this.node('span', 'streaming-text__caret');
        caret.dataset.caret = '';
        caret.setAttribute('aria-hidden', 'true');
        this.paragraph.append(caret);
      }
    } else {
      this.paragraph.removeAttribute('aria-hidden');
      caret?.remove();
    }
  }
  private citations(): void {
    const items = this.options.citations ?? [];
    if (this.options.streaming || items.length === 0) {
      this.sources?.remove();
      this.sources = undefined;
      this.sourceMode = undefined;
      this.citationNodes.clear();
      return;
    }
    if (!this.sources) {
      this.sources = this.node('div', 'streaming-text__citations');
      this.paragraph.after(this.sources);
    }
    const detailed = this.options.variant === 'Sources';
    if (this.sourceMode !== detailed) {
      this.citationNodes.clear();
      this.sources.replaceChildren();
      if (detailed)
        this.sources.append(this.node('ul', 'streaming-text__source-list'));
      else {
        const summary = this.node('div', 'streaming-text__summary');
        const badges = this.node('span', 'streaming-text__badges');
        badges.setAttribute('aria-hidden', 'true');
        summary.append(
          badges,
          this.node('span', 'streaming-text__source-count'),
        );
        this.sources.append(summary);
      }
      this.sourceMode = detailed;
    }
    const list = this.sources.querySelector<HTMLElement>(
      detailed ? 'ul' : '.streaming-text__badges',
    )!;
    this.keyed(
      list,
      detailed ? items : items.slice(0, 3),
      this.citationNodes,
      detailed ? 'source' : 'badge',
      (node, item) => {
        if (detailed) {
          this.text(node.querySelector('[data-index]')!, String(item.index));
          this.text(node.querySelector('[data-title]')!, item.title);
          this.text(
            node.querySelector('[data-host]')!,
            new URL(item.url).hostname,
          );
        } else this.text(node, String(item.index));
      },
    );
    if (!detailed) {
      const caption = this.sources.querySelector(
        '.streaming-text__source-count',
      )!;
      const single = this.element.dataset.singleSource!;
      const pattern =
        items.length === 1 ? single : this.element.dataset.manySources!;
      const [prefix, suffix] = pattern.split('%count%');
      const shared = single.split('%count%')[1];
      const parts = [
        ...(prefix ? [prefix] : []),
        String(items.length),
        ...(suffix.startsWith(shared)
          ? [
              shared,
              ...(suffix.slice(shared.length)
                ? [suffix.slice(shared.length)]
                : []),
            ]
          : [suffix]),
      ];
      const nodes = [...caption.childNodes];
      if (nodes.length !== parts.length)
        caption.replaceChildren(
          ...parts.map((part) => document.createTextNode(part)),
        );
      else
        parts.forEach((part, index) => {
          if (nodes[index].nodeValue !== part) nodes[index].nodeValue = part;
        });
    }
  }
  private prompts(): void {
    const items = this.options.followUps ?? [];
    if (this.options.streaming || items.length === 0) {
      this.followups?.remove();
      this.followups = undefined;
      this.promptNodes.clear();
      return;
    }
    if (!this.followups) {
      this.followups = this.node('div', 'streaming-text__followups');
      const label = this.node('p', 'streaming-text__followups-label');
      label.textContent = this.element.dataset.followupsLabel!;
      this.followups.append(
        label,
        this.node('ul', 'streaming-text__followup-list'),
      );
      (this.sources ?? this.paragraph).after(this.followups);
    }
    this.keyed(
      this.followups.querySelector('ul')!,
      items,
      this.promptNodes,
      'followup',
      (node, item, index) => {
        node.style.animationDelay = `${Math.min(index, 4) * 50}ms`;
        const button = node.querySelector<HTMLElement>('[data-followup]')!;
        button.dataset.followup = item.id;
        const text = [...button.childNodes].find(
          (child) => child.nodeType === Node.TEXT_NODE,
        );
        if (item.label) {
          if (!text) button.append(document.createTextNode(item.label));
          else if (text.nodeValue !== item.label) text.nodeValue = item.label;
        } else text?.remove();
      },
    );
  }
  private render(): void {
    this.answer();
    this.citations();
    this.prompts();
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
      this.element.classList.add('streaming-text');
    }
    this.render();
  }
  destroy(): void {
    this.element.removeEventListener('click', this.click);
  }
}
register(
  'StreamingText',
  '[data-component="streaming-text"]',
  (element) => new StreamingText(element),
);
