import { useEffect, useState } from 'react'
import App from './App'
import { GeradorApp } from './gerador/GeradorApp'
import { isGeradorHash } from './gerador/routes'
import { PropostaV2 } from './proposta/PropostaV2'
import { isPropostaV2Hash } from './proposta/routes'

type Fluxo = 'atual' | 'gerador' | 'proposta-v2'

const fluxoDaRota = (): Fluxo => {
  const hash = window.location.hash
  if (isPropostaV2Hash(hash)) return 'proposta-v2'
  return isGeradorHash(hash) ? 'gerador' : 'atual'
}

/**
 * Escolhe o fluxo pela rota: `#gerador/...` (v1) e `#investir/...` (v2) abrem o fluxo Gerador
 * (simulação completa + cadastro); `#proposta-v2/<número>` abre o modelo novo da proposta gerada (prévia local,
 * com dados de exemplo); qualquer outra rota abre o fluxo atual (`App`), que continua intacto.
 */
export default function Root() {
  const [fluxo, setFluxo] = useState(fluxoDaRota)

  useEffect(() => {
    const sync = () => setFluxo(fluxoDaRota())
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  if (fluxo === 'proposta-v2') return <PropostaV2 />
  return fluxo === 'gerador' ? <GeradorApp /> : <App />
}
