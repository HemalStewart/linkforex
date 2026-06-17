type UserPermissionShape = {
    role?: string | null;
    system_defined?: string | null;
    username?: string | null;
    email?: string | null;
    name?: string | null;
};

const normalizeRole = (role?: string | null): string =>
    String(role || '')
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ');

export const isSuperAdminRole = (role?: string | null): boolean => {
    const normalized = normalizeRole(role);
    return normalized === 'super admin' || normalized === 'superadmin' || normalized.includes('super admin');
};

export const isPrivilegedUser = (user?: UserPermissionShape | null): boolean => {
    if (!user) return false;
    if (String(user.system_defined || '').toLowerCase() === 'yes') return true;

    const username = String(user.username || '').trim().toLowerCase();
    const email = String(user.email || '').trim().toLowerCase();
    const name = String(user.name || '').trim().toLowerCase();
    if (username === 'admin' || email === 'admin@linkforex.com' || name === 'system admin') {
        return true;
    }

    const normalizedRole = normalizeRole(user.role);
    if (isSuperAdminRole(normalizedRole)) return true;

    return normalizedRole.includes('admin') || normalizedRole.includes('super');
};

export interface AdminPageInfo {
    name: string;
    section: string;
    operations: string[];
}

export interface AdminCategoryInfo {
    category: string;
    pages: AdminPageInfo[];
}

export const ADMIN_PAGES_CONFIG: AdminCategoryInfo[] = [
    {
        category: 'Dashboard',
        pages: [
            { name: 'Dashboard', section: 'DASHBOARD', operations: ['VIEW'] }
        ]
    },
    {
        category: 'Operations',
        pages: [
            { name: 'Transfers', section: 'TRANSFERS', operations: ['VIEW', 'ADD', 'EDIT', 'APPROVE', 'CANCEL'] },
            { name: 'Remitters', section: 'REMITTERS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'Receivers', section: 'RECEIVERS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'KYC Reviews', section: 'KYC_REVIEWS', operations: ['VIEW', 'EDIT'] },
            { name: 'Branch Access Flags', section: 'BRANCH_ACCESS_REQUESTS', operations: ['VIEW', 'ADD', 'APPROVE'] },
            { name: 'Support', section: 'SUPPORT', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'Branch Rates', section: 'BRANCH_CURRENCY_RATES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] }
        ]
    },
    {
        category: 'Master Data',
        pages: [
            { name: 'Branches', section: 'BRANCHES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'Transaction Settings', section: 'TRANSACTION_SETTINGS', operations: ['VIEW', 'EDIT'] },
            { name: 'API Tokens', section: 'API_TOKENS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'Dilisense Sources', section: 'DILISENSE_SOURCES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] }
        ]
    },
    {
        category: 'Reports',
        pages: [
            { name: 'Reports', section: 'REPORTS', operations: ['VIEW'] }
        ]
    },
    {
        category: 'Mobile Controls',
        pages: [
            { name: 'Overview', section: 'MOBILE_OVERVIEW', operations: ['VIEW'] },
            { name: 'Mobile Profiles', section: 'MOBILE_PROFILES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'App Flow Settings', section: 'MOBILE_FLOW_SETTINGS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'Customer Digital Rates', section: 'MOBILE_DIGITAL_RATES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'User Rates', section: 'MOBILE_USER_RATES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'Profile Review Queue', section: 'MOBILE_PROFILE_REVIEW_QUEUE', operations: ['VIEW', 'EDIT'] },
            { name: 'Campaigns', section: 'MOBILE_CAMPAIGNS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'Onboarding & Carousel', section: 'MOBILE_ADS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] }
        ]
    },
    {
        category: 'Application Basic Data',
        pages: [
            { name: 'Countries', section: 'COUNTRIES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'Banks', section: 'BANKS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'Relationships', section: 'RELATIONSHIPS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'Purposes', section: 'PURPOSES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] }
        ]
    },
    {
        category: 'System Users',
        pages: [
            { name: 'Role', section: 'ROLES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'Role Permissions', section: 'PERMISSION_GROUPS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'Users', section: 'SYSTEM_USERS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE'] },
            { name: 'User Logs', section: 'AUDIT_LOGS', operations: ['VIEW'] }
        ]
    },
    {
        category: 'Configuration',
        pages: [
            { name: 'Configuration', section: 'SETTINGS', operations: ['VIEW', 'EDIT'] },
            { name: 'My Profile', section: 'PROFILE', operations: ['VIEW', 'EDIT'] }
        ]
    }
];
