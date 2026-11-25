import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import type { PageProps } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Download, FileSpreadsheet, Play, Upload } from 'lucide-react';
import { type FormEvent } from 'react';

interface ImportBatchRow {
    id: number;
    filename: string;
    mode: string;
    preserve_existing: boolean;
    summary_json: Record<string, Record<string, number>>;
    importer: string;
    created_at: string | null;
}

interface ImportExportProps extends PageProps {
    batches: ImportBatchRow[];
    defaultWorkbookAvailable: boolean;
}

export default function ImportExport({
    batches,
    defaultWorkbookAvailable,
}: ImportExportProps) {
    const form = useForm<{
        mode: 'dry_run' | 'apply';
        preserve_existing: boolean;
        workbook: File | null;
    }>({
        mode: 'dry_run',
        preserve_existing: true,
        workbook: null,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/admin/imports/run', { forceFormData: true });
    };

    return (
        <AppShell
            title="Workbook Import & Export Console"
            subtitle="Idempotent Excel migration (Dry-Run Preview or Apply) across all 18 source worksheets & live .xlsx export"
            actions={
                <a
                    href="/admin/imports/export"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                    <Download className="h-4 w-4" />
                    Export Live Workbook (.xlsx)
                </a>
            }
        >
            <Head title="Import & Export — KDMS" />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-1"
                >
                    <h2 className="flex items-center gap-2 text-sm font-bold text-[#101D35]">
                        <FileSpreadsheet className="h-4 w-4" />
                        Run Workbook Importer
                    </h2>
                    <div>
                        <label className="text-xs font-semibold text-slate-700">Mode</label>
                        <select
                            value={form.data.mode}
                            onChange={(e) =>
                                form.setData('mode', e.target.value as 'dry_run' | 'apply')
                            }
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                        >
                            <option value="dry_run">Dry-Run Preview (Zero DB Writes)</option>
                            <option value="apply">Apply Import to Database</option>
                        </select>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                            type="checkbox"
                            checked={form.data.preserve_existing}
                            onChange={(e) => form.setData('preserve_existing', e.target.checked)}
                        />
                        Preserve existing modified records (Skip matched IDs)
                    </label>
                    <div>
                        <label className="text-xs font-semibold text-slate-700">
                            Upload .xlsx (or leave empty to use bundled workbook)
                        </label>
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => form.setData('workbook', e.target.files?.[0] ?? null)}
                            className="mt-1 w-full text-xs text-slate-600"
                        />
                        {defaultWorkbookAvailable && (
                            <p className="mt-1 text-[11px] text-emerald-700">
                                Bundled seed workbook ready (workplan_2026_2027.xlsx).
                            </p>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#101D35] py-2 text-xs font-semibold text-white"
                    >
                        <Play className="h-3.5 w-3.5" />
                        {form.processing ? 'Running...' : 'Execute Import'}
                    </button>
                </form>

                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
                    <h2 className="text-sm font-bold text-[#101D35]">
                        Import Batch Audit History ({batches.length})
                    </h2>
                    <div className="space-y-3">
                        {batches.map((b) => (
                            <div
                                key={b.id}
                                className="rounded-xl border border-slate-200 p-3.5 text-xs"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-[#101D35]">
                                            {b.filename}
                                        </span>
                                        <StatusBadge
                                            label={b.mode === 'dry_run' ? 'Usulan' : 'Completed'}
                                        />
                                        <span className="text-[11px] text-slate-500">
                                            {b.preserve_existing ? 'Idempotent Skip' : 'Overwrite'}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-slate-400">
                                        {b.importer} • {b.created_at}
                                    </span>
                                </div>
                                <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-700">
                                    {JSON.stringify(b.summary_json, null, 2)}
                                </pre>
                            </div>
                        ))}
                        {batches.length === 0 && (
                            <p className="py-8 text-center text-xs text-slate-400">
                                No manual import batches triggered yet. Run a Dry-Run preview to inspect counts.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
