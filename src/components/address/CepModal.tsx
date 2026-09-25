import { useRef, useState } from 'react'
import { ICONS } from '../../assets'
import { cn } from '../../lib/cn'
import { UFS, searchCep, type Address } from '../../services/address'
import { Field, FieldRow } from '../ui/Field'
import { Icon } from '../ui/Icon'
import { DialogHeader, Modal } from '../ui/Modal'
import { SelectField } from '../ui/SelectField'
import styles from './CepModal.module.css'

type CepModalProps = {
  open: boolean
  onClose: () => void
  onSelect: (address: Address) => void
  initial?: Pick<Address, 'uf' | 'cidade'>
  subtitle: string
}

type Status = 'idle' | 'loading' | 'done' | 'error'

/** "CEPModal" do Design System (node 2508:9180) — Buscador de CEP */
export function CepModal({ open, onClose, ...rest }: CepModalProps) {
  return (
    <Modal open={open} onClose={onClose} label="Buscador de CEP">
      <CepSearch onClose={onClose} {...rest} />
    </Modal>
  )
}

function CepSearch({ onClose, onSelect, initial, subtitle }: Omit<CepModalProps, 'open'>) {
  const [uf, setUf] = useState(initial?.uf ?? '')
  const [cidade, setCidade] = useState(initial?.cidade ?? '')
  const [logradouro, setLogradouro] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [results, setResults] = useState<Address[]>([])
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)


  const search = async () => {
    if (!uf || cidade.trim().length < 3 || logradouro.trim().length < 3) {
      setError('Preencha estado, cidade e ao menos 3 letras do logradouro')
      return
    }
    setError(null)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('loading')
    try {
      setResults(await searchCep(uf, cidade, logradouro, controller.signal))
      setStatus('done')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setStatus('error')
    }
  }

  return (
    <>
      <DialogHeader icon={ICONS.light} title="Buscador de CEP" subtitle={subtitle} />
      <form
        className={styles.body}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          search()
        }}
      >
        <div className={styles.fields}>
          <FieldRow>
            <SelectField width={150} label="ESTADO" value={uf} onChange={setUf} options={UFS.map((u) => ({ value: u, label: u }))} />
            <Field label="CIDADE" value={cidade} onChange={setCidade} placeholder="Ex: Uberlândia" />
          </FieldRow>
          <div className={styles.searchRow}>
            <Field label="LOGRADOURO" value={logradouro} onChange={setLogradouro} placeholder="Ex.: Rua Princesa Izabel" error={error} />
            <button type="submit" className={styles.searchButton} aria-label="Buscar CEP" disabled={status === 'loading'}>
              {status === 'loading' ? <span className={styles.spinner} /> : <Icon src={ICONS.search} size={24} color="#fff" />}
            </button>
          </div>
        </div>

        {status === 'done' || status === 'error' ? (
          <div className={styles.results} aria-live="polite">
            {status === 'error' ? (
              <p className={cn('t-body-md-medium', styles.empty)}>Não foi possível buscar agora. Tente novamente em instantes.</p>
            ) : results.length === 0 ? (
              <p className={cn('t-body-md-medium', styles.empty)}>Nenhum CEP encontrado para esse endereço.</p>
            ) : (
              results.map((address) => (
                <button
                  key={`${address.cep}-${address.logradouro}-${address.bairro}`}
                  type="button"
                  className={styles.result}
                  onClick={() => {
                    onSelect(address)
                    onClose()
                  }}
                >
                  <span className={styles.resultIcon}>
                    <img src={ICONS.pin} width={24} height={24} alt="" />
                  </span>
                  <span className={styles.resultText}>
                    <span className={cn('t-body-lg-semibold', styles.resultStreet)}>{address.logradouro}</span>
                    <span className={cn('t-body-sm-medium', styles.resultCity)}>
                      {[address.bairro, `${address.cidade},  ${address.uf} - ${address.cep}`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <img src={ICONS.circleArrowRight} width={18} height={18} alt="" className={styles.resultArrow} />
                </button>
              ))
            )}
          </div>
        ) : null}
      </form>
    </>
  )
}
