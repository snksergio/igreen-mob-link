import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import styles from './Segmented.module.css'

type Option<T extends string> = { value: T; label: string }

/** Controle segmentado (radiogroup) no visual das abas do Design System; `sm` para controles secundários */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
  className,
}: {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  size?: 'md' | 'sm'
  className?: string
}) {
  return (
    <div className={cn(styles.track, size === 'sm' && styles.sm, className)} role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} className={cn(styles.item, on && styles.on)} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Abas (tablist) com o mesmo visual. Setas, Home e End trocam de aba */
export function TabBar<T extends string>({
  label,
  value,
  options,
  onChange,
  idBase,
  className,
}: {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  idBase: string
  className?: string
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const onKeyDown = (e: KeyboardEvent) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const n = options.length
    const i = options.findIndex((o) => o.value === value)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n
    onChange(options[next].value)
    refs.current[options[next].value]?.focus()
  }

  return (
    <div className={cn(styles.track, styles.tabs, className)} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[o.value] = el
            }}
            type="button"
            role="tab"
            id={`${idBase}-tab-${o.value}`}
            aria-controls={`${idBase}-panel-${o.value}`}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className={cn(styles.item, on && styles.on)}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({ idBase, value, className, children }: { idBase: string; value: string; className?: string; children: ReactNode }) {
  return (
    <div key={value} role="tabpanel" id={`${idBase}-panel-${value}`} aria-labelledby={`${idBase}-tab-${value}`} className={cn(styles.panel, className)}>
      {children}
    </div>
  )
}
