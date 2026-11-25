import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import type { PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Mail, MessageCircle, Plus, Radio, Settings, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface AnnouncementRow {
    id: number;
    code: string;
    title: string;
    body: string;
    priority: string;
    audience_type: string;
    department_name: string | null;
    send_email: boolean;
    send_whatsapp: boolean;
    send_gmail_relay: boolean;
    publisher: string | null;
    published_at: string | null;
    delivery_summary: {
        recipients_count?: number;
        mail_enabled?: boolean;
        whatsapp_enabled?: boolean;
        group_dispatched?: boolean;
        gmail_relay_status?: string;
    } | null;
}

interface AnnouncementsProps extends PageProps {
    announcements: AnnouncementRow[];
    departments: { id: number; name: string }[];
    members: { id: number; name: string }[];
    channelStatus: {
        mail_enabled: boolean;
        whatsapp_enabled: boolean;
        whatsapp_driver: string;
        has_gmail_relay: boolean;
        has_default_group: boolean;
    };
    canPublish: boolean;
}

export default function AnnouncementsIndex({
    announcements,
    departments,
    channelStatus,
    canPublish,
}: AnnouncementsProps) {
    const [showModal, setShowModal] = useState(false);

    const form = useForm({
        title: '',
        body: '',
        priority: 'Normal',
        audience_type: 'all',
        department_id: departments[0]?.id ? String(departments[0].id) : '',
        send_email: true,
        send_whatsapp: true,
        send_gmail_relay: channelStatus.has_gmail_relay,
    });

    const handlePublish = (e: FormEvent) => {
        e.preventDefault();
        form.post('/announcements', {
            onSuccess: () => {
                form.reset('title', 'body');
                setShowModal(false);
            },
        });
    };

    return (
        <AppShell
            title="Team Announcements & Broadcasts"
            subtitle="Broadcast internal announcements simultaneously to KDMS In-App, Gmail SMTP, and WhatsApp"
            actions={
                <div className="flex gap-2">
                    {canPublish && (
                        <>
                            <Link
                                href="/admin/notifications-settings"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#101D35] hover:bg-slate-50"
                            >
                                <Settings className="h-4 w-4" />
                                Gmail & WA Settings
                            </Link>
                            <button
                                type="button"
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white"
                            >
                                <Plus className="h-4 w-4" />
                                New Announcement
                            </button>
                        </>
                    )}
                </div>
            }
        >
            <Head title="Announcements — KDMS" />

            {/* Channel Status Strip */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-[#101D35]">
                        <Mail className="h-4 w-4 text-blue-600" />
                        Gmail SMTP Channel
                    </div>
                    <StatusBadge label={channelStatus.mail_enabled ? 'Active' : 'Inactive'} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-[#101D35]">
                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                        WhatsApp ({channelStatus.whatsapp_driver})
                    </div>
                    <StatusBadge label={channelStatus.whatsapp_enabled ? 'Active' : 'Inactive'} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-[#101D35]">
                        <Radio className="h-4 w-4 text-amber-600" />
                        Gmail → WA Relay Copy
                    </div>
                    <StatusBadge label={channelStatus.has_gmail_relay ? 'Active' : 'Not Set'} />
                </div>
            </div>

            <div className="mt-4 space-y-3">
                {announcements.map((a) => (
                    <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-500">
                                    {a.code}
                                </span>
                                <StatusBadge
                                    label={
                                        a.priority === 'Mendesak'
                                            ? 'Urgent'
                                            : a.priority === 'Penting'
                                              ? 'Segera'
                                              : 'Completed'
                                    }
                                />
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                    {a.audience_type === 'department'
                                        ? `Dept: ${a.department_name}`
                                        : 'All Active Members'}
                                </span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                                By {a.publisher} • {a.published_at}
                            </span>
                        </div>
                        <h3 className="mt-2 text-base font-bold text-[#101D35]">{a.title}</h3>
                        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                            {a.body}
                        </p>
                        {a.delivery_summary && (
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                                <span>
                                    Recipients: <strong>{a.delivery_summary.recipients_count ?? 0}</strong>
                                </span>
                                <span>• Email: {a.send_email ? 'Queued/Sent' : 'Off'}</span>
                                <span>• WhatsApp: {a.send_whatsapp ? 'Queued/Sent' : 'Off'}</span>
                                {a.send_gmail_relay && (
                                    <span>• Gmail Relay: {a.delivery_summary.gmail_relay_status}</span>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {announcements.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-400">
                        No announcements published yet.
                    </div>
                )}
            </div>

            {showModal && canPublish && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-[#101D35]">
                                Broadcast New Announcement
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="rounded p-1 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handlePublish} className="mt-4 space-y-3">
                            <input
                                type="text"
                                required
                                value={form.data.title}
                                onChange={(e) => form.setData('title', e.target.value)}
                                placeholder="Announcement subject / headline"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={form.data.priority}
                                    onChange={(e) => form.setData('priority', e.target.value)}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    <option value="Normal">Normal</option>
                                    <option value="Penting">Penting</option>
                                    <option value="Mendesak">Mendesak</option>
                                </select>
                                <select
                                    value={form.data.audience_type}
                                    onChange={(e) => form.setData('audience_type', e.target.value)}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    <option value="all">All Active Members</option>
                                    <option value="department">Specific Department</option>
                                </select>
                            </div>
                            {form.data.audience_type === 'department' && (
                                <select
                                    value={form.data.department_id}
                                    onChange={(e) => form.setData('department_id', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <textarea
                                rows={4}
                                required
                                value={form.data.body}
                                onChange={(e) => form.setData('body', e.target.value)}
                                placeholder="Write announcement content..."
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                            <div className="flex flex-wrap gap-4 text-xs text-slate-700">
                                <label className="flex items-center gap-1.5">
                                    <input
                                        type="checkbox"
                                        checked={form.data.send_email}
                                        onChange={(e) => form.setData('send_email', e.target.checked)}
                                    />
                                    Send via Gmail SMTP
                                </label>
                                <label className="flex items-center gap-1.5">
                                    <input
                                        type="checkbox"
                                        checked={form.data.send_whatsapp}
                                        onChange={(e) =>
                                            form.setData('send_whatsapp', e.target.checked)
                                        }
                                    />
                                    Send via WhatsApp
                                </label>
                                <label className="flex items-center gap-1.5">
                                    <input
                                        type="checkbox"
                                        checked={form.data.send_gmail_relay}
                                        onChange={(e) =>
                                            form.setData('send_gmail_relay', e.target.checked)
                                        }
                                    />
                                    Send to Gmail Relay
                                </label>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Broadcast Now
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
