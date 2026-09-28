import type { GeradorState } from './state'

/**
 * Geração da proposta do fluxo Gerador.
 * MOCK: substitua pelo POST real do backend. Recebe todo o estado (simulação + cadastro).
 */
export async function createGeradorProposal(_state: GeradorState): Promise<{ id: string }> {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return { id: String(1_000_000 + Math.floor(Math.random() * 9_000_000)) }
}
