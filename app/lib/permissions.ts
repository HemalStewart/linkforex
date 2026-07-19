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

export const formatAuditUser = (val: string | null | undefined): string => {
    const trimmed = String(val || '').trim();
    if (!trimmed || trimmed.toLowerCase() === 'system') {
        const user = getStoredUser<{ username?: string; name?: string; email?: string }>();
        return user?.username || user?.name || user?.email || 'Admin';
    }
    return trimmed;
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
            { name: 'Transfers', section: 'TRANSFERS', operations: ['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'CANCEL', 'PDF', 'EXPORT', 'PRINT', 'SIGN', ...AUDIT_OPS] },
            { name: 'Remitters', section: 'REMITTERS', operations: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'PDF', 'EXPORT', 'MANUALLY_PASSED', 'RE_SCREENING', 'DELETE_COMPLIANCE_REPORT', ...AUDIT_OPS] },
            { name: 'Receivers', section: 'RECEIVERS', operations: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'PDF', 'EXPORT', 'MANUALLY_PASSED', 'RE_SCREENING', 'DELETE_COMPLIANCE_REPORT', ...AUDIT_OPS] },
            { name: 'Branch Access Flags', section: 'BRANCH_ACCESS_REQUESTS', operations: ['VIEW', 'APPROVE', 'CANCEL', ...AUDIT_OPS] },
            { name: 'Support', section: 'SUPPORT', operations: ['VIEW', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Branch Rates', section: 'BRANCH_CURRENCY_RATES', operations: ['VIEW', 'CREATE', ...AUDIT_OPS] }
        ]
    },
    {
        category: 'Master Data',
        pages: [
            { name: 'Branches', section: 'BRANCHES', operations: ['VIEW', 'CREATE', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Transaction Settings', section: 'TRANSACTION_SETTINGS', operations: ['VIEW', 'EDIT'] },
            { name: 'API Tokens', section: 'API_TOKENS', operations: ['VIEW', 'EDIT'] },
            { name: 'Dilisense Sources', section: 'DILISENSE_SOURCES', operations: ['VIEW', 'EDIT', 'DELETE', 'EDIT_FUZZY_SEARCH', 'SYNC_SOURCES', ...AUDIT_OPS] },
            { name: 'Currencies', section: 'CURRENCIES', operations: ['VIEW', 'CREATE', 'EDIT', 'DELETE', ...AUDIT_OPS] }
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
            { name: 'Mobile Profiles', section: 'MOBILE_PROFILES', operations: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'PDF', 'EXPORT', ...AUDIT_OPS] },
            { name: 'App Flow Settings', section: 'MOBILE_FLOW_SETTINGS', operations: ['VIEW', 'EDIT'] },
            { name: 'Customer Digital Rates', section: 'MOBILE_DIGITAL_RATES', operations: ['VIEW', ...AUDIT_OPS] },
            { name: 'User Rates', section: 'MOBILE_USER_RATES', operations: ['VIEW', 'CREATE', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Profile Review Queue', section: 'MOBILE_PROFILE_REVIEW_QUEUE', operations: ['VIEW', ...AUDIT_OPS] },
            { name: 'Campaigns', section: 'MOBILE_CAMPAIGNS', operations: ['VIEW', 'CREATE', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Onboarding & Carousel', section: 'MOBILE_ADS', operations: ['VIEW', 'CREATE', 'DELETE', 'DISABLE', ...AUDIT_OPS] }
        ]
    },
    {
        category: 'Application Basic Data',
        pages: [
            { name: 'Countries', section: 'COUNTRIES', operations: ['VIEW', 'CREATE', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Banks', section: 'BANKS', operations: ['VIEW', 'CREATE', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Relationships', section: 'RELATIONSHIPS', operations: ['VIEW', 'CREATE', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Purposes', section: 'PURPOSES', operations: ['VIEW', 'CREATE', 'EDIT', 'DELETE', ...AUDIT_OPS] }
        ]
    },
    {
        category: 'System Users',
        pages: [
            { name: 'Role', section: 'ROLES', operations: ['VIEW', 'CREATE', 'EDIT', 'DELETE', ...AUDIT_OPS] },
            { name: 'Role Permissions', section: 'PERMISSION_GROUPS', operations: ['VIEW', 'EDIT', ...AUDIT_OPS] },
            { name: 'Users', section: 'SYSTEM_USERS', operations: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'RESET_PASSWORD', ...AUDIT_OPS] },
            { name: 'User Logs', section: 'AUDIT_LOGS', operations: ['VIEW', 'EXPORT'] }
        ]
    },
    {
        category: 'Configuration',
        pages: [
            { name: 'Configuration', section: 'SETTINGS', operations: ['VIEW', 'EDIT'] },
            { name: 'My Profile', section: 'PROFILE', operations: ['VIEW', 'EDIT', 'CHANGE_PASSWORD', 'DISPLAY_PREFERENCES'] }
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

        const targetOp = operation.toUpperCase();
        const rowOp = o.toUpperCase();
        if (rowOp !== targetOp) {
            const isCreateAddMatch = (targetOp === 'CREATE' && rowOp === 'ADD') || (targetOp === 'ADD' && rowOp === 'CREATE');
            if (!isCreateAddMatch) return false;
        }

        const targetSec = section.toUpperCase().trim();
        const rowSec = s.toUpperCase().trim();
        return rowSec === targetSec ||
            rowSec === targetSec + 'S' ||
            targetSec === rowSec + 'S' ||
            (targetSec === 'BRANCH_CURRENCY_RATES' && rowSec === 'BRANCH_CURRENCY_RATE') ||
            (targetSec === 'BRANCH_ACCESS_REQUESTS' && rowSec === 'BRANCH_ACCESS') ||
            (targetSec === 'SYSTEM_USERS' && rowSec === 'SYSUSERS') ||
            (targetSec === 'ROLES' && rowSec === 'SYSGROUPS') ||
            (targetSec === 'SYSGROUPS' && rowSec === 'ROLES') ||
            (targetSec === 'PERMISSION_GROUPS' && rowSec === 'SYSGROUPS_PERMISSION') ||
            (targetSec === 'SYSGROUPS_PERMISSION' && rowSec === 'PERMISSION_GROUPS') ||
            (targetSec === 'AUDIT_LOGS' && (rowSec === 'SYSUSERS_LOG' || rowSec === 'SYSRECORD_LOGS' || rowSec === 'LOGS')) ||
            ((targetSec === 'SYSUSERS_LOG' || targetSec === 'SYSRECORD_LOGS' || targetSec === 'LOGS') && rowSec === 'AUDIT_LOGS');
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
        window.addEventListener('user-loaded', update);
        return () => {
            window.removeEventListener('permissions-loaded', update);
            window.removeEventListener('user-loaded', update);
        };
    }, [section]);

    return cols;
}

export function usePagePermissions(section: string) {
    const [perms, setPerms] = useState({
        canAdd: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canPdf: false,
        canExport: false,
        canPrint: false,
        canSign: false,
        canApprove: false,
        canCancel: false,
        canView: false,
        canManuallyPassed: false,
        canChangePassword: false,
        canDisplayPreferences: false,
        canEditFuzzySearch: false,
        canSyncSources: false,
        canResetPassword: false,
        canDisable: false,
        canReScreening: false,
        canDeleteComplianceReport: false,
    });

    useEffect(() => {
        const update = () => {
            const hasCreate = checkPermission(section, 'CREATE');
            const hasEdit = checkPermission(section, 'EDIT');
            const hasDelete = checkPermission(section, 'DELETE');
            const hasView = checkPermission(section, 'VIEW');
            const hasManuallyPassed = checkPermission(section, 'MANUALLY_PASSED');
            const hasChangePassword = checkPermission(section, 'CHANGE_PASSWORD');
            const hasDisplayPreferences = checkPermission(section, 'DISPLAY_PREFERENCES');
            const hasEditFuzzySearch = checkPermission(section, 'EDIT_FUZZY_SEARCH');
            const hasSyncSources = checkPermission(section, 'SYNC_SOURCES');
            const hasReScreening = checkPermission(section, 'RE_SCREENING');
            const hasDeleteComplianceReport = checkPermission(section, 'DELETE_COMPLIANCE_REPORT');

            const isOpConfigured = (op: string) => {
                for (const cat of ADMIN_PAGES_CONFIG) {
                    for (const page of cat.pages) {
                        const targetSec = section.toUpperCase().trim();
                        const rowSec = page.section.toUpperCase().trim();

                        const match = rowSec === targetSec ||
                            rowSec === targetSec + 'S' ||
                            targetSec === rowSec + 'S' ||
                            (targetSec === 'BRANCH_CURRENCY_RATES' && rowSec === 'BRANCH_CURRENCY_RATE') ||
                            (targetSec === 'BRANCH_ACCESS_REQUESTS' && rowSec === 'BRANCH_ACCESS') ||
                            (targetSec === 'SYSTEM_USERS' && rowSec === 'SYSUSERS') ||
                            (targetSec === 'ROLES' && rowSec === 'SYSGROUPS') ||
                            (targetSec === 'SYSGROUPS' && rowSec === 'ROLES') ||
                            (targetSec === 'PERMISSION_GROUPS' && rowSec === 'SYSGROUPS_PERMISSION') ||
                            (targetSec === 'SYSGROUPS_PERMISSION' && rowSec === 'PERMISSION_GROUPS') ||
                            (targetSec === 'AUDIT_LOGS' && (rowSec === 'SYSUSERS_LOG' || rowSec === 'SYSRECORD_LOGS' || rowSec === 'LOGS')) ||
                            ((targetSec === 'SYSUSERS_LOG' || targetSec === 'SYSRECORD_LOGS' || targetSec === 'LOGS') && rowSec === 'AUDIT_LOGS');

                        if (match) {
                            return page.operations.includes(op);
                        }
                    }
                }
                return false;
            };

            const hasPdf = checkPermission(section, 'PDF');
            const hasExport = checkPermission(section, 'EXPORT');

            setPerms({
                canAdd: hasCreate,
                canCreate: hasCreate,
                canEdit: hasEdit,
                canDelete: hasDelete,
                canPdf: isOpConfigured('PDF') ? hasPdf : (hasPdf || hasView),
                canExport: isOpConfigured('EXPORT') ? hasExport : (hasExport || hasView),
                canPrint: checkPermission(section, 'PRINT'),
                canSign: checkPermission(section, 'SIGN'),
                canApprove: checkPermission(section, 'APPROVE'),
                canCancel: checkPermission(section, 'CANCEL'),
                canView: hasView,
                canManuallyPassed: hasManuallyPassed,
                canChangePassword: hasChangePassword,
                canDisplayPreferences: hasDisplayPreferences,
                canEditFuzzySearch: hasEditFuzzySearch,
                canSyncSources: hasSyncSources,
                canResetPassword: checkPermission(section, 'RESET_PASSWORD'),
                canDisable: checkPermission(section, 'DISABLE'),
                canReScreening: hasReScreening,
                canDeleteComplianceReport: hasDeleteComplianceReport,
            });
        };

        update();

        window.addEventListener('permissions-loaded', update);
        window.addEventListener('user-loaded', update);
        return () => {
            window.removeEventListener('permissions-loaded', update);
            window.removeEventListener('user-loaded', update);
        };
    }, [section]);

    return perms;
}
