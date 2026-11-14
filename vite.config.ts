import {defineConfig, type Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';
import {readFileSync} from 'node:fs';

const packageVersion = (
    JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
        version: string;
    }
).version;
// Netlify sets COMMIT_REF during builds; locally it is absent.
const commit = process.env['COMMIT_REF'] || 'dev';

/** Emits dist/version.json ({"commit": "..."}) so the About page can check what is deployed now. */
function versionJsonPlugin(): Plugin {
    return {
        name: 'emit-version-json',
        apply: 'build',
        generateBundle() {
            this.emitFile({
                type: 'asset',
                fileName: 'version.json',
                source: JSON.stringify({commit}) + '\n',
            });
        },
    };
}

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(packageVersion),
        __APP_COMMIT__: JSON.stringify(commit),
        __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
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
        versionJsonPlugin(),
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'BCR Clear',
                short_name: 'BCR Clear',
                description: 'Clear your daily docket. Bureau of Civic Responsibility.',
                theme_color: '#000000',
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
