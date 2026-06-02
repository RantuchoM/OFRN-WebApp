import React from 'react'
import './global-shim';
import './components/ui/quillEntradasRegister';
window.React = React;
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Recupera automáticamente cuando un chunk hashado ya no existe tras deploy.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
