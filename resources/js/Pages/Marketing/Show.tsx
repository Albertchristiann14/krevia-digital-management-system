import { StatusBadge } from '@/Components/shared/StatusBadge';
import { UserAvatar } from '@/Components/shared/UserAvatar';
import { UserPicker, type UserPickerOption } from '@/Components/shared/UserPicker';
import { AppShell } from '@/Layouts/AppShell';
import { cn, formatShortDate } from '@/lib/utils';
import type { PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    CheckCircle2,
    Download,
    ExternalLink,
    FileUp,
    Lock,
    ShieldCheck,
    UserCog,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface MarketingShowProps extends PageProps {
    item: {
        id: number;
        code: string;
        platform: string;
        category: string;
        title_topic: string;
        brief: string | null;
        caption: string | null;
        hashtags: string | null;
        pic_user_id: number | null;
        pic_name: string | null;
        pic_email?: string | null;
        pic_avatar_url?: string | null;
        pic_avatar_color?: string | null;
        reviewer_user_id: number | null;
        reviewer_name: string | null;
        demo_product_id: number | null;
        demo: {
            id: number;
            code: string;
            name: string;
            is_ready_to_present: boolean;
        } | null;
        requires_ready_demo: boolean;
        production_date: string | null;
        review_date: string | null;
        publish_date: string | null;
        published_at: string | null;
        published_url: string | null;
        status: string;
        is_reused_reel: boolean;
        is_approved: boolean;
        approver_name: string | null;
        approved_at: string | null;
        notes: string | null;
        assets: {
            id: number;
            asset_type: string;
            title: string;
            has_file: boolean;
            external_url: string | null;
            uploader: string | null;
            created_at: string | null;
        }[];
        approvals: {
            id: number;
            decision: string;
            feedback: string | null;
            reviewer: string | null;
            reviewed_at: string | null;
        }[];
        metrics: {
            id: number;
            recorded_date: string | null;
            reach: number;
            impressions: number;
            likes: number;
            comments: number;
            shares: number;
            saves: number;
            clicks: number;
            inquiries_generated: number;
            recorder: string | null;
        }[];
    };
    statuses: string[];
    demos: { id: number; code: string; name: string; is_ready_to_present: boolean }[];
    users: UserPickerOption[];
    permissions: {
        canUpdate: boolean;
        canApprove: boolean;
        canPublish: boolean;
    };
}

export default function MarketingShow({
    item,
    statuses,
    demos,
    users,
    permissions,
    errors,
}: MarketingShowProps) {
    const [showPicModal, setShowPicModal] = useState(false);

    const picForm = useForm({
        pic_user_id: item.pic_user_id ? String(item.pic_user_id) : '',
    });

    const editForm = useForm({
        title_topic: item.title_topic,
        brief: item.brief ?? '',
        caption: item.caption ?? '',
        hashtags: item.hashtags ?? '',
        demo_product_id: item.demo_product_id ? String(item.demo_product_id) : '',
        pic_user_id: item.pic_user_id ? String(item.pic_user_id) : '',
        reviewer_user_id: item.reviewer_user_id ? String(item.reviewer_user_id) : '',
        production_date: item.production_date ?? '',
        review_date: item.review_date ?? '',
        publish_date: item.publish_date ?? '',
        published_url: item.published_url ?? '',
        notes: item.notes ?? '',
    });

    const statusForm = useForm({
        status: item.status,
        published_url: item.published_url ?? '',
    });

    const reviewForm = useForm({
        decision: 'Approved',
        feedback: '',
    });

    const assetForm = useForm<{
        asset_type: string;
        title: string;
        external_url: string;
        file: File | null;
    }>({
        asset_type: 'image',
        title: '',
        external_url: '',
        file: null,
    });

    const metricForm = useForm({
        recorded_date: new Date().toISOString().slice(0, 10),
        reach: '0',
        impressions: '0',
        likes: '0',
        comments: '0',
        shares: '0',
        saves: '0',
        clicks: '0',
        inquiries_generated: '0',
    });

    const submitAsset = (e: FormEvent) => {
        e.preventDefault();
        assetForm.post(`/marketing/content/${item.id}/assets`, {
            forceFormData: true,
            onSuccess: () => assetForm.reset('title', 'external_url', 'file'),
        });
    };

    const errorList = Object.values(errors ?? {});

    return (
        <AppShell
            title={`${item.code} — ${item.platform}`}
            subtitle={`${item.category} • PIC: ${item.pic_name ?? 'Jihanz'} • Reviewer: ${item.reviewer_name ?? '—'}`}
            actions={
                <Link
                    href="/marketing/content"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Content Calendar
                </Link>
            }
        >
            <Head title={`${item.code} ${item.platform} — KDMS`} />

            {errorList.length > 0 && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                    <div className="flex items-center gap-2 font-bold">
                        <AlertTriangle className="h-4 w-4" />
                        Publication / Workflow Gate Blocked
                    </div>
                    <ul className="mt-1 list-disc pl-5">
                        {errorList.map((m, idx) => (
                            <li key={idx}>{m}</li>
                        ))}
                    </ul>
                </div>
            )}

            {item.requires_ready_demo && (
                <div
                    className={cn(
                        'mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs',
                        item.demo?.is_ready_to_present
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-amber-200 bg-amber-50 text-amber-900',
                    )}
                >
                    <div className="flex items-center gap-2">
                        {item.demo?.is_ready_to_present ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                            <Lock className="h-4 w-4 text-amber-600" />
                        )}
                        <span>
                            <strong>Demo Readiness Gate ({item.category}):</strong>{' '}
                            {item.demo
                                ? `Linked to ${item.demo.code} (${item.demo.name}) — ${
                                      item.demo.is_ready_to_present
                                          ? 'Ready to Present ✓'
                                          : 'Not Ready yet; publication blocked until 6/6 criteria pass.'
                                  }`
                                : 'Requires an approved Ready-to-Present demo before publication.'}
                        </span>
                    </div>
                    {item.demo && (
                        <Link
                            href={`/portfolio/demos/${item.demo.id}`}
                            className="font-semibold underline"
                        >
                            Open {item.demo.code}
                        </Link>
                    )}
                </div>
            )}

            {/* Status & Timeline Header */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge label={item.status} />
                            {item.is_approved && (
                                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                    Approved by {item.approver_name}
                                </span>
                            )}
                        </div>
                        <p className="text-sm font-bold text-[#101D35]">{item.title_topic}</p>
                        <p className="text-xs text-slate-500">
                            H-5 Production: <strong>{formatShortDate(item.production_date)}</strong> •
                            H-2 Review: <strong>{formatShortDate(item.review_date)}</strong> •
                            Publish Target: <strong>{formatShortDate(item.publish_date)}</strong>
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 pt-1">
                            <div className="flex items-center gap-2">
                                <UserAvatar
                                    name={item.pic_name}
                                    avatarUrl={item.pic_avatar_url}
                                    avatarColor={item.pic_avatar_color}
                                    size="xs"
                                    className="h-6 w-6"
                                />
                                <div className="text-xs">
                                    <span className="text-slate-400">PIC: </span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                                        {item.pic_name ?? 'Unassigned'}
                                    </span>
                                    {item.pic_email && (
                                        <span className="ml-1.5 text-[11px] text-slate-400">
                                            ({item.pic_email})
                                        </span>
                                    )}
                                </div>
                            </div>
                            {permissions.canUpdate && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        picForm.setData(
                                            'pic_user_id',
                                            item.pic_user_id ? String(item.pic_user_id) : '',
                                        );
                                        setShowPicModal(true);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-[#101D35] hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                >
                                    <UserCog className="h-3 w-3" />
                                    Change PIC
                                </button>
                            )}
                        </div>
                    </div>

                    {(permissions.canUpdate || permissions.canPublish) && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                statusForm.post(`/marketing/content/${item.id}/status`);
                            }}
                            className="flex flex-wrap items-center gap-2"
                        >
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
                            {statusForm.data.status === 'Published' && (
                                <input
                                    type="url"
                                    required
                                    value={statusForm.data.published_url}
                                    onChange={(e) =>
                                        statusForm.setData('published_url', e.target.value)
                                    }
                                    placeholder="Published post URL..."
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                                />
                            )}
                            <button
                                type="submit"
                                disabled={statusForm.processing}
                                className="rounded-lg bg-[#101D35] px-3.5 py-1.5 text-xs font-semibold text-white"
                            >
                                Move Status
                            </button>
                        </form>
                    )}
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left 2 cols: Brief, Caption, Reviewer Approval & Metrics */}
                <div className="space-y-6 lg:col-span-2">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            editForm.transform((data) => ({
                                ...data,
                                pic_user_id: data.pic_user_id ? Number(data.pic_user_id) : null,
                            }));
                            editForm.patch(`/marketing/content/${item.id}`);
                        }}
                        className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
                    >
                        <h2 className="text-sm font-bold text-[#101D35]">
                            Content Brief, Caption & Schedule
                        </h2>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                Person in Charge (PIC)
                            </label>
                            <UserPicker
                                users={users}
                                value={editForm.data.pic_user_id}
                                onChange={(val) => editForm.setData('pic_user_id', val)}
                                disabled={!permissions.canUpdate}
                                placeholder="Unassigned (No PIC)"
                                allowClear
                                error={editForm.errors.pic_user_id}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-700">
                                Topic / Headline
                            </label>
                            <input
                                type="text"
                                disabled={!permissions.canUpdate}
                                value={editForm.data.title_topic}
                                onChange={(e) => editForm.setData('title_topic', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    H-5 Production Date
                                </label>
                                <input
                                    type="date"
                                    disabled={!permissions.canUpdate}
                                    value={editForm.data.production_date}
                                    onChange={(e) =>
                                        editForm.setData('production_date', e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    H-2 Review Date
                                </label>
                                <input
                                    type="date"
                                    disabled={!permissions.canUpdate}
                                    value={editForm.data.review_date}
                                    onChange={(e) =>
                                        editForm.setData('review_date', e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Publish Date
                                </label>
                                <input
                                    type="date"
                                    disabled={!permissions.canUpdate}
                                    value={editForm.data.publish_date}
                                    onChange={(e) =>
                                        editForm.setData('publish_date', e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Reviewer
                                </label>
                                <select
                                    disabled={!permissions.canUpdate}
                                    value={editForm.data.reviewer_user_id}
                                    onChange={(e) =>
                                        editForm.setData('reviewer_user_id', e.target.value)
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
                                    Linked Demo Product
                                </label>
                                <select
                                    disabled={!permissions.canUpdate}
                                    value={editForm.data.demo_product_id}
                                    onChange={(e) =>
                                        editForm.setData('demo_product_id', e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    <option value="">None</option>
                                    {demos.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.code} — {d.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-700">
                                Content Brief
                            </label>
                            <textarea
                                rows={2}
                                disabled={!permissions.canUpdate}
                                value={editForm.data.brief}
                                onChange={(e) => editForm.setData('brief', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-700">Caption</label>
                            <textarea
                                rows={3}
                                disabled={!permissions.canUpdate}
                                value={editForm.data.caption}
                                onChange={(e) => editForm.setData('caption', e.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-700">Hashtags</label>
                            <input
                                type="text"
                                disabled={!permissions.canUpdate}
                                value={editForm.data.hashtags}
                                onChange={(e) => editForm.setData('hashtags', e.target.value)}
                                placeholder="#KreviaDigital #BuildSmarter #SoftwareDevelopment"
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                        </div>
                        {permissions.canUpdate && (
                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Save Content Details
                                </button>
                            </div>
                        )}
                    </form>

                    {/* Performance Metrics */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                            <BarChart3 className="h-4 w-4" />
                            Post Performance Metrics
                        </h3>
                        {permissions.canUpdate && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    metricForm.post(`/marketing/content/${item.id}/metrics`);
                                }}
                                className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-5"
                            >
                                <input
                                    type="date"
                                    required
                                    value={metricForm.data.recorded_date}
                                    onChange={(e) =>
                                        metricForm.setData('recorded_date', e.target.value)
                                    }
                                    className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                                />
                                {(
                                    [
                                        ['reach', 'Reach'],
                                        ['impressions', 'Impr.'],
                                        ['likes', 'Likes'],
                                        ['inquiries_generated', 'Leads'],
                                    ] as const
                                ).map(([field, label]) => (
                                    <div key={field} className="flex items-center gap-1">
                                        <span className="text-[10px] text-slate-500">{label}</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={metricForm.data[field]}
                                            onChange={(e) =>
                                                metricForm.setData(field, e.target.value)
                                            }
                                            className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                                        />
                                    </div>
                                ))}
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#101D35] px-3 py-1.5 text-xs font-semibold text-white sm:col-span-5"
                                >
                                    Record Snapshot
                                </button>
                            </form>
                        )}
                        <div className="mt-3 space-y-2">
                            {item.metrics.map((m) => (
                                <div
                                    key={m.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs"
                                >
                                    <span className="font-semibold text-[#101D35]">
                                        {formatShortDate(m.recorded_date)}
                                    </span>
                                    <span className="text-slate-600">
                                        Reach: {m.reach} • Impr: {m.impressions} • Likes: {m.likes}{' '}
                                        • Leads: <strong>{m.inquiries_generated}</strong>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Col: Reviewer Gate & Visual Assets */}
                <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                            <ShieldCheck className="h-4 w-4" />
                            H-2 Reviewer Approval Workflow
                        </h3>
                        {permissions.canApprove && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    reviewForm.post(`/marketing/content/${item.id}/review`, {
                                        onSuccess: () => reviewForm.reset('feedback'),
                                    });
                                }}
                                className="mt-3 space-y-2"
                            >
                                <select
                                    value={reviewForm.data.decision}
                                    onChange={(e) =>
                                        reviewForm.setData('decision', e.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold"
                                >
                                    <option value="Approved">Approve Content</option>
                                    <option value="Revision Needed">Request Revision</option>
                                </select>
                                <textarea
                                    rows={2}
                                    value={reviewForm.data.feedback}
                                    onChange={(e) =>
                                        reviewForm.setData('feedback', e.target.value)
                                    }
                                    placeholder="Review notes (required for revision)..."
                                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                />
                                <button
                                    type="submit"
                                    disabled={reviewForm.processing}
                                    className="w-full rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                >
                                    Submit Review Decision
                                </button>
                            </form>
                        )}
                        <div className="mt-3 space-y-2">
                            {item.approvals.map((ap) => (
                                <div
                                    key={ap.id}
                                    className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs"
                                >
                                    <div className="flex items-center justify-between">
                                        <StatusBadge label={ap.decision} />
                                        <span className="text-[10px] text-slate-400">
                                            {ap.reviewed_at}
                                        </span>
                                    </div>
                                    <p className="mt-1 font-medium text-slate-700">
                                        By {ap.reviewer}
                                    </p>
                                    {ap.feedback && (
                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                            {ap.feedback}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                        <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#101D35]">
                            <FileUp className="h-4 w-4" />
                            Visual & Video Assets
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
                                    <option value="image">Feed / Carousel Image</option>
                                    <option value="video">Reels / TikTok Video</option>
                                    <option value="carousel_slide">Carousel Deck</option>
                                    <option value="link">Design Link (Figma/Canva)</option>
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
                                    className="w-full rounded-lg bg-[#101D35] py-1.5 text-xs font-semibold text-white"
                                >
                                    Upload Asset
                                </button>
                            </form>
                        )}
                        <div className="mt-3 space-y-2">
                            {item.assets.map((a) => (
                                <div
                                    key={a.id}
                                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                                >
                                    <div>
                                        <p className="font-semibold text-slate-800">{a.title}</p>
                                        <p className="text-[10px] text-slate-400 uppercase">
                                            {a.asset_type}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {a.has_file && (
                                            <a
                                                href={`/marketing/content/${item.id}/assets/${a.id}/download`}
                                                className="text-blue-600"
                                            >
                                                <Download className="h-4 w-4" />
                                            </a>
                                        )}
                                        {a.external_url && (
                                            <a
                                                href={a.external_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-blue-600"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showPicModal && permissions.canUpdate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#111A2E]">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <h3 className="text-base font-bold text-[#101D35] dark:text-white">
                                Change Person in Charge (PIC)
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowPicModal(false)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form
                            onSubmit={(e: FormEvent) => {
                                e.preventDefault();
                                picForm.transform((data) => ({
                                    pic_user_id: data.pic_user_id ? Number(data.pic_user_id) : null,
                                }));
                                picForm.patch(`/marketing/content/${item.id}`, {
                                    preserveScroll: true,
                                    onSuccess: () => setShowPicModal(false),
                                });
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Select New PIC
                                </label>
                                <UserPicker
                                    users={users}
                                    value={picForm.data.pic_user_id}
                                    onChange={(val) => picForm.setData('pic_user_id', val)}
                                    placeholder="Unassigned (No PIC)"
                                    allowClear
                                    error={picForm.errors.pic_user_id}
                                />
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowPicModal(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={picForm.processing}
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                >
                                    {picForm.processing ? 'Saving...' : 'Save PIC'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
