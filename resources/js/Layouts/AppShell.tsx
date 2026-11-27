import { GlobalSearch } from '@/Components/shared/GlobalSearch';
import { UserAvatar } from '@/Components/shared/UserAvatar';
import { cn } from '@/lib/utils';
import type { PageProps } from '@/types';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Bell,
    Briefcase,
    Building,
    Building2,
    CalendarCheck2,
    CalendarRange,
    CheckCircle2,
    CheckSquare,
    ClipboardList,
    Compass,
    FileSpreadsheet,
    FolderLock,
    Gavel,
    Handshake,
    KeyRound,
    LayoutDashboard,
    LogOut,
    MailCheck,
    Megaphone,
    Menu,
    Monitor,
    Moon,
    NotebookPen,
    PanelLeftClose,
    PanelLeftOpen,
    Presentation,
    Radio,
    ShieldAlert,
    ShieldCheck,
    Sun,
    Target,
    UserCircle,
    UserCog,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';

interface NavItem {
    label: string;
    href: string;
    matchPrefix: string;
    icon: typeof LayoutDashboard;
    permission?: string;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
    {
        title: 'Overview',
        items: [
            {
                label: 'Executive Dashboard',
                href: '/dashboard',
                matchPrefix: '/dashboard',
                icon: LayoutDashboard,
            },
            {
                label: 'Virtual Office',
                href: '/virtual-office',
                matchPrefix: '/virtual-office',
                icon: Building2,
            },
            {
                label: 'My Tasks',
                href: '/my-tasks',
                matchPrefix: '/my-tasks',
                icon: CheckSquare,
                permission: 'tasks.view',
            },
            {
                label: 'Announcements',
                href: '/announcements',
                matchPrefix: '/announcements',
                icon: Radio,
            },
        ],
    },
    {
        title: 'Workplan & Execution',
        items: [
            {
                label: 'Annual Roadmap',
                href: '/workplan/roadmap',
                matchPrefix: '/workplan/roadmap',
                icon: Compass,
                permission: 'workplan.view',
            },
            {
                label: 'Monthly Workplan',
                href: '/workplan/monthly',
                matchPrefix: '/workplan/monthly',
                icon: CalendarCheck2,
                permission: 'workplan.view',
            },
            {
                label: 'Task Tracker',
                href: '/tasks',
                matchPrefix: '/tasks',
                icon: ClipboardList,
                permission: 'tasks.view',
            },
            {
                label: 'Projects',
                href: '/projects',
                matchPrefix: '/projects',
                icon: Briefcase,
                permission: 'projects.view',
            },
        ],
    },
    {
        title: 'Growth & CRM',
        items: [
            {
                label: 'Sales Pipeline',
                href: '/crm/leads',
                matchPrefix: '/crm/leads',
                icon: Handshake,
                permission: 'crm.view',
            },
            {
                label: 'Companies & Contacts',
                href: '/crm/companies',
                matchPrefix: '/crm/companies',
                icon: Building,
                permission: 'crm.view',
            },
            {
                label: 'Portfolio & Demos',
                href: '/portfolio/demos',
                matchPrefix: '/portfolio/demos',
                icon: Presentation,
                permission: 'demos.view',
            },
            {
                label: 'Content Calendar',
                href: '/marketing/content',
                matchPrefix: '/marketing/content',
                icon: Megaphone,
                permission: 'marketing.view',
            },
        ],
    },
    {
        title: 'Finance & Accounting',
        items: [
            {
                label: 'Financial Tracker',
                href: '/finance',
                matchPrefix: '/finance',
                icon: Wallet,
                permission: 'finance.view',
            },
            {
                label: 'Accounting & Ledger',
                href: '/finance/suite',
                matchPrefix: '/finance/suite',
                icon: FileSpreadsheet,
                permission: 'finance.view',
            },
            {
                label: 'My Compensations',
                href: '/finance/my-compensations',
                matchPrefix: '/finance/my-compensations',
                icon: Wallet,
            },
        ],
    },
    {
        title: 'Organization & Governance',
        items: [
            {
                label: 'Organization & Team',
                href: '/organization',
                matchPrefix: '/organization',
                icon: Building2,
                permission: 'organization.view',
            },
            {
                label: 'Roles & Permissions',
                href: '/admin/roles',
                matchPrefix: '/admin/roles',
                icon: ShieldCheck,
                permission: 'roles.view',
            },
            {
                label: 'Audit Trail',
                href: '/admin/audit-logs',
                matchPrefix: '/admin/audit-logs',
                icon: Activity,
                permission: 'audit.view',
            },
            {
                label: 'KPI & Performance',
                href: '/kpi',
                matchPrefix: '/kpi',
                icon: Target,
                permission: 'kpi.view_own',
            },
            {
                label: 'Meetings & Reviews',
                href: '/governance/meetings',
                matchPrefix: '/governance/meetings',
                icon: NotebookPen,
                permission: 'meetings.view',
            },
            {
                label: 'Risks & Decisions',
                href: '/governance/risks-decisions',
                matchPrefix: '/governance/risks-decisions',
                icon: ShieldAlert,
                permission: 'risks.view',
            },
            {
                label: 'Decision Log',
                href: '/governance/risks-decisions?tab=decisions',
                matchPrefix: '/governance/risks-decisions?tab=decisions',
                icon: Gavel,
                permission: 'risks.view',
            },
            {
                label: 'Document Center',
                href: '/documents',
                matchPrefix: '/documents',
                icon: FolderLock,
                permission: 'documents.view',
            },
            {
                label: 'Import & Export',
                href: '/admin/imports',
                matchPrefix: '/admin/imports',
                icon: FileSpreadsheet,
                permission: 'imports.manage',
            },
            {
                label: 'Team Accounts',
                href: '/admin/accounts',
                matchPrefix: '/admin/accounts',
                icon: UserCog,
                permission: 'users.manage',
            },
            {
                label: 'Gmail & WA Settings',
                href: '/admin/notifications-settings',
                matchPrefix: '/admin/notifications-settings',
                icon: MailCheck,
                permission: 'users.manage',
            },
        ],
    },
    {
        title: 'People',
        items: [
            {
                label: 'People',
                href: '/people',
                matchPrefix: '/people',
                icon: Users,
                permission: 'organization.view',
            },
        ],
    },
    {
        title: 'My Account',
        items: [
            {
                label: 'My Account',
                href: '/my-account',
                matchPrefix: '/my-account',
                icon: UserCircle,
            },
        ],
    },
];

const SIDEBAR_COLLAPSED_KEY = 'kdms.sidebar.collapsed';
const SIDEBAR_SCROLL_KEY = 'kdms.sidebar.scrollTop';
let lastSidebarScrollTop = 0;

function readInitialCollapsed(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
        return false;
    }
}

function readInitialScrollTop(): number {
    if (typeof window === 'undefined') return lastSidebarScrollTop;
    try {
        const stored = window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
        return stored !== null ? Number(stored) || 0 : lastSidebarScrollTop;
    } catch {
        return lastSidebarScrollTop;
    }
}

interface SidebarContentProps {
    mobile?: boolean;
    isCollapsed: boolean;
    appName: string;
    appTagline: string;
    currentUrl: string;
    user: PageProps['auth']['user'];
    canSee: (item: NavItem) => boolean;
    onCloseMobile: () => void;
    onLogout: () => void;
    navRef?: RefObject<HTMLElement | null>;
    onNavScroll?: () => void;
}

function SidebarContent({
    mobile = false,
    isCollapsed,
    appName,
    appTagline,
    currentUrl,
    user,
    canSee,
    onCloseMobile,
    onLogout,
    navRef,
    onNavScroll,
}: SidebarContentProps) {
    const compact = isCollapsed && !mobile;

    return (
        <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-[#0D1729] via-[#0B1424] to-[#080E1B] text-slate-200 select-none">
            <div
                className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(102,140,255,0.16) 0%, transparent 70%)' }}
            />
            <div
                className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(69,216,232,0.12) 0%, transparent 70%)' }}
            />
            <div
                className={cn(
                    'relative z-10 flex h-16 shrink-0 items-center border-b border-white/[0.09]',
                    compact ? 'justify-center px-2' : 'justify-between px-4',
                )}
            >
                <Link
                    href="/dashboard"
                    prefetch
                    className={cn(
                        'flex items-center overflow-hidden',
                        compact ? 'justify-center' : 'gap-3',
                    )}
                    title={compact ? 'Krevia Digital — KDMS' : undefined}
                >
                    <img
                        src="/images/krevia-mark.png"
                        alt="Krevia Digital"
                        width={36}
                        height={36}
                        decoding="async"
                        className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-0.5 shadow-sm"
                    />
                    {!compact && (
                        <div className="min-w-0">
                            <div className="truncate font-display text-sm font-bold tracking-tight text-white">
                                Krevia Digital
                            </div>
                            <div className="truncate text-[11px] text-slate-400">
                                {appName} · {appTagline}
                            </div>
                        </div>
                    )}
                </Link>
                {mobile && (
                    <button
                        type="button"
                        onClick={onCloseMobile}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                        aria-label="Close navigation"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            <nav
                ref={navRef}
                onScroll={onNavScroll}
                className={cn(
                    'flex-1 overflow-y-auto py-4',
                    compact
                        ? 'sidebar-scroll-collapsed space-y-2 px-2'
                        : 'sidebar-scroll space-y-5 px-3',
                )}
            >
                {NAV_GROUPS.map((group, groupIndex) => {
                    const visibleItems = group.items.filter(canSee);
                    if (visibleItems.length === 0) return null;

                    return (
                        <div
                            key={group.title}
                            className={cn(
                                compact && groupIndex > 0 && 'border-t border-white/10 pt-2',
                            )}
                        >
                            {!compact && (
                                <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                                    {group.title}
                                </p>
                            )}
                            <div className={cn(compact ? 'space-y-1.5' : 'space-y-1')}>
                                {visibleItems.map((item) => {
                                    const active =
                                        currentUrl === item.href ||
                                        (item.matchPrefix === '/finance'
                                            ? currentUrl === '/finance' || currentUrl.startsWith('/finance?')
                                            : currentUrl.startsWith(item.matchPrefix));
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            prefetch
                                            onClick={onCloseMobile}
                                            title={compact ? item.label : undefined}
                                            aria-label={item.label}
                                             className={cn(
                                                'flex items-center rounded-xl text-sm font-medium transition-all duration-150',
                                                compact
                                                    ? 'mx-auto h-10 w-10 justify-center p-0'
                                                    : 'gap-3 px-3 py-2',
                                                active
                                                    ? 'bg-gradient-to-r from-[#6C8CFF]/25 via-[#55D6E8]/10 to-transparent text-white shadow-[0_0_20px_rgba(108,140,255,0.16)] ring-1 ring-[#6C8CFF]/35'
                                                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
                                            )}
                                        >
                                            <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-[#55D6E8]')} />
                                            {!compact && (
                                                <span className="truncate">{item.label}</span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {user && (
                <div className="relative z-10 shrink-0 border-t border-white/[0.09] p-3">
                    <div
                        className={cn(
                            'flex items-center rounded-xl bg-white/[0.045] ring-1 ring-white/[0.09] backdrop-blur-md transition hover:bg-white/[0.07]',
                            compact ? 'justify-center p-1.5' : 'gap-3 p-2.5',
                        )}
                    >
                        <UserAvatar
                            name={user.name}
                            avatarUrl={user.avatar_url}
                            avatarColor={user.profile?.avatar_color ?? '#1E3A5F'}
                            size="sm"
                            className="ring-1 ring-white/20"
                        />
                        {!compact && (
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-white">{user.name}</p>
                                <p className="truncate text-[11px] text-slate-400">
                                    {user.profile?.position ?? user.roles[0] ?? 'Member'}
                                </p>
                            </div>
                        )}
                        {!compact && (
                            <button
                                type="button"
                                onClick={onLogout}
                                title="Sign out"
                                className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export function AppShell({
    title,
    subtitle,
    actions,
    children,
}: {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    children: ReactNode;
}) {
    const { auth, app, flash } = usePage<PageProps>().props;
    const currentUrl = usePage().url;
    const [collapsed, setCollapsed] = useState<boolean>(readInitialCollapsed);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showOwnPasswordModal, setShowOwnPasswordModal] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const navRef = useRef<HTMLElement | null>(null);

    const ownPasswordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const user = auth.user;
    const unreadCount = auth.unreadNotificationsCount ?? 0;
    const activeTheme = user?.preferences?.theme ?? 'light';

    useEffect(() => {
        if (typeof document === 'undefined' || !user?.preferences) {
            return;
        }
        const root = document.documentElement;
        const theme = user.preferences.theme ?? 'light';
        try {
            localStorage.setItem('kdms_theme', theme);
        } catch {
            // Ignore storage errors
        }

        const applyTheme = () => {
            root.classList.add('dark');
        };

        applyTheme();
        root.setAttribute('data-density', user.preferences.compact_mode ?? 'comfortable');

        if (theme === 'system' && typeof window !== 'undefined') {
            const media = window.matchMedia('(prefers-color-scheme: dark)');
            media.addEventListener('change', applyTheme);
            return () => media.removeEventListener('change', applyTheme);
        }
    }, [user?.preferences?.theme, user?.preferences?.compact_mode]);

    const cycleTheme = () => {
        if (!user) {
            return;
        }
        const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
        const currentIdx = order.indexOf(activeTheme);
        const nextTheme = order[(currentIdx + 1) % order.length];
        try {
            localStorage.setItem('kdms_theme', nextTheme);
        } catch {
            // Ignore
        }
        router.patch(
            '/my-account/preferences',
            {
                theme: nextTheme,
                language: user.preferences?.language ?? 'en',
                timezone: user.preferences?.timezone ?? 'Asia/Jakarta',
                date_format: user.preferences?.date_format ?? 'DD/MM/YYYY',
                compact_mode: user.preferences?.compact_mode ?? 'comfortable',
            },
            { preserveScroll: true, preserveState: true },
        );
    };
    const perms = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);

    const canSee = (item: NavItem) => !item.permission || perms.has(item.permission);

    useEffect(() => {
        const removeStart = router.on('start', (event) => {
            if (!event.detail.visit.prefetch) {
                setIsNavigating(true);
            }
        });
        const removeFinish = router.on('finish', () => setIsNavigating(false));
        return () => {
            removeStart();
            removeFinish();
        };
    }, []);

    useLayoutEffect(() => {
        const el = navRef.current;
        if (!el) return;
        const saved = readInitialScrollTop();
        if (saved > 0) {
            el.scrollTop = saved;
        }
    }, [currentUrl, collapsed]);

    const handleNavScroll = () => {
        const top = navRef.current?.scrollTop ?? 0;
        lastSidebarScrollTop = top;
        try {
            window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(top));
        } catch {
            // ignore storage errors
        }
    };

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev;
            try {
                window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
            } catch {
                // ignore storage errors
            }
            return next;
        });
    };

    const handleLogout = () => {
        router.post('/logout');
    };

    return (
        <div className="krevia-glow-mesh flex min-h-screen bg-[#070B16] text-[#F4F7FF]">
            <aside
                className={cn(
                    'relative hidden shrink-0 border-r border-white/[0.11] transition-all duration-200 lg:block',
                    collapsed ? 'w-[72px]' : 'w-64',
                )}
            >
                <div className="sticky top-0 h-screen">
                    <SidebarContent
                        isCollapsed={collapsed}
                        appName={app.name}
                        appTagline={app.tagline}
                        currentUrl={currentUrl}
                        user={user}
                        canSee={canSee}
                        onCloseMobile={() => setMobileOpen(false)}
                        onLogout={handleLogout}
                        navRef={navRef}
                        onNavScroll={handleNavScroll}
                    />
                </div>
            </aside>

            {mobileOpen && (
                <div className="fixed inset-0 z-50 flex lg:hidden">
                    <div
                        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="relative z-10 w-72 max-w-[85vw]">
                        <SidebarContent
                            mobile
                            isCollapsed={false}
                            appName={app.name}
                            appTagline={app.tagline}
                            currentUrl={currentUrl}
                            user={user}
                            canSee={canSee}
                            onCloseMobile={() => setMobileOpen(false)}
                            onLogout={handleLogout}
                        />
                    </div>
                </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-white/[0.11] bg-[#0B1222]/75 px-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            className="rounded-xl border border-white/[0.11] bg-white/[0.055] p-2 text-[#A7B4CB] hover:bg-white/[0.1] hover:text-[#F4F7FF] lg:hidden"
                            aria-label="Open navigation"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            onClick={toggleCollapsed}
                            className="hidden h-8 w-8 items-center justify-center rounded-xl border border-white/[0.11] bg-white/[0.055] text-[#A7B4CB] transition hover:border-[#668CFF]/40 hover:bg-white/[0.1] hover:text-[#F4F7FF] lg:inline-flex"
                            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {collapsed ? (
                                <PanelLeftOpen className="h-4 w-4" />
                            ) : (
                                <PanelLeftClose className="h-4 w-4" />
                            )}
                        </button>
                        <div className="flex items-center gap-2 text-xs text-[#71819C]">
                            <span className="font-semibold text-[#F4F7FF]">KDMS</span>
                            <span>/</span>
                            <span className="text-[#A7B4CB]">{title}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <GlobalSearch />
                        <div className="hidden items-center gap-1.5 rounded-xl border border-white/[0.11] bg-white/[0.055] px-3 py-1.5 text-xs font-medium text-[#A7B4CB] sm:inline-flex">
                            <CalendarRange className="h-3.5 w-3.5 text-[#45D8E8]" />
                            <span>{app.period}</span>
                        </div>

                        {user && (
                            <button
                                type="button"
                                onClick={cycleTheme}
                                title={`Theme: ${activeTheme} (click to switch)`}
                                className="rounded-xl border border-white/[0.11] bg-white/[0.055] p-2 text-[#A7B4CB] transition hover:border-[#668CFF]/40 hover:bg-white/[0.1] hover:text-[#F4F7FF]"
                            >
                                {activeTheme === 'dark' ? (
                                    <Moon className="h-4 w-4 text-[#668CFF]" />
                                ) : activeTheme === 'system' ? (
                                    <Monitor className="h-4 w-4 text-[#45D8E8]" />
                                ) : (
                                    <Sun className="h-4 w-4 text-[#F4B860]" />
                                )}
                            </button>
                        )}

                        <Link
                            href="/notifications"
                            prefetch
                            className="relative rounded-xl border border-white/[0.11] bg-white/[0.055] p-2 text-[#A7B4CB] transition hover:border-[#668CFF]/40 hover:bg-white/[0.1] hover:text-[#F4F7FF]"
                            title="Notifications"
                        >
                            <Bell className="h-4 w-4" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(240,113,131,0.6)]">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Link>

                        {user && (
                            <div className="flex items-center gap-2 rounded-xl border border-white/[0.11] bg-white/[0.055] px-2.5 py-1.5 backdrop-blur-md">
                                <Link href="/my-account" prefetch className="flex items-center gap-2 hover:opacity-85">
                                    <UserAvatar
                                        name={user.name}
                                        avatarUrl={user.avatar_url}
                                        avatarColor={user.profile?.avatar_color ?? '#101D35'}
                                        size="xs"
                                    />
                                    <div className="hidden text-left sm:block">
                                        <p className="text-xs leading-none font-semibold text-[#F4F7FF]">
                                            {user.name}
                                        </p>
                                        <p className="mt-0.5 text-[10px] leading-none text-[#71819C]">
                                            {[user.profile?.position ?? user.roles[0], user.profile?.department]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </p>
                                    </div>
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setShowOwnPasswordModal(true)}
                                    title="Change my password"
                                    className="ml-1 rounded-lg p-1 text-[#71819C] transition hover:bg-white/[0.09] hover:text-[#F4F7FF]"
                                >
                                    <KeyRound className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <main className={cn('flex-1 px-4 py-6 transition-opacity duration-150 sm:px-6 lg:px-8', isNavigating && 'opacity-70')}>
                    {user?.must_change_password && (
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#F4B860]/35 bg-[#F4B860]/10 px-4 py-3 text-xs text-[#F4D9A6] backdrop-blur-md">
                            <span>
                                <strong>Initial / Reset Password Active:</strong> Please update your personal login password.
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowOwnPasswordModal(true)}
                                className="rounded-xl bg-[#F4B860] px-3 py-1 font-semibold text-[#070B16] transition hover:brightness-110"
                            >
                                Change Password Now
                            </button>
                        </div>
                    )}
                    {(flash.success || flash.error || flash.warning) && (
                        <div className="mb-5 space-y-2">
                            {flash.success && (
                                <div className="flex items-center gap-2.5 rounded-2xl border border-[#42C99A]/35 bg-[#42C99A]/10 px-4 py-3 text-sm font-medium text-[#A9F2D7] backdrop-blur-md">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#42C99A]" />
                                    <span>{flash.success}</span>
                                </div>
                            )}
                            {flash.error && (
                                <div className="flex items-center gap-2.5 rounded-2xl border border-[#F07183]/35 bg-[#F07183]/10 px-4 py-3 text-sm font-medium text-[#F9B4BE] backdrop-blur-md">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-[#F07183]" />
                                    <span>{flash.error}</span>
                                </div>
                            )}
                            {flash.warning && (
                                <div className="flex items-center gap-2.5 rounded-2xl border border-[#F4B860]/35 bg-[#F4B860]/10 px-4 py-3 text-sm font-medium text-[#F4D9A6] backdrop-blur-md">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-[#F4B860]" />
                                    <span>{flash.warning}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="font-display text-2xl font-bold tracking-tight text-[#F4F7FF]">
                                {title}
                            </h1>
                            {subtitle && <p className="mt-1 text-sm text-[#A7B4CB]">{subtitle}</p>}
                        </div>
                        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
                    </div>

                    {children}
                </main>
            </div>

            {showOwnPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070B16]/75 p-4 backdrop-blur-md">
                    <div className="krevia-glass-elevated w-full max-w-md rounded-2xl p-6">
                        <div className="flex items-center justify-between border-b border-white/[0.11] pb-3">
                            <h2 className="text-base font-bold text-[#F4F7FF]">Change My Password</h2>
                            <button
                                type="button"
                                onClick={() => setShowOwnPasswordModal(false)}
                                className="rounded-lg p-1 text-[#A7B4CB] transition hover:bg-white/[0.08] hover:text-[#F4F7FF]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                ownPasswordForm.put('/profile/password', {
                                    onSuccess: () => {
                                        ownPasswordForm.reset();
                                        setShowOwnPasswordModal(false);
                                    },
                                });
                            }}
                            className="mt-4 space-y-3"
                        >
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={ownPasswordForm.data.current_password}
                                    onChange={(e) =>
                                        ownPasswordForm.setData('current_password', e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                                {ownPasswordForm.errors.current_password && (
                                    <p className="mt-1 text-[11px] text-rose-600">
                                        {ownPasswordForm.errors.current_password}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    New Password (min 8 characters)
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={ownPasswordForm.data.password}
                                    onChange={(e) =>
                                        ownPasswordForm.setData('password', e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={ownPasswordForm.data.password_confirmation}
                                    onChange={(e) =>
                                        ownPasswordForm.setData(
                                            'password_confirmation',
                                            e.target.value,
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowOwnPasswordModal(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={ownPasswordForm.processing}
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Update Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
