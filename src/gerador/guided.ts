import { money } from '../lib/format'
import { DEFAULTS, TERMS, type ChargerId, type SimInputs, type SimResult } from './model'
import type { GeradorVersion } from './routes'

/* Dados do simulador v2 usados pelo formulário, pelo painel e pelo documento da simulação */

export const POTENCIA = { lento: '7 kW', duo: '7 + 40 kW', ultra: '80 kW' } as const

export const CONEXOES = [
  { key: 'energyEnabled' as const, nome: 'Energia', valor: TERMS.energyBill * TERMS.energyCommission, detalhe: `${TERMS.energyCommission * 100}% de ${money(TERMS.energyBill)}` },
  { key: 'insuranceEnabled' as const, nome: 'Seguros', valor: TERMS.insuranceBill * TERMS.insuranceCommission, detalhe: `${TERMS.insuranceCommission * 100}% de ${money(TERMS.insuranceBill)}` },
  { key: 'telecomEnabled' as const, nome: 'Telecom', valor: TERMS.telecomCommission, detalhe: 'por linha' },
]

export const TAX_KEYS = ['pisRate', 'cofinsRate', 'taxCredit', 'pisExclusion', 'localMode', 'localRate', 'taxAdditions', 'commissionMode', 'commissionRate'] as const

export const taxCustom = (s: SimInputs) => TAX_KEYS.some((k) => s[k] !== DEFAULTS[k])

/*
 * Carteira por dia: a v2 pergunta quantos clientes o ponto conecta por dia, com sugestão por modelo.
 * O modelo continua em clientes por mês = clientes por dia × dias de operação.
 */
export const CLIENTES_DIA: Record<ChargerId, number> = { lento: 1, duo: 2, ultra: 5 }
export const MAX_CLIENTES_DIA = 20

export const clientesPorDia = (s: SimInputs) => Math.round(s.monthlyClients / s.days)

/** Premissas iniciais de cada versão (a v2 já parte dos clientes por dia do modelo padrão) */
export const defaultsFor = (version: GeradorVersion): SimInputs =>
  version === 'v2' ? { ...DEFAULTS, monthlyClients: CLIENTES_DIA[DEFAULTS.charger] * DEFAULTS.days } : DEFAULTS

/**
 * A v2 não mostra o valor do investimento nem o que depende dele: retorno (payback), ROI e saldo descontando o
 * investimento. No lugar, os gráficos e totais usam o recebido acumulado (começa em zero).
 */
export const ocultaCapital = (version: GeradorVersion) => version === 'v2'

/** Recebido acumulado mês a mês; índice 0 = início (zero), índice 36 = total dos 36 meses */
export function recebidoAcumulado(result: SimResult, combined: boolean): number[] {
  let soma = 0
  return [0, ...result.months.map((m) => (soma += combined ? m.totalInvestor : m.investorRechargeCash))]
}

/** Totais do recebido para os cards da v2: ano 1, 36 meses e média por mês */
export function totaisRecebidos(result: SimResult, combined: boolean) {
  const acc = recebidoAcumulado(result, combined)
  return { ano1: acc[12], total36: acc[36], mediaMes: acc[36] / 36 }
}
