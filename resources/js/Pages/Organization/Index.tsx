import { RaciBadge, StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { cn, getInitials } from '@/lib/utils';
import type {
    DepartmentItem,
    EmployeeProfileItem,
    PageProps,
    RaciActivityItem,
    RaciUserItem,
} from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Edit3,
    FileText,
    Network,
    Search,
    Table2,
    Users,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

interface OrganizationProps extends PageProps {
    initialTab: string;
    profiles: EmployeeProfileItem[];
    departments: DepartmentItem[];
    raciUsers: RaciUserItem[];
    raciActivities: RaciActivityItem[];
    canEdit: boolean;
}

type OrgTab = 'directory' | 'org-chart' | 'job-descriptions' | 'raci';

export default function OrganizationIndex({
    initialTab,
    profiles,
    departments,
    raciUsers,
    raciActivities,
    canEdit,
}: OrganizationProps) {
    const validTabs: OrgTab[] = ['directory', 'org-chart', 'job-descriptions', 'raci'];
    const [activeTab, setActiveTab] = useState<OrgTab>(
        validTabs.includes(initialTab as OrgTab) ? (initialTab as OrgTab) : 'directory',
    );
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState<string>('all');
    const [zoom, setZoom] = useState<number>(100);
    const [selectedJdId, setSelectedJdId] = useState<number>(profiles[0]?.id ?? 0);

    // Edit Profile Modal state
    const [editingProfile, setEditingProfile] = useState<EmployeeProfileItem | null>(null);
    const [profileForm, setProfileForm] = useState({
        weekly_capacity_hours: '',
        capacity_status: 'Perlu Konfirmasi Manajemen',
        coordination_status: 'Sesuai arahan',
        coordination_note: '',
        focus_summary: '',
        employment_status: 'Active',
    });

    // Edit RACI Modal state
    const [editingRaci, setEditingRaci] = useState<RaciActivityItem | null>(null);
    const [raciForm, setRaciForm] = useState<{
        notes: string;
        data_status: string;
        assignments: Record<number, string>;
    }>({ notes: '', data_status: 'Disepakati', assignments: {} });
    const [raciClientError, setRaciClientError] = useState<string | null>(null);

    const filteredProfiles = useMemo(() => {
        return profiles.filter((p) => {
            const matchesDept = deptFilter === 'all' || String(p.department_id) === deptFilter;
            const q = search.trim().toLowerCase();
            const matchesSearch =
                !q ||
                p.name.toLowerCase().includes(q) ||
                p.position.toLowerCase().includes(q) ||
                p.employee_code.toLowerCase().includes(q);
            return matchesDept && matchesSearch;
        });
    }, [profiles, deptFilter, search]);

    const selectedJdProfile =
        profiles.find((p) => p.id === selectedJdId) ?? profiles[0] ?? null;

    const openEditProfile = (p: EmployeeProfileItem) => {
        setEditingProfile(p);
        setProfileForm({
            weekly_capacity_hours:
                p.weekly_capacity_hours !== null ? String(p.weekly_capacity_hours) : '',
            capacity_status: p.capacity_status,
            coordination_status: p.coordination_status,
            coordination_note: p.coordination_note ?? '',
            focus_summary: p.focus_summary ?? '',
            employment_status: p.employment_status,
        });
    };

    const submitProfile = (e: FormEvent) => {
        e.preventDefault();
        if (!editingProfile) return;
        router.patch(
            `/organization/profiles/${editingProfile.id}`,
            {
                ...profileForm,
                weekly_capacity_hours:
                    profileForm.weekly_capacity_hours === ''
                        ? null
                        : Number(profileForm.weekly_capacity_hours),
            },
            {
                preserveScroll: true,
                onSuccess: () => setEditingProfile(null),
            },
        );
    };

    const openEditRaci = (activity: RaciActivityItem) => {
        const mapped: Record<number, string> = {};
        raciUsers.forEach((u) => {
            mapped[u.id] = activity.assignments[u.id] ?? '';
        });
        setEditingRaci(activity);
        setRaciForm({
            notes: activity.notes ?? '',
            data_status: activity.data_status,
            assignments: mapped,
        });
        setRaciClientError(null);
    };

    const submitRaci = (e: FormEvent) => {
        e.preventDefault();
        if (!editingRaci) return;

        let aCount = 0;
        let rCount = 0;
        Object.values(raciForm.assignments).forEach((code) => {
            if (code.includes('A')) aCount++;
            if (code.includes('R')) rCount++;
        });
        if (aCount !== 1) {
            setRaciClientError(
                `Each activity must have exactly 1 Accountable (A or A/R). Currently: ${aCount}.`,
            );
            return;
        }
        if (rCount < 1) {
            setRaciClientError(
                'Each activity must have at least 1 Responsible (R or A/R).',
            );
            return;
        }

        router.put(`/organization/raci/${editingRaci.id}`, raciForm, {
            preserveScroll: true,
            onSuccess: () => setEditingRaci(null),
        });
    };

    // Org chart helpers
    const findMember = (code: string) => profiles.find((p) => p.employee_code === code);
    const albert = findMember('KRV-01');
    const farizy = findMember('KRV-02');
    const aldo = findMember('KRV-03');
    const febriana = findMember('KRV-04');
    const yoga = findMember('KRV-05');
    const ananta = findMember('KRV-06');
    const jihanz = findMember('KRV-07');

    const tabs: { id: OrgTab; label: string; icon: typeof Users }[] = [
        { id: 'directory', label: 'Team Directory', icon: Users },
        { id: 'org-chart', label: 'Organization Chart', icon: Network },
        { id: 'job-descriptions', label: 'Job Descriptions', icon: FileText },
        { id: 'raci', label: 'RACI Matrix', icon: Table2 },
    ];

    return (
        <AppShell
            title="Organization & Team"
            subtitle="7 internal members · 5 divisions · Effective 1 Dec 2026 (Decision D-02)"
        >
            <Head title="Organization & Team" />

            {/* Sub-tab navigation (BordUp Ref 2 style) */}
            <div className="mb-6 border-b border-slate-200">
                <nav className="-mb-px flex flex-wrap gap-6">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'inline-flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-colors',
                                    active
                                        ? 'border-[#101D35] text-[#101D35]'
                                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* TAB 1: TEAM DIRECTORY */}
            {activeTab === 'directory' && (
                <div className="space-y-4">
                    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative flex-1 sm:max-w-xs">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name, role, or ID..."
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm outline-none focus:border-[#101D35] focus:bg-white"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={deptFilter}
                                onChange={(e) => setDeptFilter(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#101D35]"
                            >
                                <option value="all">All Divisions (5)</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={String(d.id)}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Member</th>
                                        <th className="px-4 py-3">Division</th>
                                        <th className="px-4 py-3">Coordination Line</th>
                                        <th className="px-4 py-3">Capacity (hrs/wk)</th>
                                        <th className="px-4 py-3">Status</th>
                                        {canEdit && <th className="px-4 py-3 text-right">Action</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredProfiles.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/70">
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                                        style={{ backgroundColor: p.avatar_color }}
                                                    >
                                                        {getInitials(p.name)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-slate-900">
                                                                {p.name}
                                                            </span>
                                                            <span className="font-mono text-[11px] text-slate-400">
                                                                {p.employee_code}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500">{p.position}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700">
                                                    <span
                                                        className="h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: p.department_color }}
                                                    />
                                                    {p.department}
                                                </span>
                                            </td>
                                            <td className="max-w-xs px-4 py-3.5">
                                                <p className="text-xs text-slate-700">{p.coordination_note}</p>
                                                <div className="mt-1">
                                                    <StatusBadge label={p.coordination_status} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                                                    {p.weekly_capacity_hours !== null
                                                        ? `${p.weekly_capacity_hours} hrs`
                                                        : 'Not set'}
                                                </div>
                                                <div className="mt-1">
                                                    <StatusBadge label={p.capacity_status} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <StatusBadge label={p.employment_status} />
                                            </td>
                                            {canEdit && (
                                                <td className="px-4 py-3.5 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditProfile(p)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                        Edit
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: INTERACTIVE ORG CHART (BordUp Ref 2 style) */}
            {activeTab === 'org-chart' && (
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
                        <div>
                            <h2 className="font-display text-sm font-bold text-[#101D35]">
                                Leadership &amp; Coordination Structure
                            </h2>
                            <p className="text-xs text-slate-500">
                                Peer Leadership: Albert (Commercial), Farizy (Operations), Aldo (Technology)
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1">
                            <button
                                type="button"
                                onClick={() => setZoom((z) => Math.max(75, z - 10))}
                                className="rounded p-1 text-slate-600 hover:bg-white"
                                title="Zoom out"
                            >
                                <ZoomOut className="h-4 w-4" />
                            </button>
                            <span className="px-2 font-mono text-xs font-semibold text-slate-700">
                                {zoom}%
                            </span>
                            <button
                                type="button"
                                onClick={() => setZoom((z) => Math.min(120, z + 10))}
                                className="rounded p-1 text-slate-600 hover:bg-white"
                                title="Zoom in"
                            >
                                <ZoomIn className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="org-grid-bg overflow-x-auto p-6 sm:p-10">
                        <div
                            className="mx-auto min-w-[780px] origin-top transition-transform duration-150"
                            style={{ transform: `scale(${zoom / 100})` }}
                        >
                            {/* Tier 1: Peer Leadership */}
                            <div className="mb-3 text-center">
                                <span className="inline-flex rounded-full bg-[#101D35] px-3.5 py-1 text-[11px] font-semibold tracking-wider text-white uppercase">
                                    Leadership Peers · Final Commercial Decision: Albert Christian
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                {[albert, farizy, aldo].map(
                                    (leader) =>
                                        leader && (
                                            <div
                                                key={leader.id}
                                                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                                            >
                                                <div
                                                    className="mb-3 h-1.5 w-full rounded-full"
                                                    style={{ backgroundColor: leader.department_color }}
                                                />
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                                        style={{ backgroundColor: leader.avatar_color }}
                                                    >
                                                        {getInitials(leader.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-bold text-slate-900">
                                                            {leader.name}
                                                        </p>
                                                        <p className="truncate text-xs text-slate-500">
                                                            {leader.position}
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                                                    {leader.focus_summary}
                                                </p>
                                            </div>
                                        ),
                                )}
                            </div>

                            {/* Connector Strip */}
                            <div className="my-5 flex items-center justify-center">
                                <div className="h-6 w-px bg-slate-300" />
                            </div>

                            {/* Tier 2: Division Columns */}
                            <div className="grid grid-cols-3 gap-6">
                                {/* Under Albert & Farizy: Brand & Content */}
                                <div className="space-y-3">
                                    <div className="rounded-full bg-[#DB2777] px-3 py-1 text-center text-xs font-semibold text-white">
                                        Brand, Konten &amp; Desain
                                    </div>
                                    {jihanz && (
                                        <OrgMemberCard member={jihanz} />
                                    )}
                                </div>

                                {/* Under Aldo & Albert: Analysis & Client Relations */}
                                <div className="space-y-3">
                                    <div className="rounded-full bg-[#7C3AED] px-3 py-1 text-center text-xs font-semibold text-white">
                                        Analisis &amp; Relasi Klien
                                    </div>
                                    {febriana && (
                                        <OrgMemberCard member={febriana} />
                                    )}
                                </div>

                                {/* Under Aldo: Technology & Engineering */}
                                <div className="space-y-3">
                                    <div className="rounded-full bg-[#0D9488] px-3 py-1 text-center text-xs font-semibold text-white">
                                        Teknologi &amp; Engineering
                                    </div>
                                    {yoga && <OrgMemberCard member={yoga} />}
                                    {ananta && <OrgMemberCard member={ananta} />}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: JOB DESCRIPTIONS (Sheet 03) */}
            {activeTab === 'job-descriptions' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                        <p className="px-2 py-1 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                            Select Position
                        </p>
                        {profiles.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setSelectedJdId(p.id)}
                                className={cn(
                                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                                    selectedJdProfile?.id === p.id
                                        ? 'bg-[#101D35] text-white'
                                        : 'text-slate-700 hover:bg-slate-50',
                                )}
                            >
                                <div
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-1 ring-white/20"
                                    style={{ backgroundColor: p.avatar_color }}
                                >
                                    {getInitials(p.name)}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold">{p.name}</p>
                                    <p
                                        className={cn(
                                            'truncate text-[11px]',
                                            selectedJdProfile?.id === p.id
                                                ? 'text-slate-300'
                                                : 'text-slate-500',
                                        )}
                                    >
                                        {p.position}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {selectedJdProfile && selectedJdProfile.job_description && (
                        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-3">
                            <div className="border-b border-slate-100 pb-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h2 className="font-display text-lg font-bold text-[#101D35]">
                                            {selectedJdProfile.name}
                                        </h2>
                                        <p className="text-sm text-slate-600">
                                            {selectedJdProfile.position}
                                        </p>
                                    </div>
                                    <StatusBadge label={selectedJdProfile.department} tone="blue" />
                                </div>
                                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                                    <span className="font-semibold text-[#101D35]">Tujuan Posisi: </span>
                                    {selectedJdProfile.job_description.purpose}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <JdSection
                                    title="Tanggung Jawab Utama"
                                    items={selectedJdProfile.job_description.responsibilities}
                                />
                                <JdSection
                                    title="Tugas Rutin"
                                    items={selectedJdProfile.job_description.routine_tasks}
                                />
                                <JdSection
                                    title="Tugas Berdasarkan Proyek"
                                    items={selectedJdProfile.job_description.project_tasks}
                                />
                                <JdSection
                                    title="Hasil Kerja Diharapkan"
                                    items={selectedJdProfile.job_description.expected_outputs}
                                />
                                <JdSection
                                    title="Indikator Keberhasilan"
                                    items={selectedJdProfile.job_description.success_indicators}
                                />
                                <JdSection
                                    title="Batas Kewenangan"
                                    items={selectedJdProfile.job_description.authority_limits}
                                    tone="amber"
                                />
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <JdSection
                                    title="Jalur Koordinasi"
                                    items={selectedJdProfile.job_description.coordination_links}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 4: RACI MATRIX (Sheet 04) */}
            {activeTab === 'raci' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                                <RaciBadge code="A/R" /> Accountable &amp; Responsible
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <RaciBadge code="A" /> Accountable (Exact 1)
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <RaciBadge code="R" /> Responsible (≥1)
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <RaciBadge code="C" /> Consulted
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <RaciBadge code="I" /> Informed
                            </span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {raciActivities.length} / {raciActivities.length} Activities Valid
                        </span>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="border-b border-slate-200 bg-[#101D35] text-xs font-semibold text-white">
                                    <tr>
                                        <th className="px-4 py-3">#</th>
                                        <th className="px-4 py-3">Activity</th>
                                        {raciUsers.map((u) => (
                                            <th key={u.id} className="px-3 py-3 text-center">
                                                {u.short_name}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3">Notes / Governance</th>
                                        {canEdit && <th className="px-4 py-3 text-right">Edit</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {raciActivities.map((act) => (
                                        <tr key={act.id} className="hover:bg-slate-50/70">
                                            <td className="px-4 py-3 font-mono text-xs text-slate-400">
                                                {act.sort_order}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-900">
                                                <div>{act.activity_name}</div>
                                                {act.data_status !== 'Disepakati' && (
                                                    <div className="mt-1">
                                                        <StatusBadge label={act.data_status} />
                                                    </div>
                                                )}
                                            </td>
                                            {raciUsers.map((u) => (
                                                <td key={u.id} className="px-3 py-3 text-center">
                                                    <RaciBadge code={act.assignments[u.id]} />
                                                </td>
                                            ))}
                                            <td className="max-w-xs px-4 py-3 text-xs text-slate-500">
                                                {act.notes ?? '—'}
                                            </td>
                                            {canEdit && (
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditRaci(act)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Employee Capacity/Coordination Modal */}
            {editingProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-display text-lg font-bold text-[#101D35]">
                                    Edit Profile · {editingProfile.name}
                                </h3>
                                <p className="text-xs text-slate-500">{editingProfile.position}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingProfile(null)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={submitProfile} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Weekly Capacity (hrs/week)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="80"
                                        value={profileForm.weekly_capacity_hours}
                                        onChange={(e) =>
                                            setProfileForm({ ...profileForm, weekly_capacity_hours: e.target.value })
                                        }
                                        placeholder="Leave blank if unconfirmed"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#101D35]"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Capacity Confirmation (D-07)
                                    </label>
                                    <select
                                        value={profileForm.capacity_status}
                                        onChange={(e) =>
                                            setProfileForm({ ...profileForm, capacity_status: e.target.value })
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#101D35]"
                                    >
                                        <option value="Disepakati">Disepakati</option>
                                        <option value="Usulan">Usulan</option>
                                        <option value="Perlu Konfirmasi Manajemen">
                                            Perlu Konfirmasi Manajemen
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Employment Status
                                    </label>
                                    <select
                                        value={profileForm.employment_status}
                                        onChange={(e) =>
                                            setProfileForm({ ...profileForm, employment_status: e.target.value })
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#101D35]"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Part-Time">Part-Time</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Coordination Status (D-06)
                                    </label>
                                    <select
                                        value={profileForm.coordination_status}
                                        onChange={(e) =>
                                            setProfileForm({ ...profileForm, coordination_status: e.target.value })
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#101D35]"
                                    >
                                        <option value="Sesuai arahan">Sesuai arahan</option>
                                        <option value="Disepakati">Disepakati</option>
                                        <option value="Usulan (D-06)">Usulan (D-06)</option>
                                        <option value="Perlu Konfirmasi Manajemen">
                                            Perlu Konfirmasi Manajemen
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    Coordination Line Notes
                                </label>
                                <input
                                    type="text"
                                    value={profileForm.coordination_note}
                                    onChange={(e) =>
                                        setProfileForm({ ...profileForm, coordination_note: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#101D35]"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingProfile(null)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1A2D4E]"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit RACI Modal */}
            {editingRaci && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-display text-lg font-bold text-[#101D35]">
                                    Edit RACI · {editingRaci.activity_name}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Invariant: Exact 1 Accountable (A or A/R) and ≥1 Responsible (R or A/R).
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingRaci(null)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {raciClientError && (
                            <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                {raciClientError}
                            </div>
                        )}

                        <form onSubmit={submitRaci} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {raciUsers.map((u) => (
                                    <div key={u.id} className="rounded-lg border border-slate-200 p-2.5">
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                                            {u.short_name}
                                        </label>
                                        <select
                                            value={raciForm.assignments[u.id] ?? ''}
                                            onChange={(e) =>
                                                setRaciForm({
                                                    ...raciForm,
                                                    assignments: {
                                                        ...raciForm.assignments,
                                                        [u.id]: e.target.value,
                                                    },
                                                })
                                            }
                                            className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-semibold"
                                        >
                                            <option value="">—</option>
                                            <option value="A/R">A/R</option>
                                            <option value="A">A</option>
                                            <option value="R">R</option>
                                            <option value="C">C</option>
                                            <option value="I">I</option>
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Data Status
                                    </label>
                                    <select
                                        value={raciForm.data_status}
                                        onChange={(e) =>
                                            setRaciForm({ ...raciForm, data_status: e.target.value })
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    >
                                        <option value="Disepakati">Disepakati</option>
                                        <option value="Usulan">Usulan</option>
                                        <option value="Perlu Konfirmasi Manajemen">
                                            Perlu Konfirmasi Manajemen
                                        </option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Notes
                                    </label>
                                    <input
                                        type="text"
                                        value={raciForm.notes}
                                        onChange={(e) =>
                                            setRaciForm({ ...raciForm, notes: e.target.value })
                                        }
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingRaci(null)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1A2D4E]"
                                >
                                    Save RACI
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}

function OrgMemberCard({ member }: { member: EmployeeProfileItem }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-3">
                <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: member.avatar_color }}
                >
                    {getInitials(member.name)}
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{member.name}</p>
                    <p className="truncate text-xs text-slate-500">{member.position}</p>
                </div>
            </div>
            <p className="mt-2.5 text-xs text-slate-600">{member.coordination_note}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
                <StatusBadge label={member.coordination_status} />
            </div>
        </div>
    );
}

function JdSection({
    title,
    items,
    tone = 'default',
}: {
    title: string;
    items: string[];
    tone?: 'default' | 'amber';
}) {
    return (
        <div
            className={cn(
                'rounded-xl border p-4',
                tone === 'amber'
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-slate-100 bg-slate-50/60',
            )}
        >
            <h3 className="mb-2 text-xs font-bold tracking-wide text-[#101D35] uppercase">
                {title}
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-700">
                {items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#101D35]" />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
