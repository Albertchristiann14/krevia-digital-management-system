import { router } from '@inertiajs/react';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface SearchItem {
    id: string;
    title: string;
    subtitle: string;
    url: string;
}

interface SearchGroup {
    module: string;
    items: SearchItem[];
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
    if (!query.trim()) {
        return <>{text}</>;
    }
    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.trim().toLowerCase() ? (
                    <mark
                        key={i}
                        className="rounded bg-blue-100 px-0.5 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200"
                    >
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                ),
            )}
        </>
    );
}

export function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [groups, setGroups] = useState<SearchGroup[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
            if (e.key === 'Escape') {
                setOpen(false);
                inputRef.current?.blur();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setGroups([]);
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`/search?q=${encodeURIComponent(trimmed)}`, {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                });
                if (res.ok) {
                    const data = await res.json();
                    setGroups(Array.isArray(data.groups) ? data.groups : []);
                    setActiveIndex(0);
                }
            } catch {
                // Ignore abort errors
            } finally {
                setLoading(false);
            }
        }, 250);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    const navigateTo = (url: string) => {
        setOpen(false);
        setQuery('');
        router.visit(url);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open || flatItems.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => (prev + 1) % flatItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = flatItems[activeIndex];
            if (target) {
                navigateTo(target.url);
            }
        }
    };

    return (
        <div ref={containerRef} className="relative hidden w-64 md:block lg:w-80">
            <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onFocus={() => setOpen(true)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search tasks, clients, projects... (Ctrl+K)"
                    className="w-full rounded-xl border border-slate-200/90 bg-slate-50/90 py-1.5 pr-8 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/[0.11] dark:bg-white/[0.055] dark:text-[#F4F7FF] dark:placeholder:text-[#71819C] dark:focus:border-[#668CFF]/60 dark:focus:bg-[#101A30]/90"
                />
                {loading ? (
                    <Loader2 className="absolute right-2.5 h-3.5 w-3.5 animate-spin text-slate-400 dark:text-[#A7B4CB]" />
                ) : query ? (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('');
                            setGroups([]);
                        }}
                        className="absolute right-2 rounded p-0.5 text-slate-400 hover:text-slate-900 dark:text-[#71819C] dark:hover:text-[#F4F7FF]"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                ) : null}
            </div>

            {open && query.trim().length >= 2 && (
                <div className="krevia-glass-elevated absolute right-0 left-0 z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl p-2">
                    {loading && groups.length === 0 ? (
                        <p className="px-3 py-4 text-center text-xs text-slate-400 dark:text-[#71819C]">Searching...</p>
                    ) : groups.length === 0 ? (
                        <p className="px-3 py-4 text-center text-xs text-slate-500 dark:text-[#A7B4CB]">
                            No matching records found for &ldquo;{query}&rdquo;.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {groups.map((group) => (
                                <div key={group.module}>
                                    <p className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-[#71819C]">
                                        {group.module}
                                    </p>
                                    <div className="space-y-0.5">
                                        {group.items.map((item) => {
                                            const idx = flatItems.findIndex((f) => f.id === item.id);
                                            const isActive = idx === activeIndex;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => navigateTo(item.url)}
                                                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition ${
                                                        isActive
                                                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-gradient-to-r dark:from-[#668CFF]/30 dark:to-[#45D8E8]/15 dark:text-[#F4F7FF] dark:ring-[#668CFF]/40'
                                                            : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 dark:text-[#A7B4CB] dark:hover:bg-white/[0.06] dark:hover:text-[#F4F7FF]'
                                                    }`}
                                                >
                                                    <span className="truncate font-medium">
                                                        <HighlightMatch text={item.title} query={query} />
                                                    </span>
                                                    <span
                                                        className={`shrink-0 text-[10px] ${
                                                            isActive ? 'text-slate-200' : 'text-slate-400'
                                                        }`}
                                                    >
                                                        {item.subtitle}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
