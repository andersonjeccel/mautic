import './animated-checkbox';
import { register, emit } from './lifecycle';
type Step = { id: string; title: string; detail?: string };
type Options = {
  steps: Step[];
  title?: string;
  runLabel?: string;
  variant?: 'Default' | 'Compact';
  className?: string;
  onRun?: (ids: string[]) => void;
};
type Checkbox = {
  update(options: { checked?: boolean; onCheckedChange?: () => void }): void;
};
type Row = {
  element: HTMLElement;
  checkbox: Checkbox;
  initial: boolean;
  title: Text;
  detail?: HTMLElement;
};
class AgentPlan {
  private options: Options;
  private disabled = new Set<string>();
  private rows = new Map<string, Row>();
  private events = new AbortController();
  private counter = new Map<string, Text>();
  private defaults: { title: string; runLabel: string };
  private runText: Text;
  constructor(private element: HTMLElement) {
    this.options = JSON.parse(element.dataset.options!) as Options;
    this.defaults = {
      title: element.dataset.defaultTitle!,
      runLabel: element.dataset.defaultRunLabel!,
    };
    element.className = `agent-plan ${this.options.className ?? ''}`;
    element.querySelector('ol')!.replaceChildren();
    const counter = element.querySelector('.agent-plan__counter')!;
    counter.replaceChildren();
    const pattern = element.dataset.counter!;
    for (const part of pattern.split(/(%enabled%|%total%)/g).filter(Boolean)) {
      const node = document.createTextNode(part);
      counter.append(node);
      if (part === '%enabled%' || part === '%total%')
        this.counter.set(part, node);
    }
    for (const node of [
      ...element.querySelector('.agent-plan__run')!.childNodes,
    ])
      if (node.nodeType === Node.TEXT_NODE) node.remove();
    this.runText = document.createTextNode('');
    element.querySelector('.agent-plan__run')!.prepend(this.runText);
    element.addEventListener(
      'click',
      (event) => {
        const target = event.target as Element;
        const run = target.closest<HTMLButtonElement>('.agent-plan__run');
        if (run) {
          if (run.disabled) return;
          const ids = this.options.steps
            .filter((step) => !this.disabled.has(step.id))
            .map((step) => step.id);
          this.options.onRun?.(ids);
          emit(element, 'mautic:agent-plan:run', { enabledStepIds: ids });
          return;
        }
        const group = target.closest<HTMLElement>('.agent-plan__step');
        if (group && element.contains(group)) this.toggle(group.dataset.id!);
      },
      { signal: this.events.signal },
    );
    this.render();
    element.closest('form')?.addEventListener(
      'reset',
      () => {
        for (const step of this.options.steps) {
          const row = this.rows.get(step.id)!;
          if (!this.disabled.has(step.id) !== row.initial) this.toggle(step.id);
        }
      },
      { signal: this.events.signal },
    );
  }
  private text(element: Element, value: string): void {
    if (element.textContent !== value) element.textContent = value;
  }
  private nodeText(node: Text, value: string): void {
    if (node.nodeValue !== value) node.nodeValue = value;
  }
  private toggle(id: string): void {
    if (this.disabled.has(id)) this.disabled.delete(id);
    else this.disabled.add(id);
    this.render();
  }
  private render(): void {
    this.element.toggleAttribute(
      'data-compact',
      this.options.variant === 'Compact',
    );
    this.text(
      this.element.querySelector('h3')!,
      this.options.title === undefined
        ? this.defaults.title
        : (this.options.title ?? ''),
    );
    this.nodeText(
      this.runText,
      this.options.runLabel === undefined
        ? this.defaults.runLabel
        : (this.options.runLabel ?? ''),
    );
    const count = this.options.steps.length - this.disabled.size;
    this.nodeText(this.counter.get('%enabled%')!, String(count));
    this.nodeText(
      this.counter.get('%total%')!,
      String(this.options.steps.length),
    );
    this.element.querySelector<HTMLButtonElement>(
      '.agent-plan__run',
    )!.disabled = count === 0;
    const list = this.element.querySelector('ol')!;
    const ids = new Set(this.options.steps.map((step) => step.id));
    for (const [id, row] of this.rows)
      if (!ids.has(id)) {
        row.element.remove();
        this.rows.delete(id);
      }
    const positions = new Map(
      [...list.children].map((node, index) => [node, index]),
    );
    const ordered = this.options.steps.map((step, index) => {
      let row = this.rows.get(step.id);
      if (!row) {
        const node = (
          this.element
            .querySelector<HTMLTemplateElement>(
              'template[data-prototype=step]',
            )!
            .content.cloneNode(true) as DocumentFragment
        ).firstElementChild as HTMLElement;
        const checkboxElement = node.querySelector<HTMLElement>(
          '[data-component=animated-checkbox]',
        )!;
        const initial = !this.disabled.has(step.id);
        checkboxElement.dataset.state = initial ? 'checked' : 'unchecked';
        checkboxElement.querySelector('svg')!.removeAttribute('aria-hidden');
        const input = checkboxElement.querySelector<HTMLInputElement>('input')!;
        input.defaultChecked = initial;
        input.checked = initial;
        list.append(node);
        window.MauticUI!.AnimatedCheckbox.mount(checkboxElement);
        const checkbox = window.MauticUI!.AnimatedCheckbox.get(
          checkboxElement,
        ) as Checkbox;
        checkbox.update({
          checked: initial,
          onCheckedChange: () => this.toggle(step.id),
        });
        const button = checkboxElement.querySelector('button')!;
        button.addEventListener('click', (event) => event.stopPropagation(), {
          signal: this.events.signal,
        });
        if (!checkboxElement.querySelector<HTMLInputElement>('input')!.form)
          checkboxElement.querySelector('input')!.remove();
        const title = document.createTextNode(step.title);
        node.querySelector('.agent-plan__title')!.append(title);
        row = { element: node, checkbox, initial, title };
        this.rows.set(step.id, row);
      }
      const group = row.element.querySelector<HTMLElement>('[role=group]')!;
      group.dataset.id = step.id;
      group.classList.toggle(
        'agent-plan__step--compact',
        this.options.variant === 'Compact',
      );
      group.setAttribute('aria-label', step.title);
      group.toggleAttribute('data-off', this.disabled.has(step.id));
      const button = group.querySelector('button')!;
      button.setAttribute(
        'aria-label',
        this.element.dataset.label!.replace(/%title%/g, () => step.title),
      );
      row.checkbox.update({ checked: !this.disabled.has(step.id) });
      this.text(
        group.querySelector('.agent-plan__index')!,
        String(index + 1).padStart(2, '0'),
      );
      if (row.title.nodeValue !== step.title) row.title.nodeValue = step.title;
      if (this.options.variant !== 'Compact' && step.detail) {
        if (!row.detail) {
          row.detail = document.createElement('span');
          row.detail.className = 'agent-plan__detail';
          group.querySelector('.agent-plan__body')!.append(row.detail);
        }
        this.text(row.detail, step.detail);
      } else {
        row.detail?.remove();
        row.detail = undefined;
      }
      return row.element;
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
      list.insertBefore(node, sibling ?? null);
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
      this.element.classList.add('agent-plan');
    }
    this.render();
  }
  destroy(): void {
    this.events.abort();
  }
}
register(
  'AgentPlan',
  '[data-component="agent-plan"]',
  (element) => new AgentPlan(element),
);
