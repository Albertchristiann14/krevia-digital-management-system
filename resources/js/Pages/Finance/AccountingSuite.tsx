import { CurrencyInput } from '@/Components/shared/CurrencyInput';
import { StatCard } from '@/Components/shared/StatCard';
import { StatusBadge } from '@/Components/shared/StatusBadge';
import { AppShell } from '@/Layouts/AppShell';
import { formatRupiah } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import { DollarSign, Receipt, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { FormEvent, useState } from 'react';

const formatIdr = formatRupiah;

type TabKey = 'statements' | 'journals' | 'ledger' | 'approvals' | 'operations' | 'projects' | 'settings';

export default function AccountingSuite(props: any) {
    const [tab, setTab] = useState<TabKey>('statements');
    const {
        accounts = [],
        periods = [],
        journals = [],
        cashAccounts = [],
        transfers = [],
        approvals = [],
        expenses = [],
        compensations = [],
        subscriptionPlans = [],
        subscriptions = [],
        taxes = [],
        projectFinancials = [],
        trialBalance,
        generalLedger,
        profitAndLoss,
        balanceSheet,
        cashFlow,
        arAging,
        apAging,
        companies = [],
        users = [],
        expenseCategories = [],
        compensationTypes = [],
        canManage = false,
        isFounder = false,
        filters = {},
    } = props;

    // Forms
    const journalForm = useForm({
        journal_date: new Date().toISOString().slice(0, 10),
        journal_type: 'General',
        description: '',
        post_immediately: true,
        lines: [
            { account_id: accounts.find((a: any) => a.is_posting)?.id ?? '', description: '', debit: '', credit: '' },
            { account_id: accounts.filter((a: any) => a.is_posting)[1]?.id ?? '', description: '', debit: '', credit: '' },
        ],
    });

    const transferForm = useForm({
        from_cash_account_id: cashAccounts[0]?.id ?? '',
        to_cash_account_id: cashAccounts[1]?.id ?? '',
        transfer_date: new Date().toISOString().slice(0, 10),
        amount: '',
        reference_no: '',
        notes: '',
    });

    const expenseForm = useForm({
        expense_date: new Date().toISOString().slice(0, 10),
        category: expenseCategories[0] ?? 'Infrastructure & Hosting',
        description: '',
        amount: '',
        project_id: '',
    });

    const compForm = useForm({
        user_id: users[0]?.id ?? '',
        project_id: '',
        compensation_type: compensationTypes[0] ?? 'Project-Based Fee',
        amount: '',
        description: '',
        calculation_basis: '',
    });

    const subForm = useForm({
        company_id: companies[0]?.id ?? '',
        plan_id: subscriptionPlans[0]?.id ?? '',
        project_id: '',
        start_date: new Date().toISOString().slice(0, 10),
    });

    const submitJournal = (e: FormEvent) => {
        e.preventDefault();
        journalForm.post('/finance/journals', { preserveScroll: true });
    };

    const submitTransfer = (e: FormEvent) => {
        e.preventDefault();
        transferForm.post('/finance/transfers', { preserveScroll: true, onSuccess: () => transferForm.reset('amount', 'reference_no', 'notes') });
    };

    const submitExpense = (e: FormEvent) => {
        e.preventDefault();
        expenseForm.post('/finance/expenses', { preserveScroll: true, onSuccess: () => expenseForm.reset('description', 'amount') });
    };

    const submitComp = (e: FormEvent) => {
        e.preventDefault();
        compForm.post('/finance/compensations', { preserveScroll: true, onSuccess: () => compForm.reset('description', 'amount', 'calculation_basis') });
    };

    const submitSub = (e: FormEvent) => {
        e.preventDefault();
        subForm.post('/finance/subscriptions', { preserveScroll: true });
    };

    const handleApproval = (id: string, action: 'approve' | 'reject') => {
        const reason = window.prompt(action === 'approve' ? 'Approval note (optional):' : 'Rejection reason (required):');
        if (action === 'reject' && (!reason || !reason.trim())) return;
        router.post(`/finance/approvals/${id}/${action}`, { reason: reason ?? '' }, { preserveScroll: true });
    };

    const totalCash = cashAccounts.reduce((acc: number, c: any) => acc + Number(c.current_balance || 0), 0);
    const pendingCount = approvals.filter((a: any) => a.status === 'Pending Approval').length;

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'statements', label: 'Financial Statements' },
        { key: 'journals', label: `Journals (${journals.length})` },
        { key: 'ledger', label: 'General Ledger & Trial Balance' },
        { key: 'approvals', label: `Approval Inbox (${pendingCount})` },
        { key: 'operations', label: 'Expenses, Bank & Transfers' },
        { key: 'projects', label: 'Projects, Subscriptions & Comp' },
        { key: 'settings', label: 'CoA, Periods & Taxes' },
    ];

    return (
        <AppShell
            title="Accounting & Finance Suite"
            subtitle="Double-entry accrual accounting, statements, Founder approvals, project finance & recurring billing"
        >
            <Head title="Accounting & Finance Suite" />

            {/* Executive KPI Row */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard label="Cash & Bank" value={formatIdr(totalCash)} icon={Wallet} accent="navy" />
                <StatCard label="Revenue (Accrual)" value={formatIdr(profitAndLoss?.total_revenue)} icon={TrendingUp} accent="green" />
                <StatCard label="Net Profit" value={formatIdr(profitAndLoss?.net_profit)} icon={DollarSign} accent="blue" />
                <StatCard label="Accounts Receivable" value={formatIdr(arAging?.total_receivable)} icon={Receipt} accent="amber" />
                <StatCard
                    label="Pending Approvals"
                    value={String(pendingCount)}
                    subtitle={isFounder ? 'Founder Action Required' : 'Awaiting Founder'}
                    icon={ShieldCheck}
                    accent={pendingCount > 0 ? 'red' : 'navy'}
                />
            </div>

            {/* Sub-navigation Tabs */}
            <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => setTab(t.key)}
                        className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                            tab === t.key ? 'bg-[#101D35] text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* TAB 1: FINANCIAL STATEMENTS */}
            {tab === 'statements' && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                        <h3 className="mb-3 text-sm font-bold text-[#101D35]">Profit & Loss Statement (Accrual)</h3>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between font-semibold text-slate-700"><span>Total Revenue</span><span>{formatIdr(profitAndLoss?.total_revenue)}</span></div>
                            <div className="flex justify-between text-slate-600"><span>Cost of Services</span><span>({formatIdr(profitAndLoss?.total_cost_of_services)})</span></div>
                            <div className="flex justify-between border-t border-slate-100 pt-1.5 font-semibold text-slate-800"><span>Gross Profit</span><span>{formatIdr(profitAndLoss?.gross_profit)}</span></div>
                            <div className="flex justify-between text-slate-600"><span>Operating Expenses</span><span>({formatIdr(profitAndLoss?.total_operating_expenses)})</span></div>
                            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-[#101D35]"><span>Net Profit</span><span>{formatIdr(profitAndLoss?.net_profit)}</span></div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-[#101D35]">Balance Sheet</h3>
                            <StatusBadge label={balanceSheet?.is_balanced ? 'Balanced' : 'Unbalanced'} tone={balanceSheet?.is_balanced ? 'green' : 'red'} />
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between font-semibold text-slate-800"><span>Total Assets</span><span>{formatIdr(balanceSheet?.total_assets)}</span></div>
                            <div className="flex justify-between text-slate-600"><span>Total Liabilities</span><span>{formatIdr(balanceSheet?.total_liabilities)}</span></div>
                            <div className="flex justify-between text-slate-600"><span>Total Equity (incl. Current Earnings)</span><span>{formatIdr(balanceSheet?.total_equity)}</span></div>
                            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-[#101D35]">
                                <span>Total Liabilities + Equity</span>
                                <span>{formatIdr(balanceSheet?.total_liabilities_and_equity)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                        <h3 className="mb-3 text-sm font-bold text-[#101D35]">Cash Flow Statement</h3>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between text-slate-700"><span>Operating Activities</span><span>{formatIdr(cashFlow?.operating_activities)}</span></div>
                            <div className="flex justify-between text-slate-700"><span>Investing Activities</span><span>{formatIdr(cashFlow?.investing_activities)}</span></div>
                            <div className="flex justify-between text-slate-700"><span>Financing Activities</span><span>{formatIdr(cashFlow?.financing_activities)}</span></div>
                            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-[#101D35]"><span>Net Cash Change</span><span>{formatIdr(cashFlow?.net_cash_change)}</span></div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                        <h3 className="mb-3 text-sm font-bold text-[#101D35]">AR & AP Aging Summary</h3>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <p className="mb-1.5 font-semibold text-slate-700">Accounts Receivable</p>
                                {Object.entries(arAging?.buckets ?? {}).map(([b, v]: any) => (
                                    <div key={b} className="flex justify-between py-0.5 text-slate-600"><span>{b}</span><span>{formatIdr(v)}</span></div>
                                ))}
                            </div>
                            <div>
                                <p className="mb-1.5 font-semibold text-slate-700">Accounts Payable</p>
                                {Object.entries(apAging?.buckets ?? {}).map(([b, v]: any) => (
                                    <div key={b} className="flex justify-between py-0.5 text-slate-600"><span>{b}</span><span>{formatIdr(v)}</span></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: JOURNALS */}
            {tab === 'journals' && (
                <div className="grid gap-6 lg:grid-cols-3">
                    {canManage && (
                        <form onSubmit={submitJournal} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                            <h3 className="text-sm font-bold text-[#101D35]">Create Double-Entry Journal</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="date" value={journalForm.data.journal_date} onChange={(e) => journalForm.setData('journal_date', e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs" required />
                                <select value={journalForm.data.journal_type} onChange={(e) => journalForm.setData('journal_type', e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
                                    <option value="General">General</option>
                                    <option value="Adjusting">Adjusting (Founder)</option>
                                </select>
                            </div>
                            <input type="text" placeholder="Description" value={journalForm.data.description} onChange={(e) => journalForm.setData('description', e.target.value)} className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs" required />
                            {journalForm.data.lines.map((line, i) => (
                                <div key={i} className="rounded-lg bg-slate-50 p-2.5 space-y-1.5">
                                    <select
                                        value={line.account_id}
                                        onChange={(e) => {
                                            const next = [...journalForm.data.lines];
                                            next[i].account_id = e.target.value;
                                            journalForm.setData('lines', next);
                                        }}
                                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                                    >
                                        {accounts.filter((a: any) => a.is_posting).map((a: any) => (
                                            <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                                        ))}
                                    </select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <CurrencyInput placeholder="Debit" value={line.debit} onChange={(val) => { const next = [...journalForm.data.lines]; next[i].debit = val; journalForm.setData('lines', next); }} />
                                        <CurrencyInput placeholder="Credit" value={line.credit} onChange={(val) => { const next = [...journalForm.data.lines]; next[i].credit = val; journalForm.setData('lines', next); }} />
                                    </div>
                                </div>
                            ))}
                            <button type="submit" disabled={journalForm.processing} className="w-full rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a2c4e]">
                                Save & Post Balanced Journal
                            </button>
                        </form>
                    )}

                    <div className={`${canManage ? 'lg:col-span-2' : 'lg:col-span-3'} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs`}>
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50 text-left font-semibold text-slate-600">
                                <tr>
                                    <th className="px-4 py-3">Journal No</th>
                                    <th className="px-4 py-3">Date & Description</th>
                                    <th className="px-4 py-3">Debit / Credit</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {journals.map((j: any) => (
                                    <tr key={j.id}>
                                        <td className="px-4 py-3 font-mono font-semibold text-[#101D35]">{j.journal_no}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-800">{j.description}</div>
                                            <div className="text-[11px] text-slate-500">{j.journal_date} · {j.journal_type}</div>
                                        </td>
                                        <td className="px-4 py-3 font-mono">{formatIdr(j.total_debit)}</td>
                                        <td className="px-4 py-3"><StatusBadge label={j.status} /></td>
                                        <td className="px-4 py-3">
                                            {canManage && j.status === 'Posted' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const reason = window.prompt('Reversal reason:');
                                                        if (reason) router.post(`/finance/journals/${j.id}/reverse`, { reason });
                                                    }}
                                                    className="rounded bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                                                >
                                                    Reverse
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: GENERAL LEDGER & TRIAL BALANCE */}
            {tab === 'ledger' && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                        <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-[#101D35]">Trial Balance</h3>
                            <span className="text-xs font-semibold text-slate-600">Diff: {formatIdr(trialBalance?.difference)}</span>
                        </div>
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50 text-left font-semibold text-slate-600">
                                <tr>
                                    <th className="px-4 py-2.5">Account</th>
                                    <th className="px-4 py-2.5 text-right">Debit</th>
                                    <th className="px-4 py-2.5 text-right">Credit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(trialBalance?.rows ?? []).map((r: any) => (
                                    <tr key={r.account_id}>
                                        <td className="px-4 py-2 font-medium text-slate-800">{r.code} — {r.name}</td>
                                        <td className="px-4 py-2 text-right font-mono">{r.debit_balance > 0 ? formatIdr(r.debit_balance) : '—'}</td>
                                        <td className="px-4 py-2 text-right font-mono">{r.credit_balance > 0 ? formatIdr(r.credit_balance) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 font-bold text-[#101D35]">
                                <tr>
                                    <td className="px-4 py-2.5">Total</td>
                                    <td className="px-4 py-2.5 text-right font-mono">{formatIdr(trialBalance?.total_debit)}</td>
                                    <td className="px-4 py-2.5 text-right font-mono">{formatIdr(trialBalance?.total_credit)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                        <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-[#101D35]">General Ledger</h3>
                            <select
                                value={filters.account_id}
                                onChange={(e) => router.get('/finance/suite', { account_id: e.target.value }, { preserveState: true })}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs"
                            >
                                {accounts.filter((a: any) => a.is_posting).map((a: any) => (
                                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                                ))}
                            </select>
                        </div>
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50 text-left font-semibold text-slate-600">
                                <tr>
                                    <th className="px-4 py-2.5">Journal & Date</th>
                                    <th className="px-4 py-2.5 text-right">Debit</th>
                                    <th className="px-4 py-2.5 text-right">Credit</th>
                                    <th className="px-4 py-2.5 text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(generalLedger?.entries ?? []).map((e: any) => (
                                    <tr key={e.id}>
                                        <td className="px-4 py-2">
                                            <div className="font-mono font-semibold text-[#101D35]">{e.journal_no}</div>
                                            <div className="text-[11px] text-slate-500">{e.journal_date} · {e.description}</div>
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono">{e.debit > 0 ? formatIdr(e.debit) : '—'}</td>
                                        <td className="px-4 py-2 text-right font-mono">{e.credit > 0 ? formatIdr(e.credit) : '—'}</td>
                                        <td className="px-4 py-2 text-right font-mono font-semibold">{formatIdr(e.running_balance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 4: APPROVAL INBOX */}
            {tab === 'approvals' && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50 text-left font-semibold text-slate-600">
                            <tr>
                                <th className="px-4 py-3">Request No</th>
                                <th className="px-4 py-3">Type & Summary</th>
                                <th className="px-4 py-3">Requester</th>
                                <th className="px-4 py-3">Amount</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Founder Decision</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {approvals.map((a: any) => (
                                <tr key={a.id}>
                                    <td className="px-4 py-3 font-mono font-semibold text-[#101D35]">{a.request_no}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-slate-800">{a.request_type}</div>
                                        <div className="text-slate-500">{a.summary}</div>
                                    </td>
                                    <td className="px-4 py-3">{a.requester?.name}</td>
                                    <td className="px-4 py-3 font-semibold">{formatIdr(a.amount)}</td>
                                    <td className="px-4 py-3"><StatusBadge label={a.status} /></td>
                                    <td className="px-4 py-3">
                                        {isFounder && a.status === 'Pending Approval' ? (
                                            <div className="flex gap-1.5">
                                                <button type="button" onClick={() => handleApproval(a.id, 'approve')} className="rounded bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700">Approve</button>
                                                <button type="button" onClick={() => handleApproval(a.id, 'reject')} className="rounded bg-rose-600 px-2.5 py-1 font-semibold text-white hover:bg-rose-700">Reject</button>
                                            </div>
                                        ) : (
                                            <span className="text-slate-500">{a.decider?.name ?? '—'}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB 5: OPERATIONS (EXPENSES, CASH & BANK TRANSFERS) */}
            {tab === 'operations' && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <form onSubmit={submitExpense} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                        <h3 className="text-sm font-bold text-[#101D35]">New Expense Request (Founder Approval)</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={expenseForm.data.expense_date} onChange={(e) => expenseForm.setData('expense_date', e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs" required />
                            <select value={expenseForm.data.category} onChange={(e) => expenseForm.setData('category', e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
                                {expenseCategories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <CurrencyInput placeholder="1.000.000" value={expenseForm.data.amount} onChange={(val) => expenseForm.setData('amount', val)} required />
                        <input type="text" placeholder="Purpose / Description" value={expenseForm.data.description} onChange={(e) => expenseForm.setData('description', e.target.value)} className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs" required />
                        <button type="submit" disabled={expenseForm.processing} className="w-full rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white">Submit Expense Request</button>
                    </form>

                    {canManage && (
                        <form onSubmit={submitTransfer} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                            <h3 className="text-sm font-bold text-[#101D35]">Internal Cash / Bank Transfer</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <select value={transferForm.data.from_cash_account_id} onChange={(e) => transferForm.setData('from_cash_account_id', e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
                                    {cashAccounts.map((c: any) => <option key={c.id} value={c.id}>From: {c.name}</option>)}
                                </select>
                                <select value={transferForm.data.to_cash_account_id} onChange={(e) => transferForm.setData('to_cash_account_id', e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
                                    {cashAccounts.map((c: any) => <option key={c.id} value={c.id}>To: {c.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="date" value={transferForm.data.transfer_date} onChange={(e) => transferForm.setData('transfer_date', e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs" required />
                                <CurrencyInput placeholder="1.000.000" value={transferForm.data.amount} onChange={(val) => transferForm.setData('amount', val)} required />
                            </div>
                            <button type="submit" disabled={transferForm.processing} className="w-full rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white">Record Internal Transfer</button>
                        </form>
                    )}

                    <div className="lg:col-span-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50 text-left font-semibold text-slate-600">
                                <tr>
                                    <th className="px-4 py-3">Expense No</th>
                                    <th className="px-4 py-3">Requester & Purpose</th>
                                    <th className="px-4 py-3">Total</th>
                                    <th className="px-4 py-3">Approval</th>
                                    <th className="px-4 py-3">Payment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {expenses.map((ex: any) => (
                                    <tr key={ex.id}>
                                        <td className="px-4 py-3 font-mono font-semibold text-[#101D35]">{ex.expense_no}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-800">{ex.description}</div>
                                            <div className="text-[11px] text-slate-500">{ex.requester?.name} · {ex.category}</div>
                                        </td>
                                        <td className="px-4 py-3 font-semibold">{formatIdr(ex.total_amount)}</td>
                                        <td className="px-4 py-3"><StatusBadge label={ex.approval_status} /></td>
                                        <td className="px-4 py-3">
                                            {canManage && ex.approval_status === 'Approved' && ex.payment_status === 'Unpaid' && cashAccounts[0] ? (
                                                <button type="button" onClick={() => router.post(`/finance/expenses/${ex.id}/pay`, { cash_account_id: cashAccounts[0].id })} className="rounded bg-[#101D35] px-2.5 py-1 font-semibold text-white">Pay Now</button>
                                            ) : (
                                                <StatusBadge label={ex.payment_status} />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 6: PROJECTS, SUBSCRIPTIONS & COMPENSATION */}
            {tab === 'projects' && (
                <div className="space-y-6">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                        <div className="border-b border-slate-200 px-5 py-3"><h3 className="text-sm font-bold text-[#101D35]">Project Financial Profitability</h3></div>
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50 text-left font-semibold text-slate-600">
                                <tr>
                                    <th className="px-4 py-2.5">Project</th>
                                    <th className="px-4 py-2.5 text-right">Invoiced</th>
                                    <th className="px-4 py-2.5 text-right">Received</th>
                                    <th className="px-4 py-2.5 text-right">Direct Cost</th>
                                    <th className="px-4 py-2.5 text-right">Gross Profit</th>
                                    <th className="px-4 py-2.5 text-right">Margin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {projectFinancials.map((pf: any) => (
                                    <tr key={pf.project_id}>
                                        <td className="px-4 py-2.5 font-medium text-slate-800">{pf.project_code} · {pf.project_name}</td>
                                        <td className="px-4 py-2.5 text-right font-mono">{formatIdr(pf.total_invoiced)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono">{formatIdr(pf.payments_received)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono">{formatIdr(pf.actual_direct_costs)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono font-semibold">{formatIdr(pf.gross_profit)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono">{pf.profit_margin_pct}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {canManage && (
                            <form onSubmit={submitComp} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                                <h3 className="text-sm font-bold text-[#101D35]">Record Flexible Team Compensation</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <select value={compForm.data.user_id} onChange={(e) => compForm.setData('user_id', e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
                                        {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                    <select value={compForm.data.compensation_type} onChange={(e) => compForm.setData('compensation_type', e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
                                        {compensationTypes.map((ct: string) => <option key={ct} value={ct}>{ct}</option>)}
                                    </select>
                                </div>
                                <CurrencyInput placeholder="1.000.000" value={compForm.data.amount} onChange={(val) => compForm.setData('amount', val)} required />
                                <input type="text" placeholder="Description" value={compForm.data.description} onChange={(e) => compForm.setData('description', e.target.value)} className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs" required />
                                <button type="submit" disabled={compForm.processing} className="w-full rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white">Submit Compensation</button>
                            </form>
                        )}

                        {canManage && (
                            <form onSubmit={submitSub} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                                <h3 className="text-sm font-bold text-[#101D35]">New Client Subscription</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <select value={subForm.data.company_id} onChange={(e) => subForm.setData('company_id', e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
                                        {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <select value={subForm.data.plan_id} onChange={(e) => subForm.setData('plan_id', e.target.value)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
                                        {subscriptionPlans.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({formatIdr(p.price)})</option>)}
                                    </select>
                                </div>
                                <input type="date" value={subForm.data.start_date} onChange={(e) => subForm.setData('start_date', e.target.value)} className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs" required />
                                <button type="submit" disabled={subForm.processing} className="w-full rounded-lg bg-[#101D35] px-4 py-2 text-xs font-semibold text-white">Activate Subscription</button>
                            </form>
                        )}
                    </div>

                    {/* Team Compensation List & Payouts */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                        <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-[#101D35]">Team Compensations & Payouts ({compensations.length})</h3>
                        </div>
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50 text-left font-semibold text-slate-600">
                                <tr>
                                    <th className="px-4 py-2.5">No</th>
                                    <th className="px-4 py-2.5">Member & Type</th>
                                    <th className="px-4 py-2.5">Amount</th>
                                    <th className="px-4 py-2.5">Approval</th>
                                    <th className="px-4 py-2.5">Payment Status</th>
                                    <th className="px-4 py-2.5">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {compensations.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-center text-slate-500">No compensation records yet.</td>
                                    </tr>
                                )}
                                {compensations.map((c: any) => (
                                    <tr key={c.id}>
                                        <td className="px-4 py-2.5 font-mono font-semibold text-[#101D35]">{c.compensation_no}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="font-semibold text-slate-800">{c.user?.name} · {c.compensation_type}</div>
                                            <div className="text-[11px] text-slate-500">{c.description}</div>
                                        </td>
                                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">{formatIdr(c.amount)}</td>
                                        <td className="px-4 py-2.5"><StatusBadge label={c.approval_status} /></td>
                                        <td className="px-4 py-2.5">
                                            <StatusBadge label={c.payment_status} tone={c.payment_status === 'Paid' ? 'green' : 'amber'} />
                                            {c.payment_date && <div className="mt-0.5 text-[11px] text-slate-500">{c.payment_date}</div>}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {canManage && c.approval_status === 'Approved' && c.payment_status === 'Unpaid' && cashAccounts[0] ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const ref = window.prompt('Payment reference / transfer note (optional):') ?? '';
                                                        router.post(`/finance/compensations/${c.id}/pay`, {
                                                            cash_account_id: cashAccounts[0].id,
                                                            payment_date: new Date().toISOString().slice(0, 10),
                                                            payment_reference: ref,
                                                        }, { preserveScroll: true });
                                                    }}
                                                    className="rounded bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700"
                                                >
                                                    Mark Paid
                                                </button>
                                            ) : (
                                                <span className="text-slate-400">{c.payment_reference || '—'}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Active Subscriptions */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                        <div className="border-b border-slate-200 px-5 py-3">
                            <h3 className="text-sm font-bold text-[#101D35]">Client Subscriptions ({subscriptions.length})</h3>
                        </div>
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50 text-left font-semibold text-slate-600">
                                <tr>
                                    <th className="px-4 py-2.5">Subscription No</th>
                                    <th className="px-4 py-2.5">Client & Plan</th>
                                    <th className="px-4 py-2.5">Price</th>
                                    <th className="px-4 py-2.5">Next Billing</th>
                                    <th className="px-4 py-2.5">Status</th>
                                    <th className="px-4 py-2.5">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {subscriptions.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-center text-slate-500">No active subscriptions yet.</td>
                                    </tr>
                                )}
                                {subscriptions.map((s: any) => (
                                    <tr key={s.id}>
                                        <td className="px-4 py-2.5 font-mono font-semibold text-[#101D35]">{s.subscription_no}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="font-semibold text-slate-800">{s.company?.name}</div>
                                            <div className="text-[11px] text-slate-500">{s.plan?.name} ({s.plan?.billing_cycle})</div>
                                        </td>
                                        <td className="px-4 py-2.5 font-mono font-semibold">{formatIdr(s.plan?.price)}</td>
                                        <td className="px-4 py-2.5">{s.next_billing_date}</td>
                                        <td className="px-4 py-2.5"><StatusBadge label={s.status} /></td>
                                        <td className="px-4 py-2.5">
                                            {canManage && s.status === 'Active' && (
                                                <button
                                                    type="button"
                                                    onClick={() => router.post(`/finance/subscriptions/${s.id}/bill`, {}, { preserveScroll: true })}
                                                    className="rounded bg-[#101D35] px-2.5 py-1 font-semibold text-white hover:bg-[#1a2c4e]"
                                                >
                                                    Generate Invoice
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 7: COA, PERIODS & TAXES */}
            {tab === 'settings' && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                        <div className="border-b border-slate-200 px-5 py-3"><h3 className="text-sm font-bold text-[#101D35]">Chart of Accounts ({accounts.length})</h3></div>
                        <div className="max-h-96 overflow-y-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-xs">
                                <thead className="bg-slate-50 text-left font-semibold text-slate-600">
                                    <tr>
                                        <th className="px-4 py-2">Code</th>
                                        <th className="px-4 py-2">Name</th>
                                        <th className="px-4 py-2">Type</th>
                                        <th className="px-4 py-2">Normal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {accounts.map((a: any) => (
                                        <tr key={a.id}>
                                            <td className="px-4 py-1.5 font-mono font-semibold text-[#101D35]">{a.code}</td>
                                            <td className="px-4 py-1.5">{a.name}</td>
                                            <td className="px-4 py-1.5 text-slate-600">{a.type}</td>
                                            <td className="px-4 py-1.5 text-slate-600">{a.normal_balance}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                        <div className="border-b border-slate-200 px-5 py-3"><h3 className="text-sm font-bold text-[#101D35]">Accounting Periods & Tax Rates</h3></div>
                        <div className="max-h-96 overflow-y-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-xs">
                                <thead className="bg-slate-50 text-left font-semibold text-slate-600">
                                    <tr>
                                        <th className="px-4 py-2">Period</th>
                                        <th className="px-4 py-2">Status</th>
                                        <th className="px-4 py-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {periods.map((p: any) => (
                                        <tr key={p.id}>
                                            <td className="px-4 py-2 font-medium">{p.name} ({p.code})</td>
                                            <td className="px-4 py-2"><StatusBadge label={p.status} /></td>
                                            <td className="px-4 py-2">
                                                {canManage && p.status === 'Open' && (
                                                    <button type="button" onClick={() => router.post(`/finance/periods/${p.id}/close`)} className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-700 hover:bg-slate-200">Close</button>
                                                )}
                                                {isFounder && p.status === 'Closed' && (
                                                    <button type="button" onClick={() => { const reason = window.prompt('Founder reopen reason:'); if (reason) router.post(`/finance/periods/${p.id}/reopen`, { reason }); }} className="rounded bg-amber-100 px-2 py-1 font-semibold text-amber-900 hover:bg-amber-200">Reopen</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
