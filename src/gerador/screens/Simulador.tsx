import { useEffect, useRef, useState } from 'react'
import { ICONS } from '../../assets'
import { Highlight } from '../../components/layout/PageShell'
import { Icon } from '../../components/ui/Icon'
import { AdvancedTaxes } from '../components/AdvancedTaxes'
import { ChargerCarousel } from '../components/ChargerCarousel'
import { DreTable } from '../components/DreTable'
import { MonthTable } from '../components/MonthTable'
import { Premissas } from '../components/Premissas'
import { ReturnChart } from '../components/ReturnChart'
import { MobileResultBar, ResultPanel } from '../components/ResultPanel'
import { GeradorStepPage } from '../components/Shell'
import { CarteiraBlock, MovimentoBlock, PrecosBlock } from '../components/SimBlocks'
import { SimSection } from '../components/SimSection'
import { CHARGERS } from '../model'
import { useGerador } from '../state'
import styles from './Simulador.module.css'

const INCLUSO = ['Equipamento', 'Instalação', 'Pintura', 'Licença iGreen']

export function Simulador() {
  const { state, setSim, go, result, scenario } = useGerador()
  const inputs = state.simulacao.inputs
  const { view, month, year } = state.simulacao
  const combined = inputs.incomeMode === 'combined'
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelVisible, setPanelVisible] = useState(false)

  // A barra fixa do celular some enquanto o painel completo está na tela
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setPanelVisible(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const seguir = () => go('dados')

  return (
    <GeradorStepPage
      step={1}
      wide
      title={
        <>
          Simule seu <Highlight>eletroposto</Highlight>
        </>
      }
      subtitle="Grátis e sem compromisso: nada é contratado nesta etapa. Ajuste as premissas e veja o resultado na hora."
    >
      <div className={styles.layout}>
        <div className={styles.config}>
          <SimSection index={1} title="Escolha seu eletroposto" subtitle="Um ponto, quatro fontes de receita: recarga, energia, seguros e telecom.">
            <ChargerCarousel inputs={inputs} onSelect={(charger) => setSim({ charger, cars: CHARGERS[charger].defaultCars })} />
            <div className={styles.included}>
              <span className={styles.includedTitle}>Seu eletroposto pronto para operar</span>
              <ul className={styles.includedList}>
                {INCLUSO.map((item) => (
                  <li key={item}>
                    <span className={styles.tick} aria-hidden>
                      <Icon src={ICONS.checkBold} size={7} color="#fff" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </SimSection>
          <MovimentoBlock />
          <PrecosBlock />
          <CarteiraBlock />
          <AdvancedTaxes />
        </div>

        <aside className={styles.side}>
          <ResultPanel onContinue={seguir} panelRef={panelRef} />
        </aside>
      </div>

      <div className={styles.below}>
        <ReturnChart result={result} mode={inputs.incomeMode} />
        <DreTable
          period={scenario.period}
          inputs={inputs}
          charger={result.charger}
          periodLabel={view === 'month' ? `Mês ${month}` : `Ano ${year}`}
          combined={combined}
        />
        <MonthTable months={result.months} />
        <Premissas />
      </div>

      <MobileResultBar onContinue={seguir} hidden={panelVisible} />
    </GeradorStepPage>
  )
}
