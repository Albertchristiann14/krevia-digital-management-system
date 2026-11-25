import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import type { PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Mail, MessageCircle, Send } from 'lucide-react';
import { type FormEvent } from 'react';

interface NotificationSettingsProps extends PageProps {
    setting: {
        mail_enabled: boolean;
        smtp_host: string;
        smtp_port: number;
        smtp_encryption: string;
        smtp_username: string;
        has_smtp_password: boolean;
        mail_from_address: string;
        mail_from_name: string;
        whatsapp_enabled: boolean;
        whatsapp_driver: string;
        whatsapp_api_url: string;
        has_whatsapp_token: boolean;
        whatsapp_sender_id: string;
        whatsapp_default_group: string;
        gmail_relay_address: string;
    };
    drivers: string[];
    logs: {
        id: number;
        channel: string;
        recipient_name: string | null;
        recipient_target: string;
        subject_or_type: string;
        status: string;
        error_message: string | null;
        sent_at: string | null;
    }[];
}

export default function NotificationSettings({
    setting,
    drivers,
    logs,
}: NotificationSettingsProps) {
    const form = useForm({
        mail_enabled: setting.mail_enabled,
        smtp_host: setting.smtp_host,
        smtp_port: String(setting.smtp_port),
        smtp_encryption: setting.smtp_encryption || 'tls',
        smtp_username: setting.smtp_username,
        smtp_password: '',
        mail_from_address: setting.mail_from_address,
        mail_from_name: setting.mail_from_name,
        whatsapp_enabled: setting.whatsapp_enabled,
        whatsapp_driver: setting.whatsapp_driver,
        whatsapp_api_url: setting.whatsapp_api_url,
        whatsapp_api_token: '',
        whatsapp_sender_id: setting.whatsapp_sender_id,
        whatsapp_default_group: setting.whatsapp_default_group,
        gmail_relay_address: setting.gmail_relay_address,
    });

    const testForm = useForm({
        test_email: '',
        test_whatsapp: '',
    });

    const saveSettings = (e: FormEvent) => {
        e.preventDefault();
        form.patch('/admin/notifications-settings');
    };

    const runTest = (e: FormEvent) => {
        e.preventDefault();
        testForm.post('/admin/notifications-settings/test');
    };

    return (
        <AppShell
            title="Gmail SMTP & WhatsApp Notification Settings"
            subtitle="Configure multi-channel delivery for all KDMS notifications and team announcements"
            actions={
                <Link
                    href="/announcements"
                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#101D35] hover:bg-slate-50"
                >
                    Open Announcements
                </Link>
            }
        >
            <Head title="Notification Settings — KDMS" />

            <form onSubmit={saveSettings} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Gmail SMTP Card */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h2 className="flex items-center gap-2 text-sm font-bold text-[#101D35]">
                            <Mail className="h-4 w-4 text-blue-600" />
                            Gmail SMTP & Relay Configuration
                        </h2>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-[#101D35]">
                            <input
                                type="checkbox"
                                checked={form.data.mail_enabled}
                                onChange={(e) => form.setData('mail_enabled', e.target.checked)}
                            />
                            Enable Email
                        </label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                            <label className="text-xs font-semibold text-slate-700">SMTP Host</label>
                            <input
                                type="text"
                                value={form.data.smtp_host}
                                onChange={(e) => form.setData('smtp_host', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-700">Port / TLS</label>
                            <div className="mt-1 flex gap-1">
                                <input
                                    type="number"
                                    value={form.data.smtp_port}
                                    onChange={(e) => form.setData('smtp_port', e.target.value)}
                                    className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                                />
                                <select
                                    value={form.data.smtp_encryption}
                                    onChange={(e) => form.setData('smtp_encryption', e.target.value)}
                                    className="flex-1 rounded-lg border border-slate-200 px-1.5 py-1.5 text-xs"
                                >
                                    <option value="tls">TLS</option>
                                    <option value="ssl">SSL</option>
                                    <option value="none">None</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-700">
                            Gmail Username
                        </label>
                        <input
                            type="text"
                            value={form.data.smtp_username}
                            onChange={(e) => form.setData('smtp_username', e.target.value)}
                            placeholder="krevia.notif@gmail.com"
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-700">
                            Gmail App Password {setting.has_smtp_password ? '(Saved — leave blank to keep)' : ''}
                        </label>
                        <input
                            type="password"
                            value={form.data.smtp_password}
                            onChange={(e) => form.setData('smtp_password', e.target.value)}
                            placeholder="16-char Google App Password"
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="email"
                            value={form.data.mail_from_address}
                            onChange={(e) => form.setData('mail_from_address', e.target.value)}
                            placeholder="From email"
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                        />
                        <input
                            type="text"
                            value={form.data.mail_from_name}
                            onChange={(e) => form.setData('mail_from_name', e.target.value)}
                            placeholder="From name"
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-700">
                            Gmail → WhatsApp Relay Inbox (Optional, e.g. for n8n/Make trigger)
                        </label>
                        <input
                            type="email"
                            value={form.data.gmail_relay_address}
                            onChange={(e) => form.setData('gmail_relay_address', e.target.value)}
                            placeholder="relay-wa@gmail.com"
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                        />
                    </div>
                </div>

                {/* WhatsApp Gateway Card */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h2 className="flex items-center gap-2 text-sm font-bold text-[#101D35]">
                            <MessageCircle className="h-4 w-4 text-emerald-600" />
                            WhatsApp Gateway Configuration
                        </h2>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-[#101D35]">
                            <input
                                type="checkbox"
                                checked={form.data.whatsapp_enabled}
                                onChange={(e) => form.setData('whatsapp_enabled', e.target.checked)}
                            />
                            Enable WhatsApp
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-semibold text-slate-700">Driver</label>
                            <select
                                value={form.data.whatsapp_driver}
                                onChange={(e) => form.setData('whatsapp_driver', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                            >
                                {drivers.map((d) => (
                                    <option key={d} value={d}>
                                        {d}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-700">
                                Sender / Phone Number ID
                            </label>
                            <input
                                type="text"
                                value={form.data.whatsapp_sender_id}
                                onChange={(e) => form.setData('whatsapp_sender_id', e.target.value)}
                                placeholder="Meta Phone ID or label"
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-700">
                            Gateway / Webhook API URL
                        </label>
                        <input
                            type="url"
                            value={form.data.whatsapp_api_url}
                            onChange={(e) => form.setData('whatsapp_api_url', e.target.value)}
                            placeholder="https://api.fonnte.com/send or custom n8n webhook"
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-700">
                            API Token / Secret {setting.has_whatsapp_token ? '(Saved — leave blank to keep)' : ''}
                        </label>
                        <input
                            type="password"
                            value={form.data.whatsapp_api_token}
                            onChange={(e) => form.setData('whatsapp_api_token', e.target.value)}
                            placeholder="Gateway Bearer / API token"
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-700">
                            Default Team WhatsApp Group ID (Optional)
                        </label>
                        <input
                            type="text"
                            value={form.data.whatsapp_default_group}
                            onChange={(e) =>
                                form.setData('whatsapp_default_group', e.target.value)
                            }
                            placeholder="e.g. 1203630...@g.us"
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                        />
                    </div>
                </div>

                <div className="flex justify-end lg:col-span-2">
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="rounded-lg bg-[#101D35] px-5 py-2 text-xs font-semibold text-white hover:bg-[#192c4e]"
                    >
                        Save Notification Settings
                    </button>
                </div>
            </form>

            {/* Test Dispatch */}
            <form
                onSubmit={runTest}
                className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-5"
            >
                <div className="min-w-[200px] flex-1">
                    <label className="text-xs font-semibold text-slate-700">Test Gmail Email</label>
                    <input
                        type="email"
                        value={testForm.data.test_email}
                        onChange={(e) => testForm.setData('test_email', e.target.value)}
                        placeholder="target@gmail.com"
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                    />
                </div>
                <div className="min-w-[200px] flex-1">
                    <label className="text-xs font-semibold text-slate-700">
                        Test WhatsApp Number
                    </label>
                    <input
                        type="text"
                        value={testForm.data.test_whatsapp}
                        onChange={(e) => testForm.setData('test_whatsapp', e.target.value)}
                        placeholder="628123456789"
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                    />
                </div>
                <button
                    type="submit"
                    disabled={testForm.processing}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                >
                    <Send className="h-3.5 w-3.5" />
                    Send Test Dispatch
                </button>
            </form>

            {/* Delivery Logs */}
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3 text-xs font-bold text-[#101D35]">
                    Recent Delivery Audit Logs ({logs.length})
                </div>
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                        <tr>
                            <th className="px-4 py-2.5">Channel</th>
                            <th className="px-4 py-2.5">Recipient / Target</th>
                            <th className="px-4 py-2.5">Subject</th>
                            <th className="px-4 py-2.5">Status</th>
                            <th className="px-4 py-2.5">Sent At</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {logs.map((l) => (
                            <tr key={l.id}>
                                <td className="px-4 py-2 font-mono font-bold uppercase text-[#101D35]">
                                    {l.channel}
                                </td>
                                <td className="px-4 py-2">
                                    {l.recipient_name ? `${l.recipient_name} · ` : ''}
                                    <span className="font-mono text-slate-600">
                                        {l.recipient_target}
                                    </span>
                                </td>
                                <td className="px-4 py-2">{l.subject_or_type}</td>
                                <td className="px-4 py-2">
                                    <StatusBadge
                                        label={
                                            l.status === 'sent'
                                                ? 'Completed'
                                                : l.status === 'failed'
                                                  ? 'Failed'
                                                  : 'Usulan'
                                        }
                                    />
                                    {l.error_message && (
                                        <span className="ml-2 text-[10px] text-rose-600">
                                            {l.error_message}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-2 text-slate-500">{l.sent_at}</td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                    No external email/WhatsApp deliveries logged yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </AppShell>
    );
}
