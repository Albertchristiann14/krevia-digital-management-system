import { UserAvatar } from '@/Components/shared/UserAvatar';
import { BellRing, CornerDownLeft, Pencil, Send, Smile, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

export interface OfficeMessageData {
    id: number;
    scope: 'zone' | 'dm' | 'room';
    zone_id: number | null;
    recipient_id: number | null;
    sender_id: number;
    sender_name: string;
    sender_avatar_url: string | null;
    sender_avatar_color: string;
    body: string;
    reactions: Record<string, number[]>;
    is_urgent: boolean;
    silent_dnd?: boolean;
    reply_to: { id: number; sender_name: string; body: string } | null;
    edited_at: string | null;
    created_at: string | null;
    time_label: string | null;
}

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '👏', '😂', '👀'];

interface OfficeChatPanelProps {
    scope: 'zone' | 'dm';
    zoneId?: number | null;
    otherUserId?: number | null;
    myUserId: number;
    canSendUrgent?: boolean;
    emptyLabel: string;
    readXsrfToken: () => string;
    incomingMessage?: OfficeMessageData | null;
    deletedMessageId?: number | null;
    onUnreadChange?: (unread: { dm: Record<string, number>; zone: Record<string, number> }) => void;
}

function renderMessageBody(text: string) {
    const parts = text.split(/(https?:\/\/[^\s]+|@[A-Za-z0-9_.-]+)/g);
    return parts.map((part, idx) => {
        if (/^https?:\/\//.test(part)) {
            return (
                <a
                    key={idx}
                    href={part}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline dark:text-[#45D8E8]"
                >
                    {part}
                </a>
            );
        }
        if (/^@[A-Za-z0-9_.-]+/.test(part)) {
            return (
                <span key={idx} className="font-semibold text-blue-600 dark:text-[#8DA8FF]">
                    {part}
                </span>
            );
        }
        return <span key={idx}>{part}</span>;
    });
}

export function OfficeChatPanel({
    scope,
    zoneId,
    otherUserId,
    myUserId,
    canSendUrgent = false,
    emptyLabel,
    readXsrfToken,
    incomingMessage,
    deletedMessageId,
    onUnreadChange,
}: OfficeChatPanelProps) {
    const [messages, setMessages] = useState<OfficeMessageData[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [body, setBody] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState<OfficeMessageData | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editBody, setEditBody] = useState('');
    const [reactMenuId, setReactMenuId] = useState<number | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const targetValid = scope === 'zone' ? !!zoneId : !!otherUserId;

    useEffect(() => {
        if (!targetValid) return;
        let cancelled = false;
        setLoading(true);

        const params = new URLSearchParams({ scope });
        if (scope === 'zone' && zoneId) params.set('zone_id', String(zoneId));
        if (scope === 'dm' && otherUserId) params.set('user_id', String(otherUserId));

        fetch(`/virtual-office/messages?${params.toString()}`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled || !data) return;
                setMessages(Array.isArray(data.messages) ? data.messages : []);
                setHasMore(!!data.has_more);
                if (data.unread) onUnreadChange?.(data.unread);
                setLoading(false);

                // Mark thread read
                fetch('/virtual-office/messages/read', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': readXsrfToken(),
                    },
                    body: JSON.stringify({
                        scope,
                        ...(scope === 'zone' ? { zone_id: zoneId } : { user_id: otherUserId }),
                    }),
                })
                    .then((r) => (r.ok ? r.json() : null))
                    .then((d) => d?.unread && onUnreadChange?.(d.unread))
                    .catch(() => {});
            })
            .catch(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [scope, zoneId, otherUserId, targetValid, readXsrfToken, onUnreadChange]);

    useEffect(() => {
        if (!incomingMessage) return;
        const belongsHere =
            incomingMessage.scope === scope &&
            (scope === 'zone'
                ? incomingMessage.zone_id === zoneId
                : (incomingMessage.sender_id === otherUserId && incomingMessage.recipient_id === myUserId) ||
                  (incomingMessage.sender_id === myUserId && incomingMessage.recipient_id === otherUserId));
        if (!belongsHere) return;

        setMessages((prev) => {
            const exists = prev.some((m) => m.id === incomingMessage.id);
            return exists
                ? prev.map((m) => (m.id === incomingMessage.id ? incomingMessage : m))
                : [...prev, incomingMessage];
        });
    }, [incomingMessage, scope, zoneId, otherUserId, myUserId]);

    useEffect(() => {
        if (!deletedMessageId) return;
        setMessages((prev) => prev.filter((m) => m.id !== deletedMessageId));
    }, [deletedMessageId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const loadOlder = async () => {
        if (!messages[0]) return;
        const params = new URLSearchParams({ scope, before_id: String(messages[0].id) });
        if (scope === 'zone' && zoneId) params.set('zone_id', String(zoneId));
        if (scope === 'dm' && otherUserId) params.set('user_id', String(otherUserId));

        const res = await fetch(`/virtual-office/messages?${params.toString()}`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (res.ok) {
            const data = await res.json();
            setMessages((prev) => [...(data.messages ?? []), ...prev]);
            setHasMore(!!data.has_more);
        }
    };

    const handleSend = async (e: FormEvent) => {
        e.preventDefault();
        if (!body.trim() || !targetValid || sending) return;
        setSending(true);
        try {
            const res = await fetch('/virtual-office/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                body: JSON.stringify({
                    scope,
                    zone_id: scope === 'zone' ? zoneId : null,
                    recipient_id: scope === 'dm' ? otherUserId : null,
                    body: body.trim(),
                    reply_to_id: replyTo?.id ?? null,
                    is_urgent: scope === 'dm' && canSendUrgent ? isUrgent : false,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.message) {
                    setMessages((prev) =>
                        prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message],
                    );
                }
                setBody('');
                setReplyTo(null);
                setIsUrgent(false);
            }
        } finally {
            setSending(false);
        }
    };

    const handleSaveEdit = async (id: number) => {
        if (!editBody.trim()) return;
        const res = await fetch(`/virtual-office/messages/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': readXsrfToken(),
            },
            body: JSON.stringify({ body: editBody.trim() }),
        });
        if (res.ok) {
            const data = await res.json();
            setMessages((prev) => prev.map((m) => (m.id === id ? data.message : m)));
            setEditingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        const res = await fetch(`/virtual-office/messages/${id}`, {
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': readXsrfToken(),
            },
        });
        if (res.ok) {
            setMessages((prev) => prev.filter((m) => m.id !== id));
        }
    };

    const handleReact = async (id: number, emoji: string) => {
        setReactMenuId(null);
        const res = await fetch(`/virtual-office/messages/${id}/react`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': readXsrfToken(),
            },
            body: JSON.stringify({ emoji }),
        });
        if (res.ok) {
            const data = await res.json();
            setMessages((prev) => prev.map((m) => (m.id === id ? data.message : m)));
        }
    };

    return (
        <div className="flex h-full min-h-[260px] flex-col">
            <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                {hasMore && (
                    <button
                        type="button"
                        onClick={loadOlder}
                        className="w-full rounded-lg border border-slate-200 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-[#A7B4CB]"
                    >
                        Muat pesan sebelumnya
                    </button>
                )}

                {loading ? (
                    <div className="space-y-2 py-4">
                        <div className="h-10 animate-pulse rounded-xl bg-slate-200/70 dark:bg-white/[0.06]" />
                        <div className="h-10 animate-pulse rounded-xl bg-slate-200/70 dark:bg-white/[0.06]" />
                    </div>
                ) : messages.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-[11px] text-slate-500 dark:border-white/10 dark:text-[#71819C]">
                        {emptyLabel}
                    </p>
                ) : (
                    messages.map((msg) => {
                        const isMine = msg.sender_id === myUserId;
                        return (
                            <div
                                key={msg.id}
                                className="group rounded-xl border border-slate-200/70 bg-white/80 p-2.5 text-xs dark:border-white/[0.08] dark:bg-white/[0.04]"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-1.5">
                                        <UserAvatar
                                            name={msg.sender_name}
                                            avatarUrl={msg.sender_avatar_url}
                                            avatarColor={msg.sender_avatar_color}
                                            size="xs"
                                        />
                                        <span className="truncate font-semibold text-slate-900 dark:text-[#F4F7FF]">
                                            {msg.sender_name}
                                        </span>
                                        <span className="font-mono text-[10px] text-slate-400 dark:text-[#71819C]">
                                            {msg.time_label}
                                        </span>
                                        {msg.is_urgent && (
                                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                                                URGENT
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                                        <button
                                            type="button"
                                            onClick={() => setReplyTo(msg)}
                                            title="Balas"
                                            className="rounded p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                                        >
                                            <CornerDownLeft className="h-3 w-3" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReactMenuId(reactMenuId === msg.id ? null : msg.id)}
                                            title="Reaksi"
                                            className="rounded p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                                        >
                                            <Smile className="h-3 w-3" />
                                        </button>
                                        {isMine && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingId(msg.id);
                                                        setEditBody(msg.body);
                                                    }}
                                                    title="Edit"
                                                    className="rounded p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(msg.id)}
                                                    title="Hapus"
                                                    className="rounded p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/15"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {msg.reply_to && (
                                    <div className="mt-1 rounded-lg border-l-2 border-blue-500 bg-slate-50 px-2 py-1 text-[10px] text-slate-500 dark:bg-white/[0.03] dark:text-[#A7B4CB]">
                                        <span className="font-semibold">{msg.reply_to.sender_name}: </span>
                                        {msg.reply_to.body}
                                    </div>
                                )}

                                {editingId === msg.id ? (
                                    <div className="mt-1.5 flex gap-1.5">
                                        <input
                                            type="text"
                                            value={editBody}
                                            onChange={(e) => setEditBody(e.target.value)}
                                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleSaveEdit(msg.id)}
                                            className="rounded-lg bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white"
                                        >
                                            Simpan
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingId(null)}
                                            className="rounded-lg border border-slate-200 px-2 py-1 text-[10px]"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                ) : (
                                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-[#A7B4CB]">
                                        {renderMessageBody(msg.body)}
                                        {msg.edited_at && (
                                            <span className="ml-1 text-[10px] text-slate-400">(diedit)</span>
                                        )}
                                    </p>
                                )}

                                {reactMenuId === msg.id && (
                                    <div className="mt-1.5 flex gap-1">
                                        {QUICK_REACTIONS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => handleReact(msg.id, emoji)}
                                                className="rounded-md border border-slate-200 px-1.5 py-0.5 text-xs hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {Object.keys(msg.reactions ?? {}).length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                        {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => handleReact(msg.id, emoji)}
                                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
                                                    userIds.includes(myUserId)
                                                        ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-[#668CFF]/50 dark:bg-[#668CFF]/20 dark:text-[#F4F7FF]'
                                                        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#A7B4CB]'
                                                }`}
                                            >
                                                <span>{emoji}</span>
                                                <span className="font-mono">{userIds.length}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="mt-2.5 space-y-1.5 border-t border-slate-200/80 pt-2.5 dark:border-white/[0.1]">
                {replyTo && (
                    <div className="flex items-center justify-between rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] text-blue-700 dark:bg-[#668CFF]/15 dark:text-[#8DA8FF]">
                        <span className="truncate">Membalas {replyTo.sender_name}: {replyTo.body}</span>
                        <button type="button" onClick={() => setReplyTo(null)}>
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )}
                {scope === 'dm' && canSendUrgent && (
                    <label className="flex items-center gap-1.5 text-[10px] font-medium text-rose-600 dark:text-rose-300">
                        <input
                            type="checkbox"
                            checked={isUrgent}
                            onChange={(e) => setIsUrgent(e.target.checked)}
                            className="h-3.5 w-3.5 rounded"
                        />
                        <BellRing className="h-3 w-3" />
                        Tandai Urgent (tembus Do Not Disturb)
                    </label>
                )}
                <div className="flex gap-1.5">
                    <input
                        type="text"
                        maxLength={2000}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder={scope === 'zone' ? 'Tulis pesan di zona ini...' : 'Tulis pesan langsung...'}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                    />
                    <button
                        type="submit"
                        disabled={sending || !body.trim()}
                        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                        <Send className="h-3.5 w-3.5" />
                    </button>
                </div>
            </form>
        </div>
    );
}
