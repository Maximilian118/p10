import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Vite configuration for P10 Game frontend
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            '/graphql': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler',
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
