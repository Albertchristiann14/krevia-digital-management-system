import { CurrencyInput } from '@/Components/shared/CurrencyInput';
import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { formatRupiah } from '@/lib/utils';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

interface CompensationRow {
    id: string;
    compensation_no: string;
    compensation_type: string;
    amount: string;
    description: string;
    calculation_basis: string | null;
    approval_status: string;
    payment_status: string;
    payment_date: string | null;
    payment_reference: string | null;
    project?: { code: string; name: string } | null;
    task?: { code: string; title: string } | null;
}

interface ReimbursementRow {
    id: string;
    reimbursement_no: string;
    expense_date: string;
    category: string;
    description: string;
    amount: string;
    approval_status: string;
    payment_status: string;
    project?: { code: string; name: string } | null;
}

const formatIdr = formatRupiah;

export default function MyCompensations({
    compensations,
    reimbursements,
    projects,
    expenseCategories,
}: {
    compensations: CompensationRow[];
    reimbursements: ReimbursementRow[];
    projects: { id: number; code: string; name: string }[];
    expenseCategories: string[];
}) {
    const [tab, setTab] = useState<'compensations' | 'reimbursements'>('compensations');
    const form = useForm({
        expense_date: new Date().toISOString().slice(0, 10),
        category: expenseCategories[0] ?? 'Transportation',
        description: '',
        amount: '',
        project_id: '',
    });

    const submitReimbursement = (e: FormEvent) => {
        e.preventDefault();
        form.post('/finance/reimbursements', {
            preserveScroll: true,
            onSuccess: () => form.reset('description', 'amount'),
        });
    };

    return (
        <AppShell
            title="My Compensations & Reimbursements"
            subtitle="Personal fee history, project/task payouts, and reimbursement claims"
        >
            <Head title="My Compensations" />

            <div className="mb-4 flex gap-2 border-b border-slate-200 pb-3">
                <button
                    type="button"
                    onClick={() => setTab('compensations')}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                        tab === 'compensations' ? 'bg-[#101D35] text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                    }`}
                >
                    My Compensations ({compensations.length})
                </button>
                <button
                    type="button"
                    onClick={() => setTab('reimbursements')}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                        tab === 'reimbursements' ? 'bg-[#101D35] text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                    }`}
                >
                    My Reimbursements ({reimbursements.length})
                </button>
            </div>

            {tab === 'compensations' ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
                            <tr>
                                <th className="px-4 py-3">Number</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Project / Task</th>
                                <th className="px-4 py-3">Amount</th>
                                <th className="px-4 py-3">Approval</th>
                                <th className="px-4 py-3">Payment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {compensations.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                                        No personal compensation records found.
                                    </td>
                                </tr>
                            )}
                            {compensations.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#101D35]">{c.compensation_no}</td>
                                    <td className="px-4 py-3 text-xs text-slate-700">
                                        <div className="font-medium">{c.compensation_type}</div>
                                        <div className="text-slate-500">{c.description}</div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-600">
                                        {c.project ? `${c.project.code} · ${c.project.name}` : 'General'}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-slate-900">{formatIdr(c.amount)}</td>
                                    <td className="px-4 py-3"><StatusBadge label={c.approval_status} /></td>
                                    <td className="px-4 py-3 text-xs">
                                        <StatusBadge label={c.payment_status} />
                                        {c.payment_date && <div className="mt-1 text-[11px] text-slate-500">{c.payment_date}</div>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                    <form onSubmit={submitReimbursement} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                        <h3 className="text-sm font-semibold text-[#101D35]">Submit Reimbursement Claim</h3>
                        <div>
                            <label className="block text-xs font-medium text-slate-600">Expense Date</label>
                            <input type="date" value={form.data.expense_date} onChange={(e) => form.setData('expense_date', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600">Category</label>
                            <select value={form.data.category} onChange={(e) => form.setData('category', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                                {expenseCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600">Project (Optional)</label>
                            <select value={form.data.project_id} onChange={(e) => form.setData('project_id', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                                <option value="">— Operational / Non-Project —</option>
                                {projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600">Amount (Rp)</label>
                            <CurrencyInput value={form.data.amount} onChange={(val) => form.setData('amount', val)} className="mt-1" required />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600">Description</label>
                            <textarea rows={2} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
                        </div>
                        <button type="submit" disabled={form.processing} className="w-full rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a2c4e] disabled:opacity-50">
                            Submit for Founder Approval
                        </button>
                    </form>

                    <div className="lg:col-span-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
                                <tr>
                                    <th className="px-4 py-3">Claim No</th>
                                    <th className="px-4 py-3">Date & Category</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3">Approval</th>
                                    <th className="px-4 py-3">Payment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {reimbursements.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500">No reimbursement claims submitted yet.</td>
                                    </tr>
                                )}
                                {reimbursements.map((r) => (
                                    <tr key={r.id}>
                                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#101D35]">{r.reimbursement_no}</td>
                                        <td className="px-4 py-3 text-xs">
                                            <div className="font-medium text-slate-800">{r.category} ({r.expense_date})</div>
                                            <div className="text-slate-500">{r.description}</div>
                                        </td>
                                        <td className="px-4 py-3 font-semibold">{formatIdr(r.amount)}</td>
                                        <td className="px-4 py-3"><StatusBadge label={r.approval_status} /></td>
                                        <td className="px-4 py-3"><StatusBadge label={r.payment_status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
