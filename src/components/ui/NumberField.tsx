import { useState } from 'react'
import { Field, type FieldProps } from './Field'

type NumberFieldProps = Omit<FieldProps, 'value' | 'onChange' | 'onFocus' | 'onBlur'> & {
  value: number
  onChange: (value: number) => void
  /** Texto exibido fora de foco, ex.: 20 -> "20%" */
  format: (value: number) => string
  /** Texto exibido durante a edição, ex.: 20 -> "20" */
  editFormat?: (value: number) => string
  parse: (text: string) => number
  min?: number
  max?: number
}

/** Field numérico: edita um texto livre e só formata ao sair do campo. */
export function NumberField({ value, onChange, format, editFormat = format, parse, min = 0, max = Number.POSITIVE_INFINITY, ...rest }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  return (
    <Field
      {...rest}
      value={draft ?? format(value)}
      onFocus={() => setDraft(editFormat(value))}
      onBlur={() => setDraft(null)}
      onChange={(text) => {
        setDraft(text)
        const n = parse(text)
        if (Number.isFinite(n) && n > 0) onChange(clamp(n))
      }}
    />
  )
}
