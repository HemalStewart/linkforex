'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import { ShieldCheck, Calendar, FileText, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface VeriffDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    beneficiaryName: string;
    veriffStatus: string;
    veriffSessionId: string;
    veriffCheckedAt: string;
    veriffPepSanctionMatch: string | null | undefined; // JSON string
}

export default function VeriffDetailsModal({
    isOpen,
    onClose,
    beneficiaryName,
    veriffStatus,
    veriffSessionId,
    veriffCheckedAt,
    veriffPepSanctionMatch
}: VeriffDetailsModalProps) {
    const [showRaw, setShowRaw] = useState(false);

    let parsedMatch: any = null;
    try {
        if (veriffPepSanctionMatch) {
            parsedMatch = JSON.parse(veriffPepSanctionMatch);
        }
    } catch (e) {
        console.error('Failed to parse veriff_pep_sanction_match JSON:', e);
    }

    // Look for hits in the response structure
    const hits = parsedMatch?.data?.hits || parsedMatch?.hits || [];
    const matchStatus = parsedMatch?.data?.matchStatus || parsedMatch?.matchStatus || (hits.length > 0 ? 'possible_match' : 'no_match');

    const getStatusBadgeClass = (status: string) => {
        const norm = (status || '').toLowerCase().trim();
        switch (norm) {
            case 'clear':
            case 'passed':
            case 'approved':
                return 'bg-emerald-150 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-350 border-emerald-250 dark:border-emerald-800';
            case 'review':
                return 'bg-amber-150 text-amber-700 dark:bg-amber-900/30 dark:text-amber-350 border-amber-250 dark:border-amber-800';
            case 'pending':
                return 'bg-blue-150 text-blue-700 dark:bg-blue-900/30 dark:text-blue-350 border-blue-250 dark:border-blue-800';
            default:
                return 'bg-slate-150 text-slate-700 dark:bg-slate-800/40 dark:text-slate-350 border-slate-250 dark:border-slate-700';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Veriff PEP / Sanctions Details" size="lg">
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/50 pb-4">
                    <div>
                        <h4 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{beneficiaryName}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">PEP, Sanctions, and Watchlist Screening</p>
                    </div>
                    <span className={`inline-flex rounded-full px-3.5 py-1.5 text-xs font-bold border ${getStatusBadgeClass(veriffStatus)}`}>
                        {veriffStatus ? veriffStatus.replace('_', ' ') : 'Pending'}
                    </span>
                </div>

                {/* Session details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                        <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 block mb-1">Session ID</span>
                        <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-250 break-all">{veriffSessionId || '-'}</span>
                    </div>
                    <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4">
                        <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 block mb-1">Screening Checked At</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-250">
                            {veriffCheckedAt ? new Date(veriffCheckedAt).toLocaleString() : '-'}
                        </span>
                    </div>
                </div>

                {/* Matches Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300">Watchlist Hits ({hits.length})</h5>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${hits.length > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-450' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450'}`}>
                            {matchStatus.replace('_', ' ')}
                        </span>
                    </div>

                    {hits.length > 0 ? (
                        <div className="max-h-72 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                            {hits.map((hit: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-2xl border border-rose-100/70 dark:border-rose-950/40 bg-rose-50/10 dark:bg-rose-950/5 space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center space-x-2.5">
                                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{hit.name || 'Match Candidate'}</span>
                                        </div>
                                        {hit.score !== undefined && (
                                            <span className="text-xs bg-rose-100/80 dark:bg-rose-950/50 text-rose-700 dark:text-rose-305 px-2 py-0.5 rounded-full font-bold">
                                                Match: {Math.round(hit.score * 100)}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-605 dark:text-slate-400">
                                        {hit.birthDate && (
                                            <div>
                                                <span className="font-semibold text-slate-500">Birth Date:</span> {hit.birthDate}
                                            </div>
                                        )}
                                        {hit.type && (
                                            <div>
                                                <span className="font-semibold text-slate-500">Match Type:</span> {hit.type}
                                            </div>
                                        )}
                                        {hit.source && (
                                            <div className="sm:col-span-2">
                                                <span className="font-semibold text-slate-500">Watchlist Source:</span> {hit.source}
                                            </div>
                                        )}
                                    </div>
                                    {hit.details && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 bg-white/40 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100/80 dark:border-slate-800/40 leading-relaxed break-words whitespace-pre-line">
                                            {hit.details}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/20 dark:bg-slate-800/10">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                            <p className="text-sm font-bold text-slate-900 dark:text-white">No PEP or Sanction Matches Detected</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">
                                The name-only screening session found no matches against PEP list databases or international sanctions list databases.
                            </p>
                        </div>
                    )}
                </div>

                {/* Raw Response Payload */}
                {veriffPepSanctionMatch && (
                    <div className="border border-slate-150/70 dark:border-slate-700/50 rounded-2xl overflow-hidden bg-slate-50/20 dark:bg-slate-900/10">
                        <button
                            type="button"
                            onClick={() => setShowRaw(!showRaw)}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors text-left"
                        >
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Raw Screening API Response</span>
                            <div className="flex items-center space-x-1.5 text-slate-400">
                                <span className="text-[11px] font-medium">{showRaw ? 'Collapse' : 'Expand'}</span>
                                {showRaw ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                        </button>
                        {showRaw && (
                            <div className="p-4 border-t border-slate-150/70 dark:border-slate-700/50 bg-slate-950">
                                <pre className="text-xs font-mono text-emerald-450 overflow-x-auto max-h-60 p-2 leading-relaxed whitespace-pre-wrap select-all scrollbar-thin">
                                    {JSON.stringify(parsedMatch, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Action */}
                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-205 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 font-bold text-xs transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}
