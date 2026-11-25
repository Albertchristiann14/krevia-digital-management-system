import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

createInertiaApp({
    title: (title) => (title ? `${title} — KDMS` : 'Krevia Digital Management System'),
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob<{ default: ComponentType }>('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        if (el) {
            createRoot(el).render(<App {...props} />);
        }
    },
    progress: {
        color: '#101D35',
        showSpinner: false,
    },
});
