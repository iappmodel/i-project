import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './prototypes.css'
import './design-system.css'
import './styles/gesture-buttons.css'
import './styles/elo-presence.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
