import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { emptyAddress, type Address } from '../services/address'
import { DEFAULTS, calculate, clampInputs, scenarioResult, type PeriodView, type Scenario, type SimInputs, type SimResult } from './model'
import { BASE, baseOf, versionOfBase, type GeradorVersion } from './routes'

export type GeradorScreen = 'inicio' | 'simulador' | 'dados' | 'eletroposto' | 'resumo' | 'proposta'
const SCREENS: GeradorScreen[] = ['inicio', 'simulador', 'dados', 'eletroposto', 'resumo', 'proposta']

/** v1: simulador com abas (#gerador) · v2: formulário linear (#investir). As demais etapas são as mesmas (ver routes.ts) */
export type { GeradorVersion }

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

/** #investir/resumo → { version: 'v2', screen: 'resumo' } (ignora uma eventual query) */
const routeFromHash = (): { version: GeradorVersion; screen: GeradorScreen } => {
  const [path] = window.location.hash.replace('#', '').split('?')
  const [, sub] = path.split('/')
  const screen = SCREENS.includes(sub as GeradorScreen) ? (sub as GeradorScreen) : 'inicio'
  return { version: versionOfBase(baseOf(window.location.hash)) ?? 'v1', screen }
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
    const sync = () => {
      const next = routeFromHash()
      // Endereço antigo (#gerador2/...) vira o atual (#investir/...) sem criar entrada no histórico.
      // Só mexe em endereços do Gerador: outra rota é do fluxo atual e o Root troca de app.
      const base = baseOf(window.location.hash)
      if (versionOfBase(base) && base !== BASE[next.version]) window.history.replaceState(null, '', hashOf(next.screen, next.version))
      setRoute(next)
    }
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
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
