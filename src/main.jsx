import React from 'react'
import './global-shim'; // <--- ESTA DEBE SER LA LÍNEA 1
window.React = React; // <--- ESTA LÍNEA SOLUCIONA EL ERROR
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // <--- IMPORTAR
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> {/* <--- ENVOLVER APP */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)