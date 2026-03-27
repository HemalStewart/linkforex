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
