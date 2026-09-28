/**
 * Endereços do fluxo Gerador (rotas por hash):
 * - v1, simulador com abas: #gerador, #gerador/simulador, #gerador/dados…
 * - v2, formulário linear: #investir, #investir/simulador, #investir/dados…
 * #gerador2 é o endereço antigo da v2: continua abrindo e é trocado por #investir.
 */
export type GeradorVersion = 'v1' | 'v2'

export const BASE: Record<GeradorVersion, string> = { v1: 'gerador', v2: 'investir' }

const ALIASES: Record<string, GeradorVersion> = { gerador: 'v1', investir: 'v2', gerador2: 'v2' }

/** Primeiro trecho do hash: "#investir/resumo?x" → "investir" */
export const baseOf = (hash: string) => hash.replace('#', '').split(/[/?]/)[0]

export const versionOfBase = (base: string): GeradorVersion | null => ALIASES[base] ?? null

/** O hash abre o fluxo Gerador (qualquer versão ou endereço antigo)? */
export const isGeradorHash = (hash: string) => versionOfBase(baseOf(hash)) != null
