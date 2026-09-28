import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react'
import { Highlight } from '../../components/layout/PageShell'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { FormSection } from '../components/Guided'
import { CarteiraFields, EletropostoFields, MovimentoFields, PrecosFields, TributosFields } from '../components/GuidedFields'
import { MobileResultBar, ResultPanel } from '../components/ResultPanel'
import { ShareModal } from '../components/ShareModal'
import { ETAPAS, GeradorHeader, GeradorPageHeader } from '../components/Shell'
import { SimReport } from '../components/SimReport'
import { secoesPreenchidas } from '../guided'
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
 * Simulador v2 (#gerador2): um formulário linear que se revela conforme o preenchimento.
 * Cada seção aparece quando todos os campos da anterior estão preenchidos (os campos começam vazios).
 * O resultado aparece com movimento e preços; a carteira entra depois; relatório e botões no fim.
 */
export function SimuladorV2() {
  const { state, go } = useGerador()
  const prontas = secoesPreenchidas(state.simulacao.preenchidos)
  const hasResult = prontas >= 3
  const carteiraPending = prontas < 4
  const complete = prontas >= 4
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
  }, [hasResult])

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
  const verResultado = () => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.column}>
          <GeradorHeader step={1} label={`ETAPA 1 DE ${ETAPAS}`} />
          <div className={styles.form}>
            <GeradorPageHeader
              badge={`ETAPA 1 DE ${ETAPAS}`}
              title={
                <>
                  Simule seu <Highlight>eletroposto</Highlight>
                </>
              }
              subtitle="Grátis e sem compromisso. Preencha os dados e veja o resultado na hora."
            />
            <div className={styles.sections}>
              {SECOES.slice(0, Math.min(prontas + 1, SECOES.length)).map(({ title, description, Fields }) => (
                <FormSection key={title} title={title} description={description}>
                  <Fields />
                </FormSection>
              ))}
            </div>
          </div>
        </div>

        <aside ref={sideRef} className={cn(styles.side, !hasResult && styles.sideEmpty)} style={{ '--side-top': `${sideTop}px` } as CSSProperties}>
          <ResultPanel
            panelRef={panelRef}
            empty={!hasResult}
            carteiraPending={carteiraPending}
            onContinue={complete ? seguir : undefined}
            onShare={complete ? () => setShareOpen(true) : undefined}
          />
          {hasResult && !complete ? <p className={styles.sideHint}>Informe a carteira iGreen para ver o relatório completo e seguir para a proposta.</p> : null}
        </aside>
      </div>

      {complete ? (
        <div className={styles.below}>
          <SimReport />
          <section className={styles.final} aria-label="Próximos passos">
            <div className={styles.finalText}>
              <h2 className={cn('t-section-title', styles.finalTitle)}>Gostou do resultado?</h2>
              <p>Siga para a proposta com estes valores ou compartilhe a simulação.</p>
            </div>
            <div className={styles.finalButtons}>
              <Button variant="secondary" onClick={() => setShareOpen(true)}>
                Compartilhar simulação
              </Button>
              <Button onClick={seguir}>Seguir para proposta</Button>
            </div>
          </section>
        </div>
      ) : null}

      <MobileResultBar
        onContinue={complete ? seguir : verResultado}
        actionLabel={complete ? 'Seguir' : 'Resultado'}
        hidden={!hasResult || panelVisible}
        carteiraPending={carteiraPending}
      />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </main>
  )
}
