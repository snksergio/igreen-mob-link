import type { CSSProperties } from 'react'
import { cn } from '../../lib/cn'
import styles from './Icon.module.css'

type IconProps = {
  /** SVG exportado do Figma — usado como máscara para poder trocar a cor por estado */
  src: string
  size?: number
  color?: string
  className?: string
  label?: string
}

/** Ícone monocromático recolorível (máscara CSS sobre o SVG original do Figma). */
export function Icon({ src, size = 18, color, className, label }: IconProps) {
  const style = {
    width: size,
    height: size,
    '--icon-src': `url("${src}")`,
    ...(color ? { backgroundColor: color } : null),
  } as CSSProperties
  return (
    <span
      className={cn(styles.icon, className)}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}

/** Ícone multicolorido — renderiza o SVG original como imagem. */
export function Img({ src, size = 18, className, alt = '' }: { src: string; size?: number; className?: string; alt?: string }) {
  return <img src={src} width={size} height={size} alt={alt} className={cn(styles.img, className)} style={{ width: size, height: size }} />
}
