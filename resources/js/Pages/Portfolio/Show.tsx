import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { cn, formatShortDate } from '@/lib/utils';
import type { PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Download,
    ExternalLink,
    FileUp,
    Lock,
    Megaphone,
    ShieldCheck,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface CriterionCheck {
    id: number;
    criterion_key: string;
    label: string;
    sort_order: number;
    is_met: boolean;
    evidence_note: string | null;
    checker: string | null;
    checked_at: string | null;
}

interface PortfolioShowProps extends PageProps {
    demo: {
        id: number;
        code: string;
        name: string;
        service_line: string;
        purpose: string | null;
        features_summary: string | null;
        feature_checklist: { title: string; done: boolean }[];
        qa_checklist: { title: string; done: boolean }[];
        pic_user_id: number | null;
        pic_name: string | null;
        supporting_team: string | null;
        start_date: string | null;
        target_end_date: string | null;
        status: string;
        label_type: string;
        client_permission_granted: boolean;
        is_conditional: boolean;
        data_status: string;
        staging_url: string | null;
        documentation_url: string | null;
        technical_approver: string | null;
        technical_approved_at: string | null;
        commercial_approver: string | null;
        commercial_approved_at: string | null;
        is_ready_to_present: boolean;
        notes: string | null;
        criteria_checks: CriterionCheck[];
        assets: {
            id: number;
            asset_type: string;
            title: string;
            has_file: boolean;
            external_url: string | null;
            uploader: string | null;
            created_at: string | null;
        }[];
        content_items: {
            id: number;
            code: string;
            platform: string;
            category: string;
            title_topic: string;
            publish_date: string | null;
            status: string;
        }[];
    };
    activeDemoCount: number;
    maxActiveDemos: number;
    statuses: string[];
    users: { id: number; name: string }[];
    permissions: {
        canUpdate: boolean;
        canApproveTechnical: boolean;
        canApproveCommercial: boolean;
    };
}

export default function PortfolioShow({
    demo,
    activeDemoCount,
    maxActiveDemos,
    statuses,
    users,
    permissions,
    errors,
}: PortfolioShowProps) {
    const [notesByCriterion, setNotesByCriterion] = useState<Record<number, string>>({});

    const statusForm = useForm({
        status: demo.status,
        notes: demo.notes ?? '',
    });

    const editForm = useForm({
        pic_user_id: demo.pic_user_id ? String(demo.pic_user_id) : '',
        supporting_team: demo.supporting_team ?? '',
        start_date: demo.start_date ?? '',
        target_end_date: demo.target_end_date ?? '',
        staging_url: demo.staging_url ?? '',
        documentation_url: demo.documentation_url ?? '',
        client_permission_granted: demo.client_permission_granted,
        label_type: demo.label_type,
        data_status: demo.data_status,
        feature_checklist: demo.feature_checklist ?? [],
        qa_checklist: demo.qa_checklist ?? [],
        notes: demo.notes ?? '',
    });

    const assetForm = useForm<{
        asset_type: string;
        title: string;
        external_url: string;
        file: File | null;
    }>({
        asset_type: 'screenshot',
        title: '',
        external_url: '',
        file: null,
    });

    const submitStatus = (e: FormEvent) => {
        e.preventDefault();
        statusForm.post(`/portfolio/demos/${demo.id}/status`);
    };

    const toggleCriterion = (c: CriterionCheck) => {
        if (!permissions.canUpdate || c.criterion_key === 'dual_approved') return;
        router.post(`/portfolio/demos/${demo.id}/criteria/${c.id}`, {
            is_met: !c.is_met,
            evidence_note: notesByCriterion[c.id] ?? c.evidence_note ?? '',
        });
    };

    const toggleFeatureItem = (idx: number) => {
        const next = editForm.data.feature_checklist.map((item, i) =>
            i === idx ? { ...item, done: !item.done } : item,
        );
        editForm.setData('feature_checklist', next);
    };

    const submitAsset = (e: FormEvent) => {
        e.preventDefault();
        assetForm.post(`/portfolio/demos/${demo.id}/assets`, {
            forceFormData: true,
            onSuccess: () => assetForm.reset('title', 'external_url', 'file'),
        });
    };

    const errorList = Object.values(errors ?? {});
    const metCount = demo.criteria_checks.filter((c) => c.is_met).length;

    return (
        <AppShell
            title={`${demo.code} — ${demo.name}`}
            subtitle={`${demo.service_line} • Label: ${demo.label_type} • Active Builds: ${activeDemoCount}/${maxActiveDemos}`}
            actions={
                <Link
                    href="/portfolio/demos"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Portfolio
                </Link>
            }
        >
            <Head title={`${demo.code} ${demo.name} — KDMS`} />

            {errorList.length > 0 && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                    <div className="flex items-center gap-2 font-bold">
                        <AlertTriangle className="h-4 w-4" />
                        Portfolio Rule / Gate Blocked
                    </div>
                    <ul className="mt-1 list-disc pl-5">
                        {errorList.map((m, idx) => (
                            <li key={idx}>{m}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Status & Dual Approval Banner */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge label={demo.status} />
                            <StatusBadge label={demo.label_type} />
                            <StatusBadge label={demo.data_status} />
                            {demo.is_ready_to_present && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-semibold text-white">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Ready to Present (6/6)
                                </span>
                            )}
                        </div>
                        {demo.purpose && (
                            <p className="mt-2 max-w-3xl text-xs text-slate-600">{demo.purpose}</p>
                        )}
                    </div>

                    {permissions.canUpdate && (
                        <form onSubmit={submitStatus} className="flex items-center gap-2">
                            <select
                                value={statusForm.data.status}
                                onChange={(e) => statusForm.setData('status', e.target.value)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                            >
                                {statuses.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="submit"
                                disabled={statusForm.processing}
                                className="rounded-lg bg-[#101D35] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#192c4e]"
                            >
                                Update Status
                            </button>
                        </form>
                    )}
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left 2 cols: 6-Criteria Gate & Configuration */}
                <div className="space-y-6 lg:col-span-2">
                    {/* 6 Criteria Presentation Readiness */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-[#101D35]">
                                    6 Presentation-Readiness Criteria (Sheet 10 Part B)
                                </h2>
                                <p className="text-xs text-slate-500">
                                    All 6 criteria + dual approval (Aldo & Albert) must be met before Ready to Present or showcase marketing publication
                                </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-[#101D35]">
                                {metCount} / 6 Met
                            </span>
                        </div>

                        <div className="mt-4 space-y-2.5">
                            {demo.criteria_checks.map((c) => {
                                const isDual = c.criterion_key === 'dual_approved';
                                return (
                                    <div
                                        key={c.id}
                                        className={cn(
                                            'rounded-xl border p-3.5',
                                            c.is_met
                                                ? 'border-emerald-200 bg-emerald-50/40'
                                                : 'border-slate-200 bg-white',
                                        )}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <span
                                                    className={cn(
                                                        'flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold',
                                                        c.is_met
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-slate-100 text-slate-600',
                                                    )}
                                                >
                                                    {c.sort_order}
                                                </span>
                                                <div>
                                                    <p className="text-xs font-bold text-[#101D35]">
                                                        {c.label}
                                                    </p>
                                                    {c.checker && (
                                                        <p className="text-[11px] text-slate-500">
                                                            Verified by {c.checker} • {c.checked_at}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {isDual ? (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {demo.technical_approver ? (
                                                        <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                                                            Aldo ✓ ({demo.technical_approver})
                                                        </span>
                                                    ) : permissions.canApproveTechnical ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                router.post(
                                                                    `/portfolio/demos/${demo.id}/approve-technical`,
                                                                )
                                                            }
                                                            className="rounded-lg bg-[#101D35] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#192c4e]"
                                                        >
                                                            Approve Technical (Aldo)
                                                        </button>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
                                                            <Lock className="h-3 w-3" />
                                                            Aldo Pending
                                                        </span>
                                                    )}

                                                    {demo.commercial_approver ? (
                                                        <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                                                            Albert ✓ ({demo.commercial_approver})
                                                        </span>
                                                    ) : permissions.canApproveCommercial ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                router.post(
                                                                    `/portfolio/demos/${demo.id}/approve-commercial`,
                                                                )
                                                            }
                                                            className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                                                        >
                                                            Approve Commercial (Albert)
                                                        </button>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
                                                            <Lock className="h-3 w-3" />
                                                            Albert Pending
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                permissions.canUpdate && (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={
                                                                notesByCriterion[c.id] ??
                                                                c.evidence_note ??
                                                                ''
                                                            }
                                                            onChange={(e) =>
                                                                setNotesByCriterion((prev) => ({
                                                                    ...prev,
                                                                    [c.id]: e.target.value,
                                                                }))
                                                            }
                                                            placeholder="Evidence note..."
                                                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px]"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleCriterion(c)}
                                                            className={cn(
                                                                'rounded-lg px-3 py-1 text-[11px] font-semibold',
                                                                c.is_met
                                                                    ? 'border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50'
                                                                    : 'bg-[#101D35] text-white hover:bg-[#192c4e]',
                                                            )}
                                                        >
                                                            {c.is_met ? 'Completed ✓' : 'Mark Met'}
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Details, Staging URL & Feature Checklist */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            editForm.patch(`/portfolio/demos/${demo.id}`);
                        }}
                        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
                    >
                        <h2 className="text-sm font-bold text-[#101D35]">
                            Demo Configuration, Staging & Feature Checklist
                        </h2>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Staging URL
                                </label>
                                <input
                                    type="url"
                                    disabled={!permissions.canUpdate}
                                    value={editForm.data.staging_url}
                                    onChange={(e) =>
                                        editForm.setData('staging_url', e.target.value)
                                    }
                                    placeholder="https://demo.kreviadigital.com/..."
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Documentation URL
                                </label>
                                <input
                                    type="url"
                                    disabled={!permissions.canUpdate}
                                    value={editForm.data.documentation_url}
                                    onChange={(e) =>
                                        editForm.setData('documentation_url', e.target.value)
                                    }
                                    placeholder="https://docs..."
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">PIC</label>
                                <select
                                    disabled={!permissions.canUpdate}
                                    value={editForm.data.pic_user_id}
                                    onChange={(e) =>
                                        editForm.setData('pic_user_id', e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    {users.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Label & Client Permission
                                </label>
                                <div className="mt-1 flex items-center gap-3">
                                    <select
                                        disabled={!permissions.canUpdate}
                                        value={editForm.data.label_type}
                                        onChange={(e) =>
                                            editForm.setData('label_type', e.target.value)
                                        }
                                        className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                                    >
                                        <option value="contoh internal">contoh internal</option>
                                        <option value="klien nyata">klien nyata</option>
                                    </select>
                                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                                        <input
                                            type="checkbox"
                                            disabled={!permissions.canUpdate}
                                            checked={editForm.data.client_permission_granted}
                                            onChange={(e) =>
                                                editForm.setData(
                                                    'client_permission_granted',
                                                    e.target.checked,
                                                )
                                            }
                                        />
                                        Client Permitted
                                    </label>
                                </div>
                            </div>
                        </div>

                        {editForm.data.feature_checklist.length > 0 && (
                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
                                <p className="text-xs font-bold text-[#101D35]">
                                    Feature Checklist (Do not market unbuilt features)
                                </p>
                                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                    {editForm.data.feature_checklist.map((item, idx) => (
                                        <label
                                            key={idx}
                                            className="flex items-center gap-2 text-xs text-slate-700"
                                        >
                                            <input
                                                type="checkbox"
                                                disabled={!permissions.canUpdate}
                                                checked={item.done}
                                                onChange={() => toggleFeatureItem(idx)}
                                            />
                                            <span
                                                className={
                                                    item.done ? 'line-through text-slate-400' : ''
                                                }
                                            >
                                                {item.title}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {permissions.canUpdate && (
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Save Demo Settings
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                {/* Right Col: Assets & Linked Marketing */}
                <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                            <FileUp className="h-4 w-4" />
                            Screenshots, Videos & Documentation
                        </h3>

                        {permissions.canUpdate && (
                            <form onSubmit={submitAsset} className="mt-3 space-y-2">
                                <select
                                    value={assetForm.data.asset_type}
                                    onChange={(e) =>
                                        assetForm.setData('asset_type', e.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                >
                                    <option value="screenshot">Screenshot</option>
                                    <option value="demo_video">Demo Video</option>
                                    <option value="doc">Documentation</option>
                                    <option value="asset_pack">Jihanz Asset Pack</option>
                                </select>
                                <input
                                    type="text"
                                    required
                                    value={assetForm.data.title}
                                    onChange={(e) => assetForm.setData('title', e.target.value)}
                                    placeholder="Asset title"
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                />
                                <input
                                    type="url"
                                    value={assetForm.data.external_url}
                                    onChange={(e) =>
                                        assetForm.setData('external_url', e.target.value)
                                    }
                                    placeholder="External URL (optional)"
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                />
                                <input
                                    type="file"
                                    onChange={(e) =>
                                        assetForm.setData('file', e.target.files?.[0] ?? null)
                                    }
                                    className="w-full text-[11px] text-slate-600"
                                />
                                <button
                                    type="submit"
                                    disabled={assetForm.processing}
                                    className="w-full rounded-lg bg-[#101D35] py-1.5 text-xs font-semibold text-white"
                                >
                                    Attach Asset
                                </button>
                            </form>
                        )}

                        <div className="mt-3 space-y-2">
                            {demo.assets.map((a) => (
                                <div
                                    key={a.id}
                                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                                >
                                    <div>
                                        <p className="font-semibold text-slate-800">{a.title}</p>
                                        <p className="text-[10px] text-slate-500 uppercase">
                                            {a.asset_type} • {a.created_at}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {a.has_file && (
                                            <a
                                                href={`/portfolio/demos/${demo.id}/assets/${a.id}/download`}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                <Download className="h-4 w-4" />
                                            </a>
                                        )}
                                        {a.external_url && (
                                            <a
                                                href={a.external_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {demo.assets.length === 0 && (
                                <p className="text-[11px] text-slate-400">
                                    No demo screenshots or videos uploaded yet.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                            <Megaphone className="h-4 w-4" />
                            Gated Marketing Content ({demo.content_items.length})
                        </h3>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Blocked from publication until this demo is Ready to Present
                        </p>
                        <div className="mt-3 space-y-2">
                            {demo.content_items.map((ci) => (
                                <Link
                                    key={ci.id}
                                    href={`/marketing/content/${ci.id}`}
                                    className="block rounded-lg border border-slate-200 p-2.5 text-xs hover:bg-slate-50"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-[#101D35]">
                                            {ci.code} • {ci.platform}
                                        </span>
                                        <StatusBadge label={ci.status} />
                                    </div>
                                    <p className="mt-1 line-clamp-1 text-slate-700">
                                        {ci.title_topic}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        Publish: {formatShortDate(ci.publish_date)}
                                    </p>
                                </Link>
                            ))}
                            {demo.content_items.length === 0 && (
                                <p className="text-[11px] text-slate-400">
                                    No marketing posts linked yet.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
