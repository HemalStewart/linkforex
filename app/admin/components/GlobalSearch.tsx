'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, ArrowRight, Users, ArrowLeftRight } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';

type Hit = {
    kind: 'remitter' | 'transfer';
    id: string;
    title: string;
    detail: string;
    href: string;
};

const asText = (v: unknown): string => String(v ?? '').trim();

/**
 * Header search. It used to push straight to the transfers list on Enter, so
 * typing a customer's name looked like it did nothing. It now searches
 * remitters and transfers and offers the matches directly.
 */
export default function GlobalSearch({ className = '' }: { className?: string }) {
    const router = useRouter();
    const [query, setQuery] = React.useState('');
    const [hits, setHits] = React.useState<Hit[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [open, setOpen] = React.useState(false);
    const [cursor, setCursor] = React.useState(-1);
    const boxRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const onClickAway = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClickAway);
        return () => document.removeEventListener('mousedown', onClickAway);
    }, []);

    React.useEffect(() => {
        const term = query.trim();
        if (term.length < 2) {
            setHits([]);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        const timer = setTimeout(async () => {
            try {
                const [remitterRes, transferRes] = await Promise.all([
                    fetch(`${ENDPOINTS.REMITTERS.LIST}?search=${encodeURIComponent(term)}`).then(r => (r.ok ? r.json() : [])).catch(() => []),
                    fetch(ENDPOINTS.TRANSFERS.LIST).then(r => (r.ok ? r.json() : [])).catch(() => []),
                ]);
                if (cancelled) return;

                const remitters: Hit[] = (Array.isArray(remitterRes) ? remitterRes : remitterRes?.data ?? [])
                    .slice(0, 5)
                    .map((r: any) => ({
                        kind: 'remitter' as const,
                        id: asText(r.id),
                        title: asText(r.sender_name || r.name) || 'Remitter',
                        detail: [asText(r.sender_id), asText(r.phone)].filter(Boolean).join(' · '),
                        href: `/admin/remitters/${encodeURIComponent(asText(r.route_key || r.id))}`,
                    }));

                // The transfers endpoint has no search parameter, so it is
                // filtered here rather than left out of the results.
                const lower = term.toLowerCase();
                const transfers: Hit[] = (Array.isArray(transferRes) ? transferRes : transferRes?.data ?? [])
                    .filter((t: any) =>
                        [t.code, t.status, t.source_amount, t.remitter_id]
                            .some((v: unknown) => asText(v).toLowerCase().includes(lower)))
                    .slice(0, 5)
                    .map((t: any) => ({
                        kind: 'transfer' as const,
                        id: asText(t.id),
                        title: asText(t.code) || `Transfer ${asText(t.id)}`,
                        detail: [asText(t.status).replace(/_/g, ' '), asText(t.source_amount) && `£${asText(t.source_amount)}`]
                            .filter(Boolean).join(' · '),
                        href: `/admin/transfers/${encodeURIComponent(asText(t.route_key || t.id))}`,
                    }));

                setHits([...remitters, ...transfers]);
                setCursor(-1);
                setOpen(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 300);

        return () => { cancelled = true; clearTimeout(timer); };
    }, [query]);

    const go = (hit: Hit) => {
        setOpen(false);
        setQuery('');
        router.push(hit.href);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') { setOpen(false); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, hits.length - 1)); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, -1)); return; }
        if (e.key === 'Enter') {
            if (cursor >= 0 && hits[cursor]) { go(hits[cursor]); return; }
            const term = query.trim();
            if (term) { setOpen(false); router.push(`/admin/transfers?search=${encodeURIComponent(term)}`); }
        }
    };

    return (
        <div ref={boxRef} className={`relative ${className}`}>
            <div className="relative group input-icon">
                <span className="input-icon-left transition-all duration-300 group-focus-within:text-teal-500">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </span>
                <input
                    type="search"
                    placeholder="Search remitters and transfers..."
                    className="input-glass w-full pr-4 py-2.5 text-sm transition-all duration-300"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (hits.length) setOpen(true); }}
                    onKeyDown={onKeyDown}
                    aria-label="Search remitters and transfers"
                    autoComplete="off"
                />
            </div>

            {open && query.trim().length >= 2 && (
                <div className="absolute left-0 right-0 mt-2 z-50 glass-effect-strong rounded-2xl border border-white/20 dark:border-white/10 shadow-xl overflow-hidden max-h-[70vh] overflow-y-auto">
                    {hits.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                            {loading ? 'Searching...' : `Nothing found for "${query.trim()}".`}
                        </p>
                    ) : (
                        <ul className="py-1">
                            {hits.map((hit, i) => (
                                <li key={`${hit.kind}-${hit.id}`}>
                                    <button
                                        type="button"
                                        onMouseEnter={() => setCursor(i)}
                                        onClick={() => go(hit)}
                                        className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                                            i === cursor ? 'bg-teal-500/10' : 'hover:bg-white/50 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                            hit.kind === 'remitter'
                                                ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300'
                                                : 'bg-sky-500/15 text-sky-600 dark:text-sky-300'
                                        }`}>
                                            {hit.kind === 'remitter' ? <Users className="w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{hit.title}</span>
                                            <span className="block text-xs text-slate-500 dark:text-slate-400 truncate capitalize">
                                                {hit.kind} {hit.detail && `· ${hit.detail}`}
                                            </span>
                                        </span>
                                        <ArrowRight className="w-4 h-4 shrink-0 text-slate-400" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
