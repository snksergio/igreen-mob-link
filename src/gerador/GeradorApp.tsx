import { useEffect, type ComponentType } from 'react'
import { eletropostoCompleto, investidorCompleto } from './rules'
import { GeradorProvider, useGerador, type GeradorScreen } from './state'
import { Dados } from './screens/Dados'
import { Eletroposto } from './screens/Eletroposto'
import { Inicio } from './screens/Inicio'
import { Proposta } from './screens/Proposta'
import { Resumo } from './screens/Resumo'
import { Simulador } from './screens/Simulador'
import { SimuladorV2 } from './screens/SimuladorV2'

const SCREENS: Record<GeradorScreen, ComponentType> = {
  inicio: Inicio,
  simulador: Simulador,
  dados: Dados,
  eletroposto: Eletroposto,
  resumo: Resumo,
  proposta: Proposta,
}

/** Etapa que falta quando a pessoa abre uma tela sem ter concluído as anteriores */
function useMissingStep(screen: GeradorScreen): GeradorScreen | null {
  const { state } = useGerador()
  const dadosOk = investidorCompleto(state.investidor)
  const localOk = eletropostoCompleto(state.eletroposto)
  if (screen === 'eletroposto' && !dadosOk) return 'dados'
  if (screen === 'resumo') return !dadosOk ? 'dados' : !localOk ? 'eletroposto' : null
  if (screen === 'proposta' && !state.proposta) return 'resumo'
  return null
}

function Flow() {
  const { screen, version, go } = useGerador()
  const missing = useMissingStep(screen)

  useEffect(() => {
    if (missing) go(missing)
  }, [missing, go])

  if (missing) return null
  // v2 (#investir) troca só o simulador; as demais etapas são as mesmas
  const Current = screen === 'simulador' && version === 'v2' ? SimuladorV2 : SCREENS[screen]
  return <Current key={screen} />
}

export function GeradorApp() {
  return (
    <GeradorProvider>
      <Flow />
    </GeradorProvider>
  )
}
