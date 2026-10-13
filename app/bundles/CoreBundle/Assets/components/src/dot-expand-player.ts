import { emit, register } from './lifecycle';
type Options = { src?: string; label?: string; onClick?: (event: MouseEvent) => void; onEnded?: () => void; onPlaybackError?: (error: unknown) => void };
class DotExpandPlayer {
  private options: Options;
  private generation = 0;
  private pending?: number;
  private playing = false;
  private seconds = 0;
  private disposed = false;
  private observer?: ResizeObserver;
  private readonly audio: HTMLAudioElement;
  private readonly content: HTMLElement;
  private readonly labelMeasure: HTMLElement;
  private readonly playingMeasure: HTMLElement;
  private readonly listeners: [EventTarget, string, EventListener][] = [];
  constructor(private readonly element: HTMLElement) {
    this.audio = element.nextElementSibling as HTMLAudioElement;
    this.options = { src: this.audio.getAttribute('src') ?? '', label: element.dataset.label ?? '' };
    this.content = element.querySelector('[data-player-content]')!;
    this.labelMeasure = element.querySelector('[data-player-label-measure]')!;
    this.playingMeasure = element.querySelector('[data-player-playing-measure]')!;
    this.listen(element, 'click', (event) => { this.options.onClick?.(event as MouseEvent); if (!event.defaultPrevented) void this.toggle(); });
    this.listen(this.audio, 'play', () => this.render(true));
    this.listen(this.audio, 'pause', () => { this.invalidate(); this.render(false); });
    this.listen(this.audio, 'timeupdate', () => { this.seconds = Math.floor(this.audio.currentTime); this.renderTimers(); this.measure(); });
    this.listen(this.audio, 'ended', () => { this.invalidate(); this.audio.currentTime = 0; this.seconds = 0; this.render(false); this.renderTimers(); this.options.onEnded?.(); emit(element, 'mautic:dot-expand-player:ended', {}); });
    this.listen(this.audio, 'error', () => { this.invalidate(); this.render(false); this.error(this.audio.error ?? new Error('Audio playback failed')); });
    if (typeof ResizeObserver !== 'undefined') { this.observer = new ResizeObserver(() => this.measure()); this.observer.observe(this.labelMeasure); this.observer.observe(this.playingMeasure); }
    this.measure();
  }
  private listen(target: EventTarget, event: string, listener: EventListener): void { target.addEventListener(event, listener); this.listeners.push([target, event, listener]); }
  private invalidate(): void { this.generation++; this.pending = undefined; }
  private async toggle(): Promise<void> {
    if (!this.audio.paused || this.pending !== undefined) { this.invalidate(); this.audio.pause(); return; }
    const generation = ++this.generation; this.pending = generation;
    try { await this.audio.play(); }
    catch (error) { if (this.disposed || this.generation !== generation) return; this.pending = undefined; if (error instanceof DOMException && error.name === 'AbortError') return; this.error(error); }
    finally { if (this.generation === generation) this.pending = undefined; }
  }
  private error(error: unknown): void { this.options.onPlaybackError?.(error); emit(this.element, 'mautic:dot-expand-player:error', { error }); }
  private render(playing: boolean): void {
    if (this.playing !== playing) {
      this.playing = playing; this.element.dataset.state = playing ? 'playing' : 'idle';
      const live = this.content.querySelector(':scope > [data-player-live]')!;
      if (playing) live.replaceWith(this.element.querySelector<HTMLTemplateElement>('template[data-player-playing]')!.content.firstElementChild!.cloneNode(true));
      else { const label = document.createElement('span'); label.dataset.playerLive = ''; label.textContent = this.options.label!; live.replaceWith(label); }
      const icon = this.element.querySelector('.dot-expand-player__icon')!;
      const template = this.element.querySelector<HTMLTemplateElement>(playing ? 'template[data-player-pause-icon]' : 'template[data-player-play-icon]')!;
      icon.replaceChildren(template.content.cloneNode(true));
      if (!this.element.dataset.customAriaLabel) this.element.setAttribute('aria-label', playing ? this.element.dataset.pauseLabel! : this.options.label!);
    }
    this.renderTimers(); this.measure();
  }
  private renderTimers(): void {
    const seconds = Number.isFinite(this.seconds) ? Math.max(0, this.seconds) : 0;
    const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    for (const timer of this.element.querySelectorAll<HTMLElement>('[role="timer"]')) { timer.textContent = time; timer.setAttribute('aria-label', timer.dataset.voicePrefix ? `${timer.dataset.voicePrefix} ${time}` : time); }
  }
  private measure(): void {
    const label = this.labelMeasure.getBoundingClientRect().width || this.labelMeasure.offsetWidth;
    const playing = this.playingMeasure.getBoundingClientRect().width || this.playingMeasure.offsetWidth;
    if (label > 0 && playing > 0) this.content.style.width = `${this.playing ? playing : label}px`;
  }
  update(options: Options): void {
    const previous = this.options; this.options = { ...previous, ...options };
    if ('label' in options && options.label !== previous.label) { this.labelMeasure.textContent = options.label!; if (!this.playing) this.content.querySelector('[data-player-live]')!.textContent = options.label!; this.element.dataset.pauseLabel = this.element.dataset.pausePattern!.replace('%label%', options.label!); if (!this.element.dataset.customAriaLabel) this.element.setAttribute('aria-label', this.playing ? this.element.dataset.pauseLabel : options.label!); this.measure(); }
    if ('src' in options && options.src !== previous.src) { this.invalidate(); this.audio.setAttribute('src', options.src ?? ''); this.audio.pause(); this.audio.currentTime = 0; this.seconds = 0; this.render(false); }
  }
  destroy(): void { this.disposed = true; this.invalidate(); this.observer?.disconnect(); for (const [target, event, listener] of this.listeners) target.removeEventListener(event, listener); this.audio.remove(); }
}
register('DotExpandPlayer', '[data-component="dot-expand-player"]', (element) => new DotExpandPlayer(element));
