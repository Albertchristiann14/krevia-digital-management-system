import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import type { PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';

interface NotificationRow {
    id: string;
    category: string;
    priority: string;
    task_code: string | null;
    message: string;
    url: string | null;
    read_at: string | null;
    created_at: string | null;
}

interface NotificationsPageProps extends PageProps {
    notifications: {
        data: NotificationRow[];
        total: number;
    };
}

export default function NotificationsIndex({ notifications }: NotificationsPageProps) {
    const markAll = () => {
        router.post('/notifications/read-all', {}, { preserveScroll: true });
    };

    const markRead = (id: string) => {
        router.post(`/notifications/${id}/read`, {}, { preserveScroll: true });
    };

    return (
        <AppShell
            title="Notification Center"
            subtitle="Task assignments, deadline alerts, overdue escalations, and review requests"
            actions={
                <button
                    type="button"
                    onClick={markAll}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                    <CheckCheck className="h-4 w-4 text-[#101D35]" />
                    Mark All Read
                </button>
            }
        >
            <Head title="Notifications" />

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {notifications.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                        <Bell className="h-8 w-8 text-slate-300" />
                        <p className="mt-3 text-sm font-semibold text-slate-700">You are all caught up</p>
                        <p className="mt-1 text-xs text-slate-500">
                            Automated deadline, review, and task notifications will appear here.
                        </p>
                    </div>
                ) : (
                    notifications.data.map((n) => (
                        <div
                            key={n.id}
                            className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
                                n.read_at ? 'bg-white' : 'bg-blue-50/40'
                            }`}
                        >
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge label={n.category} tone="blue" />
                                    <StatusBadge label={n.priority} />
                                    <span className="font-mono text-[11px] text-slate-400">
                                        {n.created_at}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-slate-900">{n.message}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                {n.url && (
                                    <Link
                                        href={n.url}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#101D35] hover:bg-slate-50"
                                    >
                                        Open
                                    </Link>
                                )}
                                {!n.read_at && (
                                    <button
                                        type="button"
                                        onClick={() => markRead(n.id)}
                                        className="rounded-lg bg-[#101D35] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1A2D4E]"
                                    >
                                        Mark Read
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </AppShell>
    );
}
