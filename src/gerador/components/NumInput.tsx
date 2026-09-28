import { useState } from 'react'
import { Field } from '../../components/ui/Field'
import { parseLocaleNumber } from '../../lib/format'
import { fixed } from '../format'

type NumInputProps = {
  label: string
  value: number
  onChange: (value: number) => void
  /** casas decimais exibidas fora de foco */
  decimals?: number
  /** unidade após o valor, ex.: "kWh", "R$/kWh", "%" */
  suffix?: string
  min?: number
  max?: number
  helper?: string
  width?: number
}

/**
 * Campo numérico do simulador: aceita zero (o NumberField atual exige > 0), edita livre e
 * formata ao sair. Os limites finais continuam sendo aplicados pelo modelo.
 */
export function NumInput({ label, value, onChange, decimals = 2, suffix, min = 0, max = Number.POSITIVE_INFINITY, helper, width }: NumInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  const shown = fixed(value, decimals)

  return (
    <Field
      label={label}
      value={draft ?? shown}
      suffix={suffix ? <span>{suffix}</span> : undefined}
      helper={helper}
      width={width}
      inputMode="decimal"
      onFocus={() => setDraft(shown)}
      onBlur={() => setDraft(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      onChange={(text) => {
        setDraft(text)
        if (!/\d/.test(text)) return
        onChange(clamp(parseLocaleNumber(text)))
      }}
    />
  )
}
