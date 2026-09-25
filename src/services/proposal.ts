import type { CadastroState } from '../state/cadastro'

/**
 * Geração da proposta de contrato.
 * MOCK: substitua pelo POST real do backend. Recebe todo o estado do cadastro.
 */
export async function createProposal(_state: CadastroState): Promise<{ id: string }> {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return { id: String(1_000_000 + Math.floor(Math.random() * 9_000_000)) }
}
