import { register } from './lifecycle';
type Citation = {
  id: string;
  index: number;
  url: string;
  title: string;
  snippet?: string;
  favicon?: string;
};
type Options = {
  text: string;
  citations: Citation[];
  variant?: 'Inline' | 'Footnotes';
  className?: string;
};
type Part = { element: HTMLElement; marker: boolean };
class CitationSources {
  private options: Options;
  private parts: Part[] = [];
  private list: HTMLElement | null = null;
  private footnotes = new Map<string, HTMLElement>();
  constructor(private element: HTMLElement) {
    this.options = JSON.parse(element.dataset.options!) as Options;
    element.className = `citation-sources ${this.options.className ?? ''}`;
    element.querySelector('.citation-sources__text')!.replaceChildren();
    element.querySelector(':scope>.citation-sources__list')?.remove();
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
  private content(
    element: HTMLElement,
    citation: Citation,
    tooltip: boolean,
  ): void {
    this.text(element.querySelector('[data-title]')!, citation.title);
    this.text(
      element.querySelector('[data-host]')!,
      new URL(citation.url).hostname,
    );
    let snippet = element.querySelector<HTMLElement>('[data-snippet]');
    if (citation.snippet) {
      if (!snippet) {
        snippet = document.createElement('span');
        snippet.dataset.snippet = '';
        snippet.className = tooltip
          ? 'citation-sources__tooltip-snippet'
          : 'citation-sources__snippet';
        element.append(snippet);
      }
      this.text(snippet, citation.snippet);
    } else snippet?.remove();
  }
  private render(): void {
    const byIndex = new Map(
      this.options.citations.map((citation) => [citation.index, citation]),
    );
    const pieces = this.options.text.split(/(\[\d+\])/g).filter(Boolean);
    const paragraph = this.element.querySelector<HTMLElement>(
      '.citation-sources__text',
    )!;
    while (this.parts.length > pieces.length)
      this.parts.pop()!.element.remove();
    pieces.forEach((piece, index) => {
      const match = /^\[(\d+)\]$/.exec(piece);
      const citation = match ? byIndex.get(Number(match[1])) : undefined;
      const marker = Boolean(citation);
      let part = this.parts[index];
      if (!part || part.marker !== marker) {
        const node = marker
          ? this.clone('marker')
          : document.createElement('span');
        if (part) part.element.replaceWith(node);
        else paragraph.append(node);
        part = { element: node, marker };
        this.parts[index] = part;
      }
      if (citation) {
        const button = part.element.querySelector('button')!;
        this.text(button, String(citation.index));
        const values: Record<string, string> = {
          index: String(citation.index),
          title: citation.title,
        };
        button.setAttribute(
          'aria-label',
          this.element.dataset.label!.replace(
            /%(index|title)%/g,
            (_, key: string) => values[key],
          ),
        );
        this.content(
          part.element.querySelector<HTMLElement>('[role=tooltip]')!,
          citation,
          true,
        );
      } else this.text(part.element, piece);
    });
    if (this.options.variant === 'Footnotes') {
      if (!this.list) {
        this.list = this.clone('list');
        this.element.append(this.list);
      }
      const ids = new Set(
        this.options.citations.map((citation) => citation.id),
      );
      for (const [id, node] of this.footnotes)
        if (!ids.has(id)) {
          node.remove();
          this.footnotes.delete(id);
        }
      const positions = new Map(
        [...this.list.children].map((node, index) => [node, index]),
      );
      const ordered = this.options.citations.map((citation) => {
        let node = this.footnotes.get(citation.id);
        if (!node) {
          node = this.clone('footnote');
          this.footnotes.set(citation.id, node);
        }
        this.text(node.querySelector('[data-index]')!, String(citation.index));
        this.content(
          node.querySelector<HTMLElement>('.citation-sources__body')!,
          citation,
          false,
        );
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
        this.list!.insertBefore(node, sibling ?? null);
      });
    } else {
      this.list?.remove();
      this.list = null;
      this.footnotes.clear();
    }
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
      this.element.classList.add('citation-sources');
    }
    this.render();
  }
  destroy(): void {}
}
register(
  'CitationSources',
  '[data-component="citation-sources"]',
  (element) => new CitationSources(element),
);
