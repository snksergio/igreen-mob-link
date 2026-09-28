import { money } from '../lib/format'
import { paybackLabel } from './format'
import { DEFAULTS, type SimInputs } from './model'

/*
 * Link de compartilhamento: só as premissas da simulação (nenhum dado pessoal), guardando apenas o que
 * difere do padrão, em JSON → base64url. Quem abre vê a simulação em #gerador2/visualizar?d=<código>.
 */

const toBase64Url = (text: string) => btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromBase64Url = (code: string) => atob(code.replace(/-/g, '+').replace(/_/g, '/'))

export function encodeSim(inputs: SimInputs): string {
  const diff: Record<string, unknown> = {}
  for (const key of Object.keys(DEFAULTS) as (keyof SimInputs)[]) {
    if (inputs[key] !== DEFAULTS[key]) diff[key] = inputs[key]
  }
  return toBase64Url(JSON.stringify(diff))
}

/** Premissas do código (só chaves conhecidas e do mesmo tipo do padrão); `null` se o código for inválido */
export function decodeSim(code: string): Partial<SimInputs> | null {
  if (!code) return null
  try {
    const data: unknown = JSON.parse(fromBase64Url(code))
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (key in DEFAULTS && typeof value === typeof DEFAULTS[key as keyof SimInputs]) out[key] = value
    }
    return out as Partial<SimInputs>
  } catch {
    return null
  }
}

export function shareUrl(inputs: SimInputs) {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#gerador2/visualizar?d=${encodeSim(inputs)}`
}

/** Código ?d= do hash atual (tela de visualização) */
export function codeFromHash() {
  const [, query = ''] = window.location.hash.split('?')
  return new URLSearchParams(query).get('d') ?? ''
}

export function shareText({ modelo, recebimento, payback, url }: { modelo: string; recebimento: number; payback: number | null; url: string }) {
  const retorno = payback == null ? 'sem retorno nos primeiros 36 meses' : `retorno em ${paybackLabel(payback)}`
  return `Simulei um eletroposto ${modelo} na iGreen Mob: recebimento estimado de ${money(recebimento)} no mês 1 e ${retorno}. Veja a simulação completa: ${url}`
}
