import type { ReactNode } from 'react'
import { ICONS } from '../../assets'
import { ResponsavelBadge, Stepper, ThemeToggle } from '../../components/layout/PageShell'
import { cn } from '../../lib/cn'
import { useGerador } from '../state'
import styles from './Shell.module.css'

/** Etapas com header: simulação, dados, eletroposto, resumo (a proposta final fica sem stepper) */
export const ETAPAS = 4

/** Estrutura de página do fluxo Gerador — duplicada do PageShell do fluxo atual (que não é alterado) */
function Isotipo() {
  const { go } = useGerador()
  return (
    <button type="button" className={styles.isotipo} onClick={() => go('inicio')} aria-label="iGreen Mob — voltar ao início">
      <img src={ICONS.logoIsotipo} width={14.787} height={20.571} alt="" />
    </button>
  )
}

/** `label` (ex.: "ETAPA 1 DE 4"): no mobile sobe para a linha do logo, ao lado do responsável */
export function GeradorHeader({ step, label }: { step?: number; label?: string }) {
  return (
    <header className={styles.headerController}>
      <div className={styles.headerTop}>
        <Isotipo />
        {label ? <span className={cn(styles.badge, styles.badgeTop, 't-label')}>{label}</span> : null}
        <div className={styles.headerRight}>
          <ThemeToggle />
          <ResponsavelBadge />
        </div>
      </div>
      {step ? <Stepper step={step} /> : null}
    </header>
  )
}

export function GeradorPageHeader({ badge, title, subtitle, className }: { badge?: string; title: ReactNode; subtitle: ReactNode; className?: string }) {
  return (
    <div className={cn(styles.pageHeader, className)}>
      {badge ? <span className={cn(styles.badge, styles.badgePage, 't-label')}>{badge}</span> : null}
      <div className={styles.titleRow}>
        <h1 className="t-page-title">{title}</h1>
        <p className={cn('t-page-subtitle', styles.subtitle)}>{subtitle}</p>
      </div>
    </div>
  )
}

const etapaLabel = (step: number) => `ETAPA ${step} DE ${ETAPAS}`

/**
 * Página de etapa: header + título + conteúdo + rodapé. Com `onSubmit` vira formulário.
 * `wide` libera a largura para o simulador (painel lateral).
 * `aside`: conteúdo fixo à direita no desktop (ex.: resumo da simulação), alinhado ao título.
 */
export function GeradorStepPage({
  step,
  title,
  subtitle,
  children,
  footer,
  onSubmit,
  wide,
  aside,
}: {
  step: number
  title: ReactNode
  subtitle: ReactNode
  children: ReactNode
  footer?: ReactNode
  onSubmit?: () => void
  wide?: boolean
  aside?: ReactNode
}) {
  const body = (
    <>
      <GeradorPageHeader badge={etapaLabel(step)} title={title} subtitle={subtitle} />
      <div className={styles.container}>
        <div className={styles.body}>{children}</div>
        {footer}
      </div>
    </>
  )
  const column = (
    <div className={styles.column}>
        <GeradorHeader step={step} label={etapaLabel(step)} />
        {onSubmit ? (
          <form
            className={styles.form}
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              onSubmit()
            }}
          >
            {body}
          </form>
        ) : (
          <div className={styles.form}>{body}</div>
        )}
    </div>
  )

  return (
    <main className={cn(styles.page, wide && styles.wide)}>
      {aside ? (
        <div className={styles.withAside}>
          {column}
          <aside className={styles.aside}>{aside}</aside>
        </div>
      ) : (
        column
      )}
    </main>
  )
}
