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

// Chunks viejos tras un deploy: el script inline de index.html (build) abre
// /refrescar.html una vez. Acá no se recarga: un reload con el SW viejo
// vuelve a servir el mismo shell y el cartel titila hasta que el navegador corta.

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
