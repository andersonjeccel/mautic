import { emit, register } from './lifecycle';
type State = 'idle' | 'recording' | 'processing';
type Options = { state?: State; onStart?: () => void; onConfirm?: () => void; onCancel?: () => void };
class VoiceInput {
  private options: Options;
  private internalState: State = 'idle';
  private currentState?: State;
  private clock?: number;
  private deciseconds = 0;
  private readonly listener = (event: Event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-action]');
    if (!button || !this.element.contains(button)) return;
    const action = button.dataset.action;
    if (action === 'start') { this.internalState = 'recording'; this.options.onStart?.(); }
    if (action === 'confirm') { this.internalState = 'processing'; this.options.onConfirm?.(); }
    if (action === 'cancel') { this.internalState = 'idle'; this.options.onCancel?.(); }
    this.render(); emit(this.element, `mautic:voice-input:${action}`, {});
  };
  constructor(private readonly element: HTMLElement) {
    this.options = { state: element.dataset.controlledState as State | undefined };
    this.currentState = (this.options.state ?? 'idle');
    this.element.addEventListener('click', this.listener); this.scheduleClock();
  }
  update(options: Options): void { this.options = { ...this.options, ...options }; this.render(); }
  private render(): void {
    const state = this.options.state ?? this.internalState;
    if (state === this.currentState) return;
    for (const child of Array.from(this.element.childNodes)) if (!(child instanceof HTMLTemplateElement)) child.remove();
    const template = this.element.querySelector<HTMLTemplateElement>(`template[data-voice-stage="${state}"]`);
    if (template) this.element.prepend(template.content.cloneNode(true));
    this.currentState = state; this.element.dataset.state = state; this.scheduleClock();
  }
  private scheduleClock(): void {
    window.clearInterval(this.clock); this.deciseconds = 0;
    if (this.currentState !== 'recording') return;
    this.clock = window.setInterval(() => {
      this.deciseconds++; const seconds = Math.floor(this.deciseconds / 10);
      const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      const timer = this.element.querySelector<HTMLElement>('[role="timer"]');
      if (timer && timer.textContent !== time) { const prefix = `${timer.dataset.voicePrefix ?? ''} `; timer.textContent = time; timer.setAttribute('aria-label', `${prefix}${time}`); }
    }, 100);
  }
  destroy(): void { window.clearInterval(this.clock); this.element.removeEventListener('click', this.listener); }
}
register('VoiceInput', '[data-component="voice-input"]', (element) => new VoiceInput(element));
