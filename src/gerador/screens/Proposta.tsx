import { useEffect, useState, type ReactNode } from 'react'
import { ICONS, IMAGES, VIDEOS } from '../../assets'
import { Button } from '../../components/ui/Button'
import { ThemeToggle } from '../../components/layout/PageShell'
import { FancyIcon } from '../../components/ui/Controls'
import { Icon, Img } from '../../components/ui/Icon'
import { PlayOnceVideo } from '../../components/ui/PlayOnceVideo'
import { useAdaptiveVideo } from '../../lib/adaptiveVideo'
import { useTheme } from '../../lib/theme'
import { cn } from '../../lib/cn'
import { money, moneyCents } from '../../lib/format'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { GeradorDetailModal } from '../components/GeradorDetailModal'
import { compactMoney, paybackLabel, pct } from '../format'
import type { ChargerId } from '../model'
import { semInvestimento } from '../guided'
import { useGerador } from '../state'
import styles from './Proposta.module.css'

type CardKey = 'id' | 'detalhe' | 'investidor' | 'local'

const POTENCIA: Record<ChargerId, string> = { lento: '7 kW', duo: '7 + 40 kW', ultra: '80 kW' }

/** proporção do vídeo da proposta (1920×814) */
const VIDEO_RATIO = 1920 / 814

export function Proposta() {
  const { state, result, go, version } = useGerador()
  const hideInvestment = semInvestimento(version)
  const { investidor: inv, eletroposto, proposta } = state
  const inputs = state.simulacao.inputs
  const combined = inputs.incomeMode === 'combined'
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
    if (!proposta) go('resumo')
  }, [proposta, go])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  if (!proposta) return null

  const m1 = result.months[0]
  const recebimento = combined ? m1.totalInvestor : m1.investorRechargeCash
  const payback = combined ? result.payback : result.chargingPayback
  const net36 = combined ? result.net36 : result.months[35].chargingNetAccumulated
  const solo = result.charger.investorShare === 1
  const modelo = `${result.charger.name} (${POTENCIA[inputs.charger]})`
  const sociedade = solo ? '100% do investidor' : `Você ${result.charger.investorShare * 100}% · iGreen ${result.charger.igreenShare * 100}%`
  const link = `${window.location.origin}${window.location.pathname}#proposta`
  const message = hideInvestment
    ? `Minha proposta iGreen Mob #${proposta.id}: ${modelo}, com recebimento estimado de ${money(recebimento)}/mês.`
    : `Minha proposta iGreen Mob #${proposta.id}: investimento de ${money(result.capital.investor)} no ${modelo}.`
  const nomeCurto = inv.nome.trim().split(/\s+/).filter((_, i, all) => i === 0 || i === all.length - 1).join(' ')

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
              <p className={styles.caption}>{hideInvestment ? 'Recebimento estimado no mês 1' : 'Valor do seu investimento no eletroposto'}</p>
              <p className={styles.value}>{money(hideInvestment ? recebimento : result.capital.investor)}</p>
            </div>
            <div className={styles.badges}>
              <span className={cn(styles.badge, styles.badgeGreen)}>{result.charger.name}</span>
              <span className={cn(styles.badge, styles.badgeOrange)}>Retorno em {paybackLabel(payback)}</span>
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
              meta={[result.charger.name, 'Projeção de 36 meses']}
            >
              <CheckItem>
                Eletroposto: <b>{modelo}</b> · até {result.maxCars} carros/dia
              </CheckItem>
              {hideInvestment ? null : (
                <CheckItem>
                  Seu investimento: <b>{moneyCents(result.capital.investor)}</b>
                  {solo ? null : <> · valor total {moneyCents(result.capital.total)}</>}
                </CheckItem>
              )}
              <CheckItem>
                Sociedade: <b>{sociedade}</b>
              </CheckItem>
              <CheckItem>
                Recebimento estimado no mês 1: <b>{moneyCents(recebimento)}</b> ({combined ? 'carteira + recargas' : 'só recargas'})
              </CheckItem>
              <CheckItem>
                Retorno: <b>{paybackLabel(payback)}</b> · ROI em 36 meses de {pct((net36 / result.investment) * 100, 0)}
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
              meta={[`${compactMoney(recebimento)}/mês`, `retorno em ${paybackLabel(payback)}`]}
              plain
            >
              {/* Só o essencial; o detalhamento completo (gráfico, DRE, mês a mês) fica no modal */}
              <div className={styles.detailSummary}>
                <dl className={styles.kpis}>
                  <div>
                    <dt>Recebimento no mês 1</dt>
                    <dd>{moneyCents(recebimento)}</dd>
                  </div>
                  <div>
                    <dt>Retorno</dt>
                    <dd>{paybackLabel(payback)}</dd>
                  </div>
                  <div>
                    <dt>Saldo em 36 meses</dt>
                    <dd>{compactMoney(net36)}</dd>
                  </div>
                  <div>
                    <dt>ROI em 36 meses</dt>
                    <dd>{pct((net36 / result.investment) * 100, 0)}</dd>
                  </div>
                </dl>
                <Button className={styles.fullButton} onClick={() => setDetailOpen(true)}>
                  Ver detalhamento da proposta
                </Button>
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
                Faturamento de publicidade: <b>{eletroposto.publicidade ? 'Sim' : 'Não'}</b>
              </CheckItem>
            </Collapsible>
          </div>
        </div>
      </div>

      <GeradorDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Detalhamento da proposta"
        subtitle="Resumo do investimento e projeção de retorno"
        resumo={[
          { label: 'Proposta', value: `#${proposta.id}` },
          { label: 'Investidor', value: inv.nome },
          { label: 'Eletroposto', value: modelo },
          { label: 'Sociedade', value: sociedade },
          ...(hideInvestment
            ? []
            : [
                { label: 'Seu investimento', value: moneyCents(result.capital.investor) },
                ...(solo ? [] : [{ label: 'Valor total', value: moneyCents(result.capital.total) }]),
              ]),
          { label: 'Local', value: `${local.logradouro}, ${local.numero} · ${local.cidade}/${local.uf}` },
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
