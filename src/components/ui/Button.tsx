import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import styles from './Button.module.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
  loading?: boolean
  children: ReactNode
}

export function Button({ variant = 'primary', loading, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(styles.button, styles[variant], 't-button-md', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : null}
      <span className={cn(loading && styles.hiddenLabel)}>{children}</span>
    </button>
  )
}

export function FooterGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(styles.footer, className)}>{children}</div>
}
