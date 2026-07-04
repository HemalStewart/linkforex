const USER_STORAGE_KEY = 'user';
const ADMIN_SESSION_TOKEN_KEY = 'admin_session_token';
const ADMIN_SESSION_EXPIRY_KEY = 'admin_session_expires_at';

const canUseBrowserStorage = (): boolean => typeof window !== 'undefined';

export const getStoredUserRaw = (): string | null => {
    if (!canUseBrowserStorage()) return null;
    return localStorage.getItem(USER_STORAGE_KEY) ?? sessionStorage.getItem(USER_STORAGE_KEY);
};

export const getStoredUser = <T = unknown>(): T | null => {
    const raw = getStoredUserRaw();
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

export const setStoredUser = (user: unknown, remember = true): void => {
    if (!canUseBrowserStorage()) return;
    const serialized = JSON.stringify(user);
    if (remember) {
        localStorage.setItem(USER_STORAGE_KEY, serialized);
        sessionStorage.removeItem(USER_STORAGE_KEY);
        return;
    }
    sessionStorage.setItem(USER_STORAGE_KEY, serialized);
    localStorage.removeItem(USER_STORAGE_KEY);
};

export const getStoredAdminSessionToken = (): string | null => {
    if (!canUseBrowserStorage()) return null;
    return localStorage.getItem(ADMIN_SESSION_TOKEN_KEY) ?? sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY);
};

export const getStoredAdminSessionExpiry = (): string | null => {
    if (!canUseBrowserStorage()) return null;
    return localStorage.getItem(ADMIN_SESSION_EXPIRY_KEY) ?? sessionStorage.getItem(ADMIN_SESSION_EXPIRY_KEY);
};

export const setStoredAdminSession = (token: string, expiresAt?: string | null, remember = true): void => {
    if (!canUseBrowserStorage()) return;

    const write = (storage: Storage) => {
        storage.setItem(ADMIN_SESSION_TOKEN_KEY, token);
        if (expiresAt) {
            storage.setItem(ADMIN_SESSION_EXPIRY_KEY, expiresAt);
        } else {
            storage.removeItem(ADMIN_SESSION_EXPIRY_KEY);
        }
    };

    const clearOther = (storage: Storage) => {
        storage.removeItem(ADMIN_SESSION_TOKEN_KEY);
        storage.removeItem(ADMIN_SESSION_EXPIRY_KEY);
    };

    if (remember) {
        write(localStorage);
        clearOther(sessionStorage);
        return;
    }

    write(sessionStorage);
    clearOther(localStorage);
};

export const clearStoredUser = (): void => {
    if (!canUseBrowserStorage()) return;
    localStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
    localStorage.removeItem(ADMIN_SESSION_EXPIRY_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_EXPIRY_KEY);
};
