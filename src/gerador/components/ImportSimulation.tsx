import { useEffect, useRef, useState } from 'react'
import { ICONS } from '../../assets'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { defaultsFor } from '../guided'
import { readSimulationFile } from '../share'
import { useGerador } from '../state'
import styles from './ImportSimulation.module.css'

type Aviso = { tom: 'ok' | 'alerta' | 'erro'; texto: string }

/**
 * "Importar simulação" (ao lado do título do simulador): lê o documento HTML gerado em "Compartilhar"
 * (ou um JSON), aplica só os campos editáveis dentro dos limites e refaz o cálculo com as regras atuais.
 */
export function ImportSimulation({ className }: { className?: string }) {
  const { setSim, version } = useGerador()
  const inputRef = useRef<HTMLInputElement>(null)
  const [aviso, setAviso] = useState<Aviso | null>(null)

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), aviso.tom === 'ok' ? 3200 : 6000)
    return () => clearTimeout(t)
  }, [aviso])

  const importar = async (file: File) => {
    const lido = readSimulationFile(await file.text(), defaultsFor(version))
    if (!lido) {
      setAviso({ tom: 'erro', texto: 'Arquivo não reconhecido. Use o documento de simulação gerado pelo iGreen Mob.' })
      return
    }
    setSim(lido.inputs)
    setAviso(
      lido.divergente
        ? { tom: 'alerta', texto: 'Simulação importada e recalculada com as regras atuais. Os valores diferem dos que estavam no documento.' }
        : { tom: 'ok', texto: 'Simulação importada: os campos foram preenchidos e o cálculo foi refeito.' },
    )
  }

  return (
    <>
      <button type="button" className={cn(styles.button, className)} onClick={() => inputRef.current?.click()}>
        <Icon src={ICONS.arrowRight} size={18} className={styles.icon} />
        <span>Importar simulação</span>
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
      {aviso ? (
        <div className={cn(styles.toast, aviso.tom === 'alerta' && styles.toastAlerta, aviso.tom === 'erro' && styles.toastErro)} role="status">
          {aviso.texto}
        </div>
      ) : null}
    </>
  )
}
