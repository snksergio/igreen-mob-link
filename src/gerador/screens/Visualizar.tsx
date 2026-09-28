import { useEffect, useMemo, useState } from 'react'
import { Highlight } from '../../components/layout/PageShell'
import { Button } from '../../components/ui/Button'
import { CAMPOS_V2, RESUMOS } from '../guided'
import { ResultPanel } from '../components/ResultPanel'
import { GeradorHeader, GeradorPageHeader } from '../components/Shell'
import { SimReport } from '../components/SimReport'
import { DEFAULTS } from '../model'
import { codeFromHash, decodeSim } from '../share'
import { useGerador } from '../state'
import styles from './SimuladorV2.module.css'
import viz from './Visualizar.module.css'

const TITULOS = ['Eletroposto', 'Movimento', 'Preços', 'Carteira iGreen', 'Tributos']

/**
 * Visualização de uma simulação compartilhada (#gerador2/visualizar?d=…): premissas escolhidas,
 * resultado e relatório completo, só para leitura. "Fazer minha simulação" abre o simulador com estes valores.
 */
export function Visualizar() {
  const { state, result, setSim, patch, go } = useGerador()
  const [code] = useState(codeFromHash)
  const shared = useMemo(() => decodeSim(code), [code])

  useEffect(() => {
    if (!shared) return
    setSim({ ...DEFAULTS, ...shared })
    patch('simulacao', { view: 'month', month: 1, year: 1 })
  }, [shared, setSim, patch])

  const simular = () => {
    patch('simulacao', { preenchidos: CAMPOS_V2 })
    go('simulador')
  }

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.column}>
          <GeradorHeader />
          <div className={styles.form}>
            <GeradorPageHeader
              badge="SIMULAÇÃO COMPARTILHADA"
              title={
                <>
                  Simulação de <Highlight>eletroposto</Highlight>
                </>
              }
              subtitle={
                shared
                  ? 'Projeção estimada com as premissas escolhidas por quem compartilhou. Nada é contratado aqui.'
                  : 'Não conseguimos abrir esta simulação. O link pode estar incompleto.'
              }
            />

            {shared ? (
              <dl className={viz.premissas}>
                {TITULOS.map((t, i) => (
                  <div key={t}>
                    <dt>{t}</dt>
                    <dd>{RESUMOS[i](state.simulacao.inputs, result)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className={viz.actions}>
              <Button onClick={simular}>{shared ? 'Fazer minha simulação' : 'Simular gratuitamente'}</Button>
              {shared ? <p className={viz.hint}>Abre o simulador com estes valores para você ajustar do seu jeito.</p> : null}
            </div>
          </div>
        </div>

        {shared ? (
          <aside className={styles.side}>
            <ResultPanel />
          </aside>
        ) : null}
      </div>

      {shared ? (
        <div className={styles.below}>
          <SimReport />
        </div>
      ) : null}
    </main>
  )
}
