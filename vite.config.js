import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    base: './',
    plugins: [react()],
    server: {
        port: 5500,
        strictPort: true,
        proxy: {
            // Endpoints del panel admin (FastAPI)
            '/admin': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            // Endpoints de autenticacion
            '/auth': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            // Catalogos
            '/categorias': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            // Endpoints legados
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
});
