/**
 * Regras de investimento (carregadores, aportes pré-definidos e premissas do eletroposto).
 * Os números da projeção reproduzem o Figma (aporte R$ 100.000 -> R$ 2.016/mês).
 * Ajuste aqui quando o backend passar a fornecer esses dados.
 */
export const PREMISSAS = {
  vagas: 4,
  potenciaKw: 40,
  custoEnergiaKwh: 0.98,
  impostos: 0.15,
  taxaAdministracao: 0.05,
  manutencaoMensal: 1500,
  contratoAnos: 5,
  diasMes: 30,
  /** kWh médios por recarga — converte "por energia" <-> "por recarga" */
  kwhPorRecarga: 20,
} as const

/** Valor total da rede: a participação do investidor é aporte / VALOR_REDE */
export const VALOR_REDE = 1_000_000
export const PERCENTUAL_FATURAMENTO_LIQUIDO = 70
export const MAX_CARREGADORES = 20

export const DEFAULTS = {
  ocupacao: 20,
  precoKwh: 2.4,
}

export type TipoCarregador = 'lenta' | 'rapida' | 'ultra'

export type Carregador = {
  tipo: TipoCarregador
  nome: string
  preco: number
  potenciaKw: number
  corrente: 'AC' | 'DC'
  conectores: number
  vagas: number
  icon: 'energyCircle' | 'eletric' | 'energyLink'
}

export const CARREGADORES: Carregador[] = [
  { tipo: 'lenta', nome: 'Carga Lenta', preco: 10_000, potenciaKw: 7, corrente: 'AC', conectores: 1, vagas: 1, icon: 'energyCircle' },
  { tipo: 'rapida', nome: 'Carga Rápida', preco: 80_000, potenciaKw: 40, corrente: 'DC', conectores: 2, vagas: 1, icon: 'eletric' },
  { tipo: 'ultra', nome: 'Carga Ultra-Rápida', preco: 110_000, potenciaKw: 80, corrente: 'DC', conectores: 2, vagas: 1, icon: 'energyLink' },
]

export const carregador = (tipo: TipoCarregador) => CARREGADORES.find((c) => c.tipo === tipo) ?? CARREGADORES[0]

/** "7kw AC" — rótulo exibido entre parênteses ao lado do aporte */
export const modeloLabel = (tipo: TipoCarregador) => {
  const c = carregador(tipo)
  return `${c.potenciaKw}kw ${c.corrente}`
}

export const specsLabel = (c: Carregador) =>
  `${c.potenciaKw} kW · ${c.conectores} ${c.conectores > 1 ? 'conectores' : 'conector'} · ${c.vagas} ${c.vagas > 1 ? 'vagas' : 'vaga'}`

export type Investimento = { tipo: TipoCarregador; quantidade: number }

export const aporteDe = ({ tipo, quantidade }: Investimento) => carregador(tipo).preco * quantidade
export const percentualDe = (aporte: number) => (aporte / VALOR_REDE) * 100

/** Aportes pré-definidos do simulador (o range percorre esta lista, em ordem de valor) */
export const APORTES: Investimento[] = [
  { tipo: 'lenta', quantidade: 1 },
  { tipo: 'lenta', quantidade: 2 },
  { tipo: 'lenta', quantidade: 3 },
  { tipo: 'lenta', quantidade: 5 },
  { tipo: 'rapida', quantidade: 1 },
  { tipo: 'lenta', quantidade: 10 },
  { tipo: 'ultra', quantidade: 1 },
  { tipo: 'rapida', quantidade: 2 },
  { tipo: 'ultra', quantidade: 2 },
  { tipo: 'rapida', quantidade: 3 },
  { tipo: 'ultra', quantidade: 3 },
]

export const INVESTIMENTO_PADRAO: Investimento = { tipo: 'lenta', quantidade: 10 }
