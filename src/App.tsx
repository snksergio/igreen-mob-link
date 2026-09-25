import type { ComponentType } from 'react'
import { Inicio } from './screens/Inicio'
import { Proposta } from './screens/Proposta'
import { Simulador } from './screens/Simulador'
import { Step1Dados } from './screens/Step1Dados'
import { Step2Modelo } from './screens/Step2Modelo'
import { Step3Endereco } from './screens/Step3Endereco'
import { Step4Resumo } from './screens/Step4Resumo'
import { CadastroProvider, useCadastro, type Screen } from './state/cadastro'

const SCREENS: Record<Screen, ComponentType> = {
  inicio: Inicio,
  simulador: Simulador,
  step1: Step1Dados,
  step2: Step2Modelo,
  step3: Step3Endereco,
  step4: Step4Resumo,
  proposta: Proposta,
}

function Flow() {
  const { screen } = useCadastro()
  const Current = SCREENS[screen]
  return <Current key={screen} />
}

export default function App() {
  return (
    <CadastroProvider>
      <Flow />
    </CadastroProvider>
  )
}
