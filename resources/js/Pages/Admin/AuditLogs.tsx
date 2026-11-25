import { AppShell } from '@/Layouts/AppShell';
import type { AuditLogItem, PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface PaginatedAudits {
    data: AuditLogItem[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
}

interface AuditLogsProps extends PageProps {
    logs: PaginatedAudits;
    events: string[];
    filters: { search: string; event: string };
}

export default function AuditLogsIndex({ logs, events, filters }: AuditLogsProps) {
    const [search, setSearch] = useState(filters.search);
    const [event, setEvent] = useState(filters.event);

    const applyFilter = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/audit-logs',
            { search, event },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AppShell
            title="Audit Trail"
            subtitle={`Immutable security & mutation log (${logs.total} events)`}
        >
            <Head title="Audit Trail" />

            <form
                onSubmit={applyFilter}
                className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
            >
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search summary or event..."
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm outline-none focus:border-[#101D35] focus:bg-white"
                    />
                </div>
                <select
                    value={event}
                    onChange={(e) => setEvent(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                    <option value="">All Events</option>
                    {events.map((ev) => (
                        <option key={ev} value={ev}>
                            {ev}
                        </option>
                    ))}
                </select>
                <button
                    type="submit"
                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1A2D4E]"
                >
                    Filter
                </button>
            </form>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                            <tr>
                                <th className="px-4 py-3">Timestamp</th>
                                <th className="px-4 py-3">Actor</th>
                                <th className="px-4 py-3">Event</th>
                                <th className="px-4 py-3">Summary</th>
                                <th className="px-4 py-3">IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.data.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-10 text-center text-sm text-slate-500"
                                    >
                                        No audit log entries match your filter.
                                    </td>
                                </tr>
                            ) : (
                                logs.data.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/70">
                                        <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                                            {log.created_at}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                                            {log.actor}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                                                {log.event}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-700">
                                            {log.summary}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-400">
                                            {log.ip_address ?? '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {logs.links.length > 3 && (
                    <div className="flex flex-wrap items-center justify-end gap-1 border-t border-slate-200 px-4 py-3">
                        {logs.links.map((link, idx) =>
                            link.url ? (
                                <Link
                                    key={idx}
                                    href={link.url}
                                    className={`rounded px-2.5 py-1 text-xs font-medium ${
                                        link.active
                                            ? 'bg-[#101D35] text-white'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ) : (
                                <span
                                    key={idx}
                                    className="px-2.5 py-1 text-xs text-slate-300"
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ),
                        )}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
