import type { CSSProperties, ReactNode } from 'react'
import { ICONS } from '../../assets'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'
import styles from './Controls.module.css'

/* ---------------- Tab (segmented control) ---------------- */

export type TabOption<T extends string> = { value: T; label: string; icon: string }

export function SegmentedTabs<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: TabOption<T>[]
  onChange: (value: T) => void
}) {
  return (
    <div className={styles.tabs} role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={cn(styles.tab, 't-body-md-semibold', active && styles.tabActive)}
            onClick={() => onChange(option.value)}
          >
            <Icon src={option.icon} size={18} className={styles.tabIcon} />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------- Checkbox ---------------- */

export function Checkbox({ checked, onChange, children, id }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; id: string }) {
  return (
    <div className={styles.checkCard}>
      <span className={cn(styles.checkbox, checked && styles.checkboxOn)}>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className={styles.checkInput} />
        {checked ? <Icon src={ICONS.checkSmall} size={14} color="var(--fg-on-primary)" /> : null}
      </span>
      <label htmlFor={id} className={cn(styles.checkLabel, 't-caption')}>
        {children}
      </label>
    </div>
  )
}

/* ---------------- Toggle Sim / Não ---------------- */

export function YesNoToggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className={styles.toggle} role="radiogroup" aria-label={label}>
      {[
        { v: true, text: 'Sim' },
        { v: false, text: 'Não' },
      ].map(({ v, text }) => (
        <button
          key={text}
          type="button"
          role="radio"
          aria-checked={value === v}
          className={cn(styles.toggleButton, value === v && styles.toggleOn)}
          onClick={() => onChange(v)}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Stepper (quantidade) ---------------- */

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
}: {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  label: string
}) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button type="button" className={styles.stepperButton} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Diminuir">
        −
      </button>
      <output className={styles.stepperValue} aria-live="polite">
        {value}
      </output>
      <button type="button" className={styles.stepperButton} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Aumentar">
        +
      </button>
    </div>
  )
}

/* ---------------- Slider ---------------- */

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  valueText,
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  label: string
  valueText?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <input
      type="range"
      className={styles.slider}
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      aria-valuetext={valueText}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ '--pct': `${pct}%`, '--handle': `url("${ICONS.sliderHandle}")` } as CSSProperties}
    />
  )
}

/* ---------------- FancyIcon + Flag ---------------- */

export function FancyIcon({ src, bg, size = 36, iconSize = 18, multicolor = false }: { src: string; bg: string; size?: number; iconSize?: number; multicolor?: boolean }) {
  return (
    <span className={styles.fancy} style={{ background: bg, width: size, height: size }}>
      {multicolor ? (
        <img src={src} width={iconSize} height={iconSize} alt="" />
      ) : (
        <Icon src={src} size={iconSize} color="#fff" />
      )}
    </span>
  )
}

export function Flag({
  icon,
  tone = 'muted',
  children,
  className,
}: {
  icon: string
  tone?: 'muted' | 'warning'
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn(styles.flag, styles[`flag_${tone}`], className)}>
      <FancyIcon src={icon} bg={tone === 'warning' ? 'var(--bg-warning)' : 'var(--bg-fill)'} multicolor />
      <p className="t-body-md-semibold">{children}</p>
    </div>
  )
}

/* ---------------- Link ---------------- */

export function TextLink({
  children,
  onClick,
  tone = 'main',
  className,
}: {
  children: ReactNode
  onClick?: () => void
  tone?: 'main' | 'primary'
  className?: string
}) {
  return (
    <button type="button" className={cn(styles.link, styles[`link_${tone}`], 't-button-sm', className)} onClick={onClick}>
      {children}
    </button>
  )
}

/* ---------------- Section heading ---------------- */

export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className={styles.section}>
      <h2 className="t-section-title">{title}</h2>
      {subtitle ? <p className={cn('t-page-subtitle', styles.sectionSubtitle)}>{subtitle}</p> : null}
    </div>
  )
}
