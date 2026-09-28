import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import styles from './Guided.module.css'

/**
 * Entra com uma animação curta quando chega perto da área visível na rolagem (e fica).
 * O conteúdo está sempre na página: só "aparece" na hora em que a pessoa chega nele.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el || shown) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setShown(true)
        io.disconnect()
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shown])

  return (
    <div ref={ref} className={cn(styles.reveal, shown && styles.revealShown, className)}>
      {children}
    </div>
  )
}

/** Seção do formulário v2: título, descrição e campos, aparecendo na rolagem */
export function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const id = useId()
  return (
    <Reveal className={styles.sectionWrap}>
      <section className={styles.section} aria-labelledby={id}>
        <header className={styles.sectionHead}>
          <h2 id={id} className={cn('t-section-title', styles.sectionTitle)}>
            {title}
          </h2>
          <p className={styles.sectionText}>{description}</p>
        </header>
        {children}
      </section>
    </Reveal>
  )
}
