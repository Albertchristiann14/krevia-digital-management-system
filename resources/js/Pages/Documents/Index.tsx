import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import type { PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Download, FileUp, FolderLock, Plus, Search, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface DocumentRow {
    id: number;
    code: string;
    title: string;
    category: string;
    description: string | null;
    project_code: string | null;
    project_name: string | null;
    original_filename: string;
    file_size: number;
    version: string;
    data_status: string;
    uploader: string | null;
    created_at: string | null;
}

interface DocumentsProps extends PageProps {
    documents: DocumentRow[];
    categories: string[];
    projects: { id: number; code: string; name: string }[];
    filters: { search: string; category: string };
    canUpload: boolean;
}

export default function DocumentsIndex({
    documents,
    categories,
    projects,
    filters,
    canUpload,
}: DocumentsProps) {
    const [search, setSearch] = useState(filters.search);
    const [category, setCategory] = useState(filters.category);
    const [showUpload, setShowUpload] = useState(false);

    const form = useForm<{
        title: string;
        category: string;
        description: string;
        project_id: string;
        version: string;
        data_status: string;
        file: File | null;
    }>({
        title: '',
        category: categories[0] ?? 'SOP & Governance',
        description: '',
        project_id: '',
        version: 'v1.0',
        data_status: 'Disepakati',
        file: null,
    });

    const applyFilter = (nextCat?: string) => {
        router.get(
            '/documents',
            { search, category: nextCat ?? category },
            { preserveState: true, replace: true },
        );
    };

    const submitUpload = (e: FormEvent) => {
        e.preventDefault();
        form.post('/documents', {
            forceFormData: true,
            onSuccess: () => {
                form.reset('title', 'description', 'file');
                setShowUpload(false);
            },
        });
    };

    return (
        <AppShell
            title="Private Document Center"
            subtitle="Authenticated internal document vault stored on private disk with role-checked downloads"
            actions={
                canUpload && (
                    <button
                        type="button"
                        onClick={() => setShowUpload(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white"
                    >
                        <Plus className="h-4 w-4" />
                        Upload Document
                    </button>
                )
            }
        >
            <Head title="Document Center — KDMS" />

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                <div className="relative min-w-[220px] flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
                        placeholder="Search code, title, or filename..."
                        className="w-full rounded-lg border border-slate-200 py-1.5 pr-3 pl-9 text-xs"
                    />
                </div>
                <select
                    value={category}
                    onChange={(e) => {
                        setCategory(e.target.value);
                        applyFilter(e.target.value);
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                        <tr>
                            <th className="px-4 py-3">Document</th>
                            <th className="px-4 py-3">Category & Project</th>
                            <th className="px-4 py-3">Version & Status</th>
                            <th className="px-4 py-3">Uploaded By</th>
                            <th className="px-4 py-3 text-right">Download</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {documents.map((d) => (
                            <tr key={d.id}>
                                <td className="px-4 py-3">
                                    <div className="font-mono font-bold text-[#101D35]">{d.code}</div>
                                    <div className="font-semibold text-slate-900">{d.title}</div>
                                    <div className="text-[11px] text-slate-500">
                                        {d.original_filename} ({Math.round(d.file_size / 1024)} KB)
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                        {d.category}
                                    </span>
                                    {d.project_code && (
                                        <div className="mt-1 text-[11px] text-blue-600">
                                            {d.project_code} — {d.project_name}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="font-mono font-bold text-slate-700">
                                        {d.version}
                                    </div>
                                    <div className="mt-1">
                                        <StatusBadge label={d.data_status} />
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                    <div>{d.uploader}</div>
                                    <div className="text-[11px] text-slate-400">{d.created_at}</div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <a
                                            href={`/documents/${d.id}/download`}
                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-[#101D35] hover:bg-slate-50"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            Download
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {documents.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                                    No documents uploaded to the private vault yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showUpload && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="flex items-center gap-2 text-base font-bold text-[#101D35]">
                                <FolderLock className="h-5 w-5" />
                                Upload Private Document
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowUpload(false)}
                                className="rounded p-1 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={submitUpload} className="mt-4 space-y-3">
                            <input
                                type="text"
                                required
                                value={form.data.title}
                                onChange={(e) => form.setData('title', e.target.value)}
                                placeholder="Document title"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={form.data.category}
                                    onChange={(e) => form.setData('category', e.target.value)}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    {categories.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={form.data.project_id}
                                    onChange={(e) => form.setData('project_id', e.target.value)}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    <option value="">No Linked Project</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.code} — {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    required
                                    value={form.data.version}
                                    onChange={(e) => form.setData('version', e.target.value)}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                                <select
                                    value={form.data.data_status}
                                    onChange={(e) => form.setData('data_status', e.target.value)}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    <option value="Disepakati">Disepakati</option>
                                    <option value="Usulan">Usulan</option>
                                    <option value="Perlu Konfirmasi Manajemen">
                                        Perlu Konfirmasi Manajemen
                                    </option>
                                </select>
                            </div>
                            <input
                                type="file"
                                required
                                onChange={(e) => form.setData('file', e.target.files?.[0] ?? null)}
                                className="w-full text-xs text-slate-600"
                            />
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowUpload(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    <FileUp className="h-3.5 w-3.5" />
                                    Upload to Vault
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
