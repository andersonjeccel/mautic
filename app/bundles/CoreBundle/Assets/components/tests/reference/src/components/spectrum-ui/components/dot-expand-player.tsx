import { Pause, Play } from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type Ref,
} from 'react'

import {
  VoiceTimer,
  VoiceVisualizer,
} from '@/components/spectrum-ui/components/blocks/ai-assistants/voice-input'
import { cn } from '@/lib/utils'

export interface DotExpandPlayerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onError'> {
  src: string
  label: string
  ref?: Ref<HTMLButtonElement>
  onEnded?: () => void
  onPlaybackError?: (error: unknown) => void
}

export function DotExpandPlayer({
  src,
  label,
  className,
  type = 'button',
  ref,
  onClick,
  onEnded,
  onPlaybackError,
  ...props
}: DotExpandPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const playGenerationRef = useRef(0)
  const pendingPlayRef = useRef<number | null>(null)
  const previousSrcRef = useRef(src)
  const labelMeasureRef = useRef<HTMLSpanElement>(null)
  const playingMeasureRef = useRef<HTMLSpanElement>(null)
  const [playing, setPlaying] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [contentWidths, setContentWidths] = useState<{
    label: number
    playing: number
  } | null>(null)

  useLayoutEffect(() => {
    const labelElement = labelMeasureRef.current
    const playingElement = playingMeasureRef.current
    if (!labelElement || !playingElement) return

    const measure = () => {
      const labelWidth = labelElement.getBoundingClientRect().width || labelElement.offsetWidth
      const playingWidth = playingElement.getBoundingClientRect().width
        || playingElement.offsetWidth

      if (labelWidth > 0 && playingWidth > 0) {
        setContentWidths((current) => (
          current?.label === labelWidth && current.playing === playingWidth
            ? current
            : { label: labelWidth, playing: playingWidth }
        ))
      }
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measure)
    observer.observe(labelElement)
    observer.observe(playingElement)
    return () => observer.disconnect()
  }, [label])

  function invalidatePendingPlay() {
    playGenerationRef.current += 1
    pendingPlayRef.current = null
  }

  useEffect(() => {
    if (previousSrcRef.current === src) return

    previousSrcRef.current = src
    invalidatePendingPlay()

    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    setElapsedSeconds(0)
    setPlaying(false)
  }, [src])

  useEffect(() => () => invalidatePendingPlay(), [])

  async function togglePlayback() {
    const audio = audioRef.current
    if (!audio) return

    if (!audio.paused || pendingPlayRef.current !== null) {
      invalidatePendingPlay()
      audio.pause()
      return
    }

    const generation = ++playGenerationRef.current
    pendingPlayRef.current = generation

    try {
      await audio.play()
    } catch (error) {
      if (playGenerationRef.current !== generation) return

      pendingPlayRef.current = null
      if (error instanceof DOMException && error.name === 'AbortError') return
      onPlaybackError?.(error)
    } finally {
      if (playGenerationRef.current === generation) pendingPlayRef.current = null
    }
  }

  function handleEnded() {
    invalidatePendingPlay()
    const audio = audioRef.current
    if (audio) audio.currentTime = 0
    setElapsedSeconds(0)
    setPlaying(false)
    onEnded?.()
  }

  return (
    <>
      <button
        ref={ref}
        type={type}
        className={cn(
          'group flex h-10 items-center gap-2 rounded-full bg-neutral-200 pl-3 pr-4 transition-[background-color,color,padding] duration-300 ease-in-out hover:bg-black hover:pl-2 hover:text-white active:bg-neutral-700',
          playing && 'bg-black pl-2 text-white',
          className,
        )}
        data-spectrum-component="DotExpandPlayer"
        data-state={playing ? 'playing' : 'idle'}
        aria-label={playing ? `Pausar ${label}` : label}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) void togglePlayback()
        }}
        {...props}
      >
        <span
          aria-hidden="true"
          data-player-dot
          className={cn(
            'inline-flex rounded-full bg-black p-1 text-sm leading-[0] transition-colors duration-300 group-hover:bg-white',
            playing && 'bg-white',
          )}
        >
          <span
            className={cn(
              'inline-flex size-[1em] -translate-x-[200%] overflow-hidden text-[0px] transition-all duration-300 group-hover:translate-x-0 group-hover:text-lg group-hover:text-black group-active:-rotate-45 [&>*]:size-full',
              playing && 'translate-x-0 text-lg text-black',
            )}
          >
            {playing
              ? <Pause data-testid="pause-icon" />
              : <Play data-testid="play-icon" />}
          </span>
        </span>
        <span
          data-player-content
          className="relative block overflow-hidden transition-[width] duration-300 ease-in-out"
          style={contentWidths
            ? { width: `${playing ? contentWidths.playing : contentWidths.label}px` }
            : undefined}
        >
          {playing
            ? (
                <span className="flex items-center gap-2">
                  <VoiceVisualizer className="px-0" barClassName="bg-white dark:bg-white" />
                  <VoiceTimer seconds={elapsedSeconds} prefix="Tempo reproduzido" />
                </span>
              )
            : <span>{label}</span>}
          <span
            ref={labelMeasureRef}
            aria-hidden="true"
            data-player-label-measure
            className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap"
          >
            {label}
          </span>
          <span
            ref={playingMeasureRef}
            aria-hidden="true"
            data-player-playing-measure
            className="pointer-events-none invisible absolute left-0 top-0 flex items-center gap-2"
          >
            <VoiceVisualizer active={false} className="px-0" />
            <VoiceTimer seconds={elapsedSeconds} />
          </span>
        </span>
      </button>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        data-testid="dot-expand-player-audio"
        onPlay={() => setPlaying(true)}
        onPause={() => {
          invalidatePendingPlay()
          setPlaying(false)
        }}
        onEnded={handleEnded}
        onTimeUpdate={(event) => setElapsedSeconds(Math.floor(event.currentTarget.currentTime))}
        onError={() => {
          invalidatePendingPlay()
          setPlaying(false)
          onPlaybackError?.(audioRef.current?.error ?? new Error('Audio playback failed'))
        }}
      />
    </>
  )
}
