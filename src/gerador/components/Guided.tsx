import { useId, useState, type ReactNode } from 'react'
import { Field } from '../../components/ui/Field'
import { cn } from '../../lib/cn'
import { parseLocaleNumber } from '../../lib/format'
import { fixed } from '../format'
import type { SimInputs } from '../model'
import { useGerador } from '../state'
import styles from './Guided.module.css'

type NumericField = { [K in keyof SimInputs]: SimInputs[K] extends number ? K : never }[keyof SimInputs]

/** Seção do formulário v2: título, descrição e campos. Entra com uma animação curta quando é liberada */
export function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className={styles.section} aria-labelledby={id}>
      <header className={styles.sectionHead}>
        <h2 id={id} className={cn('t-section-title', styles.sectionTitle)}>
          {title}
        </h2>
        <p className={styles.sectionText}>{description}</p>
      </header>
      {children}
    </section>
  )
}

/**
 * Campo numérico do formulário v2: começa vazio (com um exemplo), marca o campo como preenchido
 * no primeiro número digitado e mostra o check quando está preenchido e fora de foco.
 */
export function FormNumber({
  field,
  label,
  suffix,
  decimals = 0,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  placeholder,
  helper,
}: {
  field: NumericField
  label: string
  suffix?: string
  decimals?: number
  min?: number
  max?: number
  placeholder: string
  helper?: ReactNode
}) {
  const { state, setSim, patch } = useGerador()
  const { inputs, preenchidos } = state.simulacao
  const filled = preenchidos.includes(field)
  const [draft, setDraft] = useState<string | null>(null)
  const shown = filled ? fixed(inputs[field], decimals) : ''
  const typed = draft && /\d/.test(draft) ? parseLocaleNumber(draft) : null

  return (
    <Field
      label={label}
      value={draft ?? shown}
      placeholder={placeholder}
      suffix={suffix ? <span>{suffix}</span> : undefined}
      helper={helper}
      warning={typed != null && typed > max ? `Máximo de ${fixed(max, decimals)}: usamos esse valor` : undefined}
      valid={filled && draft == null}
      inputMode={decimals ? 'decimal' : 'numeric'}
      onFocus={() => setDraft(shown)}
      onBlur={() => setDraft(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      onChange={(text) => {
        const clean = decimals ? text.replace(/[^\d,.]/g, '') : text.replace(/\D/g, '')
        setDraft(clean)
        if (!/\d/.test(clean)) return
        setSim({ [field]: Math.min(max, Math.max(min, parseLocaleNumber(clean))) })
        if (!filled) patch('simulacao', { preenchidos: [...preenchidos, field] })
      }}
    />
  )
}
