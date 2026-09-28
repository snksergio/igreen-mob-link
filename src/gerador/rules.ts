import { isFullName, isValidCep, isValidCnpj, isValidCpf, isValidDate, isValidEmail, isValidPhone } from '../lib/validators'
import type { Address } from '../services/address'
import type { GeradorState } from './state'

/** Maior de idade na data informada (dd/mm/aaaa) */
export function isAdult(date: string) {
  const [dd, mm, yyyy] = date.split('/').map(Number)
  const eighteen = new Date(yyyy + 18, mm - 1, dd)
  return eighteen.getTime() <= Date.now()
}

const enderecoCompleto = (e: Address) => Boolean(e.logradouro || e.cidade) && Boolean(e.numero.trim()) && (!e.cep || isValidCep(e.cep))

/** Mesmas regras de validação da etapa "Seus dados" */
export function investidorCompleto(inv: GeradorState['investidor']) {
  const pf = inv.tipo === 'pf'
  const doc = pf ? isValidCpf(inv.documento) : isValidCnpj(inv.documento)
  const nome = pf ? isFullName(inv.nome) : Boolean(inv.nome.trim())
  const nascimento = isValidDate(inv.nascimento, { past: true }) && (!pf || isAdult(inv.nascimento))
  return doc && nome && nascimento && isValidEmail(inv.email) && isValidPhone(inv.whatsapp) && enderecoCompleto(inv.endereco)
}

export const eletropostoCompleto = (e: GeradorState['eletroposto']) => enderecoCompleto(e.endereco)
