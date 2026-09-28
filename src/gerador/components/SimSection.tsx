import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import styles from './Sim.module.css'

/** Bloco numerado do simulador: número, título, subtítulo e conteúdo, em card */
export function SimSection({
  index,
  title,
  subtitle,
  aside,
  children,
  className,
}: {
  index: number
  title: string
  subtitle?: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <section className={cn(styles.section, className)} aria-labelledby={id}>
      <header className={styles.sectionHead}>
        <span className={styles.sectionIndex} aria-hidden>
          {String(index).padStart(2, '0')}
        </span>
        <div className={styles.sectionText}>
          <h2 id={id} className={cn('t-section-title', styles.sectionTitle)}>
            {title}
          </h2>
          {subtitle ? <p className={cn('t-body-md-medium', styles.sectionSubtitle)}>{subtitle}</p> : null}
        </div>
        {aside ? <div className={styles.sectionAside}>{aside}</div> : null}
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  )
}
