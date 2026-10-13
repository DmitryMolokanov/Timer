import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// шрифты в бандле, а не с Google Fonts: попадают в precache и работают офлайн
import '@fontsource/audiowide/latin-400.css'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/cyrillic-400.css'
import '@fontsource/source-sans-3/latin-700.css'
import '@fontsource/source-sans-3/cyrillic-700.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
