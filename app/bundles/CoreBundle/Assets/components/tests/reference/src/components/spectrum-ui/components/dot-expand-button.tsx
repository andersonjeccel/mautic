import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

import { cn } from '@/lib/utils'

export interface DotExpandButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: ReactNode
  icon?: ReactNode
  label?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

const defaultIcon = (
  <svg
    stroke="currentColor"
    fill="none"
    width="1em"
    height="1em"
    strokeWidth="2"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

export function DotExpandButton({
  children,
  icon = defaultIcon,
  label,
  className,
  type = 'button',
  ref,
  ...props
}: DotExpandButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'group flex h-10 items-center gap-2 rounded-full bg-neutral-200 pl-3 pr-4 transition-all duration-300 ease-in-out hover:bg-black hover:pl-2 hover:text-white active:bg-neutral-700',
        className,
      )}
      data-spectrum-component="DotExpandButton"
      {...props}
    >
      <span
        aria-hidden="true"
        className="inline-flex rounded-full bg-black p-1 text-sm leading-[0] transition-colors duration-300 group-hover:bg-white"
      >
        <span className="inline-flex size-[1em] -translate-x-[200%] overflow-hidden text-[0px] transition-all duration-300 group-hover:translate-x-0 group-hover:text-lg group-hover:text-black group-active:-rotate-45 [&>*]:size-full">
          {icon}
        </span>
      </span>
      <span>{children ?? label}</span>
    </button>
  )
}
