import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { emptyAddress, type Address } from '../services/address'
import { DEFAULTS, calculate, clampInputs, scenarioResult, type PeriodView, type Scenario, type SimInputs, type SimResult } from './model'

export type GeradorScreen = 'inicio' | 'simulador' | 'dados' | 'eletroposto' | 'resumo' | 'proposta' | 'visualizar'
const SCREENS: GeradorScreen[] = ['inicio', 'simulador', 'dados', 'eletroposto', 'resumo', 'proposta', 'visualizar']

/** v1: simulador com abas (#gerador) · v2: formulário linear com seções que aparecem na rolagem (#gerador2). As demais etapas são as mesmas */
export type GeradorVersion = 'v1' | 'v2'
const BASE: Record<GeradorVersion, string> = { v1: 'gerador', v2: 'gerador2' }

export type GeradorState = {
  simulacao: {
    inputs: SimInputs
    /** visão do resultado (o cenário "carteira + recargas" / "só recargas" fica em inputs.incomeMode) */
    view: PeriodView
    month: number
    year: number
  }
  investidor: {
    tipo: 'pf' | 'pj'
    documento: string
    nome: string
    nascimento: string
    email: string
    whatsapp: string
    endereco: Address
  }
  eletroposto: {
    endereco: Address
    publicidade: boolean
  }
  assinatura: {
    data: string
    nome: string
    documento: string
    testemunhaNome: string
    testemunhaCpf: string
    aceite: boolean
  }
  proposta: { id: string } | null
}

type Section = Exclude<keyof GeradorState, 'proposta'>
type Action =
  | { type: 'patch'; section: Section; value: Partial<GeradorState[Section]> }
  | { type: 'sim'; value: Partial<SimInputs> }
  | { type: 'proposta'; value: GeradorState['proposta'] }

const initialState: GeradorState = {
  simulacao: { inputs: DEFAULTS, view: 'month', month: 1, year: 1 },
  investidor: { tipo: 'pf', documento: '', nome: '', nascimento: '', email: '', whatsapp: '', endereco: emptyAddress },
  eletroposto: { endereco: emptyAddress, publicidade: false },
  assinatura: { data: '', nome: '', documento: '', testemunhaNome: '', testemunhaCpf: '', aceite: false },
  proposta: null,
}

function reducer(state: GeradorState, action: Action): GeradorState {
  switch (action.type) {
    case 'patch':
      return { ...state, [action.section]: { ...state[action.section], ...action.value } }
    case 'sim':
      return { ...state, simulacao: { ...state.simulacao, inputs: clampInputs({ ...state.simulacao.inputs, ...action.value }) } }
    case 'proposta':
      return { ...state, proposta: action.value }
  }
}

const STORAGE_KEY = 'igreen-mob-gerador-v1'

function loadState(): GeradorState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<GeradorState>
      // merge por seção: tolera estados salvos por versões anteriores
      return {
        simulacao: {
          ...initialState.simulacao,
          ...saved.simulacao,
          inputs: clampInputs({ ...DEFAULTS, ...saved.simulacao?.inputs }),
        },
        investidor: { ...initialState.investidor, ...saved.investidor },
        eletroposto: { ...initialState.eletroposto, ...saved.eletroposto },
        assinatura: { ...initialState.assinatura, ...saved.assinatura },
        proposta: saved.proposta ?? null,
      }
    }
  } catch {
    /* sessionStorage indisponível */
  }
  return initialState
}

const hashOf = (screen: GeradorScreen, version: GeradorVersion) => `#${BASE[version]}${screen === 'inicio' ? '' : `/${screen}`}`

/** #gerador2/resumo → { version: 'v2', screen: 'resumo' } (ignora a query, ex.: o ?d= do link compartilhado) */
const routeFromHash = (): { version: GeradorVersion; screen: GeradorScreen } => {
  const [path] = window.location.hash.replace('#', '').split('?')
  const [base, sub] = path.split('/')
  const screen = SCREENS.includes(sub as GeradorScreen) ? (sub as GeradorScreen) : 'inicio'
  return { version: base === BASE.v2 ? 'v2' : 'v1', screen }
}

type Ctx = {
  state: GeradorState
  /** resultado completo do modelo para as entradas atuais */
  result: SimResult
  /** recorte do resultado na visão escolhida (cenário + período) */
  scenario: Scenario
  screen: GeradorScreen
  version: GeradorVersion
  /** navega mantendo a versão do fluxo (v1 ou v2) */
  go: (screen: GeradorScreen) => void
  patch: <S extends Section>(section: S, value: Partial<GeradorState[S]>) => void
  /** altera entradas da simulação (sempre aplicando os limites do modelo) */
  setSim: (value: Partial<SimInputs>) => void
  setProposta: (value: GeradorState['proposta']) => void
}

const GeradorContext = createContext<Ctx | null>(null)

export function GeradorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const [route, setRoute] = useState(routeFromHash)
  const { screen, version } = route

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* sessionStorage indisponível */
    }
  }, [state])

  useEffect(() => {
    const onPop = () => setRoute(routeFromHash())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [screen])

  const go = useCallback(
    (next: GeradorScreen) => {
      window.history.pushState(null, '', hashOf(next, version))
      setRoute({ version, screen: next })
    },
    [version],
  )

  const patch = useCallback(<S extends Section>(section: S, value: Partial<GeradorState[S]>) => {
    dispatch({ type: 'patch', section, value } as Action)
  }, [])

  const setSim = useCallback((value: Partial<SimInputs>) => dispatch({ type: 'sim', value }), [])
  const setProposta = useCallback((value: GeradorState['proposta']) => dispatch({ type: 'proposta', value }), [])

  const { inputs, view, month, year } = state.simulacao
  const result = useMemo(() => calculate(inputs), [inputs])
  const scenario = useMemo(() => scenarioResult(result, inputs.incomeMode, view, month, year), [result, inputs.incomeMode, view, month, year])

  const value = useMemo(
    () => ({ state, result, scenario, screen, version, go, patch, setSim, setProposta }),
    [state, result, scenario, screen, version, go, patch, setSim, setProposta],
  )

  return <GeradorContext.Provider value={value}>{children}</GeradorContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useGerador() {
  const ctx = useContext(GeradorContext)
  if (!ctx) throw new Error('useGerador deve ser usado dentro de <GeradorProvider>')
  return ctx
}
