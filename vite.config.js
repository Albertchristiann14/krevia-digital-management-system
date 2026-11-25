import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, 'resources/js'),
            'ziggy-js': path.resolve(import.meta.dirname, 'vendor/tightenco/ziggy'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return;
                    if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/@inertiajs/')) {
                        return 'vendor-react';
                    }
                    if (id.includes('/recharts/') || id.includes('/d3-') || id.includes('/victory-vendor/')) {
                        return 'vendor-charts';
                    }
                    if (id.includes('/@fullcalendar/')) {
                        return 'vendor-calendar';
                    }
                    if (id.includes('/lucide-react/') || id.includes('/@radix-ui/')) {
                        return 'vendor-ui';
                    }
                },
            },
        },
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
