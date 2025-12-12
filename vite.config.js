import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // <--- 1. IMPORTAR ESTO

export default defineConfig({
  plugins: [
    react(),
    // 2. AGREGAR ESTE BLOQUE COMPLETO
    VitePWA({
      registerType: 'autoUpdate', // Se actualiza sola cuando haces push a Vercel
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Gestor de Giras',    // Nombre completo
        short_name: 'Giras',        // Nombre debajo del ícono
        description: 'Gestión de seating y agenda para músicos',
        theme_color: '#ffffff',     // Color de la barra de estado
        background_color: '#ffffff',
        display: 'standalone',      // Esto hace que parezca App nativa (sin barra de URL)
        orientation: 'portrait',    // Bloquea la rotación si quieres (opcional)
        icons: [
          {
            src: 'pwa-192x192.png', // Asegúrate que coincida con el nombre en /public
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png', // Asegúrate que coincida con el nombre en /public
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png', 
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Importante para que Android recorte el ícono en círculo si quiere
          }
        ]
      }
    })
  ],
})