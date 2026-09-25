import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { keepFocusedFieldVisible } from './lib/keepFocusedFieldVisible'
import { initTheme } from './lib/theme'
import './styles/global.css'

initTheme()
keepFocusedFieldVisible()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
