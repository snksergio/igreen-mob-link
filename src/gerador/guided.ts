import { money } from '../lib/format'
import { DEFAULTS, TERMS, type SimInputs } from './model'

/* Dados do simulador v2 usados pelo formulário, pelo painel e pelo documento da simulação */

export const POTENCIA = { lento: '7 kW', duo: '7 + 40 kW', ultra: '80 kW' } as const

export const CONEXOES = [
  { key: 'energyEnabled' as const, nome: 'Energia', valor: TERMS.energyBill * TERMS.energyCommission, detalhe: `${TERMS.energyCommission * 100}% de ${money(TERMS.energyBill)}` },
  { key: 'insuranceEnabled' as const, nome: 'Seguros', valor: TERMS.insuranceBill * TERMS.insuranceCommission, detalhe: `${TERMS.insuranceCommission * 100}% de ${money(TERMS.insuranceBill)}` },
  { key: 'telecomEnabled' as const, nome: 'Telecom', valor: TERMS.telecomCommission, detalhe: 'por linha' },
]

export const TAX_KEYS = ['pisRate', 'cofinsRate', 'taxCredit', 'pisExclusion', 'localMode', 'localRate', 'taxAdditions', 'commissionMode', 'commissionRate'] as const

export const taxCustom = (s: SimInputs) => TAX_KEYS.some((k) => s[k] !== DEFAULTS[k])
