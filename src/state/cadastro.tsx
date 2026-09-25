import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { DEFAULTS, INVESTIMENTO_PADRAO, aporteDe, type TipoCarregador } from '../data/investment'
import { simulate, type Simulation } from '../lib/simulation'
import { emptyAddress, type Address } from '../services/address'

export type Screen = 'inicio' | 'simulador' | 'step1' | 'step2' | 'step3' | 'step4' | 'proposta'
const SCREENS: Screen[] = ['inicio', 'simulador', 'step1', 'step2', 'step3', 'step4', 'proposta']

export type CadastroState = {
  simulacao: {
    cpf: string
    liberada: boolean
    modo: 'energia' | 'recarga'
    /** Investimento = tipo de carregador × quantidade (o aporte é derivado) */
    tipo: TipoCarregador
    quantidade: number
    ocupacao: number
    precoKwh: number
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
  modelo: {
    /** Categoria escolhida no passo 2 (antes disso a lista fica aberta) */
    categoriaConfirmada: boolean
    publicidade: boolean
  }
  eletroposto: {
    endereco: Address
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

type Section = Exclude<keyof CadastroState, 'proposta'>
type Action =
  | { type: 'patch'; section: Section; value: Partial<CadastroState[Section]> }
  | { type: 'proposta'; value: CadastroState['proposta'] }
  | { type: 'reset' }

const initialState: CadastroState = {
  simulacao: { cpf: '', liberada: false, modo: 'energia', ...INVESTIMENTO_PADRAO, ...DEFAULTS },
  investidor: { tipo: 'pf', documento: '', nome: '', nascimento: '', email: '', whatsapp: '', endereco: emptyAddress },
  modelo: { categoriaConfirmada: false, publicidade: false },
  eletroposto: { endereco: emptyAddress },
  assinatura: { data: '', nome: '', documento: '', testemunhaNome: '', testemunhaCpf: '', aceite: false },
  proposta: null,
}

function reducer(state: CadastroState, action: Action): CadastroState {
  switch (action.type) {
    case 'patch':
      return { ...state, [action.section]: { ...state[action.section], ...action.value } }
    case 'proposta':
      return { ...state, proposta: action.value }
    case 'reset':
      return initialState
  }
}

const STORAGE_KEY = 'igreen-mob-cadastro-v2'

function loadState(): CadastroState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<CadastroState>
      // merge por seção: tolera estados salvos por versões anteriores
      return {
        simulacao: { ...initialState.simulacao, ...saved.simulacao },
        investidor: { ...initialState.investidor, ...saved.investidor },
        modelo: { ...initialState.modelo, ...saved.modelo },
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

const screenFromHash = (): Screen => {
  const hash = window.location.hash.replace('#', '') as Screen
  return SCREENS.includes(hash) ? hash : 'inicio'
}

type Ctx = {
  state: CadastroState
  simulation: Simulation
  screen: Screen
  go: (screen: Screen) => void
  patch: <S extends Section>(section: S, value: Partial<CadastroState[S]>) => void
  setProposta: (value: CadastroState['proposta']) => void
  reset: () => void
}

const CadastroContext = createContext<Ctx | null>(null)

export function CadastroProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const [screen, setScreen] = useState<Screen>(screenFromHash)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* sessionStorage indisponível */
    }
  }, [state])

  useEffect(() => {
    const onPop = () => setScreen(screenFromHash())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [screen])

  const go = useCallback((next: Screen) => {
    window.history.pushState(null, '', next === 'inicio' ? window.location.pathname : `#${next}`)
    setScreen(next)
  }, [])

  const patch = useCallback(<S extends Section>(section: S, value: Partial<CadastroState[S]>) => {
    dispatch({ type: 'patch', section, value } as Action)
  }, [])

  const setProposta = useCallback((value: CadastroState['proposta']) => dispatch({ type: 'proposta', value }), [])
  const reset = useCallback(() => dispatch({ type: 'reset' }), [])

  const { tipo, quantidade, ocupacao, precoKwh } = state.simulacao
  const simulation = useMemo(
    () => simulate({ aporte: aporteDe({ tipo, quantidade }), ocupacao, precoKwh }),
    [tipo, quantidade, ocupacao, precoKwh],
  )

  const value = useMemo(
    () => ({ state, simulation, screen, go, patch, setProposta, reset }),
    [state, simulation, screen, go, patch, setProposta, reset],
  )

  return <CadastroContext.Provider value={value}>{children}</CadastroContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useCadastro() {
  const ctx = useContext(CadastroContext)
  if (!ctx) throw new Error('useCadastro deve ser usado dentro de <CadastroProvider>')
  return ctx
}
