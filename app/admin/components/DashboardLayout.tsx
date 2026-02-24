'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ENDPOINTS, isApiRequestUrl } from '@/app/lib/api';
import { clearStoredUser, getStoredUserRaw } from '@/app/lib/authStorage';
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
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Moon,
    Search,
    Bell,
    PlusCircle,
    ArrowRightLeft,
    FileText,
    AlertTriangle,
    Sun,
    User
} from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

interface CurrentUser {
    id?: string | number;
    name?: string;
    email?: string;
    username?: string;
    role?: string;
    system_defined?: string;
}

interface NavChild {
    name: string;
    href?: string;
    badge?: string;
    icon?: React.ReactNode;
    sections?: string[];
}

interface NavItem {
    name: string;
    icon: React.ReactNode;
    href?: string;
    children?: NavChild[];
    sections?: string[];
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [headerUserMenuOpen, setHeaderUserMenuOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [isLoadingNav, setIsLoadingNav] = useState(true);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const headerUserMenuRef = React.useRef<HTMLDivElement | null>(null);
    const originalFetchRef = React.useRef<typeof window.fetch | null>(null);
    const signOffSentRef = React.useRef(false);
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
        'Operations': true,
        'Management': true,
        'Mobile Operations': true
    });

    const [counts, setCounts] = useState({
        transfers: 0,
        remitters: 0,
        receivers: 0,
        users: 0,
        branches: 0,
        branchCurrencyRates: 0,
        roles: 0,
        permissionGroups: 0,
        branchAccessFlags: 0,
        kyc: 0
    });
    const [isPrivilegedUser, setIsPrivilegedUser] = useState(false);
    const [viewSections, setViewSections] = useState<Set<string>>(new Set());

    const pathname = usePathname();
    const router = useRouter();
    const isLoginPage = pathname.startsWith('/admin/login');

    const buildSignOffPayload = React.useCallback((note: string) => {
        const stored = getStoredUserRaw();
        if (!stored) return null;
        try {
            const user: CurrentUser = JSON.parse(stored);
            return {
                user_id: user.id,
                username: user.username || user.email || user.name,
                sign_off_note: note
            };
        } catch {
            return null;
        }
    }, []);

    const logSignOff = React.useCallback(async (note: string, useBeacon = false) => {
        if (signOffSentRef.current) return;
        const payload = buildSignOffPayload(note);
        if (!payload) return;
        signOffSentRef.current = true;

        try {
            if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon(ENDPOINTS.LOGS.SIGNOFF, blob);
                return;
            }
            await fetch(ENDPOINTS.LOGS.SIGNOFF, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch {
            // fail silently
        }
    }, [buildSignOffPayload]);

    React.useEffect(() => {
        const fetchCounts = async () => {
            const timestamp = Date.now();
            try {
                // Parallel fetch for dashboard counts
                const [tRes, rRes, bRes, uRes, brRes, bcrRes, roRes, pgRes, baRes] = await Promise.allSettled([
                    fetch(`${ENDPOINTS.TRANSFERS.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.REMITTERS.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.BENEFICIARIES.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.USERS.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.BRANCHES.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.BRANCH_CURRENCY_RATES.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.ROLES.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.PERMISSION_GROUPS.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.BRANCH_ACCESS_REQUESTS.LIST}?status=pending&_t=${timestamp}`).then(r => r.ok ? r.json() : [])
                ]);

                const getCount = (res: PromiseSettledResult<unknown>) =>
                    res.status === 'fulfilled' && Array.isArray(res.value) ? res.value.length : 0;

                // For KYC, we need to filter remitters
                let kycCount = 0;
                if (rRes.status === 'fulfilled' && Array.isArray(rRes.value)) {
                    kycCount = rRes.value.filter((r: unknown) => {
                        if (!r || typeof r !== 'object') return false;
                        return (r as { kyc_status?: string }).kyc_status === 'pending';
                    }).length;
                }

                setCounts({
                    transfers: getCount(tRes),
                    remitters: getCount(rRes),
                    receivers: getCount(bRes),
                    users: getCount(uRes),
                    branches: getCount(brRes),
                    branchCurrencyRates: getCount(bcrRes),
                    roles: getCount(roRes),
                    permissionGroups: getCount(pgRes),
                    branchAccessFlags: getCount(baRes),
                    kyc: kycCount
                });

            } catch {
                // Silent fail
            }
        };
        // Only fetch if NOT login page and a user is loaded (so branch-scoped headers apply).
        if (!isLoginPage && currentUser?.id) {
            fetchCounts();
        }
    }, [pathname, isLoginPage, currentUser?.id]);

    React.useEffect(() => {
        if (!currentUser?.id) {
            setIsPrivilegedUser(false);
            setViewSections(new Set());
            return;
        }

        const role = String(currentUser.role || '').trim();
        const privileged = String(currentUser.system_defined || '').toLowerCase() === 'yes'
            || role.toLowerCase().includes('admin')
            || role.toLowerCase().includes('super');
        setIsPrivilegedUser(privileged);

        if (privileged) {
            setViewSections(new Set());
            return;
        }

        const fetchPermissions = async () => {
            try {
                const res = await fetch(`${ENDPOINTS.PERMISSION_GROUPS.LIST}?role=${encodeURIComponent(role)}&active=yes`);
                if (!res.ok) {
                    setViewSections(new Set());
                    return;
                }
                const rows = await res.json();
                if (!Array.isArray(rows)) {
                    setViewSections(new Set());
                    return;
                }
                const sections = new Set<string>();
                for (const row of rows) {
                    const op = String(row?.operation || '').toUpperCase().trim();
                    const section = String(row?.page_section || '').toUpperCase().trim();
                    const active = String(row?.active || '').toLowerCase().trim();
                    if ((op === 'VIEW' || op === 'ALL' || op === '*') && section !== '' && (active === '' || active === 'yes')) {
                        sections.add(section);
                    }
                }
                setViewSections(sections);
            } catch {
                setViewSections(new Set());
            }
        };

        fetchPermissions();
    }, [currentUser?.id, currentUser?.role, currentUser?.system_defined]);

    React.useEffect(() => {
        if (isLoginPage || !currentUser?.id || isPrivilegedUser) return;

        if (pathname.startsWith('/admin/roles') || pathname.startsWith('/admin/permission-groups')) {
            router.replace('/admin/branches');
        }
    }, [isLoginPage, currentUser?.id, isPrivilegedUser, pathname, router]);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        if (!originalFetchRef.current) {
            originalFetchRef.current = window.fetch.bind(window);
        }

        const originalFetch = originalFetchRef.current;
        const actingUserId = currentUser?.id ? String(currentUser.id) : '';

        if (!actingUserId) {
            window.fetch = originalFetch;
            return;
        }

        const enrichApiUrl = (rawUrl: string): string => {
            try {
                if (!isApiRequestUrl(rawUrl, window.location.origin)) {
                    return rawUrl;
                }
                const parsed = new URL(rawUrl, window.location.origin);
                if (!parsed.searchParams.has('acting_user_id')) {
                    parsed.searchParams.set('acting_user_id', actingUserId);
                }
                return parsed.toString();
            } catch {
                return rawUrl;
            }
        };

        window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
            let requestUrl = '';
            if (typeof input === 'string') {
                requestUrl = input;
            } else if (input instanceof URL) {
                requestUrl = input.toString();
            } else if (input instanceof Request) {
                requestUrl = input.url;
            }

            const isApiCall = isApiRequestUrl(requestUrl, window.location.origin);
            if (!isApiCall) {
                return originalFetch(input, init);
            }

            const enrichedUrl = enrichApiUrl(requestUrl);
            const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
            headers.set('X-Acting-User-Id', actingUserId);

            if (input instanceof Request) {
                const patchedBase = new Request(enrichedUrl, input);
                const patchedRequest = new Request(patchedBase, { ...init, headers });
                return originalFetch(patchedRequest);
            }

            return originalFetch(enrichedUrl, { ...init, headers });
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, [currentUser?.id]);

    // Initial Auth Check
    React.useEffect(() => {
        if (isLoginPage) {
            setIsLoadingNav(false);
            return;
        }

        const stored = getStoredUserRaw();
        if (!stored) {
            setCurrentUser(null);
            setIsLoadingNav(false);
            router.replace('/admin/login');
            return;
        }

        try {
            const parsed = JSON.parse(stored) as CurrentUser;
            setCurrentUser(parsed);
            setIsLoadingNav(false);
        } catch {
            clearStoredUser();
            setCurrentUser(null);
            setIsLoadingNav(false);
            router.replace('/admin/login');
        }
    }, [pathname, router, isLoginPage]);

    React.useEffect(() => {
        const onStorage = (event: StorageEvent) => {
            if (event.key !== 'user') return;
            if (!event.newValue) {
                setCurrentUser(null);
                return;
            }
            try {
                setCurrentUser(JSON.parse(event.newValue));
            } catch {
                setCurrentUser(null);
            }
        };

        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        const applyTheme = (nextTheme: 'light' | 'dark') => {
            document.documentElement.classList.toggle('dark', nextTheme === 'dark');
            document.documentElement.style.colorScheme = nextTheme;
            localStorage.setItem('theme', nextTheme);
            setTheme(nextTheme);
        };

        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
            applyTheme(savedTheme);
            return;
        }

        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
    }, []);

    React.useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (!headerUserMenuRef.current) return;
            if (!headerUserMenuRef.current.contains(event.target as Node)) {
                setHeaderUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    React.useEffect(() => {
        if (isLoginPage) return;
        signOffSentRef.current = false;

        const timeoutMs = 30 * 60 * 1000;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const resetTimer = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(async () => {
                await logSignOff('Auto logged out, session expired.', false);
                clearStoredUser();
                setCurrentUser(null);
                router.replace('/admin/login');
            }, timeoutMs);
        };

        const activityEvents: Array<keyof WindowEventMap> = [
            'mousemove',
            'mousedown',
            'keydown',
            'scroll',
            'touchstart'
        ];

        activityEvents.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
        resetTimer();

        const handleBeforeUnload = () => {
            logSignOff('Browser closed', true);
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            if (timer) clearTimeout(timer);
            activityEvents.forEach((event) => window.removeEventListener(event, resetTimer));
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [router, isLoginPage, logSignOff]);

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

    const canViewSections = (sections?: string[]) => {
        if (!sections || sections.length === 0) return true;
        if (isPrivilegedUser) return true;

        const restrictedForBranchUsers = new Set([
            'SYSGROUPS',
            'ROLES',
            'SYSGROUPS_PERMISSION',
            'PERMISSION_GROUPS'
        ]);

        if (sections.some((section) => restrictedForBranchUsers.has(section.toUpperCase()))) {
            return false;
        }

        return sections.some((section) => viewSections.has(section.toUpperCase()));
    };

    const handleSignOut = async () => {
        await logSignOff('User signed out', false);
        clearStoredUser();
        setCurrentUser(null);
        setUserMenuOpen(false);
        setHeaderUserMenuOpen(false);
        router.replace('/admin/login');
    };

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.classList.toggle('dark', nextTheme === 'dark');
        document.documentElement.style.colorScheme = nextTheme;
        localStorage.setItem('theme', nextTheme);
        setTheme(nextTheme);
    };

    const navigation: NavItem[] = [
        {
            name: 'Dashboard',
            icon: <LayoutGrid className="w-5 h-5" />,
            href: '/admin/dashboard'
        },
        {
            name: 'Reports',
            icon: <BarChart3 className="w-5 h-5" />,
            href: '/admin/reports',
            sections: ['TODAY_SUMMARY', 'MC_STATISTICS', 'REPORTS']
        },
        {
            name: 'Operations',
            icon: <Layers className="w-5 h-5" />,
            children: [
                { name: 'Transfers', href: '/admin/transfers', badge: counts.transfers > 0 ? counts.transfers.toString() : undefined, icon: <ArrowRightLeft className="w-4 h-4" />, sections: ['MONEY_CHANGER', 'TELEX_TRANSFER', 'ACCOUNT_TRANSACTIONS', 'TRANSFERS'] },
                { name: 'Remitters', href: '/admin/remitters', badge: counts.remitters > 0 ? counts.remitters.toString() : undefined, icon: <Users className="w-4 h-4" />, sections: ['SENDER_DETAILS', 'CUSTOMER', 'REMITTERS'] },
                { name: 'Receivers', href: '/admin/receivers', badge: counts.receivers > 0 ? counts.receivers.toString() : undefined, icon: <UserCheck className="w-4 h-4" />, sections: ['RECEIVER_DETAILS', 'BENEFICIARIES', 'CUSTOMER', 'RECEIVERS'] },
                { name: 'KYC Reviews', href: '/admin/kyc', badge: counts.kyc > 0 ? counts.kyc.toString() : undefined, icon: <ShieldCheck className="w-4 h-4" /> },
                { name: 'Branch Access Flags', href: '/admin/branch-access', badge: counts.branchAccessFlags > 0 ? counts.branchAccessFlags.toString() : undefined, icon: <AlertTriangle className="w-4 h-4" /> },
            ]
        },
        {
            name: 'Mobile Operations',
            icon: <Smartphone className="w-5 h-5" />,
            children: [
                { name: 'Mobile Accounts', href: '/admin/mobile-users', icon: <Smartphone className="w-4 h-4" /> },
                { name: 'Mobile Profiles', href: '/admin/mobile-profiles', icon: <Users className="w-4 h-4" /> },
                { name: 'Mobile Control', href: '/admin/mobile-users/control', badge: counts.kyc > 0 ? counts.kyc.toString() : undefined, icon: <ShieldCheck className="w-4 h-4" /> },
            ]
        },
        {
            name: 'Management',
            icon: <Settings className="w-5 h-5" />,
            children: [
                { name: 'System Users', href: '/admin/users', badge: counts.users > 0 ? counts.users.toString() : undefined, icon: <Users className="w-4 h-4" />, sections: ['SYSUSERS', 'SYSTEM_USERS'] },
                { name: 'Roles', href: '/admin/roles', badge: counts.roles > 0 ? counts.roles.toString() : undefined, icon: <Shield className="w-4 h-4" />, sections: ['SYSGROUPS', 'ROLES'] },
                { name: 'Role Permissions', href: '/admin/permission-groups', badge: counts.permissionGroups > 0 ? counts.permissionGroups.toString() : undefined, icon: <ShieldCheck className="w-4 h-4" />, sections: ['SYSGROUPS_PERMISSION', 'PERMISSION_GROUPS'] },
                { name: 'Branches', href: '/admin/branches', badge: counts.branches > 0 ? counts.branches.toString() : undefined, icon: <Building2 className="w-4 h-4" />, sections: ['BRANCH', 'BRANCHES'] },
                { name: 'Branch Currency Rates', href: '/admin/branch-currency-rates', badge: counts.branchCurrencyRates > 0 ? counts.branchCurrencyRates.toString() : undefined, icon: <Coins className="w-4 h-4" />, sections: ['BRANCH_CURRENCY_RATE', 'BRANCH_CURRENCY_RATES'] },
                { name: 'Countries', href: '/admin/countries', icon: <Globe className="w-4 h-4" /> },
                { name: 'Currencies', href: '/admin/currencies', icon: <Coins className="w-4 h-4" /> },
            ]
        },
        {
            name: 'System',
            icon: <Cpu className="w-5 h-5" />,
            children: [
                { name: 'Settings', href: '/admin/settings', icon: <Settings className="w-4 h-4" /> },
                { name: 'Logs', href: '/admin/logs', icon: <FileText className="w-4 h-4" />, sections: ['SYSUSERS_LOG', 'SYSRECORD_LOGS', 'AUDIT_LOGS'] },
            ]
        }
    ];

    return (
        <div className="flex h-screen overflow-hidden antialiased text-slate-900 dark:text-white relative">
            {/* Soft Teal Background */}
            <div className="fixed inset-0 bg-gradient-to-b from-teal-50 via-teal-50 to-teal-100 dark:from-teal-950 dark:via-teal-950 dark:to-teal-900 -z-10"></div>

            {/* Sidebar - Thin, iOS-style */}
            <aside className={`flex flex-col glass-effect-strong border border-white/20 dark:border-white/10 transition-all duration-500 ease-in-out my-4 ml-4 rounded-[20px] shadow-lg z-20 ${sidebarOpen ? 'w-72' : 'w-24'} animate-slide-in-left`}>
                {/* Logo + Toggle */}
                <div className="h-20 flex items-center px-5 border-b border-white/10 dark:border-white/10">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className={`w-full flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} rounded-full px-3 py-2 glass-effect hover:bg-white/70 dark:hover:bg-white/5 transition-all duration-300`}
                        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        <div className={`flex items-center space-x-3 transition-all duration-300 ${sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 w-0 overflow-hidden'}`}>
                            <Image
                                src="/logo-removebg-preview.png"
                                alt="LinkForex"
                                width={164}
                                height={40}
                                className="h-10 w-auto object-contain drop-shadow-md dark:hidden"
                                priority
                            />
                            <Image
                                src="/logo-dark-theme.png"
                                alt="LinkForex"
                                width={164}
                                height={40}
                                className="hidden h-10 w-auto object-contain drop-shadow-md dark:block"
                                priority
                            />
                        </div>
                        <div className={`flex items-center justify-center transition-all duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-100'}`}>
                            {sidebarOpen ? <ChevronLeft className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                        </div>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-5 space-y-2.5 overflow-y-auto no-scrollbar">
                    {navigation.map((item, idx) => {
                        if (!item.children && !canViewSections(item.sections)) {
                            return null;
                        }

                        const visibleChildren = item.children?.filter((child) => canViewSections(child.sections)) || [];
                        if (item.children && visibleChildren.length === 0) {
                            return null;
                        }

                        const isChildActive = visibleChildren.some((child) => pathname === child.href || pathname.startsWith(child.href || ''));
                        const isActive = pathname === item.href || isChildActive;
                        const isExpanded = expandedMenus[item.name];

                        if (item.children) {
                            return (
                                <div key={item.name} className="mb-2 stagger-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                                    <button
                                        onClick={() => sidebarOpen ? toggleMenu(item.name) : setSidebarOpen(true)}
                                        className={`w-full flex items-center ${sidebarOpen ? 'justify-between px-5' : 'justify-center px-2'} py-3 rounded-full transition-all duration-300 group ${isActive
                                            ? 'glass-effect text-teal-700 dark:text-teal-300 font-semibold shadow-sm ring-1 ring-teal-500/20'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/5 hover:text-teal-600 dark:hover:text-teal-300'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-3.5">
                                            <span className={`transition-all duration-300 ${isActive ? 'text-teal-500 scale-110' : 'group-hover:text-teal-500 group-hover:scale-110'}`}>
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
                                        <div className="mt-2 ml-5 pl-5 border-l border-teal-200/60 dark:border-teal-800/50 space-y-1.5 animate-slide-down">
                                            {visibleChildren.map((child) => {
                                                const isChildItemActive = pathname === child.href;
                                                return (
                                                    <Link
                                                        key={child.name}
                                                        href={child.href!}
                                                        className={`flex items-center justify-between px-4 py-2.5 rounded-full transition-all duration-300 text-[14px] font-medium ${isChildItemActive
                                                            ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-sm shadow-teal-500/30'
                                                            : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-teal-600 dark:hover:text-teal-300'
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
                                                                : 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
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
                                className={`flex items-center ${sidebarOpen ? 'justify-between px-5' : 'justify-center px-2'} py-3 rounded-full transition-all duration-300 mb-2 group hover-lift stagger-item ${isActive
                                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-sm shadow-teal-500/30'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/5 hover:text-teal-600 dark:hover:text-teal-300'
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

                {/* User Profile */}
                <div className="p-4 border-t border-white/10 dark:border-white/10 relative mb-2">
                    {userMenuOpen && (
                        <div className="absolute bottom-[110%] left-4 right-4 mb-2 glass-effect-strong rounded-[16px] shadow-lg overflow-hidden animate-scale-in border border-white/20 dark:border-white/10">
                            <button
                                onClick={handleSignOut}
                                className="flex items-center space-x-3 px-5 py-3 text-red-500 hover:bg-red-50/70 dark:hover:bg-red-900/20 transition-all duration-300 w-full text-left group"
                            >
                                <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="font-semibold text-sm">Sign Out</span>
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className={`w-full flex items-center ${sidebarOpen ? 'space-x-3' : 'justify-center'} p-3 rounded-full glass-effect hover:shadow-md transition-all duration-300`}
                    >
                        <div className="avatar-circle avatar-circle-sm shrink-0">
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
                                <div className={`w-1.5 h-1.5 rounded-full bg-slate-400/50 ${userMenuOpen ? 'bg-teal-500' : ''}`}></div>
                            </div>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Top Header */}
                <header className="h-16 glass-effect-strong border border-white/20 dark:border-white/10 flex items-center justify-between px-6 z-10 animate-slide-down backdrop-blur-3xl m-4 rounded-[20px] shadow-sm">
                    <div className="flex-1 max-w-xl">
                        <div className="relative group input-icon">
                            <span className="input-icon-left transition-all duration-300 group-focus-within:text-teal-500">
                                <Search className="w-5 h-5" />
                            </span>
                            <input
                                type="text"
                                placeholder="Search everything..."
                                className="input-glass w-full pr-4 py-3 text-sm transition-all duration-300"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-5">
                        <button className="p-3 glass-effect rounded-full text-slate-500 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-300 transition-all duration-300 relative group">
                            <Bell className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
                        </button>
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="p-3 glass-effect rounded-full text-slate-500 dark:text-slate-300 hover:text-teal-500 dark:hover:text-teal-300 transition-all duration-300"
                            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <div ref={headerUserMenuRef} className="relative">
                            <button
                                onClick={() => setHeaderUserMenuOpen((prev) => !prev)}
                                className="glass-effect rounded-full pl-2 pr-3 py-1.5 text-slate-600 dark:text-slate-300 hover:text-teal-500 dark:hover:text-teal-300 transition-all duration-300 flex items-center space-x-2 hover:shadow-lg"
                            >
                                <div className="avatar-circle avatar-circle-sm shrink-0">
                                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="hidden md:block text-left max-w-[180px]">
                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                        {currentUser?.name || 'User'}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        {currentUser?.role || 'Guest'}
                                    </p>
                                </div>
                                <ChevronDown className={`w-4 h-4 transition-transform ${headerUserMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {headerUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-72 glass-effect-strong rounded-[16px] shadow-lg overflow-hidden animate-scale-in border border-white/20 dark:border-white/10 z-30">
                                    <div className="px-4 py-3 border-b border-white/10 dark:border-white/10">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                            {currentUser?.name || 'User'}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                            {currentUser?.email || 'No email'}
                                        </p>
                                        {currentUser?.username && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                @{currentUser.username}
                                            </p>
                                        )}
                                        <p className="text-xs mt-1 text-teal-600 dark:text-teal-300 font-semibold uppercase tracking-wide">
                                            {currentUser?.role || 'Guest'}
                                        </p>
                                    </div>

                                    <div className="p-2">
                                        <Link
                                            href="/admin/settings"
                                            onClick={() => setHeaderUserMenuOpen(false)}
                                            className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/5 transition-all"
                                        >
                                            <User className="w-4 h-4" />
                                            <span className="text-sm font-semibold">Profile Settings</span>
                                        </Link>
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50/70 dark:hover:bg-red-900/20 transition-all text-left"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span className="text-sm font-semibold">Sign Out</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <Link
                            href="/admin/transfers/create"
                            className="glass-effect rounded-full px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:text-teal-500 dark:hover:text-teal-300 transition-all duration-300 flex items-center space-x-2 hover:shadow-lg"
                        >
                            <PlusCircle className="w-5 h-5" />
                            <span className="font-semibold">New Transfer</span>
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
