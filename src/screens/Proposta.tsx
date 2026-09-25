import { useEffect, useState, type ReactNode } from 'react'
import { ICONS, IMAGES, VIDEOS } from '../assets'
import { DetailModal } from '../components/projection/DetailModal'
import { DistributionRows, ProjectionDisclaimer, ProjectionHero, ProjectionStats, RevenueBreakdown } from '../components/projection/Projection'
import { Button } from '../components/ui/Button'
import { ThemeToggle } from '../components/layout/PageShell'
import { FancyIcon } from '../components/ui/Controls'
import { Icon, Img } from '../components/ui/Icon'
import { PlayOnceVideo } from '../components/ui/PlayOnceVideo'
import { PREMISSAS, carregador } from '../data/investment'
import { useAdaptiveVideo } from '../lib/adaptiveVideo'
import { useTheme } from '../lib/theme'
import { cn } from '../lib/cn'
import { decimal, money, moneyCents, pad2, spelled } from '../lib/format'
import { useMediaQuery } from '../lib/useMediaQuery'
import { useCadastro } from '../state/cadastro'
import styles from './Proposta.module.css'

type CardKey = 'id' | 'detalhe' | 'investidor' | 'local'

/** proporção do vídeo da proposta (1920×814) */
const VIDEO_RATIO = 1920 / 814

export function Proposta() {
  const { state, simulation, go } = useCadastro()
  const { investidor: inv, eletroposto, simulacao, modelo: config, proposta } = state
  const local = eletroposto.endereco
  const [open, setOpen] = useState<CardKey | null>('id')
  const [detailOpen, setDetailOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  // Largura em pixels físicos que o vídeo ocupa (object-fit: cover na área --hero-w × --hero-h do CSS);
  // a qualidade baixada acompanha isso e a conexão, e em rede muito ruim fica a imagem estática
  const [neededWidth] = useState(() => {
    const w = Math.min(window.innerWidth, 1180)
    const h = window.matchMedia('(max-width: 767px)').matches ? w / 1.45 : w / 2.178
    return Math.round(h * VIDEO_RATIO * Math.min(window.devicePixelRatio || 1, 2))
  })
  // Versão noturna no tema escuro (trocar o tema com a página aberta carrega a outra versão)
  const dark = useTheme() === 'dark'
  const video = useAdaptiveVideo(dark ? VIDEOS.propostaDark : VIDEOS.proposta, { enabled: !reducedMotion, neededWidth })
  const heroImage = dark
    ? video.status === 'image' && video.lite ? IMAGES.propostaHeroDarkLite : IMAGES.propostaHeroDark
    : video.status === 'image' && video.lite ? IMAGES.propostaHeroLite : IMAGES.propostaHero

  useEffect(() => {
    if (!proposta) go('step4')
  }, [proposta, go])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  if (!proposta) return null

  const qtd = simulacao.quantidade
  const modelo = carregador(simulacao.tipo)
  const carregadores = `${pad2(qtd)} ${qtd === 1 ? 'Carregador' : 'Carregadores'}`
  const link = `${window.location.origin}${window.location.pathname}#proposta`
  const message = `Minha proposta iGreen Mob #${proposta.id}: aporte de ${money(simulation.aporte)} em ${qtd} × ${modelo.nome}.`
  const nomeCurto = inv.nome.trim().split(/\s+/).filter((_, i, all) => i === 0 || i === all.length - 1).join(' ')
  const percentual = `${decimal(simulation.percentual, simulation.percentual % 1 ? 1 : 0)}%`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setToast('Link copiado!')
    } catch {
      setToast('Não foi possível copiar o link')
    }
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Proposta iGreen Mob', text: message, url: link })
      } catch {
        /* compartilhamento cancelado */
      }
    } else copyLink()
  }

  const toggle = (key: CardKey) => setOpen((current) => (current === key ? null : key))

  return (
    <main className={styles.page}>
      <ThemeToggle className={styles.themeToggle} />
      <header className={styles.header}>
        <img src={ICONS.logoEnergy} width={88} height={28} alt="iGreen Energy" className={styles.logo} />
        <h1 className={styles.title}>
          Proposta gerada com
          <br />
          <span className={styles.accent}>Sucesso!</span>
        </h1>
        <p className={styles.subtitle}>O seu acesso oficial ao nosso mundo de soluções e tecnologia está muito mais próximo.</p>
      </header>

      <div className={styles.hero} aria-hidden>
        {/* Cidade brotando, carro chegando e carregador conectando: toca uma vez e para no quadro final (= imagem) */}
        {video.status === 'video' ? (
          <PlayOnceVideo src={video.src} className={styles.heroImg} />
        ) : video.status === 'image' ? (
          <img src={heroImage} alt="" className={styles.heroImg} />
        ) : (
          <div className={styles.heroImg} />
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.group}>
          <section className={styles.valueCard}>
            <div className={styles.valueText}>
              <p className={styles.caption}>Valor total do aporte para investimento</p>
              <p className={styles.value}>{money(simulation.aporte)}</p>
            </div>
            <div className={styles.badges}>
              <span className={cn(styles.badge, styles.badgeGreen)}>{pad2(PREMISSAS.contratoAnos)} Anos contrato</span>
              <span className={cn(styles.badge, styles.badgeOrange)}>{carregadores}</span>
            </div>
            <Button className={styles.fullButton} onClick={() => setDetailOpen(true)} aria-label="Ver detalhamento da proposta">
              Ver detalhamento<span className={styles.buttonRest}> da proposta</span>
            </Button>
          </section>

          <section className={styles.shareCard} aria-label="Compartilhar proposta">
            <ShareButton icon={ICONS.whatsapp} label="WhatsApp" href={`https://wa.me/?text=${encodeURIComponent(`${message} ${link}`)}`} />
            <ShareButton icon={ICONS.instagram} label="Messenger" onClick={share} />
            <ShareButton
              icon={ICONS.mailShare}
              label="Email"
              href={`mailto:?subject=${encodeURIComponent(`Proposta iGreen Mob #${proposta.id}`)}&body=${encodeURIComponent(`${message}\n\n${link}`)}`}
            />
            <ShareButton icon={ICONS.link} label="Copiar Link" onClick={copyLink} />
          </section>
        </div>

        <div className={styles.group}>
          <h2 className={styles.detailsTitle}>Detalhes da Proposta</h2>
          <div className={styles.list}>
            <Collapsible
              open={open === 'id'}
              onToggle={() => toggle('id')}
              icon={<FancyIcon src={ICONS.fileDollar} bg="var(--bg-primary)" multicolor />}
              title={`ID #${proposta.id}`}
              meta={[carregadores, `${PREMISSAS.contratoAnos} anos de contrato`]}
            >
              <CheckItem>
                Carregadores:{' '}
                <b>
                  {qtd} ({spelled(qtd)}) × {modelo.nome}
                </b>{' '}
                de {modelo.potenciaKw} kW
              </CheckItem>
              <CheckItem>
                Participação: <b>{percentual}</b> do resultado distribuível
              </CheckItem>
              <CheckItem>
                Aporte: <b>{moneyCents(simulation.aporte)}</b>
              </CheckItem>
              <CheckItem>
                Retorno da cota: <b>{moneyCents(Math.round(simulation.mensal))}/mês</b> - Projeção da operação
              </CheckItem>
              <CheckItem>
                Investidor: <b>{inv.nome}</b>
              </CheckItem>
            </Collapsible>

            <Collapsible
              open={open === 'detalhe'}
              onToggle={() => toggle('detalhe')}
              icon={<FancyIcon src={ICONS.dollarWhite} bg="var(--bg-primary)" multicolor />}
              title="Detalhamento do investimento"
              meta={[`${money(simulation.mensal)}/mês`, `${percentual} do resultado`]}
              plain
            >
              <div className={styles.detail}>
                <div className={styles.detailGroup}>
                  <ProjectionHero simulation={simulation} />
                  <ProjectionStats simulation={simulation} />
                </div>
                <RevenueBreakdown simulation={simulation} />
                <DistributionRows simulation={simulation} />
                <ProjectionDisclaimer />
              </div>
            </Collapsible>

            <Collapsible
              open={open === 'investidor'}
              onToggle={() => toggle('investidor')}
              icon={<FancyIcon src={ICONS.idWhite} bg="var(--bg-fill)" multicolor />}
              title={nomeCurto || inv.nome}
              meta={[inv.documento, inv.whatsapp]}
            >
              <CheckItem>
                Nome: <b>{inv.nome}</b>
              </CheckItem>
              <CheckItem>
                {inv.tipo === 'pf' ? 'CPF' : 'CNPJ'}: <b>{inv.documento}</b>
              </CheckItem>
              <CheckItem>
                E-mail: <b>{inv.email}</b>
              </CheckItem>
              <CheckItem>
                WhatsApp: <b>{inv.whatsapp}</b>
              </CheckItem>
              <CheckItem>
                Endereço:{' '}
                <b>
                  {inv.endereco.logradouro}, {inv.endereco.numero} - {inv.endereco.cidade}/{inv.endereco.uf}
                </b>
              </CheckItem>
            </Collapsible>

            <Collapsible
              open={open === 'local'}
              onToggle={() => toggle('local')}
              icon={<FancyIcon src={ICONS.fuelWhiteAlt} bg="var(--bg-fill)" multicolor />}
              title={`${local.cidade} - ${local.uf}`}
              meta={[`${local.logradouro}, ${local.numero}${local.bairro ? ` - ${local.bairro}` : ''}`]}
            >
              <CheckItem>
                Endereço:{' '}
                <b>
                  {local.logradouro}, {local.numero}
                  {local.complemento ? ` - ${local.complemento}` : ''}
                </b>
              </CheckItem>
              <CheckItem>
                Bairro: <b>{local.bairro}</b>
              </CheckItem>
              <CheckItem>
                CEP: <b>{local.cep}</b>
              </CheckItem>
              <CheckItem>
                Faturamento de publicidade: <b>{config.publicidade ? 'Sim' : 'Não'}</b>
              </CheckItem>
            </Collapsible>
          </div>
        </div>
      </div>

      <DetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        simulation={simulation}
        title="Detalhamento da proposta"
        subtitle="Resumo do investimento e projeção de retorno"
        resumo={[
          { label: 'Proposta', value: `#${proposta.id}` },
          { label: 'Investidor', value: inv.nome },
          { label: 'Carregadores', value: `${qtd} × ${modelo.nome} · ${modelo.potenciaKw} kW` },
          { label: 'Participação', value: `${percentual} do resultado distribuível` },
          { label: 'Contrato', value: `${PREMISSAS.contratoAnos} anos` },
          { label: 'Eletroposto', value: `${local.logradouro}, ${local.numero} · ${local.cidade}/${local.uf}` },
        ]}
      />
      {toast ? (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      ) : null}
    </main>
  )
}

function ShareButton({ icon, label, href, onClick }: { icon: string; label: string; href?: string; onClick?: () => void }) {
  const content = (
    <>
      <span className={styles.shareIcon}>
        <Icon src={icon} size={20} className={styles.shareGlyph} />
      </span>
      <span className={styles.caption}>{label}</span>
    </>
  )
  return href ? (
    <a className={styles.share} href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <button type="button" className={styles.share} onClick={onClick}>
      {content}
    </button>
  )
}

function Collapsible({
  open,
  onToggle,
  icon,
  title,
  meta,
  plain,
  children,
}: {
  plain?: boolean
  open: boolean
  onToggle: () => void
  icon: ReactNode
  title: string
  meta: string[]
  children: ReactNode
}) {
  return (
    <section className={cn(styles.card, open && styles.cardOpen)}>
      <button type="button" className={styles.cardHeader} aria-expanded={open} onClick={onToggle}>
        {icon}
        <span className={styles.cardText}>
          <span className={styles.cardTitle}>{title}</span>
          <span className={styles.cardMeta}>
            {meta.filter(Boolean).map((m, i) => (
              <span key={m} className={styles.cardMetaItem}>
                {i > 0 ? <Img src={ICONS.dotSeparator} size={4} /> : null}
                <span className={styles.cardMetaText}>{m}</span>
              </span>
            ))}
          </span>
        </span>
        <Icon src={ICONS.chevronDown} size={18} className={styles.chevron} />
      </button>
      {open ? (
        <div className={styles.cardBody}>
          {plain ? children : <ul className={styles.checks}>{children}</ul>}
        </div>
      ) : null}
    </section>
  )
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className={styles.check}>
      <span className={styles.checkIcon}>
        <Icon src={ICONS.checkBold} size={10} color="#fff" />
      </span>
      <span>{children}</span>
    </li>
  )
}
