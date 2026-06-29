'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Newspaper, RefreshCcw, Send, ShieldAlert, ShieldCheck, Smartphone } from 'lucide-react';
import { ENDPOINTS } from '@/app/lib/api';
import type { Overview } from '../_shared';

export default function MobileControlOverviewPage() {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<Overview>({
        mobile_users_total: 0,
        kyc_pending: 0,
        kyc_verified: 0,
        inactive_users: 0,
        campaigns_sent: 0,
        active_ads: 0,
        wallet_awaiting_funds: 0,
        wallet_funds_received: 0,
        wallet_processing: 0,
    });

    const loadOverview = async () => {
        setLoading(true);
        try {
            const res = await fetch(ENDPOINTS.MOBILE_ADMIN.OVERVIEW);
            if (!res.ok) return;
            const data = await res.json();
            setOverview((prev) => ({ ...prev, ...data }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOverview();
    }, []);

    const cards = [
        { label: 'Mobile Users', value: overview.mobile_users_total, icon: <Smartphone className="h-4 w-4" /> },
        { label: 'KYC Pending', value: overview.kyc_pending, icon: <ShieldAlert className="h-4 w-4" /> },
        { label: 'KYC Verified', value: overview.kyc_verified, icon: <ShieldCheck className="h-4 w-4" /> },
        { label: 'Inactive', value: overview.inactive_users, icon: <Bell className="h-4 w-4" /> },
        { label: 'Campaigns Sent', value: overview.campaigns_sent, icon: <Send className="h-4 w-4" /> },
        { label: 'Active Ads', value: overview.active_ads, icon: <Newspaper className="h-4 w-4" /> },
        { label: 'Awaiting Funds', value: overview.wallet_awaiting_funds, icon: <ShieldAlert className="h-4 w-4" /> },
        { label: 'Funds Received', value: overview.wallet_funds_received, icon: <ShieldCheck className="h-4 w-4" /> },
        { label: 'Wallet Processing', value: overview.wallet_processing, icon: <RefreshCcw className="h-4 w-4" /> },
    ];

    const shortcuts = [
        { href: '/admin/mobile-users/control/app-flow-settings', title: 'App Flow Settings', description: 'OTP, verification, liveness and provider setup.' },
        { href: '/admin/mobile-users/control/exchange-rates', title: 'Customer Digital Rates', description: 'Choose which branch-backed digital rates appear in the app and on home cards.' },
        { href: '/admin/mobile-users/control/user-rates', title: 'User Rates', description: 'Optional VIP user-specific digital rate overrides.' },
        { href: '/admin/mobile-users/control/wallet-transfers', title: 'Wallet Funding Queue', description: 'Review wallet-funded mobile transfers and update manual settlement status.' },
        { href: '/admin/mobile-users/control/profile-review-queue', title: 'Profile Review Queue', description: 'Review and approve/reject pending mobile profiles.' },
        { href: '/admin/mobile-users/control/campaigns', title: 'Campaigns', description: 'Create and send push/email campaigns.' },
        { href: '/admin/mobile-users/control/in-app-ads', title: 'Onboarding & Carousel', description: 'Create and manage onboarding slides and homepage carousel content shown in the app.' },
    ];

    return (
        <div className="mx-auto max-w-7xl space-y-8 pb-20 animate-fade-in-up">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Mobile Control Overview</h1>
                    <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">
                        Use the submenu to manage each mobile-control area separately.
                    </p>
                </div>
                <button
                    onClick={loadOverview}
                    className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 hover:scale-105 active:scale-95 transition-all duration-150 group border-0 bg-gradient-to-r from-teal-500 to-teal-600 text-white"
                >
                    <RefreshCcw className={`h-4 w-4 group-hover:spin-slow ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-9">
                {cards.map((card) => (
                    <div key={card.label} className="card-glass p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                            {card.icon}
                            {card.label}
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{loading ? '-' : card.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {shortcuts.map((item) => (
                    <Link key={item.href} href={item.href} className="card-glass p-6 hover-lift">
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{item.title}</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
