const USER_STORAGE_KEY = 'user';

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

export const clearStoredUser = (): void => {
    if (!canUseBrowserStorage()) return;
    localStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
};
