import { useEffect, useState } from 'react'
import App from './App'
import { GeradorApp } from './gerador/GeradorApp'
import { isGeradorHash } from './gerador/routes'

const isGerador = () => isGeradorHash(window.location.hash)

/**
 * Escolhe o fluxo pela rota: `#gerador/...` (v1) e `#investir/...` (v2) abrem o fluxo Gerador
 * (simulação completa + cadastro); qualquer outra rota abre o fluxo atual (`App`), que continua intacto.
 */
export default function Root() {
  const [gerador, setGerador] = useState(isGerador)

  useEffect(() => {
    const sync = () => setGerador(isGerador())
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  return gerador ? <GeradorApp /> : <App />
}
