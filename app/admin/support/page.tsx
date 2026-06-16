'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRowsPerPage } from '@/app/lib/uiPreferences';
import { ENDPOINTS } from '@/app/lib/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/ui/Pagination';
import { Edit2, Mail, MessageCircle, Phone, RefreshCw, Search, Send, Trash2, User, Save } from 'lucide-react';
import { formatDateTime } from '@/app/lib/dateUtils';

type SupportTicket = {
    id: number;
    ticket_number?: string | null;
    remitter_id?: number | null;
    email?: string | null;
    phone?: string | null;
    subject?: string | null;
    message_type?: string | null;
    status?: string | null;
    priority?: string | null;
    last_message_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

type SupportMessage = {
    id: number;
    ticket_id: number;
    sender_type: 'user' | 'admin';
    sender_id?: number | null;
    message: string;
    created_at?: string | null;
};

type TicketDetail = {
    ticket: SupportTicket;
    messages: SupportMessage[];
};

const STATUS_OPTIONS = ['open', 'waiting_for_user', 'closed'];
const PRIORITY_OPTIONS = ['low', 'normal', 'high'];

const normalizeText = (value?: string | null, fallback = '—'): string => {
    const text = String(value ?? '').trim();
    return text ? text : fallback;
};

const normalizeDate = (value?: string | null): string => {
    if (!value) return '';
    return value.includes('T') ? value : value.replace(' ', 'T');
};

const toLabelCase = (value?: string | null): string => {
    const text = String(value || '').trim();
    if (!text) return '-';
    return text
        .replace(/[_-]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
};



const statusStyles: Record<string, string> = {
    open: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    waiting_for_user: 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
    closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const priorityStyles: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    normal: 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
    high: 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
};

export default function SupportPage() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [rowsPerPage, setRowsPerPage] = useRowsPerPage(10);
    const [page, setPage] = useState(1);

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [replyMessage, setReplyMessage] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [updatingTicket, setUpdatingTicket] = useState(false);
    const [userLimitLoading, setUserLimitLoading] = useState(false);
    const [userLimitSaving, setUserLimitSaving] = useState(false);
    const [userQuarterLimit, setUserQuarterLimit] = useState<string>('');
    const [userYearLimit, setUserYearLimit] = useState<string>('');
    const [deleteState, setDeleteState] = useState<{ open: boolean; ticket: SupportTicket | null; loading: boolean }>({
        open: false,
        ticket: null,
        loading: false,
    });

    const refreshSidebarCounts = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('admin-counts-refresh'));
        }
    };

    const fetchUserLimits = async (email: string) => {
        const normalized = String(email || '').trim().toLowerCase();
        if (!normalized) return;

        setUserLimitLoading(true);
        try {
            const url = `${ENDPOINTS.TRANSACTION_SETTINGS.USER_LIMITS}?email=${encodeURIComponent(normalized)}&channel=app`;
            const res = await fetch(url);
            const data = res.ok ? await res.json() : [];
            const rows = Array.isArray(data) ? data : [];

            const activeQuarter = rows.find((r: any) => String(r.status || '').toLowerCase() !== 'inactive' && String(r.period || '').toLowerCase() === 'quarter');
            const activeYear = rows.find((r: any) => String(r.status || '').toLowerCase() !== 'inactive' && String(r.period || '').toLowerCase() === 'year');

            setUserQuarterLimit(activeQuarter?.limit_amount != null ? String(activeQuarter.limit_amount) : '');
            setUserYearLimit(activeYear?.limit_amount != null ? String(activeYear.limit_amount) : '');
        } catch {
            setUserQuarterLimit('');
            setUserYearLimit('');
        } finally {
            setUserLimitLoading(false);
        }
    };

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            const url = `${ENDPOINTS.SUPPORT.LIST}?${params.toString()}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setTickets(Array.isArray(data) ? data : []);
            } else {
                setTickets([]);
            }
        } catch {
            setTickets([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [statusFilter]);

    const filteredTickets = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return tickets.filter((ticket) => {
            const matchesQuery = !query || [
                ticket.subject,
                ticket.message_type,
                ticket.ticket_number,
                ticket.email,
                ticket.phone,
                ticket.status,
                ticket.priority,
                String(ticket.id)
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));

            const matchesPriority = priorityFilter === 'all' || (ticket.priority || '') === priorityFilter;
            return matchesQuery && matchesPriority;
        });
    }, [tickets, searchQuery, priorityFilter]);

    const totalRows = filteredTickets.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const currentPage = Math.min(page, totalPages);
    const startIndex = totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
    const pagedTickets = filteredTickets.slice(startIndex, endIndex);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, priorityFilter, rowsPerPage]);

    useEffect(() => {
        if (page !== currentPage) setPage(currentPage);
    }, [page, currentPage]);

    const openTicket = async (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        setDetailOpen(true);
        setReplyMessage('');
        setMessages([]);
        setUserQuarterLimit('');
        setUserYearLimit('');
        await fetchTicketDetail(ticket.id);
    };

    const fetchTicketDetail = async (ticketId: number) => {
        setDetailLoading(true);
        try {
            const res = await fetch(ENDPOINTS.SUPPORT.DETAIL(ticketId));
            if (res.ok) {
                const data = (await res.json()) as TicketDetail;
                setSelectedTicket(data.ticket);
                setMessages(Array.isArray(data.messages) ? data.messages : []);
                const email = String(data.ticket?.email || '').trim();
                if (email) {
                    void fetchUserLimits(email);
                }
            }
        } catch {
            // ignore
        } finally {
            setDetailLoading(false);
        }
    };

    const handleReply = async () => {
        if (!selectedTicket) return;
        const message = replyMessage.trim();
        if (!message) return;
        setSendingReply(true);
        try {
            const formData = new FormData();
            formData.append('message', message);
            const res = await fetch(ENDPOINTS.SUPPORT.REPLY(selectedTicket.id), {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                setReplyMessage('');
                await fetchTicketDetail(selectedTicket.id);
                await fetchTickets();
                refreshSidebarCounts();
            }
        } finally {
            setSendingReply(false);
        }
    };

    const handleUpdateTicket = async () => {
        if (!selectedTicket) return;
        const nextStatus = String(selectedTicket.status || 'open').toLowerCase();
        const nextPriority = String(selectedTicket.priority || 'normal').toLowerCase();
        if (!STATUS_OPTIONS.includes(nextStatus) || !PRIORITY_OPTIONS.includes(nextPriority)) return;

        setUpdatingTicket(true);
        try {
            const res = await fetch(ENDPOINTS.SUPPORT.UPDATE(selectedTicket.id), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: nextStatus,
                    priority: nextPriority,
                }),
            });

            if (!res.ok) return;
            await fetchTicketDetail(selectedTicket.id);
            await fetchTickets();
            refreshSidebarCounts();
        } finally {
            setUpdatingTicket(false);
        }
    };

    const handleSaveUserLimits = async () => {
        if (!selectedTicket?.email) return;
        const email = String(selectedTicket.email).trim().toLowerCase();
        if (!email) return;

        const quarter = Number(userQuarterLimit);
        const year = Number(userYearLimit);

        setUserLimitSaving(true);
        try {
            const tasks: Promise<Response>[] = [];

            if (!Number.isNaN(quarter) && quarter > 0) {
                tasks.push(fetch(ENDPOINTS.TRANSACTION_SETTINGS.USER_LIMITS, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_email: email,
                        channel: 'app',
                        period: 'quarter',
                        currency: 'GBP',
                        limit_amount: quarter,
                    }),
                }));
            }

            if (!Number.isNaN(year) && year > 0) {
                tasks.push(fetch(ENDPOINTS.TRANSACTION_SETTINGS.USER_LIMITS, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_email: email,
                        channel: 'app',
                        period: 'year',
                        currency: 'GBP',
                        limit_amount: year,
                    }),
                }));
            }

            if (tasks.length > 0) {
                await Promise.all(tasks);
            }

            await fetchUserLimits(email);
        } finally {
            setUserLimitSaving(false);
        }
    };

    const handleDeleteTicket = async () => {
        if (!deleteState.ticket) return;
        setDeleteState((prev) => ({ ...prev, loading: true }));
        try {
            const res = await fetch(ENDPOINTS.SUPPORT.DELETE(deleteState.ticket.id), {
                method: 'DELETE',
            });
            if (!res.ok) return;

            const deletingSelected = selectedTicket?.id === deleteState.ticket.id;
            await fetchTickets();
            refreshSidebarCounts();

            if (deletingSelected) {
                setDetailOpen(false);
                setSelectedTicket(null);
                setMessages([]);
            }

            setDeleteState({ open: false, ticket: null, loading: false });
        } finally {
            setDeleteState((prev) => ({ ...prev, loading: false }));
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Help & Support</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Review and respond to mobile help requests.</p>
                </div>
                <button
                    onClick={fetchTickets}
                    className="px-5 py-3 rounded-2xl border-0 glass-effect text-slate-700 dark:text-slate-300 font-bold hover:shadow-lg transition-all group"
                >
                    <span className="flex items-center space-x-2">
                        <RefreshCw className={`w-5 h-5 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </span>
                </button>
            </div>

            <div className="card-glass p-5">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-6">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Search</label>
                        <div className="relative input-icon">
                            <span className="input-icon-left">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                className="input-glass w-full text-sm"
                                placeholder="Ticket number, email, phone, topic, message type..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="xl:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Status</label>
                        <select
                            className="input-glass w-full text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All</option>
                            {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>{toLabelCase(status)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="xl:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 mb-2">Priority</label>
                        <select
                            className="input-glass w-full text-sm"
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                        >
                            <option value="all">All</option>
                            {PRIORITY_OPTIONS.map((priority) => (
                                <option key={priority} value={priority}>{toLabelCase(priority)}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="card-glass overflow-hidden shadow-xl">
                <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-700/50 flex items-center space-x-3">
                    <MessageCircle className="w-6 h-6 text-slate-400" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Support Messages</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Showing {filteredTickets.length} of {tickets.length}
                        </p>
                    </div>
                </div>
                <div className="table-scroll">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 animate-pulse">Loading tickets...</div>
                    ) : (
                        <table className="table-shell">
                            <thead className="table-head">
                                <tr>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Ticket Number</th>
                                    <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Edit"><Edit2 className="w-4 h-4 mx-auto text-slate-400" /></th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Customer</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Topic</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Message Type</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Status</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Priority</th>
                                    <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400">Last Message</th>
                                    <th className="px-2 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400" title="Delete"><Trash2 className="w-4 h-4 mx-auto text-slate-400" /></th>
                                </tr>
                            </thead>
                            <tbody className="table-body">
                                {pagedTickets.map((ticket) => (
                                    <tr key={ticket.id} className="hover:bg-teal-50/30 dark:hover:bg-slate-700/30 transition-colors duration-200">
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 font-medium">
                                            {normalizeText(ticket.ticket_number, `#${ticket.id}`)}
                                        </td>
                                        <td className="px-2 py-4 text-center">
                                            <button
                                                onClick={() => openTicket(ticket)}
                                                className="p-2 rounded-xl hover:bg-white hover:shadow-md dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-all"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-600 dark:text-slate-300">
                                            <div className="flex flex-col gap-1">
                                                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                    {normalizeText(ticket.email || ticket.phone, 'Unknown')}
                                                </span>
                                                <div className="flex flex-col text-xs text-slate-400">
                                                    <span className="flex items-center gap-2"><Mail className="w-3 h-3" />{normalizeText(ticket.email)}</span>
                                                    <span className="flex items-center gap-2"><Phone className="w-3 h-3" />{normalizeText(ticket.phone)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-600 dark:text-slate-300 font-medium">
                                            {normalizeText(ticket.subject, 'Support Request')}
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-600 dark:text-slate-300 font-medium">
                                            {normalizeText(ticket.message_type)}
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`badge-glass ${statusStyles[String(ticket.status || 'open').toLowerCase()] || statusStyles.open}`}>
                                                {toLabelCase(normalizeText(ticket.status, 'open'))}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`badge-glass ${priorityStyles[String(ticket.priority || 'normal').toLowerCase()] || priorityStyles.normal}`}>
                                                {toLabelCase(normalizeText(ticket.priority, 'normal'))}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-300 whitespace-nowrap">
                                            {formatDateTime(ticket.last_message_at || ticket.updated_at || ticket.created_at)}
                                        </td>
                                        <td className="px-2 py-4 text-center">
                                            <button
                                                onClick={() => setDeleteState({ open: true, ticket, loading: false })}
                                                className="p-2 rounded-xl hover:bg-red-50 hover:shadow-md dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setPage(1); }}
                />
            </div>

            <Modal
                isOpen={detailOpen}
                onClose={() => setDetailOpen(false)}
                title={selectedTicket ? normalizeText(selectedTicket.ticket_number, `Ticket #${selectedTicket.id}`) : 'Ticket'}
                size="lg"
            >
                {detailLoading || !selectedTicket ? (
                    <div className="py-12 text-center text-slate-500">Loading ticket...</div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-2xl glass-effect border border-white/20">
                                <p className="text-xs text-slate-400">Status</p>
                                <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                                    {toLabelCase(normalizeText(selectedTicket.status, 'open'))}
                                </p>
                            </div>
                            <div className="p-4 rounded-2xl glass-effect border border-white/20">
                                <p className="text-xs text-slate-400">Priority</p>
                                <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                                    {toLabelCase(normalizeText(selectedTicket.priority, 'normal'))}
                                </p>
                            </div>
                            <div className="p-4 rounded-2xl glass-effect border border-white/20">
                                <p className="text-xs text-slate-400">Message Type</p>
                                <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                                    {normalizeText(selectedTicket.message_type)}
                                </p>
                            </div>
                            <div className="p-4 rounded-2xl glass-effect border border-white/20">
                                <p className="text-xs text-slate-400">Last message</p>
                                <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                                    {formatDateTime(selectedTicket.last_message_at || selectedTicket.updated_at)}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-2">Update Status</label>
                                <select
                                    className="input-glass w-full"
                                    value={String(selectedTicket.status || 'open').toLowerCase()}
                                    onChange={(e) => setSelectedTicket((prev) => prev ? { ...prev, status: e.target.value } : prev)}
                                >
                                    {STATUS_OPTIONS.map((status) => (
                                        <option key={status} value={status}>{toLabelCase(status)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-2">Update Priority</label>
                                <select
                                    className="input-glass w-full"
                                    value={String(selectedTicket.priority || 'normal').toLowerCase()}
                                    onChange={(e) => setSelectedTicket((prev) => prev ? { ...prev, priority: e.target.value } : prev)}
                                >
                                    {PRIORITY_OPTIONS.map((priority) => (
                                        <option key={priority} value={priority}>{toLabelCase(priority)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <div className="w-full rounded-2xl border border-dashed border-slate-200/70 dark:border-slate-700/70 p-4 text-xs text-slate-400 dark:text-slate-300">
                                    Update ticket status and priority before sending a reply if needed.
                                </div>
                            </div>
                        </div>

                        {String(selectedTicket.email || '').trim() !== '' && (
                            <div className="card-glass p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">User Transaction Limits (App)</h3>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                            Set additional per-user limits for this customer. These are added on top of the global transaction settings.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void fetchUserLimits(String(selectedTicket.email))}
                                        className="glass-effect inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-teal-600 dark:text-slate-200 dark:hover:text-teal-300"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${userLimitLoading ? 'animate-spin' : ''}`} />
                                        Refresh
                                    </button>
                                </div>

                                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-2">Additional 3 Month Limit (GBP)</label>
                                        <input
                                            className="input-glass w-full"
                                            inputMode="decimal"
                                            placeholder={userLimitLoading ? 'Loading…' : '0.00'}
                                            value={userQuarterLimit}
                                            onChange={(e) => setUserQuarterLimit(e.target.value)}
                                            disabled={userLimitLoading}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-2">Additional Yearly Limit (GBP)</label>
                                        <input
                                            className="input-glass w-full"
                                            inputMode="decimal"
                                            placeholder={userLimitLoading ? 'Loading…' : '0.00'}
                                            value={userYearLimit}
                                            onChange={(e) => setUserYearLimit(e.target.value)}
                                            disabled={userLimitLoading}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => void handleSaveUserLimits()}
                                            disabled={userLimitLoading || userLimitSaving || (!userQuarterLimit.trim() && !userYearLimit.trim())}
                                            className="btn-primary rounded-full px-6 py-3 text-sm font-bold disabled:opacity-50"
                                        >
                                            {userLimitSaving ? 'Saving…' : 'Save Limits'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Conversation</h3>
                            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2">
                                {messages.map((msg) => {
                                    const isAdmin = msg.sender_type === 'admin';
                                    return (
                                        <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm ${isAdmin
                                                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                                                : 'bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                                                }`}>
                                                <div className="flex items-center gap-2 text-xs opacity-80 mb-1">
                                                    {isAdmin ? 'Admin Reply' : 'Customer'} · {formatDateTime(msg.created_at)}
                                                </div>
                                                <p>{msg.message}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {messages.length === 0 && (
                                    <div className="text-sm text-slate-400">No messages yet.</div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Reply</h3>
                            <textarea
                                rows={3}
                                className="input-glass w-full"
                                placeholder="Write a response to the customer..."
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleReply}
                                    disabled={!replyMessage.trim() || sendingReply}
                                    className="btn-primary flex items-center gap-2 shadow-lg shadow-teal-500/20 disabled:opacity-60"
                                >
                                    <Send className="w-4 h-4" />
                                    {sendingReply ? 'Sending...' : 'Send Reply'}
                                </button>
                            </div>
                        </div>

                        <div className="dialog-actions border-t border-slate-100 pt-4 dark:border-slate-700/50">
                            <button
                                type="button"
                                onClick={() => setDeleteState({ open: true, ticket: selectedTicket, loading: false })}
                                className="btn-secondary text-sm text-rose-600 dark:text-rose-300"
                            >
                                Delete Chat
                            </button>
                            <button
                                type="button"
                                onClick={() => setDetailOpen(false)}
                                className="btn-secondary text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleUpdateTicket}
                                disabled={updatingTicket}
                                className="btn-primary text-sm disabled:opacity-60 flex items-center justify-center gap-2 px-5 py-3 rounded-full"
                            >
                                <Save className="w-4 h-4" />
                                {updatingTicket ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            <ConfirmModal
                isOpen={deleteState.open}
                onClose={() => setDeleteState({ open: false, ticket: null, loading: false })}
                onConfirm={handleDeleteTicket}
                title="Delete Support Chat"
                message={`Delete support chat ${normalizeText(deleteState.ticket?.ticket_number, `#${deleteState.ticket?.id ?? ''}`)}? This will remove the full conversation.`}
                confirmText="Delete"
                type="danger"
                loading={deleteState.loading}
            />
        </div>
    );
}
