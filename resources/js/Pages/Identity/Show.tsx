import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    BadgeCheck,
    Building2,
    Check,
    Copy,
    Mail,
    MessageSquare,
    ShieldAlert,
    ShieldOff,
    ShieldX,
} from 'lucide-react';
import { useState } from 'react';
import { UserAvatar } from '@/Components/shared/UserAvatar';

type VerificationState = 'verified' | 'inactive' | 'invalid' | 'revoked' | 'suspended';

interface VerifiedMemberPayload {
    name: string;
    avatar_url: string | null;
    avatar_color: string;
    position: string;
    department: string;
    department_color: string;
    membership_status: string;
    email: string | null;
    whatsapp_number: string | null;
    employee_code: string | null;
    verified_at: string | null;
}

interface IdentityShowProps {
    verificationState: VerificationState;
    member: VerifiedMemberPayload | null;
}

const STATE_CONFIG: Record<
    VerificationState,
    {
        title: string;
        subtitle: string;
        badge: string;
        toneClass: string;
        icon: typeof BadgeCheck;
    }
> = {
    verified: {
        title: 'Verified Krevia Digital Member',
        subtitle: 'This digital identity has been cryptographically verified.',
        badge: 'Verified Member',
        toneClass:
            'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300',
        icon: BadgeCheck,
    },
    inactive: {
        title: 'QR Code Temporarily Inactive',
        subtitle: 'The member has temporarily deactivated this QR digital identity.',
        badge: 'Inactive QR Code',
        toneClass:
            'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-300',
        icon: ShieldOff,
    },
    revoked: {
        title: 'QR Code Revoked',
        subtitle: 'This QR code was replaced or revoked and is no longer valid.',
        badge: 'Revoked QR Code',
        toneClass:
            'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/60 dark:text-rose-300',
        icon: ShieldX,
    },
    suspended: {
        title: 'Account Inactive or Suspended',
        subtitle: 'This membership account is currently inactive.',
        badge: 'Suspended Account',
        toneClass:
            'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/60 dark:text-rose-300',
        icon: ShieldAlert,
    },
    invalid: {
        title: 'Invalid QR Code',
        subtitle: 'No valid Krevia Digital identity matches this link.',
        badge: 'Invalid QR Code',
        toneClass:
            'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
        icon: AlertTriangle,
    },
};

export default function IdentityShow({ verificationState, member }: IdentityShowProps) {
    const [copied, setCopied] = useState(false);
    const meta = STATE_CONFIG[verificationState] ?? STATE_CONFIG.invalid;
    const StatusIcon = meta.icon;

    const handleCopyContact = async () => {
        if (!member) {
            return;
        }
        const lines = [
            member.name,
            `${member.position} — ${member.department}`,
            'Krevia Digital',
        ];
        if (member.email) {
            lines.push(`Email: ${member.email}`);
        }
        if (member.whatsapp_number) {
            lines.push(`WhatsApp: ${member.whatsapp_number}`);
        }
        try {
            await navigator.clipboard.writeText(lines.join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard unavailable
        }
    };

    const whatsappHref = member?.whatsapp_number
        ? `https://wa.me/${member.whatsapp_number.replace(/\D+/g, '')}`
        : null;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-10 text-slate-900 transition-colors dark:bg-[#0B1220] dark:text-slate-100">
            <Head title={member ? `${member.name} — Krevia Digital Identity` : meta.title} />

            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#111A2E]">
                {/* Brand Header */}
                <div className="bg-gradient-to-br from-[#101D35] via-[#17294A] to-[#1E355E] px-6 py-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                                <Building2 className="h-5 w-5 text-blue-200" />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold tracking-widest text-blue-200 uppercase">
                                    Krevia Digital
                                </p>
                                <p className="text-sm font-semibold text-white">
                                    Official Digital Identity
                                </p>
                            </div>
                        </div>

                        {member?.employee_code && (
                            <span className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-white">
                                {member.employee_code}
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-6">
                    {/* Verification Status Banner */}
                    <div
                        className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-xs font-medium ${meta.toneClass}`}
                    >
                        <StatusIcon className="h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                            <p className="font-semibold">{meta.badge}</p>
                            <p className="text-[11px] opacity-85">{meta.subtitle}</p>
                        </div>
                    </div>

                    {verificationState === 'verified' && member ? (
                        <div className="mt-6">
                            <div className="flex flex-col items-center text-center">
                                <UserAvatar
                                    name={member.name}
                                    avatarUrl={member.avatar_url}
                                    avatarColor={member.avatar_color}
                                    size="xl"
                                    className="h-24 w-24 text-2xl ring-4 ring-slate-100 dark:ring-slate-800"
                                />
                                <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    {member.name}
                                </h1>
                                <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                                    {member.position}
                                </p>
                                <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        {member.department}
                                    </span>
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        {member.membership_status}
                                    </span>
                                </div>
                            </div>

                            {/* Public Contact Details (only if enabled) */}
                            {(member.email || member.whatsapp_number) && (
                                <div className="mt-6 space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                                    {member.email && (
                                        <div className="flex items-center gap-3 text-xs">
                                            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                                            <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                                                {member.email}
                                            </span>
                                        </div>
                                    )}
                                    {member.whatsapp_number && (
                                        <div className="flex items-center gap-3 text-xs">
                                            <MessageSquare className="h-4 w-4 shrink-0 text-emerald-500" />
                                            <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                                                {member.whatsapp_number}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Contact Actions */}
                            <div className="mt-6 flex flex-col gap-2.5">
                                {whatsappHref && (
                                    <a
                                        href={whatsappHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                        Message on WhatsApp
                                    </a>
                                )}

                                {member.email && (
                                    <a
                                        href={`mailto:${member.email}`}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#101D35] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#192c4f] dark:bg-blue-600 dark:hover:bg-blue-700"
                                    >
                                        <Mail className="h-4 w-4" />
                                        Send Email
                                    </a>
                                )}

                                <button
                                    type="button"
                                    onClick={handleCopyContact}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-4 w-4 text-emerald-600" />
                                            Contact Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4" />
                                            Copy Contact Information
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-8 pb-2 text-center">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                {meta.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Member details are hidden because this identity could not be
                                verified as active.
                            </p>
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-3 text-center text-[11px] text-slate-400 dark:border-slate-800 dark:bg-slate-900/40">
                    Krevia Digital Management System • Verified Identity Portal
                </div>
            </div>
        </div>
    );
}
