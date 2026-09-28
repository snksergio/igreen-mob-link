import { useEffect, useMemo, useState } from 'react'
import { ICONS } from '../../assets'
import { DialogHeader, Modal } from '../../components/ui/Modal'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { useGerador } from '../state'
import { shareText, shareUrl } from '../share'
import { renderShareImage } from '../shareImage'
import styles from './ShareModal.module.css'

const POTENCIA = { lento: '7 kW', duo: '7 + 40 kW', ultra: '80 kW' } as const
const FILE_NAME = 'simulacao-igreen-mob.png'

function ShareAction({ icon, label, onClick, iconClass }: { icon: string; label: string; onClick: () => void; iconClass?: string }) {
  return (
    <button type="button" className={styles.action} onClick={onClick}>
      <span className={styles.actionIcon}>
        <Icon src={icon} size={20} className={cn(styles.actionGlyph, iconClass)} />
      </span>
      <span className={styles.actionLabel}>{label}</span>
    </button>
  )
}

/**
 * Compartilhar a simulação: gera a imagem com o resultado (para WhatsApp e redes) e o link que abre
 * a visualização completa. No celular usa o compartilhamento do sistema com a imagem anexada.
 */
export function ShareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, result } = useGerador()
  const inputs = state.simulacao.inputs
  const combined = inputs.incomeMode === 'combined'
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null)
  const [failed, setFailed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const m1 = result.months[0]
  const recebimento = combined ? m1.totalInvestor : m1.investorRechargeCash
  const payback = combined ? result.payback : result.chargingPayback
  const net36 = combined ? result.net36 : result.months[35].chargingNetAccumulated
  const link = useMemo(() => shareUrl(inputs), [inputs])
  const message = shareText({ modelo: result.charger.name, recebimento, payback, url: link })
  const solo = result.charger.investorShare === 1

  useEffect(() => {
    if (!open) return
    let alive = true
    let objectUrl = ''
    renderShareImage({
      modelo: result.charger.name,
      potencia: POTENCIA[inputs.charger],
      investimento: result.capital.investor,
      sociedade: solo ? '100% seu' : `Sociedade ${result.charger.investorShare * 100}/${result.charger.igreenShare * 100}`,
      recebimento,
      payback,
      net36,
      roi36: (net36 / result.investment) * 100,
      saldo: [-result.investment, ...result.months.map((m) => (combined ? m.netAccumulated : m.chargingNetAccumulated))],
      recargas: m1.investorRechargeCash,
      carteira: combined ? m1.commissionNet : null,
      clientes: m1.clients,
      site: window.location.host,
    })
      .then((blob) => {
        if (!alive) return
        objectUrl = URL.createObjectURL(blob)
        setImage({ blob, url: objectUrl })
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [open, result, inputs.charger, combined, recebimento, payback, net36, m1, solo])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2400)
    return () => clearTimeout(t)
  }, [notice])

  const file = image ? new File([image.blob], FILE_NAME, { type: 'image/png' }) : null
  const canShareFile = Boolean(file && navigator.canShare?.({ files: [file] }))

  const whatsapp = async () => {
    // Celular: compartilhamento do sistema já com a imagem (a pessoa escolhe o WhatsApp)
    if (file && canShareFile) {
      try {
        await navigator.share({ files: [file], text: message })
        return
      } catch {
        /* cancelado: segue para o link do WhatsApp */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
  }

  const nativeShare = async () => {
    try {
      await navigator.share(file && canShareFile ? { files: [file], text: message } : { title: 'Simulação iGreen Mob', text: message, url: link })
    } catch {
      /* cancelado */
    }
  }

  const download = () => {
    if (!image) return
    const a = document.createElement('a')
    a.href = image.url
    a.download = FILE_NAME
    a.click()
    setNotice('Imagem baixada')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setNotice('Link copiado')
    } catch {
      setNotice('Não foi possível copiar o link')
    }
  }

  return (
    <Modal open={open} onClose={onClose} label="Compartilhar simulação" width={560} padding="compact">
      <DialogHeader title="Compartilhar simulação" subtitle="Envie a imagem com o resultado e o link para ver a simulação completa." />
      <div className={styles.content}>
        <div className={styles.preview}>
          {image ? (
            <img src={image.url} alt={`Imagem da simulação: ${result.charger.name}, recebimento estimado no mês 1 e retorno`} />
          ) : (
            <span className={styles.previewPlaceholder}>{failed ? 'Não foi possível gerar a imagem.' : 'Gerando a imagem…'}</span>
          )}
        </div>

        <div className={styles.actions}>
          <ShareAction icon={ICONS.whatsapp} label="WhatsApp" onClick={whatsapp} />
          {'share' in navigator ? <ShareAction icon={ICONS.circleArrowRight} label="Mais opções" onClick={nativeShare} /> : null}
          <ShareAction icon={ICONS.arrowRight} iconClass={styles.down} label="Baixar imagem" onClick={download} />
          <ShareAction icon={ICONS.link} label="Copiar link" onClick={copyLink} />
        </div>

        <p className={styles.message}>{message}</p>
        {canShareFile ? null : <p className={styles.hint}>No computador, baixe a imagem e anexe na conversa do WhatsApp junto com a mensagem.</p>}
      </div>
      {notice ? (
        <div className={styles.toast} role="status">
          {notice}
        </div>
      ) : null}
    </Modal>
  )
}
