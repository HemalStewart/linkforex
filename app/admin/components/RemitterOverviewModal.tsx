'use client';

import React from 'react';
import { FolderOpen, Users, X } from 'lucide-react';

const resolveAmlStatus = (r: any): string => {
    if (!r) return 'pending';

    // 1. Sanction status from backend engine first
    const sancStatus = String(r.sanction_status || '').trim().toLowerCase();
    if (sancStatus && sancStatus !== '-' && sancStatus !== 'pending' && sancStatus !== 'not_started' && sancStatus !== 'null' && sancStatus !== 'undefined') {
        if (sancStatus === 'review' || sancStatus === 'refer' || sancStatus === 'hits') return 'refer';
        if (sancStatus === 'hit' || sancStatus === 'fail') return 'hit';
        if (sancStatus === 'clear' || sancStatus === 'passed' || sancStatus === 'pass') return 'pass';
        return sancStatus;
    }

    // 2. Explicit sender_aml_result / dilisense_result
    const amlRes = String(r.sender_aml_result || r.aml_result || r.aml_status || r.dilisense_result || r.sanction_result || r.verdict || '').trim().toLowerCase();
    if (amlRes && amlRes !== '-' && amlRes !== 'pending' && amlRes !== 'not_started' && amlRes !== 'null' && amlRes !== 'undefined') {
        if (amlRes === 'review' || amlRes === 'refer' || amlRes === 'referred' || amlRes === 'under_review') return 'refer';
        if (amlRes === 'hit' || amlRes === 'fail' || amlRes === 'failed') return 'hit';
        if (amlRes === 'passed' || amlRes === 'pass' || amlRes === 'clear' || amlRes === 'manually passed') return 'pass';
        return amlRes;
    }

    // 3. Sanction score rules (hits > 0)
    if (r.sanction_score !== undefined && r.sanction_score !== null && r.sanction_score !== '') {
        const score = Number(r.sanction_score);
        if (!isNaN(score) && score > 0) {
            return score >= 80 ? 'hit' : 'refer';
        }
    }

    return 'pending';
};

const resolveIdStatus = (r: any): 'Valid ID' | 'Pending' | 'ID Expired' => {
    if (!r) return 'Pending';

    if (r.id_expiry && String(r.id_expiry).trim()) {
        const exp = new Date(r.id_expiry);
        if (!isNaN(exp.getTime())) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (exp < today) return 'ID Expired';
            return 'Valid ID';
        }
    }

    const isExpired = Boolean(r.id_expired) || 
                      String(r.id_expired || '').toLowerCase() === 'yes' || 
                      String(r.id_status || '').toLowerCase() === 'expired';

    if (isExpired) return 'ID Expired';

    const isVerified = String(r.id_verified || '').toLowerCase() === 'yes' ||
                       String(r.id_verified || '').toLowerCase() === 'verified' ||
                       r.id_verified === true ||
                       String(r.id_status || '').toLowerCase() === 'verified' ||
                       String(r.id_status || '').toLowerCase() === 'valid';

    if (isVerified) return 'Valid ID';

    return 'Pending';
};

export type RemitterOverviewProps = {
    remitter: any;
    receivers?: any[];
    onClose: () => void;
    /** Omitted when the caller has nowhere to send the user, e.g. mid-registration. */
    onOpenDocuments?: (remitter: any) => void;
};

/**
 * The full remitter overview. Shared so the registration form and the
 * remitters list show a customer the same way.
 */
export default function RemitterOverviewModal({ remitter, receivers = [], onClose, onOpenDocuments }: RemitterOverviewProps) {
    if (!remitter) return null;

    return (
                <div
                    onClick={() => onClose()}
                    className="fixed inset-0 z-[1050] flex items-center justify-center p-4 transition-all duration-300 pointer-events-auto"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200/50 bg-white/95 p-6 shadow-2xl dark:border-slate-700/50 dark:bg-slate-900/95 backdrop-blur-lg"
                    >
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-300">Remitter Overview</p>
                                <h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
                                    {remitter.sender_name || '-'}
                                </h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => onOpenDocuments && onOpenDocuments({ isOpen: true, remitterId: remitter.id, remitterName: remitter.sender_name })}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white shadow-sm transition-all"
                                >
                                    <FolderOpen className="w-4 h-4" /> Documents
                                </button>
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${String(remitter.active || '').toLowerCase() === 'active'
                                        ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300'
                                        : 'bg-slate-500/15 text-slate-600 dark:text-slate-300'
                                    }`}>
                                    {remitter.active || 'Inactive'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onClose()}
                                    className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Identity & Contact */}
                            <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4 space-y-2">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Identity & Contact</p>
                                <div>
                                    <p className="text-xs text-slate-400">Branch</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{remitter.branch_name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Reference ID</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{remitter.sender_id || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Date of Birth</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{remitter.dob || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Country of Birth</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{remitter.place_of_birth || '-'}</p>
                                </div>
                            </div>

                            {/* Address & Contact */}
                            <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4 space-y-2">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Address & Contact</p>
                                <div>
                                    <p className="text-xs text-slate-400">Mobile Number</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {remitter.telephone && remitter.telephone !== '-' ? remitter.telephone : (remitter.phone || '-')}
                                    </p>
                                </div>
                                {remitter.email && remitter.email !== '-' && (
                                    <div>
                                        <p className="text-xs text-slate-400">Email</p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{remitter.email}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-slate-400">Address</p>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{remitter.address_1 || '-'}</p>
                                    {remitter.address_2 && remitter.address_2 !== '-' && (
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{remitter.address_2}</p>
                                    )}
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {[remitter.city, remitter.county, remitter.country]
                                            .map((part) => String(part || '').trim())
                                            .filter((part) => part && part !== '-')
                                            .join(', ')
                                        }
                                        {remitter.postcode && String(remitter.postcode).trim() ? ` ${String(remitter.postcode).trim()}` : ''}
                                    </p>
                                </div>
                            </div>

                            {/* ID & Compliance */}
                            <div className="rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4 space-y-2">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">ID & Compliance</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-xs text-slate-400">ID Type</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{remitter.id_type || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">ID Number</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{remitter.id_no || '-'}</p>
                                    </div>
                                </div>
                                {remitter.id_expire_date && (
                                    <div>
                                        <p className="text-xs text-slate-400">ID Expiry Date</p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{remitter.id_expire_date}</p>
                                    </div>
                                )}
                                <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-200/50 dark:border-slate-800">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ID Status</span>
                                    {(() => {
                                        const st = resolveIdStatus(remitter);
                                        if (st === 'ID Expired') {
                                            return <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">ID Expired</span>;
                                        }
                                        if (st === 'Valid ID') {
                                            return <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Valid ID</span>;
                                        }
                                        return <span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Pending</span>;
                                    })()}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">AML Verification Result</span>
                                    {(() => {
                                        const rawVal = resolveAmlStatus(remitter);
                                        const s = String(rawVal || '').trim().toLowerCase();

                                        const isPass = ['pass', 'passed', 'clear', 'approved', 'verified', 'manually passed', 'clean', 'no_match', 'no match', 'ok'].includes(s) || s.includes('pass') || s.includes('clear');
                                        const isRefer = ['refer', 'referred', 'review', 'under_review'].includes(s) || s.includes('refer') || s.includes('review');
                                        const isHit = ['hit', 'fail', 'failed', 'match', 'matches', 'rejected', 'expired'].includes(s) || s.includes('hit') || s.includes('fail');

                                        let badgeText = 'PENDING';
                                        let badgeClass = 'bg-amber-500 text-white font-extrabold px-2.5 py-0.5 text-xs rounded-lg shadow-sm';

                                        if (isPass) {
                                            badgeText = '✓ PASS';
                                            badgeClass = 'bg-emerald-500 text-white font-extrabold px-2.5 py-0.5 text-xs rounded-lg shadow-sm';
                                        } else if (isRefer) {
                                            badgeText = s.includes('refer') ? 'REFER' : 'REVIEW';
                                            badgeClass = 'bg-amber-500 text-white font-extrabold px-2.5 py-0.5 text-xs rounded-lg shadow-sm';
                                        } else if (isHit) {
                                            badgeText = '⚠ HIT';
                                            badgeClass = 'bg-rose-600 text-white font-extrabold px-2.5 py-0.5 text-xs rounded-lg shadow-sm';
                                        }

                                        return (
                                            <span className={`inline-flex items-center justify-center ${badgeClass}`}>
                                                {badgeText}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {receivers.length > 0 && (
                            <div className="mt-4 rounded-2xl border border-slate-100/70 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                                            Receivers
                                        </h3>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-teal-500/15 text-teal-700 dark:text-teal-300">
                                        {receivers.length} {receivers.length === 1 ? 'Receiver' : 'Receivers'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {receivers.map((receiver: any, idx: number) => (
                                        <div key={receiver.id || idx} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-xs flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={receiver.name || `${receiver.first_name || ''} ${receiver.last_name || ''}`}>
                                                        {receiver.name || [receiver.first_name, receiver.last_name].filter(Boolean).join(' ') || 'Receiver'}
                                                    </p>
                                                    {(receiver.relationship || receiver.relationship_to_sender) && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                                                            {receiver.relationship || receiver.relationship_to_sender}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    {[receiver.country, receiver.city].filter(Boolean).join(', ') || '-'}
                                                </p>
                                            </div>
                                            {(receiver.bank_name || receiver.account_number || receiver.mobile_number) && (
                                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
                                                    <span className="font-medium truncate">{receiver.bank_name || 'Account'}</span>
                                                    <span className="font-mono text-slate-400 shrink-0">{receiver.account_number || receiver.mobile_number}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => onClose()}
                                className="rounded-full bg-slate-100 px-6 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
    );
}
