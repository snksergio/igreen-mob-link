import { cn } from '../../lib/cn'
import v from './Vistoria.module.css'

/** Eletroposto: a bomba com um raio na frente e o cabo com o conector */
export function IconeEletroposto({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="3" width="10" height="17" rx="2.2" />
      <path d="M2 21h13" />
      <path d="M13.5 9.5h2.2a1.6 1.6 0 0 1 1.6 1.6v5.2a1.6 1.6 0 0 0 3.2 0V8.2l-2-2.2" />
      <path d="M9.4 6.8 6.9 11.2h3.2l-1 3.9 2.6-4.5H8.5l.9-3.8z" fill="currentColor" strokeWidth="1.1" />
    </svg>
  )
}

/**
 * Selo do ponto (como os ícones dos cards de Detalhes): um quadrado com o eletroposto.
 * `ativo`: ponto aberto ou completo (verde); `ok`: completo, com o ✓ no canto.
 */
export function SeloPonto({ ok = false, ativo = false }: { ok?: boolean; ativo?: boolean }) {
  return (
    <span className={cn(v.selo, (ativo || ok) && v.seloAtivo)} aria-hidden>
      <IconeEletroposto />
      {ok ? (
        <span className={v.seloOk}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      ) : null}
    </span>
  )
}

export function IconeLixeira({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7h16M10 11v6M14 11v6M5.5 7l.9 12.1A2 2 0 0 0 8.4 21h7.2a2 2 0 0 0 2-1.9L18.5 7M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
    </svg>
  )
}
