import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { Highlight } from '../../components/layout/PageShell'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { GuidedStep } from '../components/Guided'
import { CarteiraStep, EletropostoStep, MovimentoStep, PrecosStep, TributosStep } from '../components/GuidedFields'
import { RESUMOS } from '../guided'
import { MobileResultBar, ResultPanel } from '../components/ResultPanel'
import { ShareModal } from '../components/ShareModal'
import { ETAPAS, GeradorHeader, GeradorPageHeader } from '../components/Shell'
import { SimReport } from '../components/SimReport'
import { PASSOS_V2, useGerador } from '../state'
import styles from './SimuladorV2.module.css'

const PASSOS: { title: string; short: string; description: string; Body: ComponentType }[] = [
  { title: 'Escolha seu eletroposto', short: 'eletroposto', description: 'Um ponto, quatro fontes de receita: recarga, energia, seguros e telecom.', Body: EletropostoStep },
  { title: 'Movimento', short: 'movimento', description: 'Quantos carros recarregam por dia e quanta energia cada um leva.', Body: MovimentoStep },
  { title: 'Preços', short: 'preços', description: 'Quanto custa a energia, por quanto você vende e a parte do dono do local.', Body: PrecosStep },
  { title: 'Carteira iGreen', short: 'carteira', description: 'Clientes de energia, seguros e telecom conectados pelo seu ponto geram comissões todo mês.', Body: CarteiraStep },
  { title: 'Tributos', short: 'tributos', description: 'Lucro Real · base 2026. Altere só com valores validados pela contabilidade.', Body: TributosStep },
]
const CARTEIRA = 3

/** Troca de layout com View Transitions quando o navegador suporta (painel entrando ao lado) */
function withTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (doc.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    doc.startViewTransition(() => flushSync(update))
  } else update()
}

/**
 * Simulador guiado (v2, #gerador2): os passos aparecem conforme a pessoa conclui o anterior.
 * O painel entra depois do eletroposto; a carteira entra no resultado depois do passo 4;
 * o relatório e os botões para seguir e compartilhar aparecem no fim.
 */
export function SimuladorV2() {
  const { state, result, patch, go } = useGerador()
  const inputs = state.simulacao.inputs
  const etapa = Math.min(state.simulacao.etapa ?? 0, PASSOS_V2)
  const [editing, setEditing] = useState<number | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [panelVisible, setPanelVisible] = useState(false)
  const [sideTop, setSideTop] = useState(24)
  const stepRefs = useRef<(HTMLElement | null)[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const sideRef = useRef<HTMLElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const scrollTarget = useRef<'step' | 'report' | null>(null)

  const complete = etapa >= PASSOS_V2
  const active = editing ?? (complete ? null : etapa)
  const revealed = etapa >= 1
  const carteiraPending = etapa <= CARTEIRA
  const shown = complete ? PASSOS_V2 : etapa + 1

  // Depois de concluir um passo, leva ao próximo (ou ao relatório, no fim)
  useEffect(() => {
    const target = scrollTarget.current
    scrollTarget.current = null
    if (target === 'report') reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (target === 'step' && active != null) stepRefs.current[active]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [active, complete])

  // A barra fixa do celular some enquanto o painel está na tela
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setPanelVisible(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [revealed])

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
  }, [revealed])

  const concluir = (i: number) => {
    if (editing != null) {
      setEditing(null)
      return
    }
    scrollTarget.current = i + 1 >= PASSOS_V2 ? 'report' : 'step'
    const update = () => patch('simulacao', { etapa: i + 1 })
    if (i === 0) withTransition(update)
    else update()
  }

  const editar = (i: number) => {
    scrollTarget.current = 'step'
    setEditing(i)
  }

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
              subtitle="Grátis e sem compromisso. Responda em 5 passos e veja o resultado se formando ao lado."
            />
            <div className={styles.steps}>
              {PASSOS.slice(0, shown).map((p, i) => (
                <GuidedStep
                  key={p.short}
                  n={i + 1}
                  stepRef={(el) => {
                    stepRefs.current[i] = el
                  }}
                  title={p.title}
                  description={p.description}
                  status={active === i ? 'active' : 'done'}
                  summary={RESUMOS[i](inputs, result)}
                  onEdit={() => editar(i)}
                  action={editing != null ? 'Salvar e fechar' : i + 1 < PASSOS_V2 ? `Continuar para ${PASSOS[i + 1].short}` : 'Ver resultado completo'}
                  onAction={() => concluir(i)}
                  last={i === shown - 1}
                >
                  <p.Body />
                </GuidedStep>
              ))}
            </div>
          </div>
        </div>

        {revealed ? (
          <aside ref={sideRef} className={styles.side} style={{ '--side-top': `${sideTop}px` } as CSSProperties}>
            <ResultPanel
              panelRef={panelRef}
              carteiraPending={carteiraPending}
              onContinue={complete ? seguir : undefined}
              onShare={complete ? () => setShareOpen(true) : undefined}
            />
            {complete ? null : <p className={styles.sideHint}>Conclua os {PASSOS_V2} passos para ver o relatório completo e seguir para a proposta.</p>}
          </aside>
        ) : null}
      </div>

      {complete ? (
        <div ref={reportRef} className={styles.below}>
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
        hidden={!revealed || panelVisible}
        carteiraPending={carteiraPending}
      />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </main>
  )
}
