import { cn, formatPriorityLabel } from '@/lib/utils';

type BadgeTone = 'navy' | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'slate';

const TONE_MAP: Record<BadgeTone, string> = {
    navy: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-[#668CFF]/20 dark:text-[#F4F7FF] dark:border-[#668CFF]/40',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-[#42C99A]/15 dark:text-[#42C99A] dark:border-[#42C99A]/35',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-[#F4B860]/15 dark:text-[#F4B860] dark:border-[#F4B860]/35',
    red: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-[#F07183]/15 dark:text-[#F07183] dark:border-[#F07183]/35',
    blue: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-[#45D8E8]/15 dark:text-[#45D8E8] dark:border-[#45D8E8]/35',
    purple: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-[#A17AFF]/15 dark:text-[#A17AFF] dark:border-[#A17AFF]/35',
    slate: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/[0.06] dark:text-[#A7B4CB] dark:border-white/[0.12]',
};

export function resolveDataStatusTone(status: string): BadgeTone {
    const normalized = status.toLowerCase();
    if (
        normalized.includes('disepakati') ||
        normalized.includes('sesuai') ||
        normalized === 'active' ||
        normalized === 'completed' ||
        normalized === 'won' ||
        normalized === 'passed' ||
        normalized === 'approved' ||
        normalized === 'live' ||
        normalized === 'client approved' ||
        normalized === 'verified' ||
        normalized === 'resolved' ||
        normalized === 'accepted' ||
        normalized === 'ready to present' ||
        normalized === 'published' ||
        normalized === 'klien nyata' ||
        normalized === 'paid' ||
        normalized === 'sangat baik' ||
        normalized === 'baik' ||
        normalized === 'done' ||
        normalized === 'mitigated'
    ) {
        return 'green';
    }
    if (
        normalized === 'in progress' ||
        normalized === 'responded' ||
        normalized === 'discovery meeting' ||
        normalized === 'requirement analysis' ||
        normalized === 'proposal sent' ||
        normalized === 'implemented' ||
        normalized === 'in production' ||
        normalized === 'scheduled' ||
        normalized === 'sent' ||
        normalized === 'agenda ready' ||
        normalized === 'monitoring'
    ) {
        return 'blue';
    }
    if (
        normalized.includes('usulan') ||
        normalized.includes('perlu konfirmasi') ||
        normalized === 'under review' ||
        normalized === 'segera' ||
        normalized === 'sedang' ||
        normalized === 'on hold' ||
        normalized === 'negotiation' ||
        normalized === 'under negotiation' ||
        normalized === 'follow-up later' ||
        normalized === 'revisions needed' ||
        normalized === 'in review' ||
        normalized === 'revision needed' ||
        normalized === 'contoh internal' ||
        normalized === 'partial' ||
        normalized === 'cukup'
    ) {
        return 'amber';
    }
    if (
        normalized.includes('inactive') ||
        normalized.includes('terlambat') ||
        normalized === 'tinggi' ||
        normalized === 'critical' ||
        normalized === 'high' ||
        normalized === 'cancelled' ||
        normalized === 'urgent' ||
        normalized === 'lost' ||
        normalized === 'failed' ||
        normalized === 'rejected' ||
        normalized === 'rolled back' ||
        normalized === 'overdue' ||
        normalized === 'void' ||
        normalized === 'perlu perbaikan'
    ) {
        return 'red';
    }
    return 'slate';
}

export function StatusBadge({
    label,
    tone,
    className,
}: {
    label: string;
    tone?: BadgeTone;
    className?: string;
}) {
    const resolved = tone ?? resolveDataStatusTone(label);
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
                TONE_MAP[resolved],
                className,
            )}
        >
            {formatPriorityLabel(label)}
        </span>
    );
}

export function RaciBadge({ code }: { code?: string }) {
    if (!code) {
        return <span className="text-xs text-slate-300">—</span>;
    }

    const styles: Record<string, string> = {
        'A/R': 'bg-[#101D35] text-white border-[#101D35]',
        A: 'bg-blue-600 text-white border-blue-600',
        R: 'bg-emerald-50 text-emerald-700 border-emerald-300',
        C: 'bg-amber-50 text-amber-700 border-amber-300',
        I: 'bg-slate-100 text-slate-600 border-slate-200',
    };

    return (
        <span
            className={cn(
                'inline-flex min-w-[34px] items-center justify-center rounded-md border px-1.5 py-0.5 font-mono text-xs font-semibold',
                styles[code] ?? 'bg-slate-100 text-slate-700 border-slate-200',
            )}
        >
            {code}
        </span>
    );
}
