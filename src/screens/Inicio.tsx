import { useState, type CSSProperties } from 'react'
import { ICONS, IMAGES, VIDEOS } from '../assets'
import { Img } from '../components/ui/Icon'
import { PlayOnceVideo } from '../components/ui/PlayOnceVideo'
import { useAdaptiveVideo } from '../lib/adaptiveVideo'
import { cn } from '../lib/cn'
import { decimal } from '../lib/format'
import { useCountUp } from '../lib/useCountUp'
import { useMediaQuery } from '../lib/useMediaQuery'
import { useCadastro } from '../state/cadastro'
import styles from './Inicio.module.css'

const STATS = { repassadoMi: 1.2, cotasVendidas: 68 }
/** proporção do vídeo/imagem do fundo no desktop (ocupa 100% da altura) */
const HERO_RATIO = 3065 / 2048

export function Inicio() {
  const { go } = useCadastro()
  // Vídeo só no desktop (o mobile usa a imagem própria do Figma) e sem "reduzir movimento".
  // A qualidade acompanha a tela e a conexão; em rede muito ruim fica a imagem estática.
  const desktop = useMediaQuery('(min-width: 768px)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [neededWidth] = useState(() => Math.round(window.innerHeight * HERO_RATIO * Math.min(window.devicePixelRatio || 1, 2)))
  const video = useAdaptiveVideo(VIDEOS.hero, { enabled: desktop && !reducedMotion, neededWidth })

  return (
    <main className={styles.page}>
      <div
        className={cn(styles.background, video.status !== 'image' && styles.backgroundVideo)}
        style={
          {
            '--hero-desktop': `url(${video.status === 'image' && video.lite ? IMAGES.heroDesktopLite : IMAGES.heroDesktop})`,
            '--hero-mobile': `url(${IMAGES.heroMobile})`,
          } as CSSProperties
        }
        aria-hidden
      >
        {/* eletroposto acendendo: toca uma vez e para no último quadro (igual à imagem) */}
        {video.status === 'video' ? <PlayOnceVideo src={video.src} className={styles.video} /> : null}
      </div>

      {/* Cada elemento entra em sequência (--i define a ordem) */}
      <div className={styles.content}>
        <span
          className={cn(styles.logo, styles.reveal)}
          style={{ '--logo': `url(${IMAGES.logoMob})`, '--i': 0 } as CSSProperties}
          role="img"
          aria-label="iGreen Mob"
        />

        <div className={cn(styles.badge, styles.reveal)} style={order(1)}>
          <span className={styles.badgePill}>
            <Img src={ICONS.lightning} size={12} />
            Investimento
          </span>
          <span className={styles.badgeText}>Renda com energia limpa</span>
        </div>

        {/* Desktop */}
        <div className={styles.copyDesktop}>
          <h1 className={styles.title}>
            <span className={cn(styles.line, styles.reveal)} style={order(2)}>
              Invista no futuro e
            </span>
            <span className={cn(styles.line, styles.reveal)} style={order(2.6)}>
              gere renda <span className={styles.accent}>recorrente</span>
            </span>
            <span className={cn(styles.line, styles.reveal)} style={order(3.2)}>
              com energia limpa
            </span>
          </h1>
          <p className={cn(styles.lead, styles.reveal)} style={order(4.2)}>
            Você investe, a gente instala, opera e mantém. Sua cota gera renda a cada recarga, com cashback e mais visibilidade.
            Acompanhe tudo por uma plataforma dedicada.
          </p>
        </div>

        {/* Mobile */}
        <div className={styles.copyMobile}>
          <h1 className={cn(styles.title, styles.reveal)} style={order(2)}>
            Invista em um eletroposto e <span className={styles.accent}>receba</span> por cada recarga
          </h1>
          <p className={cn(styles.lead, styles.reveal)} style={order(3)}>
            Você entra com o investimento, a gente instala, opera e mantém. Sua cota rende a cada carro que carrega no ponto.
            Acompanhe tudo pela uma plataforma dedicada.
          </p>
        </div>

        <Stats />

        {/* O texto nunca quebra: em telas muito estreitas encolhe e, no limite, vira só "Simular" */}
        <button
          type="button"
          className={cn(styles.cta, styles.reveal)}
          style={order(6.2)}
          onClick={() => go('simulador')}
          aria-label="Simular meu investimento"
        >
          <span className={styles.ctaInner}>
            <span>
              Simular<span className={styles.ctaRest}> meu investimento</span>
            </span>
            <Img src={ICONS.arrowRight} size={18} />
          </span>
        </button>
      </div>
    </main>
  )
}

const order = (i: number) => ({ '--i': i }) as CSSProperties

/** "+R$ 1,2 mi" e "68%" contam junto com a barra de progresso */
function Stats() {
  // começa quando o bloco termina de entrar (ordem 5 ≈ 0,7s)
  const p = useCountUp(1600, 900)
  const repassado = STATS.repassadoMi * p
  const pct = Math.round(STATS.cotasVendidas * p)

  return (
    <div className={cn(styles.stats, styles.reveal)} style={order(5.2)}>
      <div className={styles.battery} aria-hidden>
        <img src={IMAGES.battery} alt="" />
      </div>
      <div className={styles.statsText}>
        <div className={styles.statsHeadline}>
          <p className={styles.statsValue} aria-label={`+R$ ${decimal(STATS.repassadoMi)} milhão`}>
            +R$ {decimal(repassado)} mi
          </p>
          <p className={styles.statsLabel}>já repassados aos sócios em operação</p>
        </div>
        <div className={styles.progressBlock}>
          <div
            className={styles.progress}
            role="progressbar"
            aria-valuenow={STATS.cotasVendidas}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Cotas já com investidor"
          >
            <span style={{ width: `${STATS.cotasVendidas * p}%` }} />
          </div>
          <p className={styles.progressLabel}>
            <span className={styles.progressPct}>{pct}%</span> das cotas já com investidor
          </p>
        </div>
      </div>
    </div>
  )
}
