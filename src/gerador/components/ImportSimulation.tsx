import { useEffect, useRef, useState } from 'react'
import { ICONS } from '../../assets'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { DEFAULTS } from '../model'
import { readSimulationFile } from '../share'
import { useGerador } from '../state'
import styles from './ImportSimulation.module.css'

/**
 * "Importar simulação" (cabeçalho do simulador): lê o documento HTML gerado em "Compartilhar"
 * (ou um JSON) e preenche todos os campos com as premissas guardadas nele. Leitura direta, sem IA.
 */
export function ImportSimulation() {
  const { setSim } = useGerador()
  const inputRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 3200)
    return () => clearTimeout(t)
  }, [notice])

  const importar = async (file: File) => {
    const inputs = readSimulationFile(await file.text())
    if (!inputs) {
      setNotice({ ok: false, text: 'Arquivo não reconhecido. Use o documento de simulação gerado pelo iGreen Mob.' })
      return
    }
    setSim({ ...DEFAULTS, ...inputs })
    setNotice({ ok: true, text: 'Simulação importada: os campos foram preenchidos.' })
  }

  return (
    <>
      <button type="button" className={styles.button} onClick={() => inputRef.current?.click()} title="Importar simulação" aria-label="Importar simulação">
        <Icon src={ICONS.arrowRight} size={15} className={styles.icon} />
        <span className={styles.label}>Importar simulação</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm,.json,text/html,application/json"
        className={styles.file}
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void importar(file)
        }}
      />
      {notice ? (
        <div className={cn(styles.toast, !notice.ok && styles.toastError)} role="status">
          {notice.text}
        </div>
      ) : null}
    </>
  )
}
