import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig({
    build: {
        target: 'es2022',
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
                name: 'Bureau of Civic Responsibility',
                short_name: 'BCR',
                description: 'Citizen productivity assessment, on file with the BCR.',
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
                    },
                    {
                        src: '/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            },
        }),
    ],
});
