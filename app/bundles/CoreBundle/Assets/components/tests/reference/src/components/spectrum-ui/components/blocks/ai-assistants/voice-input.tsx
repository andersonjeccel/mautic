'use client';

import { useEffect, useState } from 'react';
import { Check, Mic, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const KEYFRAMES = `
@keyframes su-eq { 0%, 100% { transform: scaleY(0.3) } 50% { transform: scaleY(1) } }
`;

const BAR_COUNT = 18;
const BAR_SEED = Array.from({ length: BAR_COUNT }, (_, i) => ({
  delay: (i * 67) % 480,
  duration: 640 + ((i * 131) % 420),
  height: 8 + ((i * 53) % 12),
}));

export type VoiceInputState = 'idle' | 'recording' | 'processing';

export interface VoiceInputProps {
  state?: VoiceInputState;
  onStart?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  className?: string;
}

export interface VoiceVisualizerProps {
  active?: boolean;
  barCount?: number;
  className?: string;
  barClassName?: string;
}

export interface VoiceTimerProps {
  seconds: number;
  prefix?: string;
  ariaLabel?: string;
}

export function VoiceTimer({ seconds, prefix, ariaLabel }: VoiceTimerProps) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const time = `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;

  return (
    <span
      role="timer"
      aria-label={ariaLabel ?? (prefix ? `${prefix} ${time}` : time)}
      className="font-mono text-[11.5px] tabular-nums text-neutral-500 dark:text-neutral-400"
    >
      {time}
    </span>
  );
}

export function VoiceVisualizer({
  active = true,
  barCount = BAR_COUNT,
  className,
  barClassName,
}: VoiceVisualizerProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex h-6 items-center gap-[2.5px] px-1', className)}
      data-testid="voice-visualizer"
    >
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      {BAR_SEED.slice(0, barCount).map((bar, index) => (
        <span
          key={index}
          className={cn(
            'w-[2.5px] rounded-full bg-neutral-800 dark:bg-neutral-200',
            active ? 'motion-reduce:!animate-none motion-reduce:!scale-y-50' : 'scale-y-[0.35]',
            barClassName,
          )}
          style={{
            height: bar.height,
            animation: active
              ? `su-eq ${bar.duration}ms ease-in-out ${bar.delay}ms infinite`
              : undefined,
            transformOrigin: 'center',
          }}
        />
      ))}
    </span>
  );
}

function useRecordingClock(active: boolean) {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    if (!active) {
      setDs(0);
      return;
    }
    const t = setInterval(() => setDs((d) => d + 1), 100);
    return () => clearInterval(t);
  }, [active]);
  return Math.floor(ds / 10);
}

export function VoiceInput({
  state: stateProp,
  onStart,
  onConfirm,
  onCancel,
  className,
}: VoiceInputProps) {
  const [stateState, setStateState] = useState<VoiceInputState>('idle');
  const state = stateProp !== undefined ? stateProp : stateState;
  const elapsedSeconds = useRecordingClock(state === 'recording');

  function start() {
    setStateState('recording');
    onStart?.();
  }
  function confirm() {
    setStateState('processing');
    onConfirm?.();
  }
  function cancel() {
    setStateState('idle');
    onCancel?.();
  }

  return (
    <div
      className={cn(
        'flex h-11 w-fit items-center gap-2 rounded-full border border-black/[0.08] bg-white py-1.5 pl-1.5 pr-2 shadow-xs dark:border-white/[0.09] dark:bg-[#0B0B0D]',
        className,
      )}
    >
      {state === 'idle' && (
        <>
          <button
            type="button"
            aria-label="Start recording"
            onClick={start}
            className="grid size-8 place-items-center rounded-full bg-neutral-900 text-white transition-transform duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.92] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-neutral-100 dark:text-neutral-900"
          >
            <Mic className="size-3.5" />
          </button>
          <span className="pr-1.5 text-[12.5px] text-neutral-400 dark:text-neutral-500">
            Tap to speak
          </span>
        </>
      )}

      {state === 'recording' && (
        <>
          <button
            type="button"
            aria-label="Cancel recording"
            onClick={cancel}
            className="grid size-8 shrink-0 place-items-center rounded-full text-neutral-400 transition-[color,background-color,transform] duration-150 hover:bg-black/[0.04] hover:text-neutral-700 active:scale-[0.92] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-neutral-200"
          >
            <X className="size-3.5" />
          </button>

          <VoiceVisualizer />

          <VoiceTimer seconds={elapsedSeconds} prefix="Recording" />

          <button
            type="button"
            aria-label="Finish recording"
            onClick={confirm}
            className="grid size-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-white transition-transform duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.92] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-neutral-100 dark:text-neutral-900"
          >
            <Check className="size-3.5" />
          </button>
        </>
      )}

      {state === 'processing' && (
        <>
          <VoiceVisualizer active={false} barCount={10} className="h-8 px-2 opacity-50" />
          <span className="pr-1.5 text-[12.5px] text-neutral-400 dark:text-neutral-500" role="status">
            Transcribing…
          </span>
        </>
      )}
    </div>
  );
}

export default VoiceInput;
