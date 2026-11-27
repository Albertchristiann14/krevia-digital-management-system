import { useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'kdms_theme';
const THEME_EVENT = 'kdms-theme-change';

export function resolveTheme(pref?: string | null): ResolvedTheme {
    if (pref === 'dark') return 'dark';
    if (pref === 'system' && typeof window !== 'undefined') {
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
}

export function getStoredThemePreference(fallback?: string | null): ThemePreference {
    if (typeof window !== 'undefined') {
        try {
            const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
            if (stored === 'light' || stored === 'dark' || stored === 'system') {
                return stored;
            }
        } catch {
            // ignore
        }
    }
    if (fallback === 'light' || fallback === 'dark' || fallback === 'system') {
        return fallback;
    }
    return 'light';
}

export function applyThemeToDocument(pref: ThemePreference): ResolvedTheme {
    const resolved = resolveTheme(pref);
    if (typeof document !== 'undefined') {
        const root = document.documentElement;
        root.setAttribute('data-theme', resolved);
        root.style.colorScheme = resolved;
        root.classList.toggle('dark', resolved === 'dark');

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', resolved === 'dark' ? '#070B16' : '#FFFFFF');
        }
    }
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, pref);
        } catch {
            // ignore
        }
        window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { pref, resolved } }));
    }
    return resolved;
}

export function useResolvedTheme(): ResolvedTheme {
    const [resolved, setResolved] = useState<ResolvedTheme>(() => {
        if (typeof document !== 'undefined') {
            return document.documentElement.getAttribute('data-theme') === 'dark' ||
                document.documentElement.classList.contains('dark')
                ? 'dark'
                : 'light';
        }
        return 'light';
    });

    useEffect(() => {
        const sync = () => {
            const isDark =
                document.documentElement.getAttribute('data-theme') === 'dark' ||
                document.documentElement.classList.contains('dark');
            setResolved(isDark ? 'dark' : 'light');
        };
        sync();
        window.addEventListener(THEME_EVENT, sync);
        const observer = new MutationObserver(sync);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme'],
        });
        return () => {
            window.removeEventListener(THEME_EVENT, sync);
            observer.disconnect();
        };
    }, []);

    return resolved;
}
