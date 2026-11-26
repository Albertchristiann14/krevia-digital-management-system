import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { cn, formatRupiah, formatShortDate } from '@/lib/utils';
import type { PageProps } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    CheckCircle2,
    Download,
    FileText,
    Lock,
    Plus,
    Receipt,
    Wallet,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface BudgetRow {
    id: number;
    fiscal_year: number;
    category: string;
    pic_user_id: number | null;
    pic_name: string | null;
    assumptions: string | null;
    target_amount: number | null;
    actual_spent: number;
    variance: number | null;
    utilization_pct: number | null;
    data_status: string;
    notes: string | null;
}

interface InvoiceRow {
    id: number;
    invoice_no: string;
    company_name: string | null;
    project_code: string | null;
    description: string;
    issue_date: string | null;
    due_date: string | null;
    amount: number;
    paid_amount: number;
    remaining: number;
    status: string;
    payments: {
        id: number;
        amount: number;
        paid_at: string | null;
        payment_method: string;
        reference_no: string | null;
        recorder: string | null;
    }[];
}

interface TransactionRow {
    id: number;
    code: string;
    transaction_date: string | null;
    period_month: string;
    type: string;
    description: string;
    category: string;
    amount: number;
    pic_name: string | null;
    company_name: string | null;
    invoice_no: string | null;
    reference: string | null;
    has_evidence: boolean;
}

interface FinanceIndexProps extends PageProps {
    summary: {
        opening_cash_balance: number | null;
        opening_cash_date: string;
        opening_cash_status: string;
        total_budget_target: number | null;
        confirmed_budget_count: number;
        pending_budget_count: number;
        revenue_received: number;
        total_expenses: number;
        total_invoiced: number;
        receivables: number;
        cash_balance: number;
        pipeline_estimate_total: number;
        pipeline_stages: {
            stage: string;
            count: number;
            estimated_total: number;
            note: string;
        }[];
    };
    monthlyCashflow: {
        period_month: string;
        label: string;
        income: number;
        expense: number;
        net: number;
        cumulative_balance: number;
    }[];
    budgets: BudgetRow[];
    invoices: InvoiceRow[];
    transactions: TransactionRow[];
    companies: { id: number; name: string }[];
    projects: { id: number; code: string; name: string; company_id: number }[];
    users: { id: number; name: string }[];
    categories: string[];
    canManage: boolean;
}

function formatRp(val: number | null | undefined): string {
    if (val === null || val === undefined) return 'Perlu Konfirmasi Manajemen';
    return formatRupiah(val);
}

export default function FinanceIndex({
    summary,
    monthlyCashflow,
    budgets,
    invoices,
    transactions,
    companies,
    projects,
    users,
    categories,
    canManage,
    errors,
}: FinanceIndexProps) {
    const [tab, setTab] = useState<'overview' | 'budgets' | 'invoices' | 'ledger'>('overview');
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showTrxModal, setShowTrxModal] = useState(false);
    const [payingInvoice, setPayingInvoice] = useState<InvoiceRow | null>(null);
    const [editingBudget, setEditingBudget] = useState<BudgetRow | null>(null);

    const settingForm = useForm({
        opening_cash_balance:
            summary.opening_cash_balance !== null ? String(summary.opening_cash_balance) : '',
        opening_cash_date: summary.opening_cash_date,
        data_status: summary.opening_cash_status,
        notes: '',
    });

    const budgetForm = useForm({
        target_amount: '',
        pic_user_id: '',
        assumptions: '',
        data_status: 'Disepakati',
        notes: '',
    });

    const invoiceForm = useForm({
        company_id: companies[0]?.id ? String(companies[0].id) : '',
        project_id: '',
        description: '',
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        amount: '',
        status: 'Sent',
        notes: '',
    });

    const paymentForm = useForm<{
        amount: string;
        paid_at: string;
        payment_method: string;
        reference_no: string;
        notes: string;
        receipt: File | null;
    }>({
        amount: '',
        paid_at: new Date().toISOString().slice(0, 10),
        payment_method: 'Bank Transfer',
        reference_no: '',
        notes: '',
        receipt: null,
    });

    const trxForm = useForm<{
        transaction_date: string;
        type: string;
        description: string;
        category: string;
        amount: string;
        pic_user_id: string;
        reference: string;
        notes: string;
        evidence: File | null;
    }>({
        transaction_date: new Date().toISOString().slice(0, 10),
        type: 'Pengeluaran',
        description: '',
        category: 'Infrastruktur',
        amount: '',
        pic_user_id: users[0]?.id ? String(users[0].id) : '',
        reference: '',
        notes: '',
        evidence: null,
    });

    const openBudgetEdit = (b: BudgetRow) => {
        setEditingBudget(b);
        budgetForm.setData({
            target_amount: b.target_amount !== null ? String(b.target_amount) : '',
            pic_user_id: b.pic_user_id ? String(b.pic_user_id) : '',
            assumptions: b.assumptions ?? '',
            data_status: b.data_status,
            notes: b.notes ?? '',
        });
    };

    const openPaymentModal = (inv: InvoiceRow) => {
        setPayingInvoice(inv);
        paymentForm.setData({
            amount: String(inv.remaining),
            paid_at: new Date().toISOString().slice(0, 10),
            payment_method: 'Bank Transfer',
            reference_no: '',
            notes: '',
            receipt: null,
        });
    };

    const submitSetting = (e: FormEvent) => {
        e.preventDefault();
        settingForm.patch('/finance/settings');
    };

    const errorList = Object.values(errors ?? {});

    return (
        <AppShell
            title="Financial Tracker & Cashflow"
            subtitle="Sheet 13 ledger • Revenue received strictly separated from pipeline estimates • Write access restricted to Albert & Farizy (D-05)"
            actions={
                canManage ? (
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setShowInvoiceModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#101D35] hover:bg-slate-50"
                        >
                            <FileText className="h-4 w-4" />
                            New Invoice
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowTrxModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#101D35] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#192c4e]"
                        >
                            <Plus className="h-4 w-4" />
                            Record Transaction
                        </button>
                    </div>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                        <Lock className="h-3.5 w-3.5" />
                        Read-Only Access (Write restricted to Albert & Farizy)
                    </span>
                )
            }
        >
            <Head title="Financial Tracker — KDMS" />

            {errorList.length > 0 && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                    {errorList.map((m, idx) => (
                        <div key={idx}>{m}</div>
                    ))}
                </div>
            )}

            {/* Top Financial KPIs */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-[#101D35] p-4 text-white">
                    <p className="text-[11px] font-medium text-slate-300">Net Cash Balance</p>
                    <p className="mt-1 text-lg font-bold">{formatRp(summary.cash_balance)}</p>
                    <p className="mt-1 text-[10px] text-slate-300">
                        Opening:{' '}
                        {summary.opening_cash_balance !== null
                            ? formatRp(summary.opening_cash_balance)
                            : 'Pending Confirmation (D-12)'}
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-medium text-slate-500">Revenue Received</p>
                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="mt-1 text-lg font-bold text-emerald-700">
                        {formatRp(summary.revenue_received)}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">From Transaction Ledger only</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-medium text-slate-500">Total Expenses</p>
                        <ArrowDownRight className="h-4 w-4 text-rose-600" />
                    </div>
                    <p className="mt-1 text-lg font-bold text-rose-700">
                        {formatRp(summary.total_expenses)}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">Actual operating outflows</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] font-medium text-slate-500">Receivables (Piutang)</p>
                    <p className="mt-1 text-lg font-bold text-[#101D35]">
                        {formatRp(summary.receivables)}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                        Invoiced: {formatRp(summary.total_invoiced)}
                    </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                    <p className="text-[11px] font-semibold text-amber-800">
                        Pipeline Estimate (BUKAN Pendapatan)
                    </p>
                    <p className="mt-1 text-lg font-bold text-amber-900">
                        {formatRp(summary.pipeline_estimate_total)}
                    </p>
                    <p className="mt-1 text-[10px] text-amber-700">
                        Proposal + Negotiation (Sheet 08)
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="mt-5 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5">
                {(
                    [
                        ['overview', 'Cashflow & Pipeline Separation'],
                        ['budgets', `2027 Budgets (${budgets.length})`],
                        ['invoices', `Invoices (${invoices.length})`],
                        ['ledger', `Transaction Ledger (${transactions.length})`],
                    ] as const
                ).map(([k, label]) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => setTab(k)}
                        className={cn(
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                            tab === k
                                ? 'bg-[#101D35] text-white'
                                : 'text-slate-600 hover:bg-slate-100',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'overview' && (
                <div className="mt-4 space-y-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
                            <h3 className="text-sm font-bold text-[#101D35]">
                                Monthly Cashflow (Dec 2026 – Dec 2027)
                            </h3>
                            <div className="mt-4 h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyCashflow}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Bar dataKey="income" name="Income" fill="#16a34a" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="expense" name="Expenses" fill="#e11d48" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-xl border border-slate-200 bg-white p-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-[#101D35] uppercase">
                                        Opening Cash Balance (D-12)
                                    </h3>
                                    <StatusBadge label={summary.opening_cash_status} />
                                </div>
                                {canManage ? (
                                    <form onSubmit={submitSetting} className="mt-3 space-y-2.5">
                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-600">
                                                Saldo Awal Kas per {summary.opening_cash_date} (IDR)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                required
                                                value={settingForm.data.opening_cash_balance}
                                                onChange={(e) =>
                                                    settingForm.setData(
                                                        'opening_cash_balance',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Enter confirmed opening cash..."
                                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                                            />
                                        </div>
                                        <select
                                            value={settingForm.data.data_status}
                                            onChange={(e) =>
                                                settingForm.setData('data_status', e.target.value)
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                                        >
                                            <option value="Disepakati">Disepakati</option>
                                            <option value="Perlu Konfirmasi Manajemen">
                                                Perlu Konfirmasi Manajemen
                                            </option>
                                        </select>
                                        <button
                                            type="submit"
                                            className="w-full rounded-lg bg-[#101D35] py-1.5 text-xs font-semibold text-white"
                                        >
                                            Confirm Opening Balance
                                        </button>
                                    </form>
                                ) : (
                                    <p className="mt-3 text-xs text-slate-600">
                                        {summary.opening_cash_balance !== null
                                            ? formatRp(summary.opening_cash_balance)
                                            : 'Awaiting confirmation from Albert & Farizy.'}
                                    </p>
                                )}
                            </div>

                            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
                                <h3 className="text-xs font-bold text-amber-900 uppercase">
                                    Section F · Pipeline Estimates (Non-Revenue)
                                </h3>
                                <div className="mt-3 space-y-2">
                                    {summary.pipeline_stages.map((st) => (
                                        <div
                                            key={st.stage}
                                            className="rounded-lg border border-amber-200/70 bg-white p-2.5 text-xs"
                                        >
                                            <div className="flex items-center justify-between font-bold text-[#101D35]">
                                                <span>
                                                    {st.stage} ({st.count})
                                                </span>
                                                <span>{formatRp(st.estimated_total)}</span>
                                            </div>
                                            <p className="mt-0.5 text-[10px] text-slate-500">
                                                {st.note}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'budgets' && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                            <tr>
                                <th className="px-4 py-3">Category (2027)</th>
                                <th className="px-4 py-3">PIC</th>
                                <th className="px-4 py-3">Assumptions</th>
                                <th className="px-4 py-3">Target Budget</th>
                                <th className="px-4 py-3">Actual Spent</th>
                                <th className="px-4 py-3">Status</th>
                                {canManage && <th className="px-4 py-3 text-right">Edit</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {budgets.map((b) => (
                                <tr key={b.id}>
                                    <td className="px-4 py-3 font-bold text-[#101D35]">
                                        {b.category}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{b.pic_name}</td>
                                    <td className="px-4 py-3 text-slate-500">{b.assumptions}</td>
                                    <td className="px-4 py-3 font-semibold text-[#101D35]">
                                        {b.target_amount !== null ? (
                                            formatRp(b.target_amount)
                                        ) : (
                                            <span className="text-amber-700">Unconfirmed (D-12)</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-rose-700">
                                        {formatRp(b.actual_spent)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge label={b.data_status} />
                                    </td>
                                    {canManage && (
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => openBudgetEdit(b)}
                                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-[#101D35] hover:bg-slate-50"
                                            >
                                                Edit Target
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'invoices' && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                            <tr>
                                <th className="px-4 py-3">Invoice</th>
                                <th className="px-4 py-3">Client & Description</th>
                                <th className="px-4 py-3">Due Date</th>
                                <th className="px-4 py-3">Total</th>
                                <th className="px-4 py-3">Paid / Remaining</th>
                                <th className="px-4 py-3">Status</th>
                                {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td className="px-4 py-3 font-mono font-bold text-[#101D35]">
                                        {inv.invoice_no}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-slate-900">
                                            {inv.company_name}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            {inv.description}{' '}
                                            {inv.project_code ? `(${inv.project_code})` : ''}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {formatShortDate(inv.due_date)}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-[#101D35]">
                                        {formatRp(inv.amount)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-emerald-700">
                                            Paid: {formatRp(inv.paid_amount)}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            Rem: {formatRp(inv.remaining)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge label={inv.status} />
                                    </td>
                                    {canManage && (
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                {inv.remaining > 0 && inv.status !== 'Void' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openPaymentModal(inv)}
                                                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                                                    >
                                                        Record Payment
                                                    </button>
                                                )}
                                                {inv.paid_amount === 0 && inv.status !== 'Void' && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.post(
                                                                `/finance/invoices/${inv.id}/void`,
                                                            )
                                                        }
                                                        className="rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                                                    >
                                                        Void
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={canManage ? 7 : 6}
                                        className="px-4 py-10 text-center text-slate-400"
                                    >
                                        No invoices issued yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'ledger' && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                            <tr>
                                <th className="px-4 py-3">Code & Date</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Category & Description</th>
                                <th className="px-4 py-3">PIC / Ref</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                                <th className="px-4 py-3 text-right">Evidence</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions.map((t) => (
                                <tr key={t.id}>
                                    <td className="px-4 py-3">
                                        <div className="font-mono font-bold text-[#101D35]">
                                            {t.code}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            {formatShortDate(t.transaction_date)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={cn(
                                                'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                                                t.type === 'Pendapatan diterima'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-rose-50 text-rose-700',
                                            )}
                                        >
                                            {t.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-slate-800">
                                            {t.description}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            {t.category}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {t.pic_name} {t.reference ? `• ${t.reference}` : ''}
                                    </td>
                                    <td
                                        className={cn(
                                            'px-4 py-3 text-right font-bold',
                                            t.type === 'Pendapatan diterima'
                                                ? 'text-emerald-700'
                                                : 'text-rose-700',
                                        )}
                                    >
                                        {formatRp(t.amount)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {t.has_evidence && (
                                            <a
                                                href={`/finance/transactions/${t.id}/evidence`}
                                                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                File
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                                        No transactions logged yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modals */}
            {showInvoiceModal && canManage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-[#101D35]">Issue New Invoice</h2>
                            <button
                                type="button"
                                onClick={() => setShowInvoiceModal(false)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                invoiceForm.post('/finance/invoices', {
                                    onSuccess: () => {
                                        invoiceForm.reset('description', 'amount', 'notes');
                                        setShowInvoiceModal(false);
                                    },
                                });
                            }}
                            className="mt-4 space-y-3"
                        >
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Client Company *
                                </label>
                                <select
                                    value={invoiceForm.data.company_id}
                                    onChange={(e) =>
                                        invoiceForm.setData('company_id', e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    {companies.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Linked Project (Optional)
                                </label>
                                <select
                                    value={invoiceForm.data.project_id}
                                    onChange={(e) =>
                                        invoiceForm.setData('project_id', e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    <option value="">None</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.code} — {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Description *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={invoiceForm.data.description}
                                    onChange={(e) =>
                                        invoiceForm.setData('description', e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Issue Date
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={invoiceForm.data.issue_date}
                                        onChange={(e) =>
                                            invoiceForm.setData('issue_date', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={invoiceForm.data.due_date}
                                        onChange={(e) =>
                                            invoiceForm.setData('due_date', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Amount (IDR) *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={invoiceForm.data.amount}
                                        onChange={(e) =>
                                            invoiceForm.setData('amount', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Status
                                    </label>
                                    <select
                                        value={invoiceForm.data.status}
                                        onChange={(e) =>
                                            invoiceForm.setData('status', e.target.value)
                                        }
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        <option value="Sent">Sent</option>
                                        <option value="Draft">Draft</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowInvoiceModal(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Create Invoice
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {payingInvoice && canManage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-[#101D35]">
                                Record Payment — {payingInvoice.invoice_no}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setPayingInvoice(null)}
                                className="rounded p-1 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                            Atomically creates a &ldquo;Pendapatan diterima&rdquo; entry in the Transaction Ledger and updates invoice status.
                        </p>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                paymentForm.post(`/finance/invoices/${payingInvoice.id}/payments`, {
                                    forceFormData: true,
                                    onSuccess: () => setPayingInvoice(null),
                                });
                            }}
                            className="mt-3 space-y-3"
                        >
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Amount Received (Max {formatRp(payingInvoice.remaining)}) *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    required
                                    value={paymentForm.data.amount}
                                    onChange={(e) => paymentForm.setData('amount', e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    required
                                    value={paymentForm.data.paid_at}
                                    onChange={(e) => paymentForm.setData('paid_at', e.target.value)}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                                <input
                                    type="text"
                                    required
                                    value={paymentForm.data.payment_method}
                                    onChange={(e) =>
                                        paymentForm.setData('payment_method', e.target.value)
                                    }
                                    placeholder="Bank Transfer"
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <input
                                type="text"
                                value={paymentForm.data.reference_no}
                                onChange={(e) =>
                                    paymentForm.setData('reference_no', e.target.value)
                                }
                                placeholder="Transfer reference number"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                            <input
                                type="file"
                                onChange={(e) =>
                                    paymentForm.setData('receipt', e.target.files?.[0] ?? null)
                                }
                                className="w-full text-[11px] text-slate-500"
                            />
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setPayingInvoice(null)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Record Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showTrxModal && canManage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-[#101D35]">
                                Record Transaction
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowTrxModal(false)}
                                className="rounded p-1 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                trxForm.post('/finance/transactions', {
                                    forceFormData: true,
                                    onSuccess: () => {
                                        trxForm.reset('description', 'amount', 'reference', 'notes', 'evidence');
                                        setShowTrxModal(false);
                                    },
                                });
                            }}
                            className="mt-4 space-y-3"
                        >
                            <div className="grid grid-cols-2 gap-3">
                                <select
                                    value={trxForm.data.type}
                                    onChange={(e) => trxForm.setData('type', e.target.value)}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                                >
                                    <option value="Pengeluaran">Pengeluaran (Expense)</option>
                                    <option value="Pendapatan diterima">
                                        Pendapatan diterima (Income)
                                    </option>
                                </select>
                                <select
                                    value={trxForm.data.category}
                                    onChange={(e) => trxForm.setData('category', e.target.value)}
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                >
                                    {categories.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <input
                                type="text"
                                required
                                value={trxForm.data.description}
                                onChange={(e) => trxForm.setData('description', e.target.value)}
                                placeholder="Transaction description"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    required
                                    value={trxForm.data.amount}
                                    onChange={(e) => trxForm.setData('amount', e.target.value)}
                                    placeholder="Nominal (IDR)"
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                                <input
                                    type="date"
                                    required
                                    value={trxForm.data.transaction_date}
                                    onChange={(e) =>
                                        trxForm.setData('transaction_date', e.target.value)
                                    }
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <input
                                type="file"
                                onChange={(e) =>
                                    trxForm.setData('evidence', e.target.files?.[0] ?? null)
                                }
                                className="w-full text-[11px] text-slate-500"
                            />
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowTrxModal(false)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Save Transaction
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingBudget && canManage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-[#101D35]">
                                Edit 2027 Budget — {editingBudget.category}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setEditingBudget(null)}
                                className="rounded p-1 text-slate-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                budgetForm.patch(`/finance/budgets/${editingBudget.id}`, {
                                    onSuccess: () => setEditingBudget(null),
                                });
                            }}
                            className="mt-4 space-y-3"
                        >
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Target Budget 2027 (IDR)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={budgetForm.data.target_amount}
                                    onChange={(e) =>
                                        budgetForm.setData('target_amount', e.target.value)
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                />
                            </div>
                            <select
                                value={budgetForm.data.data_status}
                                onChange={(e) => budgetForm.setData('data_status', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            >
                                <option value="Disepakati">Disepakati</option>
                                <option value="Usulan">Usulan</option>
                                <option value="Perlu Konfirmasi Manajemen">
                                    Perlu Konfirmasi Manajemen
                                </option>
                            </select>
                            <textarea
                                rows={2}
                                value={budgetForm.data.assumptions}
                                onChange={(e) => budgetForm.setData('assumptions', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                            />
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingBudget(null)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white"
                                >
                                    Update Budget
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
