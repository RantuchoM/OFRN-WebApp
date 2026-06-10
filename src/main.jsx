import React from 'react'
import './global-shim';
import './components/ui/quillEntradasRegister';
window.React = React;
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Recupera cuando un chunk hashado ya no existe tras deploy (con tope anti-bucle).
const PRELOAD_RELOAD_KEY = 'ofrn:preload-reload'
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  try {
    const count = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY) || 0)
    if (count >= 2) {
      sessionStorage.removeItem(PRELOAD_RELOAD_KEY)
      console.warn('[PWA] Preload error repetido; no se recarga de nuevo.')
      return
    }
    sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(count + 1))
  } catch {
    /* ignore */
  }
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
