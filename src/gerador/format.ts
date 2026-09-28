/** Formatação específica do fluxo Gerador (o resto vem de lib/format) */

const nf = (min: number, max: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max })

/** Número pt-BR com até `digits` casas: 23.7 → "23,7" */
export const num = (value: number, digits = 0) => nf(0, digits).format(value)

/** Número pt-BR com casas fixas: 0.8 → "0,80" */
export const fixed = (value: number, digits = 2) => nf(digits, digits).format(value)

export const pct = (value: number, digits = 1) => `${num(value, digits)}%`

/** Valor compacto para eixos e destaques: 3151615 → "R$ 3,15 mi"; 56160 → "R$ 56,2 mil" */
export function compactMoney(value: number) {
  const sign = value < 0 ? '−' : ''
  const abs = Math.abs(value)
  if (abs >= 1e6) return `${sign}R$ ${num(abs / 1e6, 2)} mi`
  if (abs >= 1e4) return `${sign}R$ ${num(abs / 1e3, 1)} mil`
  return `${sign}R$ ${nf(0, 0).format(Math.round(abs))}`
}

/** Moeda com centavos e sinal tipográfico: -52685.53 → "−R$ 52.685,53" */
export function signedMoney(value: number) {
  const abs = `R$ ${nf(2, 2).format(Math.abs(value))}`
  return value < 0 ? `−${abs}` : abs
}

/** Payback em meses: 4.08 → "4,1 meses"; null → "Sem retorno em 36 meses" */
export const paybackLabel = (months: number | null) => (months == null ? 'Sem retorno em 36 meses' : `${num(months, 1)} ${months <= 1 ? 'mês' : 'meses'}`)

/** Horas decimais em "4 h 38 min" */
export function hoursLabel(hours: number) {
  let h = Math.floor(hours)
  let m = Math.round((hours - h) * 60)
  if (m === 60) {
    h += 1
    m = 0
  }
  return m ? `${h} h ${m} min` : `${h} h`
}
