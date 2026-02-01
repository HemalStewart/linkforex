'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isLoadingNav, setIsLoadingNav] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
        'Operations': true,
        'Management': true
    });

    const [counts, setCounts] = useState({
        transfers: 0,
        remitters: 0,
        receivers: 0,
        users: 0,
        branches: 0,
        kyc: 0
    });

    const pathname = usePathname();
    const router = useRouter();

    React.useEffect(() => {
        const fetchCounts = async () => {
            const timestamp = Date.now();
            try {
                // Parallel fetch for dashboard counts
                const [tRes, rRes, bRes, uRes, brRes] = await Promise.allSettled([
                    fetch(`${ENDPOINTS.TRANSFERS.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.REMITTERS.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.BENEFICIARIES.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.USERS.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.BRANCHES.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : [])
                ]);

                const getCount = (res: PromiseSettledResult<any>) =>
                    res.status === 'fulfilled' && Array.isArray(res.value) ? res.value.length : 0;

                // For KYC, we need to filter remitters (since kyc is usually on remitter/customer)
                // Or users? Usually remitters have KYC.
                // Let's assume remitters endpoint returns objects with kyc_status.
                let kycCount = 0;
                if (rRes.status === 'fulfilled' && Array.isArray(rRes.value)) {
                    kycCount = rRes.value.filter((r: any) => r.kyc_status === 'pending').length;
                }

                setCounts({
                    transfers: getCount(tRes),
                    remitters: getCount(rRes),
                    receivers: getCount(bRes),
                    users: getCount(uRes),
                    branches: getCount(brRes),
                    kyc: kycCount
                });

            } catch (e) {
                // Silent fail
            }
        };
        // Only fetch if NOT login page
        if (!pathname.startsWith('/admin/login')) {
            fetchCounts();
        }
    }, [pathname]); // Depend on pathname so it updates on navigation if needed, or stick to empty array and rely on layout remount? 
    // Actually, DashboardLayout might not unmount on nav. 
    // Better to depend on pathname to refresh counts on navigation? Or just run once.
    // The previous implementation ran once. I'll stick to once or maybe pathname if I want live updates.
    // I'll add [pathname] to be safe so it refreshes when user navigates around.

    React.useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            try {
                setCurrentUser(JSON.parse(stored));
            } catch (e) { }
        }
    }, []);

    // Initial Auth Check
    React.useEffect(() => {
        if (!pathname.startsWith('/admin/login')) {
            const user = localStorage.getItem('user');
            if (!user) {
                router.replace('/admin/login');
            } else {
                setIsLoadingNav(false);
            }
        }
    }, [pathname, router]);

    if (pathname.startsWith('/admin/login')) {
        return <>{children}</>;
    }

    // While checking auth, show nothing or a spinner to prevent flashing content
    if (isLoadingNav) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">Loading...</div>;

    const toggleMenu = (name: string) => {
        setExpandedMenus(prev => ({
            ...prev,
            [name]: !prev[name]
        }));
    };



    const navigation = [
        {
            name: 'Dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            ),
            href: '/admin/dashboard'
        },
        {
            name: 'Operations',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            children: [
                { name: 'Transfers', href: '/admin/transfers', badge: counts.transfers > 0 ? counts.transfers.toString() : undefined },
                { name: 'Remitters', href: '/admin/remitters', badge: counts.remitters > 0 ? counts.remitters.toString() : undefined },
                { name: 'Mobile App Users', href: '/admin/mobile-users' },
                { name: 'Receivers', href: '/admin/receivers', badge: counts.receivers > 0 ? counts.receivers.toString() : undefined },
                { name: 'KYC Reviews', href: '/admin/kyc', badge: counts.kyc > 0 ? counts.kyc.toString() : undefined },
            ]
        },
        {
            name: 'Management',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
            children: [
                { name: 'System Users', href: '/admin/users', badge: counts.users > 0 ? counts.users.toString() : undefined },
                { name: 'Roles & Permissions', href: '/admin/roles' },
                { name: 'Branches', href: '/admin/branches', badge: counts.branches > 0 ? counts.branches.toString() : undefined },
                { name: 'Countries', href: '/admin/countries' },
                { name: 'Currencies', href: '/admin/currencies' },
            ]
        },
        {
            name: 'System',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
            ),
            children: [
                { name: 'Reports', href: '/admin/reports' },
                { name: 'Settings', href: '/admin/settings' },
            ]
        }
    ];

    return (
        <div className="flex h-screen overflow-hidden font-sans antialiased text-slate-900 dark:text-white relative">
            {/* Animated Background */}
            <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 -z-10"></div>

            {/* Sidebar */}
            <aside className={`flex flex-col glass-effect-strong border-r border-white/20 dark:border-slate-700/50 transition-all duration-500 ease-in-out ${sidebarOpen ? 'w-72' : 'w-20'} animate-slide-in-left z-20`}>
                {/* Logo */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-white/30 dark:border-slate-700/50">
                    {sidebarOpen && (
                        <div className="flex items-center space-x-3 animate-fade-in">
                            <img src="/logo-removebg-preview.png" alt="LinkForex" className="h-10 object-contain" />
                        </div>
                    )}
                    {!sidebarOpen && (
                        <div className="flex items-center justify-center w-full">
                            <img src="/logo-removebg-preview.png" alt="LinkForex" className="h-10 object-contain" />
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded-xl glass-effect hover:scale-110 transition-all duration-300 text-sky-500 dark:text-sky-400 hover-glow"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    {navigation.map((item, idx) => {
                        const isChildActive = item.children?.some(child => pathname === child.href || pathname.startsWith(child.href!));
                        const isActive = pathname === item.href || isChildActive;
                        const isExpanded = expandedMenus[item.name];

                        if (item.children) {
                            return (
                                <div key={item.name} className="mb-2 stagger-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                                    <button
                                        onClick={() => sidebarOpen ? toggleMenu(item.name) : setSidebarOpen(true)}
                                        className={`w-full flex items-center ${sidebarOpen ? 'justify-between px-4' : 'justify-center px-2'} py-3 rounded-xl transition-all duration-300 group ${isActive
                                            ? 'glass-effect text-sky-600 dark:text-sky-400 font-semibold shadow-lg'
                                            : 'text-slate-600 dark:text-slate-400 hover:glass-effect hover:text-sky-600 dark:hover:text-sky-400 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <span className={`transition-all duration-300 ${isActive ? 'text-sky-500 scale-110' : 'group-hover:text-sky-500 group-hover:scale-110'}`}>
                                                {item.icon}
                                            </span>
                                            {sidebarOpen && <span className="tracking-tight">{item.name}</span>}
                                        </div>
                                        {sidebarOpen && (
                                            <svg className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        )}
                                    </button>

                                    {/* Submenu Items */}
                                    {sidebarOpen && isExpanded && (
                                        <div className="mt-1 ml-4 pl-4 border-l-2 border-sky-200/50 dark:border-sky-800/50 space-y-1 animate-slide-down">
                                            {item.children.map((child: any) => {
                                                const isChildItemActive = pathname === child.href;
                                                return (
                                                    <Link
                                                        key={child.name}
                                                        href={child.href!}
                                                        className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-300 text-sm font-medium hover-lift ${isChildItemActive
                                                            ? 'bg-blue-gradient text-white shadow-lg'
                                                            : 'text-slate-600 dark:text-slate-400 hover:glass-effect hover:text-sky-600 dark:hover:text-sky-400'
                                                            }`}
                                                    >
                                                        <span>{child.name}</span>
                                                        {child.badge && (
                                                            <span className={`badge-glass animate-pulse-glow ${isChildItemActive
                                                                ? 'bg-white/30 text-white'
                                                                : 'bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400'
                                                                }`}>
                                                                {child.badge}
                                                            </span>
                                                        )}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.name}
                                href={item.href!}
                                className={`flex items-center ${sidebarOpen ? 'justify-between px-4' : 'justify-center px-2'} py-3 rounded-xl transition-all duration-300 mb-2 group hover-lift stagger-item ${isActive
                                    ? 'bg-blue-gradient text-white shadow-xl'
                                    : 'text-slate-600 dark:text-slate-400 hover:glass-effect hover:text-sky-600 dark:hover:text-sky-400'
                                    }`}
                                style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                                <div className="flex items-center space-x-3">
                                    <span className={`transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                        {item.icon}
                                    </span>
                                    {sidebarOpen && <span className="font-semibold tracking-tight">{item.name}</span>}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-white/30 dark:border-slate-700/50 relative">
                    {userMenuOpen && (
                        <div className="absolute bottom-full left-4 right-4 mb-2 glass-effect-strong rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                            <button
                                onClick={() => {
                                    localStorage.removeItem('user');
                                    router.replace('/admin/login');
                                }}
                                className="flex items-center space-x-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 w-full text-left group"
                            >
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span className="font-semibold text-sm">Sign Out</span>
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className={`w-full flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center'} p-3 rounded-xl glass-effect hover:shadow-lg transition-all duration-300 hover-lift`}
                    >
                        <div className="w-9 h-9 rounded-full bg-blue-gradient flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg">
                            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 text-left overflow-hidden">
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {currentUser?.name || 'User'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {currentUser?.role || 'Guest'}
                                </p>
                            </div>
                        )}
                        {sidebarOpen && (
                            <svg className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Top Header */}
                <header className="h-16 glass-effect-strong border-b border-white/30 dark:border-slate-700/50 flex items-center justify-between px-6 z-10 animate-slide-down backdrop-blur-2xl">
                    <div className="flex-1 max-w-xl">
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-sky-400 transition-all duration-300 group-focus-within:text-sky-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Search..."
                                className="input-glass w-full pl-11 pr-4 py-2.5 text-sm focus:scale-[1.02] transition-all duration-300"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button className="p-2.5 glass-effect rounded-xl text-slate-600 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-all duration-300 relative hover-lift group">
                            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
                        </button>
                        <Link href="/admin/transfers/create" className="btn-primary">
                            <span className="flex items-center space-x-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>New Transfer</span>
                            </span>
                        </Link>
                    </div>
                </header>

                {/* Main Page Scrollable Area */}
                <main className="flex-1 overflow-y-auto p-6 relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
