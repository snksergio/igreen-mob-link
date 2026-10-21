import type { ReactNode } from 'react'
import { ICONS } from '../../assets'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import styles from './Proposta.module.css'

/*
 * Peças das folhas das etapas (versão 2). Regra visual: só o que é clicável tem borda e um indicador
 * (chevron em círculo, "Abrir" com seta, botão "Copiar"). Informação fica em texto ou em fundo tingido, sem caixa dentro de caixa.
 */

export type Tom = 'ok' | 'acao' | 'espera' | 'erro'

export function Cabecalho({ titulo, status, tom, children }: { titulo: string; status: string; tom: Tom; children?: ReactNode }) {
  return (
    <header className={styles.folhaHead}>
      <div className={styles.folhaHeadRow}>
        <h3 className={styles.folhaTitulo}>{titulo}</h3>
        <span className={cn(styles.pill, styles[`pill_${tom}`])}>{status}</span>
      </div>
      {children ? <p className={styles.folhaLead}>{children}</p> : null}
    </header>
  )
}

/** `acessorio`: algo pequeno na mesma linha do título, à direita (ex.: o progresso da etapa) */
export function Secao({ titulo, children, nota, acessorio }: { titulo: string; children: ReactNode; nota?: ReactNode; acessorio?: ReactNode }) {
  return (
    <section className={styles.secao}>
      {acessorio ? (
        <div className={styles.secaoTopo}>
          <h4 className={styles.secaoTitulo}>{titulo}</h4>
          {acessorio}
        </div>
      ) : (
        <h4 className={styles.secaoTitulo}>{titulo}</h4>
      )}
      {children}
      {nota ? <p className={styles.nota}>{nota}</p> : null}
    </section>
  )
}

export function Linhas({ itens }: { itens: [string, ReactNode][] }) {
  return (
    <dl className={styles.linhas}>
      {itens.map(([k, v]) => (
        <div key={k} className={styles.linha}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Aviso informativo (não clicável): fundo tingido, ícone e texto */
export function Aviso({ titulo, children, icone = 'cadeado', acao }: { titulo: string; children: ReactNode; icone?: 'cadeado' | 'relogio'; acao?: ReactNode }) {
  return (
    <div className={styles.aviso}>
      <span className={styles.avisoIcone} aria-hidden>
        {icone === 'cadeado' ? <Cadeado /> : <Relogio />}
      </span>
      <div className={styles.avisoTexto}>
        <p className={styles.avisoTitulo}>{titulo}</p>
        <p>{children}</p>
      </div>
      {acao ? <div className={styles.avisoAcao}>{acao}</div> : null}
    </div>
  )
}

export function Cadeado() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function Relogio() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

/** Linha clicável que abre um documento: borda, nome e "Abrir" com seta */
export function LinhaDoc({ titulo, detalhe, onClick, desabilitado }: { titulo: string; detalhe: string; onClick: () => void; desabilitado?: boolean }) {
  return (
    <button type="button" className={styles.linhaDoc} onClick={onClick} disabled={desabilitado}>
      <span className={styles.docIcone} aria-hidden>
        <Icon src={ICONS.fileDollar} size={16} color={desabilitado ? 'var(--fg-muted)' : 'var(--fg-primary)'} />
      </span>
      <span className={styles.linhaDocTexto}>
        <span className={styles.linhaDocTitulo}>{titulo}</span>
        <span className={styles.linhaDocDetalhe}>{detalhe}</span>
      </span>
      {desabilitado ? null : (
        <span className={styles.abrir}>
          Abrir
          <Icon src={ICONS.arrowRight} size={14} color="var(--fg-primary)" />
        </span>
      )}
    </button>
  )
}
