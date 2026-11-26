<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title inertia>{{ config('app.name', 'KDMS') }}</title>
        <link rel="icon" type="image/png" href="/favicon.png">
        <script>
            (function () {
                try {
                    var theme = localStorage.getItem('kdms_theme') || 'light';
                    var isDark =
                        theme === 'dark' ||
                        (theme === 'system' &&
                            window.matchMedia &&
                            window.matchMedia('(prefers-color-scheme: dark)').matches);
                    if (isDark) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                } catch (e) {}
            })();
        </script>
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700|plus-jakarta-sans:600,700,800|jetbrains-mono:400,500,600" rel="stylesheet" />
        @routes
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        @inertiaHead
    </head>
    <body class="bg-[#F8FAFC] text-slate-900 antialiased selection:bg-[#101D35] selection:text-white dark:bg-[#0B1220] dark:text-slate-100 dark:selection:bg-blue-600">
        @inertia
    </body>
</html>
