import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ICONS } from '../../assets'
import { cn } from '../../lib/cn'
import { Icon } from './Icon'
import styles from './Modal.module.css'

type ModalProps = {
  open: boolean
  onClose: () => void
  /** Título acessível (quando o header visual não usa <DialogHeader>) */
  label: string
  width?: number
  /** Padding do Dialog: DS usa 40/36 (formulários) e 40/30 (detalhamento) */
  padding?: 'form' | 'compact' | 'flush'
  children: ReactNode
}

export function Modal({ open, onClose, label, width = 552, padding = 'form', children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('input, button:not([data-close])')?.focus())
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(styles.dialog, padding === 'compact' && styles.compact, padding === 'flush' && styles.flush)}
        style={{ maxWidth: width }}
      >
        {children}
        <button type="button" data-close className={styles.close} onClick={onClose} aria-label="Fechar">
          <Icon src={ICONS.close} size={24} className={styles.closeIcon} />
        </button>
      </div>
    </div>,
    document.body,
  )
}

export function DialogHeader({ icon, title, subtitle }: { icon?: string; title: string; subtitle: string }) {
  return (
    <div className={styles.header}>
      {icon ? (
        <span className={styles.headerIcon}>
          <Icon src={icon} size={24} color="var(--fg-primary)" />
        </span>
      ) : null}
      <div className={styles.headerText}>
        <h2 className="t-modal-title">{title}</h2>
        <p className={cn('t-page-subtitle', styles.subtitle)}>{subtitle}</p>
      </div>
    </div>
  )
}
