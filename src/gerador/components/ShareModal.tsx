import { useEffect, useState } from 'react'
import { ICONS } from '../../assets'
import { FancyIcon } from '../../components/ui/Controls'
import { DialogHeader, Modal } from '../../components/ui/Modal'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { getResponsavel } from '../../services/responsavel'
import { POTENCIA } from '../guided'
import { shareText } from '../share'
import { renderShareImage } from '../shareImage'
import { buildSimulationDocument } from '../simulationDoc'
import { useGerador } from '../state'
import styles from './ShareModal.module.css'

type Arquivos = { codigo: string; documento: File; documentoUrl: string; imagem: File | null; imagemUrl: string }

let logoCache: Promise<string> | null = null
/** SVG do logo iGreen Energy, embutido no documento (sem depender de rede para abrir) */
const logoSvg = () => (logoCache ??= fetch(ICONS.logoEnergy).then((r) => (r.ok ? r.text() : '')).catch(() => ''))

function ShareAction({ icon, label, onClick, iconClass, disabled }: { icon: string; label: string; onClick: () => void; iconClass?: string; disabled?: boolean }) {
  return (
    <button type="button" className={styles.action} onClick={onClick} disabled={disabled}>
      <span className={styles.actionIcon}>
        <Icon src={icon} size={20} className={cn(styles.actionGlyph, iconClass)} />
      </span>
      <span className={styles.actionLabel}>{label}</span>
    </button>
  )
}

const baixar = (url: string, nome: string) => {
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
}

/**
 * Compartilhar a simulação: gera o documento completo (HTML que abre em qualquer lugar e serve para
 * importar depois) e a imagem do resultado. No celular, o compartilhamento do sistema já leva os arquivos.
 */
export function ShareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, result } = useGerador()
  const inputs = state.simulacao.inputs
  const combined = inputs.incomeMode === 'combined'
  const [arquivos, setArquivos] = useState<Arquivos | null>(null)
  const [failed, setFailed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const m1 = result.months[0]
  const recebimento = combined ? m1.totalInvestor : m1.investorRechargeCash
  const payback = combined ? result.payback : result.chargingPayback
  const net36 = combined ? result.net36 : result.months[35].chargingNetAccumulated
  const message = shareText({ modelo: result.charger.name, recebimento, payback })

  useEffect(() => {
    if (!open) return
    let alive = true
    const urls: string[] = []
    const agora = new Date()
    const codigo = `SIM-${agora.getTime().toString(36).toUpperCase().slice(-6)}`
    const solo = result.charger.investorShare === 1

    ;(async () => {
      const html = buildSimulationDocument({ inputs, result, codigo, geradoEm: agora, responsavel: getResponsavel().nome, logoSvg: await logoSvg() })
      const documento = new File([html], `simulacao-igreen-mob-${codigo}.html`, { type: 'text/html' })
      const imagemBlob = await renderShareImage({
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
        site: 'iGreen Mob',
      }).catch(() => null)
      if (!alive) return
      const imagem = imagemBlob ? new File([imagemBlob], `simulacao-igreen-mob-${codigo}.png`, { type: 'image/png' }) : null
      const documentoUrl = URL.createObjectURL(documento)
      const imagemUrl = imagem ? URL.createObjectURL(imagem) : ''
      urls.push(documentoUrl, imagemUrl)
      setArquivos({ codigo, documento, documentoUrl, imagem, imagemUrl })
    })().catch(() => alive && setFailed(true))

    return () => {
      alive = false
      urls.forEach((u) => u && URL.revokeObjectURL(u))
    }
  }, [open, inputs, result, combined, recebimento, payback, net36, m1])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2600)
    return () => clearTimeout(t)
  }, [notice])

  const files = arquivos ? [arquivos.documento, ...(arquivos.imagem ? [arquivos.imagem] : [])] : []
  const canShareFiles = files.length > 0 && Boolean(navigator.canShare?.({ files }))

  const compartilharArquivos = async () => {
    try {
      await navigator.share({ files, title: 'Simulação iGreen Mob', text: message })
      return true
    } catch {
      return false
    }
  }

  const whatsapp = async () => {
    // Celular: compartilhamento do sistema já com o documento e a imagem (a pessoa escolhe o WhatsApp)
    if (canShareFiles && (await compartilharArquivos())) return
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
    setNotice('Anexe o documento baixado na conversa')
  }

  const email = () => {
    const assunto = `Simulação iGreen Mob · ${result.charger.name}${arquivos ? ` · ${arquivos.codigo}` : ''}`
    window.location.href = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(`${message}\n\n(Anexe o documento da simulação baixado.)`)}`
  }

  const maisOpcoes = async () => {
    if (canShareFiles && (await compartilharArquivos())) return
    try {
      await navigator.share({ title: 'Simulação iGreen Mob', text: message })
    } catch {
      /* cancelado */
    }
  }

  return (
    <Modal open={open} onClose={onClose} label="Compartilhar simulação" width={600} padding="compact">
      <DialogHeader title="Compartilhar simulação" subtitle="Envie o documento completo para o cliente analisar com calma e retomar depois." />
      <div className={styles.content}>
        <div className={styles.doc}>
          <FancyIcon src={ICONS.fileDollar} bg="var(--bg-primary)" size={44} iconSize={22} multicolor />
          <div className={styles.docText}>
            <span className={styles.docTitle}>Documento da simulação</span>
            <span className={styles.docHint}>Resultado, premissas, gráfico, DRE e mês a mês · abre no navegador, e-mail e WhatsApp</span>
          </div>
          {arquivos ? (
            <a className={styles.docOpen} href={arquivos.documentoUrl} target="_blank" rel="noreferrer">
              Abrir
            </a>
          ) : (
            <span className={styles.docHint}>{failed ? 'Falhou' : 'Gerando…'}</span>
          )}
        </div>

        <div className={styles.preview}>
          {arquivos?.imagemUrl ? (
            <img src={arquivos.imagemUrl} alt={`Imagem do resultado: ${result.charger.name}, recebimento estimado no mês 1 e retorno`} />
          ) : (
            <span className={styles.previewPlaceholder}>{failed ? 'Não foi possível gerar os arquivos.' : 'Gerando a imagem…'}</span>
          )}
        </div>

        <div className={styles.actions}>
          <ShareAction icon={ICONS.whatsapp} label="WhatsApp" onClick={whatsapp} disabled={!arquivos} />
          <ShareAction icon={ICONS.mailShare} label="E-mail" onClick={email} disabled={!arquivos} />
          <ShareAction
            icon={ICONS.arrowRight}
            iconClass={styles.down}
            label="Baixar documento"
            onClick={() => arquivos && (baixar(arquivos.documentoUrl, arquivos.documento.name), setNotice('Documento baixado'))}
            disabled={!arquivos}
          />
          <ShareAction
            icon={ICONS.arrowRight}
            iconClass={styles.down}
            label="Baixar imagem"
            onClick={() => arquivos?.imagem && (baixar(arquivos.imagemUrl, arquivos.imagem.name), setNotice('Imagem baixada'))}
            disabled={!arquivos?.imagem}
          />
          {'share' in navigator ? <ShareAction icon={ICONS.circleArrowRight} label="Mais opções" onClick={maisOpcoes} disabled={!arquivos} /> : null}
        </div>

        <p className={styles.message}>{message}</p>
        <p className={styles.hint}>
          {canShareFiles ? '' : 'No computador, baixe o documento e anexe na conversa ou no e-mail. '}
          Para retomar depois, use “Importar simulação” no topo do simulador e escolha o documento.
        </p>
      </div>
      {notice ? (
        <div className={styles.toast} role="status">
          {notice}
        </div>
      ) : null}
    </Modal>
  )
}
