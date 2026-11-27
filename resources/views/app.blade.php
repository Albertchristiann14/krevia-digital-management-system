<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" data-theme="light">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#FFFFFF">
        <title inertia>{{ config('app.name', 'KDMS') }}</title>
        <link rel="icon" type="image/png" href="/favicon.png">
        <script>
            (function () {
                try {
                    var serverTheme = @json(auth()->user()?->preferences['theme'] ?? null);
                    var stored = localStorage.getItem('kdms_theme');
                    var theme = stored || serverTheme || 'light';
                    if (theme !== 'light' && theme !== 'dark' && theme !== 'system') {
                        theme = 'light';
                    }
                    var isDark =
                        theme === 'dark' ||
                        (theme === 'system' &&
                            window.matchMedia &&
                            window.matchMedia('(prefers-color-scheme: dark)').matches);
                    var resolved = isDark ? 'dark' : 'light';
                    var root = document.documentElement;
                    root.setAttribute('data-theme', resolved);
                    root.style.colorScheme = resolved;
                    if (isDark) {
                        root.classList.add('dark');
                    } else {
                        root.classList.remove('dark');
                    }
                    var meta = document.querySelector('meta[name="theme-color"]');
                    if (meta) {
                        meta.setAttribute('content', isDark ? '#070B16' : '#FFFFFF');
                    }
                } catch (e) {}
            })();
        </script>
        <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
        <link
            rel="preload"
            as="style"
            href="https://fonts.bunny.net/css?family=inter:400,500,600,700|plus-jakarta-sans:600,700,800|jetbrains-mono:400,500,600&display=swap"
            onload="this.onload=null;this.rel='stylesheet'"
        >
        <noscript>
            <link
                rel="stylesheet"
                href="https://fonts.bunny.net/css?family=inter:400,500,600,700|plus-jakarta-sans:600,700,800|jetbrains-mono:400,500,600&display=swap"
            >
        </noscript>
        @routes
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        @inertiaHead
    </head>
    <body class="antialiased selection:bg-blue-600/20 selection:text-blue-900 dark:selection:bg-[#668CFF]/35 dark:selection:text-white">
        @inertia
    </body>
</html>
