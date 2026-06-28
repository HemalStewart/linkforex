import { useState, useEffect } from 'react';
import { getStoredUser } from './authStorage';

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

const AUDIT_OPS = ['VIEW_CREATED_BY', 'VIEW_CREATED_AT', 'VIEW_UPDATED_BY', 'VIEW_UPDATED_AT'];

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
            { name: 'Transfers', section: 'TRANSFERS', operations: ['VIEW', 'ADD', 'EDIT', 'APPROVE', 'CANCEL', 'PDF', 'EXPORT', 'NEW_TRANSFER', 'PRINT', 'SIGN', ...AUDIT_OPS] },
            { name: 'Remitters', section: 'REMITTERS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', 'PDF', 'EXPORT', ...AUDIT_OPS] },
            { name: 'Receivers', section: 'RECEIVERS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', 'PDF', 'EXPORT', ...AUDIT_OPS] },
            { name: 'KYC Reviews', section: 'KYC_REVIEWS', operations: ['VIEW', 'EDIT', 'EXPORT', ...AUDIT_OPS] },
            { name: 'Branch Access Flags', section: 'BRANCH_ACCESS_REQUESTS', operations: ['VIEW', 'ADD', 'APPROVE', ...AUDIT_OPS] },
            { name: 'Support', section: 'SUPPORT', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Branch Rates', section: 'BRANCH_CURRENCY_RATES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] }
        ]
    },
    {
        category: 'Master Data',
        pages: [
            { name: 'Branches', section: 'BRANCHES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Transaction Settings', section: 'TRANSACTION_SETTINGS', operations: ['VIEW', 'EDIT'] },
            { name: 'API Tokens', section: 'API_TOKENS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Dilisense Sources', section: 'DILISENSE_SOURCES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Currencies', section: 'CURRENCIES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] }
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
            { name: 'Mobile Profiles', section: 'MOBILE_PROFILES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', 'PDF', 'EXPORT', ...AUDIT_OPS] },
            { name: 'App Flow Settings', section: 'MOBILE_FLOW_SETTINGS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Customer Digital Rates', section: 'MOBILE_DIGITAL_RATES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'User Rates', section: 'MOBILE_USER_RATES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Profile Review Queue', section: 'MOBILE_PROFILE_REVIEW_QUEUE', operations: ['VIEW', 'EDIT', ...AUDIT_OPS] },
            { name: 'Campaigns', section: 'MOBILE_CAMPAIGNS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Onboarding & Carousel', section: 'MOBILE_ADS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] }
        ]
    },
    {
        category: 'Application Basic Data',
        pages: [
            { name: 'Countries', section: 'COUNTRIES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Banks', section: 'BANKS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Relationships', section: 'RELATIONSHIPS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Purposes', section: 'PURPOSES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] }
        ]
    },
    {
        category: 'System Users',
        pages: [
            { name: 'Role', section: 'ROLES', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Role Permissions', section: 'PERMISSION_GROUPS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Users', section: 'SYSTEM_USERS', operations: ['VIEW', 'ADD', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'User Logs', section: 'AUDIT_LOGS', operations: ['VIEW', ...AUDIT_OPS] }
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

export const checkPermission = (section: string, operation: string): boolean => {
    if (typeof window === 'undefined') return false;
    const user = getStoredUser<{ role?: string | null; username?: string | null; email?: string | null; name?: string | null; system_defined?: string | null }>();
    if (!user) return false;
    if (isPrivilegedUser(user)) return true;

    const roleName = String(user.role || '').trim().toLowerCase();
    if (!roleName) return false;

    const permissions = (window as any).__userPermissions;
    if (!Array.isArray(permissions)) return false;

    return permissions.some((row: any) => {
        const r = String(row?.role_name || '').trim().toLowerCase();
        const s = String(row?.page_section || '').trim().toUpperCase();
        const o = String(row?.operation || '').trim().toUpperCase();
        const a = String(row?.active || '').trim().toLowerCase();

        if (r !== roleName) return false;
        if (a !== 'yes') return false;
        if (o !== operation.toUpperCase()) return false;

        const targetSec = section.toUpperCase().trim();
        const rowSec = s.toUpperCase().trim();
        return rowSec === targetSec ||
               rowSec === targetSec + 'S' ||
               targetSec === rowSec + 'S' ||
               (targetSec === 'KYC_REVIEWS' && rowSec === 'KYC') ||
               (targetSec === 'BRANCH_CURRENCY_RATES' && rowSec === 'BRANCH_CURRENCY_RATE') ||
               (targetSec === 'BRANCH_ACCESS_REQUESTS' && rowSec === 'BRANCH_ACCESS') ||
               (targetSec === 'SYSTEM_USERS' && rowSec === 'SYSUSERS');
    });
};

export function useAuditColumns(section: string) {
    const [cols, setCols] = useState({
        showCreatedBy: false,
        showCreatedAt: false,
        showUpdatedBy: false,
        showUpdatedAt: false
    });

    useEffect(() => {
        const update = () => {
            setCols({
                showCreatedBy: checkPermission(section, 'VIEW_CREATED_BY'),
                showCreatedAt: checkPermission(section, 'VIEW_CREATED_AT'),
                showUpdatedBy: checkPermission(section, 'VIEW_UPDATED_BY'),
                showUpdatedAt: checkPermission(section, 'VIEW_UPDATED_AT')
            });
        };

        update();

        window.addEventListener('permissions-loaded', update);
        return () => {
            window.removeEventListener('permissions-loaded', update);
        };
    }, [section]);

    return cols;
}

export function usePagePermissions(section: string) {
    const [perms, setPerms] = useState({
        canAdd: false,
        canEdit: false,
        canDelete: false,
        canPdf: false,
        canExport: false,
        canNewTransfer: false,
        canPrint: false,
        canSign: false,
    });

    useEffect(() => {
        const update = () => {
            setPerms({
                canAdd: checkPermission(section, 'ADD'),
                canEdit: checkPermission(section, 'EDIT'),
                canDelete: checkPermission(section, 'DELETE'),
                canPdf: checkPermission(section, 'PDF'),
                canExport: checkPermission(section, 'EXPORT'),
                canNewTransfer: checkPermission(section, 'NEW_TRANSFER'),
                canPrint: checkPermission(section, 'PRINT'),
                canSign: checkPermission(section, 'SIGN'),
            });
        };

        update();

        window.addEventListener('permissions-loaded', update);
        return () => {
            window.removeEventListener('permissions-loaded', update);
        };
    }, [section]);

    return perms;
}
