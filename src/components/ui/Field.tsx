import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { ICONS } from '../../assets'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'
import styles from './Field.module.css'

type NativeInput = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'className' | 'children'>

export type FieldProps = NativeInput & {
  label: string
  value: string
  onChange?: (value: string) => void
  /** Ícone à direita (SVG do Figma). Muda de cor conforme o estado. */
  icon?: string
  /** Mostra o check verde quando o campo está válido e fora de foco */
  valid?: boolean
  error?: string | false | null
  warning?: string | false | null
  helper?: ReactNode
  mask?: (value: string) => string
  /** Fundo cinza (campo calculado/somente leitura) */
  muted?: boolean
  loading?: boolean
  /** Conteúdo exibido logo após o valor digitado, ex.: "·  (7kw AC)" */
  suffix?: ReactNode
  /** Força o visual de foco (ex.: campo ativo controlado por slider) */
  active?: boolean
  className?: string
  /** Largura fixa em px (ex.: ESTADO/NÚMERO = 150) dentro de um FieldRow */
  width?: number
  inputRef?: Ref<HTMLInputElement>
  /** Substitui o <input> (usado pelo SelectField) */
  control?: ReactNode
  trailing?: ReactNode
}

export function Field({
  label,
  value,
  onChange,
  icon,
  valid,
  error,
  warning,
  helper,
  mask,
  muted,
  loading,
  suffix,
  active,
  className,
  width,
  inputRef,
  control,
  trailing,
  id,
  readOnly,
  ...inputProps
}: FieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const message = error || warning || helper
  const messageId = message ? `${inputId}-msg` : undefined
  const filled = value.length > 0

  let end: ReactNode = trailing ?? null
  if (!end) {
    if (loading) end = <span className={styles.spinner} aria-label="Carregando" role="status" />
    else if (valid && !error) end = <Icon src={ICONS.checkInput} size={24} className={styles.check} />
    else if (icon) end = <Icon src={icon} size={18} className={styles.icon} />
  }

  return (
    <div
      className={cn(
        styles.field,
        error && styles.error,
        !error && warning && styles.warning,
        active && styles.active,
        valid && !error && styles.valid,
        className,
      )}
      data-filled={filled || undefined}
      style={width ? fixedWidth(width) : undefined}
    >
      <label htmlFor={inputId} className={cn(styles.label, 't-label')}>
        {label}
      </label>
      <div
        className={cn(styles.control, muted && styles.muted, readOnly && styles.readOnly)}
        onMouseDown={(e) => {
          // Clique no padding/ícone também foca o input
          const input = e.currentTarget.querySelector('input')
          if (input && e.target !== input) {
            e.preventDefault()
            input.focus()
          }
        }}
      >
        {control ?? (
          <span className={cn(styles.valueWrap, suffix != null && styles.withSuffix)}>
            <span className={cn(styles.sizer, suffix != null && styles.autosize)} data-value={value || inputProps.placeholder || ''}>
              <input
                ref={inputRef}
                id={inputId}
                className={cn(styles.input, 't-body-lg-medium')}
                value={value}
                readOnly={readOnly}
                aria-invalid={error ? true : undefined}
                aria-describedby={messageId}
                onChange={(e) => onChange?.(mask ? mask(e.target.value) : e.target.value)}
                {...inputProps}
              />
            </span>
            {suffix != null ? <span className={cn(styles.suffix, 't-body-lg-medium')}>{suffix}</span> : null}
          </span>
        )}
        {end}
      </div>
      {message ? (
        <p id={messageId} className={cn(styles.message, 't-caption')} role={error ? 'alert' : undefined}>
          {message}
        </p>
      ) : null}
    </div>
  )
}

// oxlint-disable-next-line react/only-export-components
export const fixedWidth = (px: number) => ({ flex: `0 0 min(${px}px, 42%)`, width: `min(${px}px, 42%)` })

/** Linha de campos lado a lado. stackOnMobile empilha em telas estreitas (campos com textos longos). */
export function FieldRow({ children, className, stackOnMobile }: { children: ReactNode; className?: string; stackOnMobile?: boolean }) {
  return <div className={cn(styles.row, stackOnMobile && styles.stackMobile, className)}>{children}</div>
}
