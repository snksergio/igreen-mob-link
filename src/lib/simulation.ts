import { PREMISSAS, VALOR_REDE, percentualDe } from '../data/investment'

export type SimulationInput = {
  aporte: number
  /** Grau de ocupação das vagas, em % (0–100) */
  ocupacao: number
  precoKwh: number
}

export type Simulation = {
  aporte: number
  percentual: number
  faturamento: number
  custoEnergia: number
  impostos: number
  administracao: number
  manutencao: number
  distribuivel: number
  mensal: number
  anual: number
  contrato: number
  recargasPorVagaDia: number
  ticketMedio: number
  divisao: { key: string; label: string; value: number; share: number; color: string }[]
}

export function simulate({ aporte, ocupacao, precoKwh }: SimulationInput): Simulation {
  const p = PREMISSAS
  const kwhDia = p.vagas * p.potenciaKw * 24 * (ocupacao / 100)
  const kwhMes = kwhDia * p.diasMes

  const faturamento = kwhMes * precoKwh
  const custoEnergia = kwhMes * p.custoEnergiaKwh
  const impostos = faturamento * p.impostos
  const administracao = faturamento * p.taxaAdministracao
  const manutencao = p.manutencaoMensal
  const distribuivel = Math.max(0, faturamento - custoEnergia - impostos - administracao - manutencao)

  const mensal = distribuivel * (aporte / VALOR_REDE)
  const anual = mensal * 12

  const share = (v: number) => (faturamento > 0 ? v / faturamento : 0)

  return {
    aporte,
    percentual: percentualDe(aporte),
    faturamento,
    custoEnergia,
    impostos,
    administracao,
    manutencao,
    distribuivel,
    mensal,
    anual,
    contrato: anual * p.contratoAnos,
    recargasPorVagaDia: kwhDia / p.vagas / p.kwhPorRecarga,
    ticketMedio: precoKwh * p.kwhPorRecarga,
    divisao: [
      { key: 'energia', label: 'Custo de energia', value: custoEnergia, share: share(custoEnergia), color: 'var(--chart-energy)' },
      { key: 'impostos', label: 'Impostos', value: impostos, share: share(impostos), color: 'var(--chart-taxes)' },
      { key: 'adm', label: 'Taxa de administração', value: administracao, share: share(administracao), color: 'var(--chart-admin)' },
      { key: 'manutencao', label: 'Manutenção', value: manutencao, share: share(manutencao), color: 'var(--chart-maintenance)' },
      { key: 'resultado', label: 'Resultado distribuível', value: distribuivel, share: share(distribuivel), color: 'var(--chart-result)' },
    ],
  }
}

/** Converte recargas/vaga/dia + ticket médio para ocupação (%) + preço/kWh */
export function fromRecargas(recargas: number, ticket: number) {
  const p = PREMISSAS
  return {
    ocupacao: ((recargas * p.kwhPorRecarga) / (p.potenciaKw * 24)) * 100,
    precoKwh: ticket / p.kwhPorRecarga,
  }
}
