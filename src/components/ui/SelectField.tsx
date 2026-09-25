import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ICONS } from '../../assets'
import { cn } from '../../lib/cn'
import { Field, fixedWidth } from './Field'
import { Icon } from './Icon'
import styles from './SelectField.module.css'

export type SelectOption = { value: string; label: ReactNode }

type SelectFieldProps = {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  error?: string | false | null
  className?: string
  width?: number
}

/** Field + DropDown do Design System */
export function SelectField({ label, value, options, onChange, placeholder = 'Selecione', error, className, width }: SelectFieldProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const id = useId()
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  const openList = () => {
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  const choose = (index: number) => {
    const option = options[index]
    if (option) onChange(option.value)
    setOpen(false)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return setOpen(false)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return openList()
      const delta = e.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((i) => (i + delta + options.length) % options.length)
    }
    if ((e.key === 'Enter' || e.key === ' ') && open) {
      e.preventDefault()
      choose(activeIndex)
    }
  }

  return (
    <div ref={rootRef} className={cn(styles.root, className)} style={width ? fixedWidth(width) : undefined}>
      <Field
        id={id}
        label={label}
        value={selected ? 'x' : ''}
        error={error}
        active={open}
        control={
          <button
            id={id}
            type="button"
            className={styles.trigger}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={`${id}-list`}
            onClick={() => (open ? setOpen(false) : openList())}
            onKeyDown={onKeyDown}
          >
            <span className={cn('t-body-lg-medium', styles.value, !selected && styles.placeholder)}>
              {selected ? selected.label : placeholder}
            </span>
          </button>
        }
        trailing={<Icon src={ICONS.chevronDown} size={18} className={cn(styles.chevron, open && styles.chevronOpen)} />}
      />
      {open ? (
        <ul ref={listRef} id={`${id}-list`} role="listbox" className={styles.dropdown} aria-label={label}>
          {options.map((option, index) => {
            const isSelected = option.value === value
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                className={cn(styles.option, 't-body-md-semibold', isSelected && styles.selected, index === activeIndex && styles.activeOption)}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(index)}
              >
                <span className={styles.optionLabel}>{option.label}</span>
                {isSelected ? <Icon src={ICONS.check} size={18} className={styles.check} /> : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
