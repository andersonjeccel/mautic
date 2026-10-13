import { emit } from '../lifecycle';

type Field = HTMLInputElement | HTMLTextAreaElement;
const controls = new WeakMap<Field, FieldControl>();
export class FieldChangeEvent extends Event {
  constructor(readonly nativeEvent: Event) {
    super('change', { bubbles: nativeEvent.bubbles, cancelable: nativeEvent.cancelable });
  }

  get target(): EventTarget | null { return this.nativeEvent.target; }
  get currentTarget(): EventTarget | null { return this.nativeEvent.currentTarget; }
  get defaultPrevented(): boolean { return this.nativeEvent.defaultPrevented; }
  preventDefault(): void { this.nativeEvent.preventDefault(); }
  stopPropagation(): void { this.nativeEvent.stopPropagation(); }
  persist(): void {}
  isDefaultPrevented(): boolean { return this.nativeEvent.defaultPrevented; }
  isPropagationStopped(): boolean { return this.nativeEvent.cancelBubble; }
}
type Options = {
  value?: string | number | null;
  defaultValue?: string | number;
  checked?: boolean | null;
  defaultChecked?: boolean;
  type?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  pattern?: string;
  maxLength?: number;
  minLength?: number;
  autoComplete?: string;
  inputMode?: string;
  spellCheck?: boolean;
  rows?: number;
  cols?: number;
  wrap?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  onChange?: (event: FieldChangeEvent) => void;
  onInput?: (event: Event) => void;
  onFocus?: (event: Event) => void;
  onBlur?: (event: Event) => void;
  onInvalid?: (event: Event) => void;
  onKeyDown?: (event: Event) => void;
  onKeyUp?: (event: Event) => void;
  onClick?: (event: Event) => void;
  onSelect?: (event: Event) => void;
  onPaste?: (event: Event) => void;
  onCopy?: (event: Event) => void;
  onCut?: (event: Event) => void;
  onCompositionStart?: (event: Event) => void;
  onCompositionEnd?: (event: Event) => void;
};

export class FieldControl {
  private readonly events = new AbortController();
  private options: Options = {};
  private controlledValue: boolean;
  private controlledChecked: boolean;
  private value: string;
  private checked: boolean;
  private lastChecked: boolean;

  constructor(readonly element: Field) {
    controls.set(element, this);
    if (element.dataset.defaultValue !== undefined) this.options.defaultValue = element.dataset.defaultValue;
    this.controlledValue = element.dataset.controlledValue === 'true';
    this.controlledChecked = element.dataset.controlledChecked === 'true';
    this.value = element.value;
    this.checked = element instanceof HTMLInputElement && element.checked;
    this.lastChecked = this.checked;
    element.value = element.value;
    if (element instanceof HTMLInputElement) element.checked = element.checked;
    const listeners = { signal: this.events.signal };
    element.addEventListener('input', (event) => {
      this.options.onInput?.(event);
      if (!(element instanceof HTMLInputElement) || !['checkbox', 'radio', 'file'].includes(element.type)) this.change(event);
    }, listeners);
    element.addEventListener('change', (event) => {
      if (element instanceof HTMLInputElement && element.type === 'file') this.change(event);
    }, listeners);
    element.addEventListener('click', (event) => {
      this.options.onClick?.(event);
      if (element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type) && element.checked !== this.lastChecked) {
        this.lastChecked = element.checked;
        this.change(event);
      }
    }, listeners);
    for (const [event, callback] of [['focus', 'onFocus'], ['blur', 'onBlur'], ['invalid', 'onInvalid'], ['keydown', 'onKeyDown'], ['keyup', 'onKeyUp'], ['select', 'onSelect'], ['paste', 'onPaste'], ['copy', 'onCopy'], ['cut', 'onCut'], ['compositionstart', 'onCompositionStart'], ['compositionend', 'onCompositionEnd']] as const) {
      element.addEventListener(event, (event) => this.options[callback]?.(event), listeners);
    }
  }

  update(options: Options): void {
    this.options = { ...this.options, ...options };
    for (const attribute of ['type', 'name', 'id', 'placeholder', 'min', 'max', 'step', 'pattern', 'maxLength', 'minLength', 'autoComplete', 'inputMode', 'rows', 'cols', 'wrap'] as const) {
      if (attribute in options) {
        if (options[attribute] === undefined) this.element.removeAttribute(attribute.toLowerCase());
        else this.element.setAttribute(attribute.toLowerCase(), String(options[attribute]));
      }
    }
    if (options.spellCheck !== undefined) this.element.spellcheck = options.spellCheck;
    if ('value' in options) {
      this.controlledValue = options.value !== undefined && options.value !== null;
      if (this.controlledValue) {
        this.value = String(options.value);
        this.element.value = this.value;
        this.element.defaultValue = this.element instanceof HTMLTextAreaElement && this.options.defaultValue !== undefined ? String(this.options.defaultValue) : this.value;
      } else if (this.options.defaultValue !== undefined) {
        this.element.defaultValue = String(this.options.defaultValue);
      }
    }
    if ('defaultValue' in options && (!this.controlledValue || this.element instanceof HTMLTextAreaElement)) this.element.defaultValue = options.defaultValue === undefined ? (this.controlledValue ? this.value : '') : String(options.defaultValue);
    for (const attribute of ['disabled', 'readOnly', 'required'] as const) {
      if (attribute in options) this.element[attribute] = options[attribute] ?? false;
    }
    if (this.element instanceof HTMLInputElement) {
      if ('checked' in options) {
        this.controlledChecked = options.checked !== undefined && options.checked !== null;
        if (options.checked !== undefined && options.checked !== null) this.element.checked = this.lastChecked = this.checked = options.checked;
      }
      if (options.defaultChecked !== undefined) this.element.defaultChecked = options.defaultChecked;
    }
  }

  private change(event: Event): void {
    this.options.onChange?.(new FieldChangeEvent(event));
    emit(this.element, 'mautic:field:change', { value: this.element.value, checked: this.element instanceof HTMLInputElement ? this.element.checked : undefined });
    queueMicrotask(() => {
      if (this.events.signal.aborted) return;
      if (this.controlledValue) this.element.value = this.value;
      if (this.controlledChecked && this.element instanceof HTMLInputElement) this.element.checked = this.lastChecked = this.checked;
      if (this.element instanceof HTMLInputElement && this.element.type === 'radio' && this.element.name) {
        for (const peer of this.element.ownerDocument.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
          const control = controls.get(peer);
          if (peer.name === this.element.name && peer.form === this.element.form && control?.controlledChecked) peer.checked = control.lastChecked = control.checked;
        }
      }
    });
  }

  destroy(): void {
    this.events.abort();
    controls.delete(this.element);
  }
}
