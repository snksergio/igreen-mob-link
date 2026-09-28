import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react'
import { Highlight } from '../../components/layout/PageShell'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { FormSection, Reveal } from '../components/Guided'
import { CarteiraFields, EletropostoFields, MovimentoFields, PrecosFields, TributosFields } from '../components/GuidedFields'
import { MobileResultBar, ResultPanel } from '../components/ResultPanel'
import { ShareModal } from '../components/ShareModal'
import { GeradorHeader, GeradorPageHeader } from '../components/Shell'
import { SimReport } from '../components/SimReport'
import { useGerador } from '../state'
import styles from './SimuladorV2.module.css'

const SECOES: { title: string; description: string; Fields: ComponentType }[] = [
  { title: 'Escolha seu eletroposto', description: 'Um ponto, quatro fontes de receita: recarga, energia, seguros e telecom.', Fields: EletropostoFields },
  { title: 'Movimento', description: 'Quantos carros recarregam por dia e quanta energia cada um leva.', Fields: MovimentoFields },
  { title: 'Preços', description: 'Quanto custa a energia, por quanto você vende e a parte do dono do local.', Fields: PrecosFields },
  { title: 'Carteira iGreen', description: 'Clientes de energia, seguros e telecom conectados pelo seu ponto geram comissões todo mês.', Fields: CarteiraFields },
  { title: 'Tributos', description: 'Lucro Real · base 2026. Altere só com valores validados pela contabilidade.', Fields: TributosFields },
]

/**
 * Simulador v2 (#gerador2): mesma largura e painel do simulador com abas, mas com as premissas em um
 * formulário linear. Tudo já vem preenchido com as premissas padrão; cada seção aparece na rolagem.
 */
export function SimuladorV2() {
  const { go } = useGerador()
  const [shareOpen, setShareOpen] = useState(false)
  const [panelVisible, setPanelVisible] = useState(false)
  const [sideTop, setSideTop] = useState(24)
  const panelRef = useRef<HTMLDivElement>(null)
  const sideRef = useRef<HTMLElement>(null)

  // A barra fixa do celular some enquanto o painel está na tela
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setPanelVisible(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Painel mais alto que a tela: gruda pela base, para os botões continuarem visíveis
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
  const compartilhar = () => setShareOpen(true)

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <GeradorHeader />
        <GeradorPageHeader
          className={styles.intro}
          title={
            <>
              Simule seu <Highlight>eletroposto</Highlight>
            </>
          }
          subtitle="Grátis e sem compromisso. Ajuste os valores e veja o resultado ao vivo."
        />

        {/* O painel começa na mesma altura da primeira seção */}
        <div className={styles.layout}>
          <div className={styles.form}>
            {SECOES.map(({ title, description, Fields }) => (
              <FormSection key={title} title={title} description={description}>
                <Fields />
              </FormSection>
            ))}
          </div>

          <aside ref={sideRef} className={styles.side} style={{ '--side-top': `${sideTop}px` } as CSSProperties}>
            <ResultPanel panelRef={panelRef} onContinue={seguir} onShare={compartilhar} />
          </aside>
        </div>

        <Reveal className={styles.below}>
          <SimReport />
          <section className={styles.final} aria-label="Próximos passos">
            <div className={styles.finalText}>
              <h2 className={cn('t-section-title', styles.finalTitle)}>Gostou do resultado?</h2>
              <p>Siga para a proposta com estes valores ou compartilhe a simulação.</p>
            </div>
            <div className={styles.finalButtons}>
              <Button variant="secondary" onClick={compartilhar}>
                Compartilhar simulação
              </Button>
              <Button onClick={seguir}>Seguir para proposta</Button>
            </div>
          </section>
        </Reveal>
      </div>

      <MobileResultBar onContinue={seguir} hidden={panelVisible} />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </main>
  )
}
