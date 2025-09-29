import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '98.css'
import 'wtkrjs/dist/styles/variables.css'
import 'wtkrjs/dist/styles/DesktopWindow.css'
import 'wtkrjs/dist/styles/DesktopMenu.css'
import 'wtkrjs/dist/styles/MenuBar.css'
import 'wtkrjs/dist/styles/TaskBar.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
