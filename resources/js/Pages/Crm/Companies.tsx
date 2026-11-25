import { AppShell } from '@/Layouts/AppShell';
import type { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Building2, Globe, Mail, MapPin, Phone, Search, UserCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

interface CompanyRow {
    id: number;
    name: string;
    industry: string;
    location: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    contacts: {
        id: number;
        name: string;
        role_title: string | null;
        email: string | null;
        phone: string | null;
        is_decision_maker: boolean;
    }[];
    leads_count: number;
    projects_count: number;
}

interface CompaniesProps extends PageProps {
    companies: CompanyRow[];
    industries: string[];
}

export default function Companies({ companies, industries }: CompaniesProps) {
    const [search, setSearch] = useState('');
    const [industry, setIndustry] = useState('');

    const filtered = useMemo(() => {
        return companies.filter((c) => {
            const matchesSearch =
                !search ||
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                (c.location ?? '').toLowerCase().includes(search.toLowerCase()) ||
                c.contacts.some((ct) => ct.name.toLowerCase().includes(search.toLowerCase()));
            const matchesIndustry = !industry || c.industry === industry;
            return matchesSearch && matchesIndustry;
        });
    }, [companies, search, industry]);

    return (
        <AppShell
            title="Companies & Contacts"
            subtitle="Shared client registry linking Sales Pipeline leads and Project Delivery engagements"
            actions={
                <Link
                    href="/crm/leads"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#101D35] hover:bg-slate-50"
                >
                    Open Sales Pipeline
                </Link>
            }
        >
            <Head title="Companies & Contacts — KDMS" />

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="relative min-w-[220px] flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search company, location, or contact name..."
                        className="w-full rounded-lg border border-slate-200 py-1.5 pr-3 pl-9 text-xs focus:border-[#101D35] focus:outline-none"
                    />
                </div>
                <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700"
                >
                    <option value="">All Industries ({companies.length})</option>
                    {industries.map((ind) => (
                        <option key={ind} value={ind}>
                            {ind}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((c) => (
                    <div
                        key={c.id}
                        className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4"
                    >
                        <div>
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#101D35]">
                                        <Building2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-[#101D35]">
                                            {c.name}
                                        </h3>
                                        <p className="text-[11px] text-slate-500">{c.industry}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1.5 text-[10px] font-semibold">
                                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                                        {c.leads_count} Lead{c.leads_count === 1 ? '' : 's'}
                                    </span>
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                                        {c.projects_count} Proj
                                    </span>
                                </div>
                            </div>

                            <div className="mt-3 space-y-1 text-xs text-slate-600">
                                {c.location && (
                                    <p className="flex items-center gap-1.5">
                                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                        {c.location}
                                    </p>
                                )}
                                {c.phone && (
                                    <p className="flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                                        {c.phone}
                                    </p>
                                )}
                                {c.email && (
                                    <p className="flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                                        {c.email}
                                    </p>
                                )}
                                {c.website && (
                                    <p className="flex items-center gap-1.5 text-blue-600">
                                        <Globe className="h-3.5 w-3.5" />
                                        {c.website}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 border-t border-slate-100 pt-3">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase">
                                Contacts ({c.contacts.length})
                            </p>
                            {c.contacts.length === 0 ? (
                                <p className="mt-1 text-[11px] text-slate-400">No contacts listed</p>
                            ) : (
                                <div className="mt-1.5 space-y-1.5">
                                    {c.contacts.map((ct) => (
                                        <div
                                            key={ct.id}
                                            className="flex items-center justify-between text-xs"
                                        >
                                            <div>
                                                <span className="font-medium text-slate-800">
                                                    {ct.name}
                                                </span>
                                                {ct.role_title && (
                                                    <span className="text-[11px] text-slate-500">
                                                        {' '}
                                                        • {ct.role_title}
                                                    </span>
                                                )}
                                            </div>
                                            {ct.is_decision_maker && (
                                                <UserCheck
                                                    className="h-3.5 w-3.5 text-emerald-600"
                                                    aria-label="Decision Maker"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </AppShell>
    );
}
