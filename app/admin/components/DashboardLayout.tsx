'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/app/lib/api';
import {
    LayoutGrid,
    Layers,
    Users,
    Smartphone,
    UserCheck,
    ShieldCheck,
    Settings,
    Shield,
    Building2,
    Globe,
    Coins,
    Cpu,
    BarChart3,
    LogOut,
    Menu,
    ChevronLeft,
    ChevronRight,
    Search,
    Bell,
    PlusCircle,
    ArrowRightLeft,
    FileText
} from 'lucide-react';

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

                // For KYC, we need to filter remitters
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
    }, [pathname]);

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
            icon: <LayoutGrid className="w-5 h-5" />,
            href: '/admin/dashboard'
        },
        {
            name: 'Operations',
            icon: <Layers className="w-5 h-5" />,
            children: [
                { name: 'Transfers', href: '/admin/transfers', badge: counts.transfers > 0 ? counts.transfers.toString() : undefined, icon: <ArrowRightLeft className="w-4 h-4" /> },
                { name: 'Remitters', href: '/admin/remitters', badge: counts.remitters > 0 ? counts.remitters.toString() : undefined, icon: <Users className="w-4 h-4" /> },
                { name: 'Mobile App Users', href: '/admin/mobile-users', icon: <Smartphone className="w-4 h-4" /> },
                { name: 'Receivers', href: '/admin/receivers', badge: counts.receivers > 0 ? counts.receivers.toString() : undefined, icon: <UserCheck className="w-4 h-4" /> },
                { name: 'KYC Reviews', href: '/admin/kyc', badge: counts.kyc > 0 ? counts.kyc.toString() : undefined, icon: <ShieldCheck className="w-4 h-4" /> },
            ]
        },
        {
            name: 'Management',
            icon: <Settings className="w-5 h-5" />,
            children: [
                { name: 'System Users', href: '/admin/users', badge: counts.users > 0 ? counts.users.toString() : undefined, icon: <Users className="w-4 h-4" /> },
                { name: 'Roles & Permissions', href: '/admin/roles', icon: <Shield className="w-4 h-4" /> },
                { name: 'Branches', href: '/admin/branches', badge: counts.branches > 0 ? counts.branches.toString() : undefined, icon: <Building2 className="w-4 h-4" /> },
                { name: 'Countries', href: '/admin/countries', icon: <Globe className="w-4 h-4" /> },
                { name: 'Currencies', href: '/admin/currencies', icon: <Coins className="w-4 h-4" /> },
            ]
        },
        {
            name: 'System',
            icon: <Cpu className="w-5 h-5" />,
            children: [
                { name: 'Reports', href: '/admin/reports', icon: <BarChart3 className="w-4 h-4" /> },
                { name: 'Settings', href: '/admin/settings', icon: <Settings className="w-4 h-4" /> },
            ]
        }
    ];

    return (
        <div className="flex h-screen overflow-hidden font-sans antialiased text-slate-900 dark:text-white relative">
            {/* Animated Background with Teal Gradient */}
            <div className="fixed inset-0 bg-gradient-to-br from-teal-50 via-slate-50 to-blue-100 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950 -z-10"></div>

            {/* Sidebar with Glass Effect and Round Corners */}
            <aside className={`flex flex-col glass-effect-strong border-r border-white/20 dark:border-slate-700/50 transition-all duration-500 ease-in-out my-4 ml-4 rounded-[2rem] shadow-2xl z-20 ${sidebarOpen ? 'w-72' : 'w-24'} animate-slide-in-left`}>
                {/* Logo */}
                <div className="h-24 flex items-center justify-between px-6 border-b border-white/10 dark:border-slate-700/50">
                    {sidebarOpen && (
                        <div className="flex items-center space-x-3 animate-fade-in">
                            <img src="/logo-removebg-preview.png" alt="LinkForex" className="h-10 object-contain drop-shadow-md" />
                        </div>
                    )}
                    {!sidebarOpen && (
                        <div className="flex items-center justify-center w-full">
                            <img src="/logo-removebg-preview.png" alt="LinkForex" className="h-10 object-contain drop-shadow-md" />
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto no-scrollbar">
                    {navigation.map((item, idx) => {
                        const isChildActive = item.children?.some(child => pathname === child.href || pathname.startsWith(child.href!));
                        const isActive = pathname === item.href || isChildActive;
                        const isExpanded = expandedMenus[item.name];

                        if (item.children) {
                            return (
                                <div key={item.name} className="mb-2 stagger-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                                    <button
                                        onClick={() => sidebarOpen ? toggleMenu(item.name) : setSidebarOpen(true)}
                                        className={`w-full flex items-center ${sidebarOpen ? 'justify-between px-5' : 'justify-center px-2'} py-3.5 rounded-2xl transition-all duration-300 group ${isActive
                                            ? 'glass-effect text-cyan-600 dark:text-cyan-400 font-bold shadow-lg ring-1 ring-cyan-500/20'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-800/40 hover:text-cyan-600 dark:hover:text-cyan-400'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-3.5">
                                            <span className={`transition-all duration-300 ${isActive ? 'text-cyan-500 scale-110 drop-shadow-md' : 'group-hover:text-cyan-500 group-hover:scale-110'}`}>
                                                {item.icon}
                                            </span>
                                            {sidebarOpen && <span className="tracking-wide text-[15px]">{item.name}</span>}
                                        </div>
                                        {sidebarOpen && (
                                            <ChevronRight className={`w-4 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} strokeWidth={2.5} />
                                        )}
                                    </button>

                                    {/* Submenu Items */}
                                    {sidebarOpen && isExpanded && (
                                        <div className="mt-2 ml-5 pl-5 border-l-2 border-cyan-200/50 dark:border-cyan-800/50 space-y-1.5 animate-slide-down">
                                            {item.children.map((child: any) => {
                                                const isChildItemActive = pathname === child.href;
                                                return (
                                                    <Link
                                                        key={child.name}
                                                        href={child.href!}
                                                        className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300 text-[14px] font-medium hover-lift ${isChildItemActive
                                                            ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                                                            : 'text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-800/40 hover:text-cyan-600 dark:hover:text-cyan-400'
                                                            }`}
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            {/* Optional icons for submenus if wanted, user asked for icons everywhere */}
                                                            {/* {child.icon && <span className="opacity-70">{child.icon}</span>} */}
                                                            <span>{child.name}</span>
                                                        </div>
                                                        {child.badge && (
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold shadow-sm ${isChildItemActive
                                                                ? 'bg-white/20 text-white backdrop-blur-md'
                                                                : 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400'
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
                                className={`flex items-center ${sidebarOpen ? 'justify-between px-5' : 'justify-center px-2'} py-3.5 rounded-2xl transition-all duration-300 mb-2 group hover-lift stagger-item ${isActive
                                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-800/40 hover:text-cyan-600 dark:hover:text-cyan-400'
                                    }`}
                                style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                                <div className="flex items-center space-x-3.5">
                                    <span className={`transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                        {item.icon}
                                    </span>
                                    {sidebarOpen && <span className="font-bold tracking-wide text-[15px]">{item.name}</span>}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Footer / Toggle */}
                <div className="p-4 border-t border-white/10 dark:border-slate-700/50">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className={`w-full flex items-center ${sidebarOpen ? 'justify-end' : 'justify-center'} p-2 text-slate-400 hover:text-cyan-500 transition-colors`}
                    >
                        {sidebarOpen ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                    </button>
                </div>


                {/* User Profile */}
                <div className="p-4 border-t border-white/10 dark:border-slate-700/50 relative mb-2">
                    {userMenuOpen && (
                        <div className="absolute bottom-[110%] left-4 right-4 mb-2 glass-effect-strong rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-white/20">
                            <button
                                onClick={() => {
                                    localStorage.removeItem('user');
                                    router.replace('/admin/login');
                                }}
                                className="flex items-center space-x-3 px-5 py-3.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 w-full text-left group"
                            >
                                <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="font-semibold text-sm">Sign Out</span>
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className={`w-full flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center'} p-3 rounded-2xl glass-effect hover:shadow-lg transition-all duration-300 hover-lift`}
                    >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg ring-2 ring-white/30">
                            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 text-left overflow-hidden">
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {currentUser?.name || 'User'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate opacity-80">
                                    {currentUser?.role || 'Guest'}
                                </p>
                            </div>
                        )}
                        {sidebarOpen && (
                            <div className="text-slate-400">
                                {/* Using a simplified indicator or small icon */}
                                <div className={`w-1.5 h-1.5 rounded-full bg-slate-400/50 ${userMenuOpen ? 'bg-cyan-500' : ''}`}></div>
                            </div>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Top Header */}
                <header className="h-20 glass-effect-strong border-b border-white/20 dark:border-slate-700/50 flex items-center justify-between px-8 z-10 animate-slide-down backdrop-blur-3xl m-4 rounded-[2rem] shadow-sm">
                    <div className="flex-1 max-w-xl">
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 transition-all duration-300 group-focus-within:text-cyan-500">
                                <Search className="w-5 h-5" />
                            </span>
                            <input
                                type="text"
                                placeholder="Search everything..."
                                className="input-glass w-full pl-12 pr-4 py-3 text-sm focus:scale-[1.01] transition-all duration-300 bg-white/40 dark:bg-slate-800/40 border-0 shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-5">
                        <button className="p-3 glass-effect rounded-2xl text-slate-500 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-all duration-300 relative hover-lift group">
                            <Bell className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
                        </button>
                        <Link href="/admin/transfers/create" className="btn-primary flex items-center space-x-2 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40">
                            <PlusCircle className="w-5 h-5" />
                            <span>New Transfer</span>
                        </Link>
                    </div>
                </header>

                {/* Main Page Scrollable Area */}
                <main className="flex-1 overflow-y-auto px-6 pb-6 pt-0 relative no-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    );
}
