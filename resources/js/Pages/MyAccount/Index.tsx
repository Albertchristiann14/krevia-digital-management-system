import { Head, router, useForm } from '@inertiajs/react';
import {
    Activity,
    BadgeCheck,
    Bell,
    Building2,
    Calendar,
    Camera,
    CheckCircle2,
    Clock,
    Globe,
    KeyRound,
    Laptop,
    Lock,
    Mail,
    MessageSquare,
    Monitor,
    Palette,
    Printer,
    Shield,
    ShieldAlert,
    SlidersHorizontal,
    Smartphone,
    Trash2,
    Upload,
    User as UserIcon,
} from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBadge } from '@/Components/shared/StatusBadge';
import { UserAvatar } from '@/Components/shared/UserAvatar';
import { AppShell } from '@/Layouts/AppShell';
import type { UserPersonalPreferences } from '@/types';

type TabKey = 'personal' | 'identity' | 'security' | 'notifications' | 'preferences' | 'activity';

interface AccountData {
    id: number;
    name: string;
    email: string;
    email_verified: boolean;
    avatar_url: string | null;
    avatar_color: string | null;
    whatsapp_number: string | null;
    is_active: boolean;
    must_change_password: boolean;
    password_updated_at: string | null;
    last_login_at: string | null;
    last_login_ip: string | null;
    roles: string[];
}

interface OrganizationIdentityData {
    employee_code: string;
    position: string;
    position_level: string | null;
    department: string;
    department_color: string | null;
    employment_status: string;
    joined_at: string | null;
    account_status: string;
}

interface SessionItem {
    id: string;
    ip_address: string | null;
    agent: string;
    last_activity: string;
    is_current: boolean;
}

interface NotificationPreferencesData {
    channels: {
        in_app: boolean;
        whatsapp: boolean;
        email: boolean;
    };
    categories: {
        task_assignment: boolean;
        task_deadline_reminder: boolean;
        task_status_updates: boolean;
        task_comments: boolean;
        project_updates: boolean;
        announcements: boolean;
        general_system: boolean;
    };
}

interface ActivityItem {
    id: number;
    event: string;
    module: string;
    title: string;
    description: string;
    related_type: string | null;
    created_at: string | null;
    date_group: string;
}

interface PaginatorLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface MyAccountProps {
    initialTab: TabKey;
    account: AccountData;
    organizationIdentity: OrganizationIdentityData;
    sessions: SessionItem[];
    sessionDriver: string;
    notificationPreferences: NotificationPreferencesData;
    personalPreferences: UserPersonalPreferences;
    activities: {
        data: ActivityItem[];
        links: PaginatorLink[];
        current_page: number;
        last_page: number;
        total: number;
    };
    activityFilters: {
        module: string;
        date_from: string;
    };
}

const TABS: { key: TabKey; label: string; description: string; icon: typeof UserIcon }[] = [
    { key: 'personal', label: 'Personal Information', description: 'Profile details & photo', icon: UserIcon },
    { key: 'identity', label: 'Organization Identity', description: 'Digital employee ID card', icon: BadgeCheck },
    { key: 'security', label: 'Account Security', description: 'Password & active sessions', icon: Shield },
    { key: 'notifications', label: 'Notification Preferences', description: 'Delivery channels & alerts', icon: Bell },
    { key: 'preferences', label: 'Personal Preferences', description: 'Appearance, language & format', icon: SlidersHorizontal },
    { key: 'activity', label: 'Activity History', description: 'Personal action timeline', icon: Activity },
];

const NOTIFICATION_CATEGORIES: {
    key: keyof NotificationPreferencesData['categories'];
    label: string;
    description: string;
}[] = [
    {
        key: 'task_assignment',
        label: 'Task Assignment',
        description: 'When a task is assigned or reassigned to you.',
    },
    {
        key: 'task_deadline_reminder',
        label: 'Task Deadline Reminder',
        description: 'Upcoming and overdue task deadline alerts.',
    },
    {
        key: 'task_status_updates',
        label: 'Task Status Updates',
        description: 'Status transitions, review submissions, and approvals.',
    },
    {
        key: 'task_comments',
        label: 'Task Comments & Mentions',
        description: 'New comments or discussions on tasks you participate in.',
    },
    {
        key: 'project_updates',
        label: 'Project Updates',
        description: 'Project lifecycle updates and milestone changes.',
    },
    {
        key: 'announcements',
        label: 'Announcements',
        description: 'Company-wide announcements and leadership notices.',
    },
    {
        key: 'general_system',
        label: 'General System Notifications',
        description: 'Operational reminders and non-critical workspace updates.',
    },
];

const MODULE_FILTER_OPTIONS = [
    { value: '', label: 'All Modules' },
    { value: 'account', label: 'My Account' },
    { value: 'auth', label: 'Authentication' },
    { value: 'tasks', label: 'Tasks' },
    { value: 'projects', label: 'Projects' },
    { value: 'crm', label: 'CRM & Pipeline' },
    { value: 'finance', label: 'Finance' },
    { value: 'hr', label: 'HR & Operations' },
];

function formatDateTime(value: string | null): string {
    if (!value) {
        return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function MyAccountIndex({
    initialTab,
    account,
    organizationIdentity,
    sessions,
    sessionDriver,
    notificationPreferences,
    personalPreferences,
    activities,
    activityFilters,
}: MyAccountProps) {
    const [activeTab, setActiveTab] = useState<TabKey>(initialTab ?? 'personal');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [moduleFilter, setModuleFilter] = useState(activityFilters.module ?? '');
    const [dateFromFilter, setDateFromFilter] = useState(activityFilters.date_from ?? '');

    useEffect(() => {
        setActiveTab(initialTab ?? 'personal');
    }, [initialTab]);

    const profileForm = useForm({
        name: account.name,
        email: account.email,
        whatsapp_number: account.whatsapp_number ?? '',
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const notifForm = useForm<NotificationPreferencesData>({
        channels: { ...notificationPreferences.channels },
        categories: { ...notificationPreferences.categories },
    });

    const prefForm = useForm<UserPersonalPreferences>({
        theme: personalPreferences.theme,
        language: personalPreferences.language,
        timezone: personalPreferences.timezone,
        date_format: personalPreferences.date_format,
        compact_mode: personalPreferences.compact_mode,
    });

    const groupedActivities = useMemo(() => {
        const groups: Record<string, ActivityItem[]> = {};
        for (const item of activities.data) {
            const key = item.date_group || 'Earlier';
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
        }
        return Object.entries(groups);
    }, [activities.data]);

    const switchTab = (tab: TabKey) => {
        setActiveTab(tab);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tab);
            window.history.replaceState({}, '', url.toString());
        }
    };

    const handleProfileSubmit = (e: FormEvent) => {
        e.preventDefault();
        profileForm.patch('/my-account/profile', {
            preserveScroll: true,
        });
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        setAvatarError(null);
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) {
            setAvatarError('Please select a JPG, JPEG, PNG, or WebP image.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setAvatarError('Profile photo must be smaller than 2 MB.');
            return;
        }
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedAvatarFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleAvatarUpload = () => {
        if (!selectedAvatarFile) {
            return;
        }
        setAvatarUploading(true);
        setAvatarError(null);
        router.post(
            '/my-account/avatar',
            { avatar: selectedAvatarFile },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    if (previewUrl) {
                        URL.revokeObjectURL(previewUrl);
                    }
                    setPreviewUrl(null);
                    setSelectedAvatarFile(null);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                },
                onError: (errors) => {
                    setAvatarError(errors.avatar ?? 'Failed to upload profile photo.');
                },
                onFinish: () => {
                    setAvatarUploading(false);
                },
            },
        );
    };

    const handleAvatarRemove = () => {
        setAvatarUploading(true);
        setAvatarError(null);
        router.delete('/my-account/avatar', {
            preserveScroll: true,
            onSuccess: () => {
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                }
                setPreviewUrl(null);
                setSelectedAvatarFile(null);
            },
            onFinish: () => {
                setAvatarUploading(false);
            },
        });
    };

    const handlePasswordSubmit = (e: FormEvent) => {
        e.preventDefault();
        passwordForm.put('/my-account/password', {
            preserveScroll: true,
            onSuccess: () => passwordForm.reset(),
        });
    };

    const handleTerminateOtherSessions = () => {
        router.delete('/my-account/sessions', {
            preserveScroll: true,
        });
    };

    const handleNotificationsSubmit = (e: FormEvent) => {
        e.preventDefault();
        notifForm.patch('/my-account/notifications', {
            preserveScroll: true,
        });
    };

    const handlePreferencesSubmit = (e: FormEvent) => {
        e.preventDefault();
        prefForm.patch('/my-account/preferences', {
            preserveScroll: true,
        });
    };

    const applyActivityFilters = (nextModule: string, nextDateFrom: string) => {
        router.get(
            '/my-account',
            {
                tab: 'activity',
                module: nextModule || undefined,
                date_from: nextDateFrom || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const handlePrintIdCard = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    return (
        <AppShell
            title="My Account"
            subtitle="Manage your personal profile, organization identity, security, notifications, preferences, and activity"
        >
            <Head title="My Account" />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left Section Navigation */}
                <aside className="print:hidden lg:col-span-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                        <div className="mb-3 flex items-center gap-3 border-b border-slate-100 px-2 pb-3">
                            <UserAvatar
                                name={account.name}
                                avatarUrl={previewUrl ?? account.avatar_url}
                                avatarColor={account.avatar_color}
                                size="lg"
                            />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                    {account.name}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                    {organizationIdentity.position}
                                </p>
                                <span className="mt-1 inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-600">
                                    {organizationIdentity.employee_code}
                                </span>
                            </div>
                        </div>

                        <nav className="space-y-1">
                            {TABS.map((tab) => {
                                const Icon = tab.icon;
                                const active = activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => switchTab(tab.key)}
                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                                            active
                                                ? 'bg-[#101D35] text-white shadow-xs'
                                                : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Icon
                                            className={`h-4 w-4 shrink-0 ${
                                                active ? 'text-blue-300' : 'text-slate-400'
                                            }`}
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold">
                                                {tab.label}
                                            </p>
                                            <p
                                                className={`truncate text-[11px] ${
                                                    active ? 'text-slate-300' : 'text-slate-400'
                                                }`}
                                            >
                                                {tab.description}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Right Content Area */}
                <div className="lg:col-span-9">
                    {/* 1. PERSONAL INFORMATION */}
                    {activeTab === 'personal' && (
                        <div className="space-y-6">
                            {/* Profile Photo Card */}
                            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <UserAvatar
                                                name={account.name}
                                                avatarUrl={previewUrl ?? account.avatar_url}
                                                avatarColor={account.avatar_color}
                                                size="xl"
                                                className="ring-4 ring-slate-100"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border border-white bg-[#101D35] text-white shadow-sm hover:bg-[#192c4f]"
                                                title="Choose photo"
                                            >
                                                <Camera className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <div>
                                            <h2 className="text-base font-semibold text-slate-900">
                                                Profile Photo
                                            </h2>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                JPG, JPEG, PNG, or WebP. Max size 2 MB.
                                            </p>
                                            {previewUrl && (
                                                <p className="mt-1 text-xs font-medium text-blue-600">
                                                    Preview ready — click Save Photo to apply.
                                                </p>
                                            )}
                                            {avatarError && (
                                                <p className="mt-1 text-xs font-medium text-rose-600">
                                                    {avatarError}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={avatarUploading}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            <Upload className="h-3.5 w-3.5" />
                                            {account.avatar_url ? 'Change Photo' : 'Upload Photo'}
                                        </button>

                                        {selectedAvatarFile && (
                                            <button
                                                type="button"
                                                onClick={handleAvatarUpload}
                                                disabled={avatarUploading}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-3 py-2 text-xs font-medium text-white hover:bg-[#192c4f] disabled:opacity-50"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                {avatarUploading ? 'Uploading...' : 'Save Photo'}
                                            </button>
                                        )}

                                        {(account.avatar_url || previewUrl) && (
                                            <button
                                                type="button"
                                                onClick={handleAvatarRemove}
                                                disabled={avatarUploading}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Personal Details Form */}
                            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                                <div className="mb-5 border-b border-slate-100 pb-4">
                                    <h2 className="text-base font-semibold text-slate-900">
                                        Personal Information
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Update your display name, email address, and WhatsApp number
                                        used for team notifications.
                                    </p>
                                </div>

                                <form onSubmit={handleProfileSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-slate-700">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                value={profileForm.data.name}
                                                onChange={(e) =>
                                                    profileForm.setData('name', e.target.value)
                                                }
                                                required
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#101D35] focus:outline-none"
                                            />
                                            {profileForm.errors.name && (
                                                <p className="mt-1 text-xs text-rose-600">
                                                    {profileForm.errors.name}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-slate-700">
                                                Email Address
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="email"
                                                    value={profileForm.data.email}
                                                    onChange={(e) =>
                                                        profileForm.setData('email', e.target.value)
                                                    }
                                                    required
                                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#101D35] focus:outline-none"
                                                />
                                            </div>
                                            {profileForm.errors.email && (
                                                <p className="mt-1 text-xs text-rose-600">
                                                    {profileForm.errors.email}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-slate-700">
                                            WhatsApp Number
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="081234567890 or +6281234567890"
                                            value={profileForm.data.whatsapp_number}
                                            onChange={(e) =>
                                                profileForm.setData('whatsapp_number', e.target.value)
                                            }
                                            className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#101D35] focus:outline-none"
                                        />
                                        <p className="mt-1 text-[11px] text-slate-400">
                                            Indonesian numbers are automatically normalized to
                                            international format (62...).
                                        </p>
                                        {profileForm.errors.whatsapp_number && (
                                            <p className="mt-1 text-xs text-rose-600">
                                                {profileForm.errors.whatsapp_number}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex justify-end border-t border-slate-100 pt-4">
                                        <button
                                            type="submit"
                                            disabled={profileForm.processing}
                                            className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#192c4f] disabled:opacity-50"
                                        >
                                            {profileForm.processing
                                                ? 'Saving...'
                                                : 'Save Personal Information'}
                                        </button>
                                    </div>
                                </form>
                            </section>
                        </div>
                    )}

                    {/* 2. ORGANIZATION IDENTITY */}
                    {activeTab === 'identity' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between print:hidden">
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900">
                                        Organization Identity Card
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Official read-only Krevia Digital employment record. Contact
                                        HR / Admin to update role or department assignments.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handlePrintIdCard}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                    Print / Save PDF
                                </button>
                            </div>

                            {/* Digital ID Card */}
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="bg-gradient-to-r from-[#101D35] via-[#17294A] to-[#1E355E] px-6 py-6 text-white">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                                                <Building2 className="h-5 w-5 text-blue-200" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-semibold tracking-wider text-blue-200 uppercase">
                                                    Krevia Digital
                                                </p>
                                                <p className="text-sm font-semibold text-white">
                                                    Digital Management System • Employee ID
                                                </p>
                                            </div>
                                        </div>
                                        <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 font-mono text-xs font-semibold tracking-wide text-white">
                                            {organizationIdentity.employee_code}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                                        <UserAvatar
                                            name={account.name}
                                            avatarUrl={account.avatar_url}
                                            avatarColor={account.avatar_color}
                                            size="xl"
                                            className="ring-4 ring-slate-100"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-xl font-bold text-slate-900">
                                                    {account.name}
                                                </h3>
                                                <StatusBadge
                                                    label={organizationIdentity.account_status}
                                                    tone={
                                                        account.is_active ? 'emerald' : 'rose'
                                                    }
                                                />
                                            </div>
                                            <p className="mt-0.5 text-sm font-medium text-slate-600">
                                                {organizationIdentity.position}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {account.email}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                                        <div className="rounded-xl bg-slate-50 p-3.5">
                                            <p className="text-[11px] font-medium text-slate-400 uppercase">
                                                Department
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                                {organizationIdentity.department}
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-3.5">
                                            <p className="text-[11px] font-medium text-slate-400 uppercase">
                                                System Role(s)
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                                {account.roles.length > 0
                                                    ? account.roles.join(', ')
                                                    : 'Member'}
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-3.5">
                                            <p className="text-[11px] font-medium text-slate-400 uppercase">
                                                Employment Status
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                                {organizationIdentity.employment_status}
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-3.5">
                                            <p className="text-[11px] font-medium text-slate-400 uppercase">
                                                Joined Date
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                                {organizationIdentity.joined_at ?? '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. ACCOUNT SECURITY */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            {/* Security Overview */}
                            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        Last Login
                                    </div>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">
                                        {formatDateTime(account.last_login_at)}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <Globe className="h-4 w-4 text-slate-400" />
                                        Last Login IP
                                    </div>
                                    <p className="mt-2 font-mono text-sm font-semibold text-slate-900">
                                        {account.last_login_ip ?? '—'}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <KeyRound className="h-4 w-4 text-slate-400" />
                                        Password Updated
                                    </div>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">
                                        {formatDateTime(account.password_updated_at)}
                                    </p>
                                </div>
                            </section>

                            {/* Change Password */}
                            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                                <div className="mb-5 border-b border-slate-100 pb-4">
                                    <h2 className="text-base font-semibold text-slate-900">
                                        Change Password
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Use a strong password of at least 8 characters.
                                    </p>
                                </div>

                                <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-slate-700">
                                            Current Password
                                        </label>
                                        <input
                                            type="password"
                                            value={passwordForm.data.current_password}
                                            onChange={(e) =>
                                                passwordForm.setData(
                                                    'current_password',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#101D35] focus:outline-none"
                                        />
                                        {passwordForm.errors.current_password && (
                                            <p className="mt-1 text-xs text-rose-600">
                                                {passwordForm.errors.current_password}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-slate-700">
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            value={passwordForm.data.password}
                                            onChange={(e) =>
                                                passwordForm.setData('password', e.target.value)
                                            }
                                            required
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#101D35] focus:outline-none"
                                        />
                                        {passwordForm.errors.password && (
                                            <p className="mt-1 text-xs text-rose-600">
                                                {passwordForm.errors.password}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-slate-700">
                                            Confirm New Password
                                        </label>
                                        <input
                                            type="password"
                                            value={passwordForm.data.password_confirmation}
                                            onChange={(e) =>
                                                passwordForm.setData(
                                                    'password_confirmation',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#101D35] focus:outline-none"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={passwordForm.processing}
                                        className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#192c4f] disabled:opacity-50"
                                    >
                                        {passwordForm.processing ? 'Updating...' : 'Update Password'}
                                    </button>
                                </form>
                            </section>

                            {/* Active Sessions */}
                            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                                    <div>
                                        <h2 className="text-base font-semibold text-slate-900">
                                            Active Sessions
                                        </h2>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Manage devices currently signed into your account
                                            (driver: {sessionDriver}).
                                        </p>
                                    </div>
                                    {sessions.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={handleTerminateOtherSessions}
                                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                                        >
                                            Terminate Other Sessions
                                        </button>
                                    )}
                                </div>

                                {sessions.length === 0 ? (
                                    <p className="text-xs text-slate-500">
                                        Session list is only available when the database session
                                        driver is active.
                                    </p>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {sessions.map((session) => (
                                            <div
                                                key={session.id}
                                                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                                        <Laptop className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-mono text-xs font-semibold text-slate-900">
                                                                {session.ip_address ?? 'Unknown IP'}
                                                            </p>
                                                            {session.is_current && (
                                                                <StatusBadge
                                                                    label="This Device"
                                                                    tone="emerald"
                                                                />
                                                            )}
                                                        </div>
                                                        <p className="mt-0.5 max-w-xl truncate text-[11px] text-slate-500">
                                                            {session.agent}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-[11px] text-slate-400">
                                                    Active {session.last_activity}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                    {/* 4. NOTIFICATION PREFERENCES */}
                    {activeTab === 'notifications' && (
                        <form onSubmit={handleNotificationsSubmit} className="space-y-6">
                            {/* Channels */}
                            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                                <div className="mb-5 border-b border-slate-100 pb-4">
                                    <h2 className="text-base font-semibold text-slate-900">
                                        Delivery Channels
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Choose how you want to receive notifications from Krevia
                                        DMS.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={notifForm.data.channels.in_app}
                                            onChange={(e) =>
                                                notifForm.setData('channels', {
                                                    ...notifForm.data.channels,
                                                    in_app: e.target.checked,
                                                })
                                            }
                                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#101D35]"
                                        />
                                        <div>
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                                                <Bell className="h-3.5 w-3.5 text-blue-600" />
                                                In-App
                                            </div>
                                            <p className="mt-1 text-[11px] text-slate-500">
                                                Bell icon & notification center inside DMS.
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={notifForm.data.channels.whatsapp}
                                            onChange={(e) =>
                                                notifForm.setData('channels', {
                                                    ...notifForm.data.channels,
                                                    whatsapp: e.target.checked,
                                                })
                                            }
                                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#101D35]"
                                        />
                                        <div>
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                                                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                                                WhatsApp
                                            </div>
                                            <p className="mt-1 text-[11px] text-slate-500">
                                                Instant alerts sent via Fonnte to your WhatsApp.
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={notifForm.data.channels.email}
                                            onChange={(e) =>
                                                notifForm.setData('channels', {
                                                    ...notifForm.data.channels,
                                                    email: e.target.checked,
                                                })
                                            }
                                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#101D35]"
                                        />
                                        <div>
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                                                <Mail className="h-3.5 w-3.5 text-indigo-600" />
                                                Email
                                            </div>
                                            <p className="mt-1 text-[11px] text-slate-500">
                                                Formatted email alerts to {account.email}.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </section>

                            {/* Categories */}
                            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                                <div className="mb-5 border-b border-slate-100 pb-4">
                                    <h2 className="text-base font-semibold text-slate-900">
                                        Notification Categories
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Fine-tune which workspace events trigger notifications.
                                    </p>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {NOTIFICATION_CATEGORIES.map((category) => (
                                        <label
                                            key={category.key}
                                            className="flex cursor-pointer items-center justify-between gap-4 py-3.5"
                                        >
                                            <div>
                                                <p className="text-xs font-semibold text-slate-900">
                                                    {category.label}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-slate-500">
                                                    {category.description}
                                                </p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={notifForm.data.categories[category.key]}
                                                onChange={(e) =>
                                                    notifForm.setData('categories', {
                                                        ...notifForm.data.categories,
                                                        [category.key]: e.target.checked,
                                                    })
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-[#101D35]"
                                            />
                                        </label>
                                    ))}

                                    {/* Mandatory Security Notifications */}
                                    <div className="flex items-center justify-between gap-4 py-3.5 opacity-80">
                                        <div className="flex items-start gap-2.5">
                                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-semibold text-slate-900">
                                                        Mandatory Security Notifications
                                                    </p>
                                                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                                        <Lock className="h-2.5 w-2.5" />
                                                        Always On
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-[11px] text-slate-500">
                                                    Password resets, account status updates, and
                                                    critical security alerts cannot be disabled.
                                                </p>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked
                                            disabled
                                            className="h-4 w-4 cursor-not-allowed rounded border-slate-300 text-[#101D35]"
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                                    <button
                                        type="submit"
                                        disabled={notifForm.processing}
                                        className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#192c4f] disabled:opacity-50"
                                    >
                                        {notifForm.processing
                                            ? 'Saving...'
                                            : 'Save Notification Preferences'}
                                    </button>
                                </div>
                            </section>
                        </form>
                    )}

                    {/* 5. PERSONAL PREFERENCES */}
                    {activeTab === 'preferences' && (
                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                            <div className="mb-5 border-b border-slate-100 pb-4">
                                <h2 className="text-base font-semibold text-slate-900">
                                    Personal Preferences
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Customize your workspace theme, language, timezone, and layout
                                    density.
                                </p>
                            </div>

                            <form onSubmit={handlePreferencesSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                            <Palette className="h-3.5 w-3.5 text-slate-400" />
                                            Theme
                                        </label>
                                        <select
                                            value={prefForm.data.theme}
                                            onChange={(e) =>
                                                prefForm.setData(
                                                    'theme',
                                                    e.target.value as UserPersonalPreferences['theme'],
                                                )
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#101D35] focus:outline-none"
                                        >
                                            <option value="light">Light</option>
                                            <option value="dark">Dark</option>
                                            <option value="system">System Default</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                            <Globe className="h-3.5 w-3.5 text-slate-400" />
                                            Language
                                        </label>
                                        <select
                                            value={prefForm.data.language}
                                            onChange={(e) =>
                                                prefForm.setData(
                                                    'language',
                                                    e.target.value as UserPersonalPreferences['language'],
                                                )
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#101D35] focus:outline-none"
                                        >
                                            <option value="en">English</option>
                                            <option value="id">Bahasa Indonesia</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                                            Timezone
                                        </label>
                                        <select
                                            value={prefForm.data.timezone}
                                            onChange={(e) =>
                                                prefForm.setData('timezone', e.target.value)
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#101D35] focus:outline-none"
                                        >
                                            <option value="Asia/Jakarta">
                                                Asia/Jakarta (WIB, UTC+7)
                                            </option>
                                            <option value="Asia/Makassar">
                                                Asia/Makassar (WITA, UTC+8)
                                            </option>
                                            <option value="Asia/Jayapura">
                                                Asia/Jayapura (WIT, UTC+9)
                                            </option>
                                            <option value="Asia/Singapore">
                                                Asia/Singapore (SGT, UTC+8)
                                            </option>
                                            <option value="UTC">UTC</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            Date Format
                                        </label>
                                        <select
                                            value={prefForm.data.date_format}
                                            onChange={(e) =>
                                                prefForm.setData(
                                                    'date_format',
                                                    e.target.value as UserPersonalPreferences['date_format'],
                                                )
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#101D35] focus:outline-none"
                                        >
                                            <option value="DD/MM/YYYY">DD/MM/YYYY (26/11/2026)</option>
                                            <option value="YYYY-MM-DD">YYYY-MM-DD (2026-11-26)</option>
                                            <option value="MM/DD/YYYY">MM/DD/YYYY (11/26/2026)</option>
                                        </select>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                            <Monitor className="h-3.5 w-3.5 text-slate-400" />
                                            Layout Density
                                        </label>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            {(['comfortable', 'compact'] as const).map((mode) => (
                                                <label
                                                    key={mode}
                                                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 ${
                                                        prefForm.data.compact_mode === mode
                                                            ? 'border-[#101D35] bg-slate-50'
                                                            : 'border-slate-200 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div>
                                                        <p className="text-xs font-semibold capitalize text-slate-900">
                                                            {mode}
                                                        </p>
                                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                                            {mode === 'comfortable'
                                                                ? 'Standard spacing across tables and cards.'
                                                                : 'Higher information density for power users.'}
                                                        </p>
                                                    </div>
                                                    <input
                                                        type="radio"
                                                        name="compact_mode"
                                                        checked={prefForm.data.compact_mode === mode}
                                                        onChange={() =>
                                                            prefForm.setData('compact_mode', mode)
                                                        }
                                                        className="h-4 w-4 text-[#101D35]"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end border-t border-slate-100 pt-4">
                                    <button
                                        type="submit"
                                        disabled={prefForm.processing}
                                        className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#192c4f] disabled:opacity-50"
                                    >
                                        {prefForm.processing ? 'Saving...' : 'Save Preferences'}
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}

                    {/* 6. PERSONAL ACTIVITY HISTORY */}
                    {activeTab === 'activity' && (
                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                            <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900">
                                        Personal Activity History
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Read-only audit timeline of actions performed by your
                                        account ({activities.total} total).
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <select
                                        value={moduleFilter}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setModuleFilter(next);
                                            applyActivityFilters(next, dateFromFilter);
                                        }}
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-[#101D35] focus:outline-none"
                                    >
                                        {MODULE_FILTER_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="date"
                                        value={dateFromFilter}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setDateFromFilter(next);
                                            applyActivityFilters(moduleFilter, next);
                                        }}
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-[#101D35] focus:outline-none"
                                    />

                                    {(moduleFilter || dateFromFilter) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setModuleFilter('');
                                                setDateFromFilter('');
                                                applyActivityFilters('', '');
                                            }}
                                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>

                            {groupedActivities.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Smartphone className="mx-auto h-8 w-8 text-slate-300" />
                                    <p className="mt-2 text-sm font-medium text-slate-700">
                                        No personal activity records found
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        Actions you perform across DMS will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {groupedActivities.map(([groupLabel, items]) => (
                                        <div key={groupLabel}>
                                            <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                                                {groupLabel}
                                            </h3>
                                            <div className="relative space-y-4 border-l-2 border-slate-100 pl-5">
                                                {items.map((item) => (
                                                    <div key={item.id} className="relative">
                                                        <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#101D35]" />
                                                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-700">
                                                                        {item.module}
                                                                    </span>
                                                                    <p className="text-xs font-semibold text-slate-900">
                                                                        {item.title}
                                                                    </p>
                                                                </div>
                                                                <span className="text-[11px] text-slate-400">
                                                                    {formatDateTime(item.created_at)}
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-xs text-slate-600">
                                                                {item.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {activities.last_page > 1 && (
                                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                    <p className="text-xs text-slate-500">
                                        Page {activities.current_page} of {activities.last_page}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {activities.links.map((link, idx) => (
                                            <button
                                                key={`${link.label}-${idx}`}
                                                type="button"
                                                disabled={!link.url}
                                                onClick={() => {
                                                    if (link.url) {
                                                        router.visit(link.url, {
                                                            preserveScroll: true,
                                                            preserveState: true,
                                                        });
                                                    }
                                                }}
                                                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                                                    link.active
                                                        ? 'bg-[#101D35] text-white'
                                                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                } disabled:opacity-40`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
