'use client';

import React, { useState, useEffect } from 'react';
import { ENDPOINTS } from '@/app/lib/api';
import { Filter, Download, Clock, Search, AlertCircle, CheckCircle, XCircle, User, Phone, Calendar, FileText, Shield } from 'lucide-react';

export default function KYCPage() {
    const [filterStatus, setFilterStatus] = useState('all');
    const [remitters, setRemitters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRemitters();
    }, []);

    const fetchRemitters = async () => {
        try {
            const res = await fetch(ENDPOINTS.REMITTERS.LIST);
            if (res.ok) {
                const data = await res.json();
                setRemitters(data);
            }
        } catch (error) {
            console.error('Failed to fetch remitters:', error);
        } finally {
            setLoading(false);
        }
    };

    const mapStatus = (status: string) => {
        if (status === 'verified') return 'approved';
        return status || 'pending';
    };

    const processedApplications = remitters.map(r => ({
        id: r.id.toString(),
        user: r.name,
        email: r.email,
        phone: r.phone,
        submittedDate: new Date(r.created_at).toLocaleString(),
        status: mapStatus(r.kyc_status),
        documents: r.documents ? JSON.parse(r.documents) : ['Identity Proof'],
        riskLevel: r.risk_level || 'low',
        country: r.country || 'UK'
    }));

    const statusConfig = {
        all: { label: 'All Applications', count: processedApplications.length, icon: Shield },
        pending: { label: 'Pending', count: processedApplications.filter(k => k.status === 'pending').length, icon: Clock },
        in_review: { label: 'In Review', count: processedApplications.filter(k => k.status === 'in_review').length, icon: Search },
        needs_info: { label: 'Needs Info', count: processedApplications.filter(k => k.status === 'needs_info').length, icon: AlertCircle },
        approved: { label: 'Approved', count: processedApplications.filter(k => k.status === 'approved').length, icon: CheckCircle },
        rejected: { label: 'Rejected', count: processedApplications.filter(k => k.status === 'rejected').length, icon: XCircle },
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            in_review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            needs_info: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        return styles[status as keyof typeof styles] || styles.pending;
    };

    const getRiskBadge = (risk: string) => {
        const styles = {
            low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        return styles[risk as keyof typeof styles];
    };

    const formatStatus = (status: string) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const filteredApplications = processedApplications.filter(app =>
        filterStatus === 'all' || app.status === filterStatus
    );

    if (loading) {
        return <div className="p-12 text-center text-slate-500 animate-pulse">Loading KYC applications...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">KYC Reviews</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Review and verify remitter documents</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button className="px-5 py-3 rounded-2xl border-0 glass-effect text-slate-700 dark:text-slate-300 font-bold hover:shadow-lg transition-all flex items-center space-x-2">
                        <Filter className="w-5 h-5" />
                        <span>Filters</span>
                    </button>
                    <button className="btn-primary flex items-center space-x-2 shadow-lg shadow-slate-900/20 hover:shadow-slate-900/40 border-0 bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                        <Download className="w-5 h-5" />
                        <span>Export Report</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { title: 'Pending Review', count: statusConfig.pending.count, icon: Clock, color: 'amber' },
                    { title: 'In Review', count: statusConfig.in_review.count, icon: Search, color: 'blue' },
                    { title: 'Needs Info', count: statusConfig.needs_info.count, icon: AlertCircle, color: 'orange' },
                    { title: 'Approved Today', count: statusConfig.approved.count, icon: CheckCircle, color: 'emerald' },
                ].map((stat, i) => (
                    <div key={i} className="card-glass p-6 rounded-[2rem] hover:scale-[1.02] transition-transform duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{stat.title}</p>
                                <p className={`text-3xl font-black text-slate-900 dark:text-white`}>{stat.count}</p>
                            </div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg bg-gradient-to-br from-${stat.color}-400 to-${stat.color}-600`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card-glass p-1.5 rounded-full inline-flex flex-wrap w-full md:w-auto overflow-hidden">
                <div className="flex items-center space-x-1 overflow-x-auto p-1 no-scrollbar w-full">
                    {Object.entries(statusConfig).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                            <button
                                key={key}
                                onClick={() => setFilterStatus(key)}
                                className={`px-5 py-3 rounded-full font-bold text-sm whitespace-nowrap transition-all duration-300 ${filterStatus === key
                                    ? 'bg-white shadow-md text-slate-900 dark:bg-slate-700 dark:text-white'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
                                    }`}
                            >
                                <span className="flex items-center space-x-2">
                                    <Icon className="w-4 h-4" />
                                    <span>{config.label}</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${filterStatus === key
                                        ? 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500'
                                        }`}>
                                        {config.count}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredApplications.length > 0 ? filteredApplications.map((app) => (
                    <div
                        key={app.id}
                        className="card-glass p-8 rounded-[2.5rem] hover:shadow-xl transition-all duration-300 group"
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-white shadow-inner flex items-center justify-center text-slate-400 font-bold text-2xl group-hover:scale-110 transition-transform duration-500">
                                    {app.user.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{app.user}</h3>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center mt-1">
                                        <Shield className="w-3 h-3 mr-1" />
                                        {app.country}
                                    </p>
                                </div>
                            </div>
                            <span className={`badge-glass px-3 py-1 rounded-full uppercase tracking-wider text-[10px] font-extrabold ${getStatusBadge(app.status)}`}>
                                {formatStatus(app.status)}
                            </span>
                        </div>

                        <div className="space-y-4 mb-6 bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-3xl border border-white/20">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 font-medium flex items-center">
                                    <Phone className="w-4 h-4 mr-2" />
                                    Phone
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white">{app.phone}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 font-medium flex items-center">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Submitted
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white">{app.submittedDate}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 font-medium flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    Risk Level
                                </span>
                                <span className={`badge-glass px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${getRiskBadge(app.riskLevel)}`}>
                                    {app.riskLevel}
                                </span>
                            </div>
                        </div>

                        <div className="mb-8">
                            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 ml-2">Documents</p>
                            <div className="flex flex-wrap gap-2">
                                {app.documents.map((doc: string, idx: number) => (
                                    <span
                                        key={idx}
                                        className="badge-glass px-4 py-2 rounded-full text-slate-600 dark:text-slate-300 text-sm font-bold flex items-center space-x-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                                    >
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        <span>{doc}</span>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex space-x-3 pt-2">
                            <button className="flex-1 btn-primary py-4 text-sm font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40">
                                Review Application
                            </button>
                            <button className="px-6 py-4 rounded-2xl glass-effect border-2 border-slate-100 hover:border-slate-200 text-slate-600 font-bold transition-all text-sm hover:shadow-lg">
                                Details
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 px-6 text-center">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Applications Found</h3>
                        <p className="text-slate-500">Try adjusting your filters to see more results.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
