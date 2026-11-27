import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

export interface ReverbClientConfig {
    enabled: boolean;
    key?: string | null;
    host?: string | null;
    port?: number;
    scheme?: string;
}

declare global {
    interface Window {
        Pusher: typeof Pusher;
    }
}

export function createReverbEcho(config: ReverbClientConfig): Echo<'reverb'> | null {
    if (typeof window === 'undefined' || !config.enabled || !config.key) {
        return null;
    }

    window.Pusher = Pusher;

    const csrfToken =
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ??
        decodeURIComponent(
            document.cookie
                .split('; ')
                .find((row) => row.startsWith('XSRF-TOKEN='))
                ?.split('=')[1] ?? '',
        );

    const isHttps = (config.scheme ?? 'https') === 'https';

    return new Echo({
        broadcaster: 'reverb',
        key: config.key,
        wsHost: config.host || window.location.hostname,
        wsPort: isHttps ? 80 : (config.port ?? 8080),
        wssPort: isHttps ? (config.port ?? 443) : 443,
        forceTLS: isHttps,
        enabledTransports: ['ws', 'wss'],
        authEndpoint: '/broadcasting/auth',
        auth: {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
            },
        },
    });
}
