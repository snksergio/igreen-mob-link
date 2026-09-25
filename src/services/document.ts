import type { Address } from './address'
import { emptyAddress } from './address'

/**
 * Preenchimento automático do endereço do investidor a partir do CPF/CNPJ.
 * Desligado: a consulta abaixo é um mock que sempre devolve o endereço do Figma.
 * Ligue quando houver uma consulta real (bureau de dados) no backend.
 */
export const AUTO_ENDERECO_POR_DOCUMENTO = false

/**
 * Consulta de endereço a partir do CPF/CNPJ.
 * MOCK: substitua pela chamada real do backend (bureau de dados) quando disponível.
 * Retorna o mesmo endereço exibido no Figma para qualquer CPF válido.
 */
export async function fetchAddressByDocument(_documento: string, signal?: AbortSignal): Promise<Address | null> {
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, 650)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
  return {
    ...emptyAddress,
    cep: '38400-180',
    logradouro: 'Avenida Princesa Isabel',
    bairro: 'Boca da Barra',
    cidade: 'Uberlândia',
    uf: 'MG',
  }
}
