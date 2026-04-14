'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ENDPOINTS, UPLOADS_BASE_URL, isApiRequestUrl } from '@/app/lib/api';
import { clearStoredUser, getStoredUserRaw } from '@/app/lib/authStorage';
import { isPrivilegedUser as getIsPrivilegedUser } from '@/app/lib/permissions';
import { applyThemePreference, getStoredThemePreference, resolveTheme, type ThemePreference, type ResolvedTheme } from '@/app/lib/theme';
import {
    LayoutGrid,
    Layers,
    Users,
    UserCheck,
    ShieldCheck,
    Settings,
    Shield,
    Building2,
    Database,
    Globe,
    Coins,
    Cpu,
    BarChart3,
    LogOut,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Moon,
    Monitor,
    Search,
    Bell,
    PlusCircle,
    ArrowRightLeft,
    FileText,
    AlertTriangle,
    Sun,
    User,
    MessageCircle,
    ListChecks
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
    profile_photo?: string;
    profile_photo_url?: string;
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
    const [headerUserMenuOpen, setHeaderUserMenuOpen] = useState(false);
    const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
    const [themeMenuOpen, setThemeMenuOpen] = useState(false);
    const [themePreference, setThemePreference] = useState<ThemePreference>('system');
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
    const [currentHash, setCurrentHash] = useState('');
    const [isLoadingNav, setIsLoadingNav] = useState(true);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const headerUserMenuRef = React.useRef<HTMLDivElement | null>(null);
    const notificationMenuRef = React.useRef<HTMLDivElement | null>(null);
    const themeMenuRef = React.useRef<HTMLDivElement | null>(null);
    const originalFetchRef = React.useRef<typeof window.fetch | null>(null);
    const signOffSentRef = React.useRef(false);
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
        'Operations': true,
        'Basic Data': true,
        'Management': true
    });

    const [counts, setCounts] = useState({
        transfers: 0,
        remitters: 0,
        receivers: 0,
        users: 0,
        branches: 0,
        branchCurrencyRates: 0,
        banks: 0,
        countries: 0,
        relationships: 0,
        purposes: 0,
        roles: 0,
        permissionGroups: 0,
        branchAccessFlags: 0,
        kyc: 0,
        supportOpen: 0
    });
    const [countsRefreshNonce, setCountsRefreshNonce] = useState(0);
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
                const [tRes, rRes, bRes, uRes, brRes, bcrRes, banksRes, countriesRes, relRes, purposeRes, roRes, pgRes, baRes, supportOpenRes] = await Promise.allSettled([
                    fetch(`${ENDPOINTS.TRANSFERS.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.REMITTERS.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.BENEFICIARIES.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.USERS.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.BRANCHES.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.BRANCH_CURRENCY_RATES.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.BANKS.LIST}?include_blacklisted=yes&_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.COUNTRIES.LIST}?include_blacklisted=yes&_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.RELATIONSHIPS.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.PURPOSES.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.ROLES.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.PERMISSION_GROUPS.LIST}?_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.BRANCH_ACCESS_REQUESTS.LIST}?status=pending&_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                    fetch(`${ENDPOINTS.SUPPORT.LIST}?status=open&_t=${timestamp}`).then(r => r.ok ? r.json() : []),
                ]);

                const getCount = (res: PromiseSettledResult<unknown>) => {
                    if (res.status !== 'fulfilled') return 0;
                    const value = res.value as unknown;
                    if (Array.isArray(value)) return value.length;
                    if (value && typeof value === 'object') {
                        const rows = (value as { data?: unknown }).data;
                        if (Array.isArray(rows)) return rows.length;
                        const count = (value as { count?: unknown }).count;
                        if (typeof count === 'number' && Number.isFinite(count)) return count;
                    }
                    return 0;
                };

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
                    banks: getCount(banksRes),
                    countries: getCount(countriesRes),
                    relationships: getCount(relRes),
                    purposes: getCount(purposeRes),
                    roles: getCount(roRes),
                    permissionGroups: getCount(pgRes),
                    branchAccessFlags: getCount(baRes),
                    kyc: kycCount,
                    supportOpen: getCount(supportOpenRes),
                });

            } catch {
                // Silent fail
            }
        };
        // Only fetch if NOT login page and a user is loaded (so branch-scoped headers apply).
        if (!isLoginPage && currentUser?.id) {
            fetchCounts();
        }
    }, [pathname, isLoginPage, currentUser?.id, countsRefreshNonce]);

    React.useEffect(() => {
        const handleRefresh = () => setCountsRefreshNonce((value) => value + 1);
        window.addEventListener('admin-counts-refresh', handleRefresh);
        return () => window.removeEventListener('admin-counts-refresh', handleRefresh);
    }, []);

    React.useEffect(() => {
        if (!currentUser?.id) {
            setIsPrivilegedUser(false);
            setViewSections(new Set());
            return;
        }

        const role = String(currentUser.role || '').trim();
        const privileged = getIsPrivilegedUser(currentUser);
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

        const onUserUpdated = (event: Event) => {
            const customEvent = event as CustomEvent<CurrentUser>;
            if (!customEvent.detail) return;
            setCurrentUser(customEvent.detail);
        };

        window.addEventListener('storage', onStorage);
        window.addEventListener('admin-user-updated', onUserUpdated as EventListener);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('admin-user-updated', onUserUpdated as EventListener);
        };
    }, []);

    React.useEffect(() => {
        const syncHash = () => {
            if (typeof window === 'undefined') return;
            setCurrentHash(window.location.hash || '');
        };

        syncHash();
        window.addEventListener('hashchange', syncHash);
        return () => window.removeEventListener('hashchange', syncHash);
    }, []);

    React.useEffect(() => {
        const syncThemeState = () => {
            const preference = getStoredThemePreference();
            setThemePreference(preference);
            setResolvedTheme(resolveTheme(preference));
        };

        syncThemeState();

        const handleThemeChange = () => syncThemeState();
        const handleStorage = (event: StorageEvent) => {
            if (event.key === 'theme_preference') {
                syncThemeState();
            }
        };

        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = () => {
            if (getStoredThemePreference() === 'system') {
                syncThemeState();
            }
        };

        window.addEventListener('theme-preference-change', handleThemeChange);
        window.addEventListener('storage', handleStorage);

        media.addEventListener('change', handleMediaChange);

        return () => {
            window.removeEventListener('theme-preference-change', handleThemeChange);
            window.removeEventListener('storage', handleStorage);
            media.removeEventListener('change', handleMediaChange);
        };
    }, []);

    React.useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (headerUserMenuRef.current && !headerUserMenuRef.current.contains(event.target as Node)) {
                setHeaderUserMenuOpen(false);
            }
            if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target as Node)) {
                setNotificationMenuOpen(false);
            }
            if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
                setThemeMenuOpen(false);
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

    if (isLoadingNav) return <div className="admin-shell flex min-h-screen items-center justify-center text-sm font-medium text-slate-500 dark:text-slate-300">Loading admin panel...</div>;

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
        setHeaderUserMenuOpen(false);
        setNotificationMenuOpen(false);
        setThemeMenuOpen(false);
        router.replace('/admin/login');
    };

    const handleThemeChange = (preference: ThemePreference) => {
        applyThemePreference(preference);
        setThemePreference(preference);
        setResolvedTheme(resolveTheme(preference));
        setThemeMenuOpen(false);
    };

    const notifications: Array<{ id: string; text: string }> = [];
    const resolveProfilePhotoUrl = (user: CurrentUser | null): string | null => {
        const absolute = String(user?.profile_photo_url || '').trim();
        if (absolute) return absolute;

        const relative = String(user?.profile_photo || '').trim();
        if (!relative) return null;

        if (/^https?:\/\//i.test(relative)) return relative;
        const normalized = relative.replace(/^\/+/, '').replace(/^uploads\//, '');
        return `${UPLOADS_BASE_URL}/${normalized}`;
    };
    const toTitleCase = (value?: string, fallback = ''): string => {
        const text = String(value || '').trim();
        if (!text) return fallback;
        return text
            .replace(/[_-]+/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());
    };
    const displayName = String(currentUser?.name || '').trim() || 'User';
    const displayRole = toTitleCase(currentUser?.role, 'Guest');
    const profilePhotoUrl = resolveProfilePhotoUrl(currentUser);

    const navigation: NavItem[] = [
        {
            name: 'Dashboard',
            icon: <LayoutGrid className="w-5 h-5" />,
            href: '/admin/dashboard'
        },
        {
            name: 'Operations',
            icon: <Layers className="w-5 h-5" />,
            children: [
                { name: 'Transfers', href: '/admin/transfers', icon: <ArrowRightLeft className="w-4 h-4" />, sections: ['MONEY_CHANGER', 'TELEX_TRANSFER', 'ACCOUNT_TRANSACTIONS', 'TRANSFERS'] },
                { name: 'Remitters', href: '/admin/remitters', icon: <Users className="w-4 h-4" />, sections: ['SENDER_DETAILS', 'CUSTOMER', 'REMITTERS'] },
                { name: 'Receivers', href: '/admin/receivers', icon: <UserCheck className="w-4 h-4" />, sections: ['RECEIVER_DETAILS', 'BENEFICIARIES', 'CUSTOMER', 'RECEIVERS'] },
                { name: 'KYC Reviews', href: '/admin/kyc', badge: counts.kyc > 0 ? counts.kyc.toString() : undefined, icon: <ShieldCheck className="w-4 h-4" /> },
                { name: 'Branch Access Flags', href: '/admin/branch-access', badge: counts.branchAccessFlags > 0 ? counts.branchAccessFlags.toString() : undefined, icon: <AlertTriangle className="w-4 h-4" /> },
            ]
        },
        {
            name: 'Mobile Profiles',
            icon: <Users className="w-5 h-5" />,
            href: '/admin/mobile-profiles'
        },
        {
            name: 'Mobile Control',
            icon: <ShieldCheck className="w-5 h-5" />,
            children: [
                { name: 'Overview', href: '/admin/mobile-users/control/overview' },
                { name: 'App Flow Settings', href: '/admin/mobile-users/control/app-flow-settings', sections: ['MOBILE_APP_FLOW_SETTINGS'] },
                { name: 'Customer Digital Rates', href: '/admin/mobile-users/control/exchange-rates' },
                { name: 'Wallet Funding Queue', href: '/admin/mobile-users/control/wallet-transfers' },
                { name: 'Profile Review Queue', href: '/admin/mobile-users/control/profile-review-queue', sections: ['MOBILE_PROFILE_REVIEW_QUEUE'] },
                { name: 'Campaigns', href: '/admin/mobile-users/control/campaigns', sections: ['MOBILE_CAMPAIGNS'] },
                { name: 'In-App Ads', href: '/admin/mobile-users/control/in-app-ads', sections: ['MOBILE_ADS'] },
            ]
        },
        {
            name: 'Management',
            icon: <Settings className="w-5 h-5" />,
            children: [
                { name: 'System Users', href: '/admin/users', icon: <Users className="w-4 h-4" />, sections: ['SYSUSERS', 'SYSTEM_USERS'] },
                { name: 'Roles', href: '/admin/roles', icon: <Shield className="w-4 h-4" />, sections: ['SYSGROUPS', 'ROLES'] },
                { name: 'Role Permissions', href: '/admin/permission-groups', icon: <ShieldCheck className="w-4 h-4" />, sections: ['SYSGROUPS_PERMISSION', 'PERMISSION_GROUPS'] },
                { name: 'Branches', href: '/admin/branches', icon: <Building2 className="w-4 h-4" />, sections: ['BRANCH', 'BRANCHES'] },
                { name: 'Branch Rates', href: '/admin/branch-rates', icon: <Coins className="w-4 h-4" />, sections: ['BRANCH_CURRENCY_RATE', 'BRANCH_CURRENCY_RATES', 'MOBILE_EXCHANGE_RATES', 'MOBILE_APP_FLOW_SETTINGS'] },
            ]
        },
        {
            name: 'System',
            icon: <Cpu className="w-5 h-5" />,
            children: [
                { name: 'Settings', href: '/admin/settings', icon: <Settings className="w-4 h-4" /> },
                { name: 'Support Inbox', href: '/admin/support', icon: <MessageCircle className="w-4 h-4" />, badge: counts.supportOpen > 0 ? counts.supportOpen.toString() : undefined },
                { name: 'User Logs', href: '/admin/logs', icon: <FileText className="w-4 h-4" />, sections: ['SYSUSERS_LOG', 'SYSRECORD_LOGS', 'AUDIT_LOGS'] },
            ]
        },
        {
            name: 'Reports',
            icon: <BarChart3 className="w-5 h-5" />,
            href: '/admin/reports',
            sections: ['TODAY_SUMMARY', 'MC_STATISTICS', 'REPORTS']
        },
        {
            name: 'Basic Data',
            icon: <Database className="w-5 h-5" />,
            children: [
                { name: 'Countries', href: '/admin/countries', icon: <Globe className="w-4 h-4" /> },
                { name: 'Banks', href: '/admin/banks', icon: <Building2 className="w-4 h-4" /> },
                { name: 'Relationships', href: '/admin/relationships', icon: <Users className="w-4 h-4" /> },
                { name: 'Purposes', href: '/admin/purposes', icon: <ListChecks className="w-4 h-4" /> },
            ]
        }
    ];

    return (
        <div className="admin-shell flex h-screen overflow-hidden antialiased text-slate-900 dark:text-white">
            <aside className={`admin-sidebar z-20 my-4 ml-4 flex flex-col rounded-[28px] transition-all duration-500 ease-in-out ${sidebarOpen ? 'w-[292px]' : 'w-[96px]'}`}>
                <div className="border-b border-white/10 px-4 py-4 dark:border-white/6">
                    <div className={`flex items-center ${sidebarOpen ? 'justify-between gap-3' : 'justify-center'} rounded-[20px] bg-white/20 p-2.5 dark:bg-white/4`}>
                        <button
                            onClick={() => router.push('/admin/dashboard')}
                            className={`flex min-w-0 items-center gap-3 ${sidebarOpen ? 'opacity-100' : 'justify-center'} transition-all`}
                            aria-label="Go to dashboard"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-300 via-teal-400 to-teal-600 shadow-lg shadow-teal-500/20">
                                <Image
                                    src="/favicon-x.png"
                                    alt="LinkForex X"
                                    width={24}
                                    height={24}
                                    className="h-6 w-6 object-contain"
                                    priority
                                />
                            </div>
                            {sidebarOpen && (
                                <div className="min-w-0 text-left">
                                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">LinkForex</p>
                                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">Admin Control</p>
                                </div>
                            )}
                        </button>
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="btn-secondary !p-2.5 text-slate-500 dark:text-slate-300"
                            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                        >
                            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-5 no-scrollbar">
                    {navigation.map((item, idx) => {
                        if (!item.children && !canViewSections(item.sections)) {
                            return null;
                        }

                        const visibleChildren = item.children?.filter((child) => canViewSections(child.sections)) || [];
                        if (item.children && visibleChildren.length === 0) {
                            return null;
                        }

                        const isChildActive = visibleChildren.some((child) => {
                            const href = child.href || '';
                            const hashIndex = href.indexOf('#');
                            const queryIndex = href.indexOf('?');
                            const cutIndex = [hashIndex, queryIndex].filter((value) => value >= 0).sort((a, b) => a - b)[0];
                            const basePath = cutIndex !== undefined ? href.slice(0, cutIndex) : href;
                            const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
                            const pathMatched = pathname === basePath || pathname.startsWith(`${basePath}/`);
                            if (!pathMatched) return false;
                            if (!hash) return true;
                            return currentHash === hash;
                        });
                        const isActive = pathname === item.href || isChildActive;
                        const isExpanded = expandedMenus[item.name];

                        if (item.children) {
                            return (
                                <div key={item.name} className="stagger-item" style={{ animationDelay: `${idx * 0.05}s` }}>
                                    {sidebarOpen && (
                                        <div className="mb-2 px-3 text-[11px] font-semibold tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                            {item.name}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => sidebarOpen ? toggleMenu(item.name) : setSidebarOpen(true)}
                                        className={`admin-nav-button ${sidebarOpen ? 'justify-between px-3.5 py-3.5' : 'justify-center px-2 py-3.5'} ${isActive ? 'admin-nav-button-active font-semibold' : ''}`}
                                    >
                                        <div className="flex items-center space-x-3.5">
                                            <span className={`transition-all duration-300 ${isActive ? 'text-teal-500 dark:text-teal-300 scale-105' : ''}`}>
                                                {item.icon}
                                            </span>
                                            {!sidebarOpen && <span className="sr-only">{item.name}</span>}
                                            {sidebarOpen && <span className="text-[15px] font-semibold">{item.name}</span>}
                                        </div>
                                        {sidebarOpen && (
                                            <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} strokeWidth={2.5} />
                                        )}
                                    </button>

                                    {sidebarOpen && isExpanded && (
                                        <div className="mt-2 space-y-1.5 pl-3 animate-slide-down">
                                            {visibleChildren.map((child) => {
                                                const href = child.href || '';
                                                const hashIndex = href.indexOf('#');
                                                const queryIndex = href.indexOf('?');
                                                const cutIndex = [hashIndex, queryIndex].filter((value) => value >= 0).sort((a, b) => a - b)[0];
                                                const basePath = cutIndex !== undefined ? href.slice(0, cutIndex) : href;
                                                const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
                                                const pathMatched = pathname === basePath || pathname.startsWith(`${basePath}/`);
                                                const isChildItemActive = pathMatched && (!hash || currentHash === hash);
                                                return (
                                                    <Link
                                                        key={child.name}
                                                        href={child.href!}
                                                        className={`admin-subnav-link px-3.5 py-3 text-[14px] font-medium ${isChildItemActive ? 'admin-subnav-link-active shadow-sm' : ''}`}
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            {child.icon && <span className="opacity-80">{child.icon}</span>}
                                                            <span>{child.name}</span>
                                                        </div>
                                                        {child.badge && (
                                                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isChildItemActive
                                                                ? 'bg-white/18 text-white'
                                                                : 'bg-teal-100/80 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300'
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
                                className={`admin-nav-button ${sidebarOpen ? 'justify-between px-3.5 py-3.5' : 'justify-center px-2 py-3.5'} mb-1 stagger-item ${isActive ? 'admin-nav-button-active font-semibold' : ''}`}
                                style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                                <div className="flex items-center space-x-3.5">
                                    <span className={`transition-all duration-300 ${isActive ? 'scale-105 text-teal-500 dark:text-teal-300' : ''}`}>
                                        {item.icon}
                                    </span>
                                    {sidebarOpen && <span className="font-semibold tracking-wide text-[15px]">{item.name}</span>}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-white/10 px-3 py-3 dark:border-white/6">
                    <button
                        onClick={handleSignOut}
                        className={`admin-nav-button ${sidebarOpen ? 'px-3.5 py-3.5' : 'justify-center px-2 py-3.5'} text-rose-500 dark:text-rose-300`}
                    >
                        <LogOut className="h-5 w-5" />
                        {sidebarOpen && <span className="font-semibold">Sign Out</span>}
                    </button>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <header className="admin-topbar z-10 mx-4 mb-4 mt-4 flex min-h-[76px] items-center gap-4 rounded-[28px] px-5 py-4 animate-slide-down">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="hidden md:flex items-center">
                            <button
                                onClick={() => setSidebarOpen((prev) => !prev)}
                                className="btn-secondary !p-2.5 text-slate-500 dark:text-slate-300"
                                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                            >
                                {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                        </div>
                        <div className="relative max-w-2xl flex-1 group input-icon">
                            <span className="input-icon-left transition-all duration-300 group-focus-within:text-teal-500">
                                <Search className="w-5 h-5" />
                            </span>
                            <input
                                type="text"
                                placeholder="Search everything..."
                                className="input-glass w-full py-3.5 pr-4 text-sm transition-all duration-300"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/transfers/create"
                            className="btn-secondary hidden rounded-full px-4 py-3 text-slate-700 dark:text-slate-200 md:inline-flex md:items-center md:space-x-2"
                        >
                            <PlusCircle className="w-5 h-5" />
                            <span className="font-semibold">New Transfer</span>
                        </Link>
                        <div ref={themeMenuRef} className="relative">
                            <button
                                onClick={() => {
                                    setThemeMenuOpen((prev) => !prev);
                                    setHeaderUserMenuOpen(false);
                                    setNotificationMenuOpen(false);
                                }}
                                className="btn-secondary !p-3 text-slate-500 dark:text-slate-300 transition-all duration-300 relative group"
                                aria-label="Theme"
                                title="Theme"
                            >
                                {resolvedTheme === 'dark' ? (
                                    <Moon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                ) : (
                                    <Sun className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                )}
                            </button>
                            {themeMenuOpen && (
                                <div className="admin-panel-card absolute right-0 z-30 mt-3 w-56 overflow-hidden rounded-[20px] animate-scale-in">
                                    <div className="p-2">
                                        <button
                                            onClick={() => handleThemeChange('system')}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left ${
                                                themePreference === 'system'
                                                    ? 'bg-white/70 dark:bg-white/6 text-teal-600 dark:text-teal-300'
                                                    : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <span className="flex items-center space-x-3">
                                                <Monitor className="w-4 h-4" />
                                                <span className="text-sm font-semibold">System</span>
                                            </span>
                                            {themePreference === 'system' && <span className="text-xs font-semibold">Active</span>}
                                        </button>
                                        <button
                                            onClick={() => handleThemeChange('light')}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left ${
                                                themePreference === 'light'
                                                    ? 'bg-white/70 dark:bg-white/10 text-teal-600 dark:text-teal-300'
                                                    : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <span className="flex items-center space-x-3">
                                                <Sun className="w-4 h-4" />
                                                <span className="text-sm font-semibold">Light</span>
                                            </span>
                                            {themePreference === 'light' && <span className="text-xs font-semibold">Active</span>}
                                        </button>
                                        <button
                                            onClick={() => handleThemeChange('dark')}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left ${
                                                themePreference === 'dark'
                                                    ? 'bg-white/70 dark:bg-white/10 text-teal-600 dark:text-teal-300'
                                                    : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <span className="flex items-center space-x-3">
                                                <Moon className="w-4 h-4" />
                                                <span className="text-sm font-semibold">Dark</span>
                                            </span>
                                            {themePreference === 'dark' && <span className="text-xs font-semibold">Active</span>}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div ref={notificationMenuRef} className="relative">
                            <button
                                onClick={() => setNotificationMenuOpen((prev) => !prev)}
                                className="btn-secondary !p-3 text-slate-500 dark:text-slate-300 transition-all duration-300 relative group"
                                aria-label="Notifications"
                                title="Notifications"
                            >
                                <Bell className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                {notifications.length > 0 && (
                                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
                                )}
                            </button>
                            {notificationMenuOpen && (
                                <div className="admin-panel-card absolute right-0 z-30 mt-3 w-80 overflow-hidden rounded-[20px] animate-scale-in">
                                    <div className="border-b border-white/10 px-4 py-3 dark:border-white/6">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Notifications</p>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div ref={headerUserMenuRef} className="relative">
                            <button
                                onClick={() => setHeaderUserMenuOpen((prev) => !prev)}
                                className="btn-secondary flex items-center space-x-2 rounded-full py-1.5 pl-2 pr-3 text-slate-700 dark:text-slate-200"
                            >
                                <div className="avatar-circle avatar-circle-sm shrink-0 overflow-hidden">
                                    {profilePhotoUrl ? (
                                        <img
                                            src={profilePhotoUrl}
                                            alt={displayName}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        displayName.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="hidden md:block text-left max-w-[180px]">
                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                        {displayName}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        {displayRole}
                                    </p>
                                </div>
                                <ChevronDown className={`w-4 h-4 transition-transform ${headerUserMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {headerUserMenuOpen && (
                                <div className="admin-panel-card absolute right-0 z-30 mt-3 w-56 overflow-hidden rounded-[20px] animate-scale-in">
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
                                            className="w-full flex items-center space-x-3 rounded-xl px-3 py-2.5 text-left text-red-500 transition-all hover:bg-red-50/70 dark:hover:bg-red-900/20"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span className="text-sm font-semibold">Sign Out</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="relative flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-6 pb-6 pt-0 no-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    );
}
