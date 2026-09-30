import { money } from '../lib/format'
import { recebidoAcumulado } from './guided'
import { CHARGER_IDS, DEFAULTS, calculate, clampInputs, type SimInputs, type SimResult } from './model'

/*
 * Compartilhar e importar a simulação. O documento HTML (simulationDoc.ts) leva as premissas
 * embutidas num <script type="application/json">. Como o arquivo pode ser editado, "Importar simulação":
 * - só aceita os campos que a pessoa consegue editar no simulador (o resto segue as regras atuais);
 * - só aceita o tipo e as opções válidas de cada campo e aplica os limites do modelo;
 * - refaz todo o cálculo com o modelo atual e avisa se o resultado não bate com o do documento.
 * Nenhum dado pessoal vai no arquivo.
 */

export const SIM_SCRIPT_ID = 'igreen-mob-simulacao'

/** Campos editáveis no simulador: os únicos que o documento pode trazer */
const EDITAVEIS = [
  'charger',
  'cars',
  'days',
  'kwh',
  'cost',
  'sale',
  'share',
  'monthlyClients',
  'energyEnabled',
  'insuranceEnabled',
  'telecomEnabled',
  'incomeMode',
  'pisRate',
  'cofinsRate',
  'taxCredit',
  'pisExclusion',
  'localMode',
  'localRate',
  'commissionMode',
  'commissionRate',
  'taxAdditions',
] as const satisfies readonly (keyof SimInputs)[]

const OPCOES: Partial<Record<keyof SimInputs, readonly string[]>> = {
  charger: CHARGER_IDS,
  incomeMode: ['combined', 'charging'],
  localMode: ['unset', 'provision', 'included'],
  commissionMode: ['unset', 'rate'],
}

/**
 * Resultado registrado no documento (para conferir com o recálculo ao importar). Sem retorno nem saldo: somados ao
 * recebido, revelariam o investimento. Documentos antigos trazem `retornoMeses` e `saldo36`, que ainda são conferidos.
 */
export type ResumoDocumento = { recebimentoMes1: number; recebido36: number }
type ResumoAntigo = { retornoMeses?: number | null; saldo36?: number }

/** Conteúdo do bloco embutido no documento */
export type SimulationPayload = {
  app: 'igreen-mob'
  tipo: 'simulacao-eletroposto'
  versao: 1
  codigo: string
  geradoEm: string
  inputs: SimInputs
  resumo: ResumoDocumento
}

/** Resultado que o documento mostra (cenário escolhido, mês 1) */
export function resumoDe(inputs: SimInputs, result: SimResult): ResumoDocumento {
  const combined = inputs.incomeMode === 'combined'
  const m1 = result.months[0]
  return {
    recebimentoMes1: combined ? m1.totalInvestor : m1.investorRechargeCash,
    recebido36: recebidoAcumulado(result, combined)[36],
  }
}

/** Só os campos editáveis, com o tipo do padrão e (quando houver) uma das opções válidas; `null` se não sobrar nenhum */
export function sanitizeInputs(data: unknown): Partial<SimInputs> | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const source = data as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of EDITAVEIS) {
    const value = source[key]
    if (typeof value !== typeof DEFAULTS[key]) continue
    if (typeof value === 'number' && !Number.isFinite(value)) continue
    const opcoes = OPCOES[key]
    if (opcoes && !opcoes.includes(value as string)) continue
    out[key] = value
  }
  return Object.keys(out).length ? (out as Partial<SimInputs>) : null
}

/** Bloco <script> com as premissas (o "<" vira \u003c para o JSON nunca fechar a tag) */
export function embedPayload(payload: SimulationPayload) {
  return `<script type="application/json" id="${SIM_SCRIPT_ID}">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>`
}

const igual = (a: number | null, b: number | null) => (a == null || b == null ? a === b : Math.abs(a - b) < 0.01)

/**
 * Premissas de um arquivo importado (documento HTML da simulação ou JSON), já com os limites aplicados.
 * `divergente`: o resultado recalculado com as regras atuais não bate com o registrado no documento
 * (documento alterado ou cálculo atualizado desde que foi gerado).
 */
/** `base`: premissas da versão que importa (os campos não editáveis vêm dela, não do arquivo) */
export function readSimulationFile(text: string, base: SimInputs = DEFAULTS): { inputs: SimInputs; divergente: boolean } | null {
  const source = text.trim()
  if (!source) return null
  const embedded = source.match(new RegExp(`<script[^>]*id="${SIM_SCRIPT_ID}"[^>]*>([\\s\\S]*?)</script>`))
  const json = embedded ? embedded[1] : source.startsWith('{') ? source : null
  if (!json) return null
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }
  const wrapped = data && typeof data === 'object' && 'inputs' in data
  const campos = sanitizeInputs(wrapped ? (data as { inputs: unknown }).inputs : data)
  if (!campos) return null

  const inputs = clampInputs({ ...base, ...campos })
  const registrado = wrapped ? (data as { resumo?: Partial<ResumoDocumento> & ResumoAntigo }).resumo : undefined
  let divergente = false
  if (registrado && typeof registrado === 'object') {
    const calculado = calculate(inputs)
    const atual = resumoDe(inputs, calculado)
    const combined = inputs.incomeMode === 'combined'
    divergente =
      !igual(atual.recebimentoMes1, Number(registrado.recebimentoMes1)) ||
      ('recebido36' in registrado && !igual(atual.recebido36, Number(registrado.recebido36))) ||
      ('saldo36' in registrado && !igual(combined ? calculado.net36 : calculado.months[35].chargingNetAccumulated, Number(registrado.saldo36))) ||
      ('retornoMeses' in registrado &&
        !igual(combined ? calculado.payback : calculado.chargingPayback, registrado.retornoMeses == null ? null : Number(registrado.retornoMeses)))
  }
  return { inputs, divergente }
}

export function shareText({ modelo, recebimento }: { modelo: string; recebimento: number }) {
  return `Simulei um eletroposto ${modelo} na iGreen Mob: recebimento estimado de ${money(recebimento)} no mês 1. Envio o documento com a simulação completa (premissas, DRE e mês a mês).`
}
