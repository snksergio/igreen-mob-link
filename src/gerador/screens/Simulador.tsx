import { useEffect, useId, useRef, useState, type ComponentType, type CSSProperties } from 'react'
import { ICONS } from '../../assets'
import { Highlight } from '../../components/layout/PageShell'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { ChargerCarousel } from '../components/ChargerCarousel'
import { MobileResultBar, ResultPanel } from '../components/ResultPanel'
import { TabBar, TabPanel } from '../components/Segmented'
import { GeradorStepPage } from '../components/Shell'
import { CarteiraPanel, MovimentoPanel, PrecosPanel } from '../components/SimBlocks'
import { SimReport } from '../components/SimReport'
import { TributosPanel } from '../components/TributosPanel'
import { CHARGERS } from '../model'
import { useGerador } from '../state'
import styles from './Simulador.module.css'

const INCLUSO = ['Equipamento', 'Instalação', 'Pintura', 'Licença iGreen']

type ParamTab = 'movimento' | 'precos' | 'carteira' | 'tributos'

const PARAM_TABS: { value: ParamTab; label: string }[] = [
  { value: 'movimento', label: 'Movimento' },
  { value: 'precos', label: 'Preços' },
  { value: 'carteira', label: 'Carteira' },
  { value: 'tributos', label: 'Tributos' },
]

const PANELS: Record<ParamTab, ComponentType> = {
  movimento: MovimentoPanel,
  precos: PrecosPanel,
  carteira: CarteiraPanel,
  tributos: TributosPanel,
}

function BlockHead({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <header className={styles.blockHead}>
      <h2 id={id} className={cn('t-section-title', styles.blockTitle)}>
        {title}
      </h2>
      <p className={styles.blockSubtitle}>{subtitle}</p>
    </header>
  )
}

export function Simulador() {
  const { state, setSim, go } = useGerador()
  const inputs = state.simulacao.inputs
  const panelRef = useRef<HTMLDivElement>(null)
  const sideRef = useRef<HTMLElement>(null)
  const [sideTop, setSideTop] = useState(24)
  const [panelVisible, setPanelVisible] = useState(false)
  const [tab, setTab] = useState<ParamTab>('movimento')
  const id = useId()
  const Panel = PANELS[tab]

  // A barra fixa do celular some enquanto o painel completo está na tela
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setPanelVisible(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Painel mais alto que a tela (notebooks baixos): gruda pela base, para o botão continuar visível
  useEffect(() => {
    const el = sideRef.current
    if (!el) return
    const update = () => setSideTop(Math.min(24, window.innerHeight - el.offsetHeight - 24))
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
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
          <section className={styles.block} aria-labelledby={`${id}-modelo`}>
            <BlockHead id={`${id}-modelo`} title="Escolha seu eletroposto" subtitle="Um ponto, quatro fontes de receita: recarga, energia, seguros e telecom." />
            <ChargerCarousel inputs={inputs} onSelect={(charger) => setSim({ charger, cars: CHARGERS[charger].defaultCars })} />
            <div className={styles.included}>
              <span>Pronto para operar:</span>
              <ul>
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
          </section>

          <section className={styles.block} aria-labelledby={`${id}-premissas`}>
            <BlockHead id={`${id}-premissas`} title="Ajuste as premissas" subtitle="O resultado ao lado atualiza na hora." />
            <TabBar label="Premissas da simulação" value={tab} options={PARAM_TABS} onChange={setTab} idBase={id} />
            <TabPanel idBase={id} value={tab}>
              <Panel />
            </TabPanel>
          </section>
        </div>

        <aside ref={sideRef} className={styles.side} style={{ '--side-top': `${sideTop}px` } as CSSProperties}>
          <ResultPanel onContinue={seguir} panelRef={panelRef} />
        </aside>
      </div>

      <div className={styles.below}>
        <SimReport />
      </div>

      <MobileResultBar onContinue={seguir} hidden={panelVisible} />
    </GeradorStepPage>
  )
}
