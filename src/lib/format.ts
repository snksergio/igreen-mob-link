export const onlyDigits = (value: string) => value.replace(/\D/g, '')

function applyPattern(digits: string, pattern: string) {
  let out = ''
  let i = 0
  for (const char of pattern) {
    if (i >= digits.length) break
    if (char === '#') out += digits[i++]
    else out += char
  }
  return out
}

export const maskCpf = (v: string) => applyPattern(onlyDigits(v).slice(0, 11), '###.###.###-##')
export const maskCnpj = (v: string) => applyPattern(onlyDigits(v).slice(0, 14), '##.###.###/####-##')
export const maskCep = (v: string) => applyPattern(onlyDigits(v).slice(0, 8), '#####-###')
export const maskDate = (v: string) => applyPattern(onlyDigits(v).slice(0, 8), '##/##/####')

export function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11)
  return d.length > 10 ? applyPattern(d, '(##) #####-####') : applyPattern(d, '(##) ####-####')
}

const brl0 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const brl2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** R$ 100.000 */
export const money = (value: number) => `R$ ${brl0.format(Math.round(value))}`
/** R$ 100.000,00 */
export const moneyCents = (value: number) => `R$ ${brl2.format(value)}`
/** "2.016" e "00" separados, para o valor em destaque do card verde */
export function moneyParts(value: number) {
  const [int, cents] = brl2.format(value).split(',')
  return { int, cents }
}

export const decimal = (value: number, digits = 1) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)

/** Converte "R$ 2,40" / "2,4" / "20%" em número */
export function parseLocaleNumber(value: string) {
  const clean = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number.parseFloat(clean)
  return Number.isFinite(n) ? n : 0
}

/** Máscara monetária enquanto digita: 240 -> "2,40" */
export function maskMoneyInput(value: string) {
  const digits = onlyDigits(value).replace(/^0+(?=\d)/, '')
  if (!digits) return ''
  return brl2.format(Number(digits) / 100)
}

const UNITS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
  'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const TENS = ['', '', 'vinte', 'trinta', 'quarenta']

/** Número por extenso (0–40), usado em "4 (quatro)" */
export function spelled(n: number) {
  if (n < 20) return UNITS[n]
  const t = Math.floor(n / 10)
  const u = n % 10
  return u === 0 ? TENS[t] : `${TENS[t]} e ${UNITS[u]}`
}

export const pad2 = (n: number) => String(n).padStart(2, '0')

export function todayBr() {
  const d = new Date()
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}
