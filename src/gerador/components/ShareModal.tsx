import { useEffect, useRef, useState } from 'react'
import { ICONS } from '../../assets'
import { FancyIcon } from '../../components/ui/Controls'
import { DialogHeader, Modal } from '../../components/ui/Modal'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { getResponsavel } from '../../services/responsavel'
import { shareText } from '../share'
import { buildSimulationDocument } from '../simulationDoc'
import { useGerador } from '../state'
import styles from './ShareModal.module.css'

type Documento = { codigo: string; html: string; arquivo: File; url: string }

/** Largura em que o documento é desenhado na prévia (depois reduzido para caber no modal) */
const LARGURA_DOC = 900

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

/** Prévia do próprio documento (topo), reduzida para a largura do modal */
function DocPreview({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / LARGURA_DOC))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className={styles.docPreview}>
      <iframe title="Prévia do documento da simulação" srcDoc={html} sandbox="" scrolling="no" tabIndex={-1} style={{ width: LARGURA_DOC, height: `${100 / scale}%`, transform: `scale(${scale})` }} />
    </div>
  )
}

/**
 * Compartilhar a simulação: sempre o documento completo (HTML que abre em qualquer lugar e serve para
 * importar depois), nunca só uma imagem. No celular, o compartilhamento do sistema já envia o arquivo.
 */
export function ShareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, result } = useGerador()
  const inputs = state.simulacao.inputs
  const combined = inputs.incomeMode === 'combined'
  const [doc, setDoc] = useState<Documento | null>(null)
  const [failed, setFailed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const m1 = result.months[0]
  const message = shareText({
    modelo: result.charger.name,
    recebimento: combined ? m1.totalInvestor : m1.investorRechargeCash,
    payback: combined ? result.payback : result.chargingPayback,
  })

  useEffect(() => {
    if (!open) return
    let alive = true
    let url = ''
    const agora = new Date()
    const codigo = `SIM-${agora.getTime().toString(36).toUpperCase().slice(-6)}`
    logoSvg()
      .then((logo) => {
        if (!alive) return
        const html = buildSimulationDocument({ inputs, result, codigo, geradoEm: agora, responsavel: getResponsavel().nome, logoSvg: logo })
        const arquivo = new File([html], `simulacao-igreen-mob-${codigo}.html`, { type: 'text/html' })
        url = URL.createObjectURL(arquivo)
        setDoc({ codigo, html, arquivo, url })
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [open, inputs, result])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2600)
    return () => clearTimeout(t)
  }, [notice])

  const canShareFile = Boolean(doc && navigator.canShare?.({ files: [doc.arquivo] }))

  const compartilharArquivo = async () => {
    if (!doc) return false
    try {
      await navigator.share({ files: [doc.arquivo], title: 'Simulação iGreen Mob', text: message })
      return true
    } catch {
      return false
    }
  }

  const baixar = () => {
    if (!doc) return
    const a = document.createElement('a')
    a.href = doc.url
    a.download = doc.arquivo.name
    a.click()
  }

  const whatsapp = async () => {
    // Celular: compartilhamento do sistema já com o documento (a pessoa escolhe o WhatsApp)
    if (canShareFile && (await compartilharArquivo())) return
    // Computador: baixa o documento e abre a conversa para anexá-lo
    baixar()
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener')
    setNotice('Documento baixado: anexe na conversa do WhatsApp')
  }

  const email = async () => {
    if (canShareFile && (await compartilharArquivo())) return
    baixar()
    const assunto = `Simulação iGreen Mob · ${result.charger.name}${doc ? ` · ${doc.codigo}` : ''}`
    window.location.href = `mailto:?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(`${message}\n\n(Documento da simulação em anexo.)`)}`
    setNotice('Documento baixado: anexe no e-mail')
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
          {doc ? (
            <a className={styles.docOpen} href={doc.url} target="_blank" rel="noreferrer">
              Abrir
            </a>
          ) : null}
        </div>

        {doc ? <DocPreview html={doc.html} /> : <div className={styles.docPreview}>{failed ? 'Não foi possível gerar o documento.' : 'Gerando o documento…'}</div>}

        <div className={styles.actions}>
          <ShareAction icon={ICONS.whatsapp} label="WhatsApp" onClick={whatsapp} disabled={!doc} />
          <ShareAction icon={ICONS.mailShare} label="E-mail" onClick={email} disabled={!doc} />
          <ShareAction icon={ICONS.arrowRight} iconClass={styles.down} label="Baixar documento" onClick={() => (baixar(), setNotice('Documento baixado'))} disabled={!doc} />
          {canShareFile ? <ShareAction icon={ICONS.circleArrowRight} label="Mais opções" onClick={() => void compartilharArquivo()} /> : null}
        </div>

        <p className={styles.message}>{message}</p>
        <p className={styles.hint}>
          {canShareFile ? '' : 'No computador, o documento é baixado para você anexar na conversa ou no e-mail. '}
          Para retomar depois, use “Importar simulação” no simulador e escolha o documento.
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
