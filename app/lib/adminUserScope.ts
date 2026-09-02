import { getStoredUser } from './authStorage';

export type StoredAdminUser = {
    id?: string | number;
    role?: string;
    system_defined?: string;
    branch?: string;
    branch_id?: string | number;
    branch_name?: string;
};

export const getCurrentAdminUser = (): StoredAdminUser | null => getStoredUser<StoredAdminUser>();

export const isPrivilegedAdminUser = (user: StoredAdminUser | null = getCurrentAdminUser()): boolean => {
    if (!user) return true;
    if (String(user.system_defined || '').toLowerCase() === 'yes') return true;
    const role = String(user.role || '').toLowerCase();
    return role.includes('admin') || role.includes('super');
};

export const normalizeAdminBranchCode = (value?: string | number | null): string => {
    const raw = String(value ?? '').trim();
    const upper = raw.toUpperCase();
    if (!upper) return '';
    if (upper.startsWith('LON')) return 'LFX';
    if (upper.startsWith('MAN') || upper.startsWith('BHM')) return 'BLF';
    return upper;
};

export const getBranchDisplayName = (
    name?: string | number | null,
    code?: string | number | null
): string => {
    const rawName = String(name ?? '').trim();
    const rawCode = String(code ?? '').trim();
    const normalizedCode = normalizeAdminBranchCode(rawCode || rawName);

    if (normalizedCode === 'LFX') return 'LONDON';
    if (normalizedCode === 'BLF') return 'BIRMINGHAM';

    const displayValue = rawName || rawCode;
    if (!displayValue || displayValue === '-') return '-';

    return displayValue
        .replace(/\s*\([^)]*\)\s*$/, '')
        .split(/\s+-\s+/)[0]
        .trim()
        .toUpperCase();
};

export const getAdminBranchCode = (user: StoredAdminUser | null = getCurrentAdminUser()): string => {
    if (!user) return '';
    return normalizeAdminBranchCode(user.branch || user.branch_id || '');
};

export const branchMatchesAdminScope = (
    branch: { code?: string | number | null; transaction_prefix?: string | number | null; name?: string | null; id?: string | number | null },
    user: StoredAdminUser | null = getCurrentAdminUser()
): boolean => {
    if (isPrivilegedAdminUser(user)) return true;
    const target = getAdminBranchCode(user);
    if (!target) return false;
    const values = [branch.code, branch.transaction_prefix, branch.name, branch.id]
        .map((value) => normalizeAdminBranchCode(value))
        .filter(Boolean);
    return values.includes(target);
};

export const withActingUserParam = (url: string, user: StoredAdminUser | null = getCurrentAdminUser()): string => {
    return url;
};
