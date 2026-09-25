import { useSyncExternalStore } from 'react'

/**
 * Tema claro/escuro. O atributo `data-theme` no <html> é aplicado antes da primeira pintura pelo script
 * do index.html (sem "piscar" claro). Sem escolha salva, segue o tema do sistema; a escolha no botão fica
 * salva no aparelho.
 */
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'igreen-tema'
const EVENT = 'igreen-tema'
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)')

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
  window.dispatchEvent(new Event(EVENT))
}

export const currentTheme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* localStorage indisponível: vale só nesta visita */
  }
  apply(theme)
}

/** Garante o atributo e acompanha a troca de tema do sistema enquanto não houver escolha salva */
export function initTheme() {
  if (!document.documentElement.dataset.theme) apply(savedTheme() ?? (systemDark().matches ? 'dark' : 'light'))
  systemDark().addEventListener('change', (e) => {
    if (!savedTheme()) apply(e.matches ? 'dark' : 'light')
  })
}

const subscribe = (onChange: () => void) => {
  window.addEventListener(EVENT, onChange)
  return () => window.removeEventListener(EVENT, onChange)
}

export const useTheme = () => useSyncExternalStore(subscribe, currentTheme, (): Theme => 'light')
