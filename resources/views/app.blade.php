<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title inertia>{{ config('app.name', 'KDMS') }}</title>
        <link rel="icon" type="image/png" href="/favicon.png">
        <script>
            (function () {
                try {
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('kdms_theme', 'dark');
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
    <body class="bg-[#070B16] text-[#F4F7FF] antialiased selection:bg-[#668CFF]/35 selection:text-white">
        @inertia
    </body>
</html>
