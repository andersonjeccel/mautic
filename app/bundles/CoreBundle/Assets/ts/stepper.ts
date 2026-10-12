type Step = string | number | HTMLElement;

type StepperDetail = {
  stepper: Stepper;
  from?: HTMLElement;
  to?: HTMLElement;
  form?: HTMLFormElement;
  response?: Response;
  error?: unknown;
};

export class Stepper {
  private static readonly instances = new WeakMap<HTMLElement, Stepper>();
  private current: HTMLElement | undefined;
  private history: HTMLElement[] = [];
  private request: AbortController | undefined;
  private disposed = false;
  private readonly clickHandler = (event: Event): void => this.click(event);
  private readonly submitHandler = (event: Event): void => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute('data-step-submit') || !this.owns(form)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    void this.submit(form, form.getAttribute('data-step-submit') || undefined, (event as SubmitEvent).submitter);
  };

  constructor(public readonly element: HTMLElement) {
    const existing = Stepper.instances.get(element);
    if (existing) {
      return existing;
    }
    Stepper.instances.set(element, this);
    this.current = this.steps.find(step => !step.hidden) || this.steps[0];
    this.update();
    element.addEventListener('click', this.clickHandler, true);
    element.addEventListener('submit', this.submitHandler, true);
  }

  static getOrCreateInstance(element: HTMLElement): Stepper {
    return Stepper.instances.get(element) || new Stepper(element);
  }

  static initialize(container: ParentNode = document): void {
    if (container instanceof HTMLElement && container.matches('[data-stepper]')) {
      Stepper.getOrCreateInstance(container);
    }
    container.querySelectorAll<HTMLElement>('[data-stepper]').forEach(element => Stepper.getOrCreateInstance(element));
  }

  private get steps(): HTMLElement[] {
    return this.owned('[data-step]');
  }

  private owns(element: Element): boolean {
    return element.closest('[data-stepper]') === this.element;
  }

  private owned(selector: string): HTMLElement[] {
    return Array.from(this.element.querySelectorAll<HTMLElement>(selector)).filter(element => this.owns(element));
  }

  private resolve(step: Step): HTMLElement | undefined {
    const steps = this.steps;
    if (typeof step === 'number') {
      return steps[step];
    }
    if (typeof step === 'string') {
      return steps.find(element => element.getAttribute('data-step') === step);
    }
    return steps.includes(step) ? step : undefined;
  }

  next(target?: Step): boolean {
    return this.show(target ?? this.steps.indexOf(this.current!) + 1);
  }

  back(target?: Step): boolean {
    if (target !== undefined) {
      return this.show(target);
    }
    const previous = this.history[this.history.length - 1];
    if (!previous) {
      return this.show(this.steps.indexOf(this.current!) - 1);
    }
    if (!this.transition(previous)) {
      return false;
    }
    this.history.pop();
    return true;
  }

  show(step: Step): boolean {
    const target = this.resolve(step);
    const previous = this.current;
    if (!target || !this.transition(target)) {
      return false;
    }
    if (previous) {
      this.history.push(previous);
    }
    return true;
  }

  private transition(target: HTMLElement): boolean {
    if (this.disposed || this.request || target === this.current || !this.steps.includes(target)) {
      return false;
    }
    const detail = {from: this.current, to: target};
    if (!this.emit('show', detail, true)) {
      return false;
    }
    this.current = target;
    this.update();
    this.focus(target);
    this.emit('shown', detail);
    return true;
  }

  private update(): void {
    const steps = this.steps;
    steps.forEach(step => {
      step.hidden = step !== this.current;
      step.setAttribute('aria-hidden', String(step.hidden));
    });
    const progress = steps.length ? Math.round((steps.indexOf(this.current!) + 1) / steps.length * 100) : 0;
    this.owned('[data-stepper-progress]').forEach(element => {
      element.style.width = `${progress}%`;
      element.setAttribute('role', 'progressbar');
      element.setAttribute('aria-valuemin', '0');
      element.setAttribute('aria-valuemax', '100');
      element.setAttribute('aria-valuenow', String(progress));
    });
    this.owned('[data-step-loading]').forEach(element => { element.hidden = !this.request; });
  }

  private focus(step: HTMLElement): void {
    const target = step.querySelector<HTMLElement>('[autofocus]:not(:disabled)') || step;
    if (!target.hasAttribute('tabindex') && target === step) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus();
  }

  private click(event: Event): void {
    if (!(event.target instanceof Element)) {
      return;
    }
    const button = event.target.closest<HTMLElement>('[data-step-next], [data-step-back]');
    if (!button || !this.owns(button)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (button.matches(':disabled, [aria-disabled="true"]') || button.closest('[data-step]') !== this.current) {
      return;
    }
    if (button.hasAttribute('data-step-next')) {
      this.next(button.getAttribute('data-step-next') || undefined);
    } else {
      this.back(button.getAttribute('data-step-back') || undefined);
    }
  }

  async submit(form: HTMLFormElement, target?: Step, submitter?: HTMLElement | null): Promise<boolean> {
    const from = this.current;
    const to = this.resolve(target ?? this.steps.indexOf(from!) + 1);
    if (this.disposed || this.request || !from || !to || !this.owns(form) || form.closest('[data-step]') !== from) {
      return false;
    }
    if (!form.noValidate && !submitter?.hasAttribute('formnovalidate') && !form.reportValidity()) {
      return false;
    }
    const detail = {from, to, form};
    if (!this.emit('submit', detail, true)) {
      return false;
    }
    const request = new AbortController();
    this.request = request;
    const previousBusy = this.element.getAttribute('aria-busy');
    this.element.setAttribute('aria-busy', 'true');
    this.update();
    let response: Response | undefined;
    try {
      const action = submitter?.getAttribute('formaction') || form.action;
      const url = new URL(action, document.baseURI);
      const method = submitter?.getAttribute('formmethod') || form.getAttribute('method') || 'post';
      if (url.origin !== window.location.origin || method.toLowerCase() !== 'post') {
        throw new Error('Stepper forms must POST to the same origin.');
      }
      const data = new FormData(form);
      if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
        if (submitter.name) {
          data.append(submitter.name, submitter.value);
        }
      }
      response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        body: data,
        credentials: 'same-origin',
        headers: {'Accept': 'text/html', 'X-Requested-With': 'XMLHttpRequest'},
        signal: request.signal,
      });
      if (response.redirected || (!response.ok && response.status !== 422)) {
        throw new Error(`Stepper request failed (${response.status}).`);
      }
      if (!response.headers.get('Content-Type')?.toLowerCase().startsWith('text/html')) {
        throw new Error('Stepper responses must contain HTML.');
      }
      const html = await response.text();
      if (this.disposed || !this.element.isConnected) {
        return false;
      }
      if (response.status === 422) {
        from.innerHTML = html;
        Stepper.initialize(from);
        this.focus(from);
        this.emit('error', {...detail, response});
        return false;
      }
      to.innerHTML = html;
      Stepper.initialize(to);
      this.request = undefined;
      this.show(to);
      this.emit('success', {...detail, response});
      return true;
    } catch (error) {
      if (!request.signal.aborted) {
        this.emit('error', {...detail, response, error});
      }
      return false;
    } finally {
      this.request = undefined;
      if (previousBusy === null) {
        this.element.removeAttribute('aria-busy');
      } else {
        this.element.setAttribute('aria-busy', previousBusy);
      }
      this.update();
    }
  }

  private emit(name: string, detail: Omit<StepperDetail, 'stepper'>, cancelable = false): boolean {
    return this.element.dispatchEvent(new CustomEvent(`stepper:${name}`, {
      bubbles: true,
      cancelable,
      detail: {stepper: this, ...detail},
    }));
  }

  dispose(): void {
    this.disposed = true;
    this.request?.abort();
    this.element.removeEventListener('click', this.clickHandler, true);
    this.element.removeEventListener('submit', this.submitHandler, true);
    Stepper.instances.delete(this.element);
  }

  static disposeRemoved(container: HTMLElement): void {
    const roots = [container, ...container.querySelectorAll<HTMLElement>('[data-stepper]')];
    roots.forEach(root => {
      if (!root.isConnected) {
        Stepper.instances.get(root)?.dispose();
      }
    });
  }
}

const initialize = (): void => {
  Stepper.initialize();
  new MutationObserver(records => {
    records.forEach(record => {
      record.removedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          Stepper.disposeRemoved(node);
        }
      });
      record.addedNodes.forEach(node => {
        if (node instanceof HTMLElement && node.isConnected) {
          Stepper.initialize(node);
        }
      });
    });
  }).observe(document.documentElement, {childList: true, subtree: true});
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, {once: true});
} else {
  initialize();
}
