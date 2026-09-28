import { useId, type ReactNode, type Ref } from 'react'
import { ICONS } from '../../assets'
import { Button } from '../../components/ui/Button'
import { TextLink } from '../../components/ui/Controls'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import styles from './Guided.module.css'

/**
 * Passo do simulador guiado. Ativo: título, descrição, campos e o botão para continuar.
 * Concluído: vira uma linha com o resumo do que foi escolhido e "Editar".
 */
export function GuidedStep({
  n,
  title,
  description,
  status,
  summary,
  onEdit,
  action,
  onAction,
  last,
  stepRef,
  children,
}: {
  n: number
  title: string
  description: string
  status: 'active' | 'done'
  summary: ReactNode
  onEdit: () => void
  action: string
  onAction: () => void
  last?: boolean
  stepRef?: Ref<HTMLElement>
  children: ReactNode
}) {
  const id = useId()
  const active = status === 'active'

  return (
    <section ref={stepRef} className={cn(styles.step, active ? styles.active : styles.done, last && styles.last)} aria-labelledby={id}>
      <div className={styles.rail} aria-hidden>
        <span className={styles.marker}>{active ? n : <Icon src={ICONS.checkBold} size={11} color="var(--fg-primary)" />}</span>
        <span className={styles.line} />
      </div>

      <div className={styles.main}>
        <header className={styles.head}>
          <div className={styles.headText}>
            <h2 id={id} className={cn('t-section-title', styles.title)}>
              {title}
            </h2>
            <p className={active ? styles.description : styles.summary}>{active ? description : summary}</p>
          </div>
          {active ? null : (
            <TextLink tone="primary" onClick={onEdit}>
              Editar
            </TextLink>
          )}
        </header>

        {active ? (
          <div className={styles.body}>
            {children}
            <Button className={styles.action} onClick={onAction}>
              {action}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
