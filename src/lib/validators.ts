import { onlyDigits } from './format'

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10])
}

export function isValidCnpj(value: string) {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = weights.reduce((acc, w, i) => acc + Number(cnpj[i]) * w, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13])
}

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())

export const isValidPhone = (value: string) => {
  const d = onlyDigits(value)
  return d.length === 10 || d.length === 11
}

export const isValidCep = (value: string) => onlyDigits(value).length === 8

export function isValidDate(value: string, { past = false } = {}) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!m) return false
  const [, dd, mm, yyyy] = m.map(Number)
  const date = new Date(yyyy, mm - 1, dd)
  const valid = date.getFullYear() === yyyy && date.getMonth() === mm - 1 && date.getDate() === dd
  if (!valid || yyyy < 1900) return false
  return past ? date.getTime() < Date.now() : true
}

export const isFullName = (value: string) => value.trim().split(/\s+/).filter(Boolean).length >= 2
