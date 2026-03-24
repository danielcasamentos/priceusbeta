import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'Logo_Price_Us_192x192.png', 'Logo_price_Us_512x512.png'],
      manifest: {
        name: 'PriceU$ - Sistema de Orçamentos Online',
        short_name: 'PriceUs',
        description: 'Crie orçamentos profissionais, capture leads e gerencie seu negócio.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/Logo_Price_Us_192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/Logo_price_Us_512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
