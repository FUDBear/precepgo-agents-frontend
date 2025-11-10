import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Import Firebase config first to initialize auth
import './config/firebase'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
