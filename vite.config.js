import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/local-proxy': {
        target: 'https://demo.netbox.dev',
        changeOrigin: true,
        secure: false, // Don't verify SSL if that's an issue
        router: (req) => {
          return req.headers['x-target-url'] || 'https://demo.netbox.dev';
        },
        rewrite: (path) => path.replace(/^\/local-proxy/, ''),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Remove the custom header before it goes to the target
            proxyReq.removeHeader('x-target-url');
            // Cloudflare sometimes blocks if referer or origin is weird
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
             // For safety
          });
        }
      }
    }
  }
})
