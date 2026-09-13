import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Tabata from './Tabata.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Tabata />
  </StrictMode>,
)
