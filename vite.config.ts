import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig({
    build: {
        target: 'es2022',
        rollupOptions: {
            input: {
                main: 'index.html',
                book: 'book/index.html',
            },
        },
    },
    optimizeDeps: {
        esbuildOptions: {
            target: 'es2022',
        },
    },
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'BCR Clear',
                short_name: 'BCR Clear',
                description: 'Clear your daily docket. Bureau of Civic Responsibility.',
                theme_color: '#C41E3A',
                background_color: '#F5EFE0',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                icons: [
                    {
                        src: '/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icon-512-mask.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            },
        }),
    ],
});
