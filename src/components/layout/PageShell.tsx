import type { CSSProperties, ReactNode } from 'react'
import { ICONS } from '../../assets'
import { cn } from '../../lib/cn'
import { getResponsavel } from '../../services/responsavel'
import { useCadastro } from '../../state/cadastro'
import styles from './PageShell.module.css'

export const TOTAL_STEPS = 4

export function Isotipo() {
  const { go } = useCadastro()
  return (
    <button type="button" className={styles.isotipo} onClick={() => go('inicio')} aria-label="iGreen Mob — voltar ao início">
      <img src={ICONS.logoIsotipo} width={14.787} height={20.571} alt="" />
    </button>
  )
}

export function Stepper({ step }: { step: number }) {
  return (
    <div
      className={styles.stepper}
      role="progressbar"
      aria-label="Progresso do cadastro"
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-valuenow={step}
    >
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <span key={i} className={cn(styles.stepItem, i < step && styles.stepActive)} />
      ))}
    </div>
  )
}

/** Selo discreto com o responsável (consultor) que está fazendo o cadastro */
export function ResponsavelBadge() {
  const { nome, iniciais } = getResponsavel()
  return (
    <div className={styles.responsavel} title={`Responsável pelo cadastro: ${nome}`} aria-label={`Responsável pelo cadastro: ${nome}`}>
      <span className={styles.avatar} aria-hidden>
        {iniciais}
      </span>
      <span className={styles.respName} aria-hidden>
        {nome}
      </span>
    </div>
  )
}

/** `label` (ex.: "PASSO 1 DE 4"): no mobile sobe para a linha do logo, ao lado do responsável */
export function HeaderController({ step, label }: { step?: number; label?: string }) {
  return (
    <header className={styles.headerController}>
      <div className={styles.headerTop}>
        <Isotipo />
        {label ? <span className={cn(styles.badge, styles.badgeTop, 't-label')}>{label}</span> : null}
        <ResponsavelBadge />
      </div>
      {step ? <Stepper step={step} /> : null}
    </header>
  )
}

export function PageHeader({ badge, title, subtitle }: { badge: string; title: ReactNode; subtitle: ReactNode }) {
  return (
    <div className={styles.pageHeader}>
      <span className={cn(styles.badge, styles.badgePage, 't-label')}>{badge}</span>
      <div className={styles.titleRow}>
        <h1 className="t-page-title">{title}</h1>
        <p className={cn('t-page-subtitle', styles.subtitle)}>{subtitle}</p>
      </div>
    </div>
  )
}

export const Highlight = ({ children }: { children: ReactNode }) => <span className={styles.highlight}>{children}</span>

/** Coluna de 480px centralizada, a 72px do topo — estrutura base das telas do cadastro. */
export function StepPage({
  step,
  badge,
  title,
  subtitle,
  children,
  footer,
  onSubmit,
}: {
  step: number
  badge?: string
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer: ReactNode
  onSubmit: () => void
}) {
  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <HeaderController step={step} label={badge ?? `PASSO ${step} DE ${TOTAL_STEPS}`} />
        <form
          className={styles.form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <PageHeader
            badge={badge ?? `PASSO ${step} DE ${TOTAL_STEPS}`}
            title={title}
            subtitle={subtitle ?? 'Simples, fácil e seguro. Informe os seus dados para começar a economizar.'}
          />
          <div className={styles.container}>
            <div className={styles.body}>{children}</div>
            {footer}
          </div>
        </form>
      </div>
    </main>
  )
}

/** Coluna com espaçamento `gap` (px); no mobile o espaçamento encolhe proporcionalmente (ver CSS) */
export function Stack({ gap, children, className, style }: { gap: number; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn(styles.stack, className)} style={{ '--gap': `${gap}px`, ...style } as CSSProperties}>
      {children}
    </div>
  )
}
