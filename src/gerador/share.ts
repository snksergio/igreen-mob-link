import { money } from '../lib/format'
import { paybackLabel } from './format'
import { DEFAULTS, type SimInputs } from './model'

/*
 * Compartilhar e importar a simulação. O documento HTML (simulationDoc.ts) leva as premissas
 * embutidas num <script type="application/json">; "Importar simulação" lê esse bloco (ou um JSON)
 * e devolve só chaves conhecidas, com o mesmo tipo do padrão. Nenhum dado pessoal vai no arquivo.
 */

export const SIM_SCRIPT_ID = 'igreen-mob-simulacao'

/** Conteúdo do bloco embutido no documento */
export type SimulationPayload = { app: 'igreen-mob'; tipo: 'simulacao-eletroposto'; versao: 1; codigo: string; geradoEm: string; inputs: SimInputs }

/** Premissas válidas do objeto (só chaves conhecidas e do mesmo tipo do padrão); `null` se não sobrar nenhuma */
export function sanitizeInputs(data: unknown): Partial<SimInputs> | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key in DEFAULTS && typeof value === typeof DEFAULTS[key as keyof SimInputs]) out[key] = value
  }
  return Object.keys(out).length ? (out as Partial<SimInputs>) : null
}

/** Bloco <script> com as premissas (o "<" vira \u003c para o JSON nunca fechar a tag) */
export function embedPayload(payload: SimulationPayload) {
  return `<script type="application/json" id="${SIM_SCRIPT_ID}">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>`
}

/** Premissas de um arquivo importado: o documento HTML da simulação ou um JSON ({ inputs } ou as próprias premissas) */
export function readSimulationFile(text: string): Partial<SimInputs> | null {
  const source = text.trim()
  if (!source) return null
  const embedded = source.match(new RegExp(`<script[^>]*id="${SIM_SCRIPT_ID}"[^>]*>([\\s\\S]*?)</script>`))
  const json = embedded ? embedded[1] : source.startsWith('{') ? source : null
  if (!json) return null
  try {
    const data: unknown = JSON.parse(json)
    const inputs = data && typeof data === 'object' && 'inputs' in data ? (data as { inputs: unknown }).inputs : data
    return sanitizeInputs(inputs)
  } catch {
    return null
  }
}

export function shareText({ modelo, recebimento, payback }: { modelo: string; recebimento: number; payback: number | null }) {
  const retorno = payback == null ? 'sem retorno nos primeiros 36 meses' : `retorno em ${paybackLabel(payback)}`
  return `Simulei um eletroposto ${modelo} na iGreen Mob: recebimento estimado de ${money(recebimento)} no mês 1 e ${retorno}. Envio o documento com a simulação completa (premissas, DRE e mês a mês).`
}
