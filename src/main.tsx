import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { keepFocusedFieldVisible } from './lib/keepFocusedFieldVisible'
import './styles/global.css'

keepFocusedFieldVisible()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
