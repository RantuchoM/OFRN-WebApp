import React from 'react'
import './global-shim';
import './components/ui/quillEntradasRegister';
window.React = React;
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { tryUnlockScreenOrientation } from './utils/pwaOrientationRecovery'

tryUnlockScreenOrientation()
window.addEventListener('load', tryUnlockScreenOrientation, { once: true })

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
  // Mensaje breve antes del reload forzado (chunks viejos tras deploy).
  try {
    let el = document.getElementById('ofrn-preload-reload-msg')
    if (!el) {
      el = document.createElement('div')
      el.id = 'ofrn-preload-reload-msg'
      el.setAttribute('role', 'status')
      el.style.cssText =
        'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.45);padding:1.5rem;font-family:system-ui,sans-serif'
      el.innerHTML =
        '<div style="background:#fff;border:2px solid #4f46e5;border-radius:1rem;padding:1.5rem 1.75rem;max-width:20rem;text-align:center;font-size:.875rem;font-weight:700;color:#1e293b;line-height:1.35">Hay una versión nueva. Recargando para continuar…</div>'
      document.body?.appendChild(el)
    }
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
