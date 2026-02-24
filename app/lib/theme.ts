'use client';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme_preference';

export const getStoredThemePreference = (): ThemePreference => {
    if (typeof window === 'undefined') return 'system';
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') {
        return value;
    }
    return 'system';
};

export const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const resolveTheme = (preference: ThemePreference): ResolvedTheme => {
    return preference === 'system' ? getSystemTheme() : preference;
};

export const applyThemePreference = (preference: ThemePreference): void => {
    if (typeof window === 'undefined') return;

    const resolved = resolveTheme(preference);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.style.colorScheme = resolved;
    localStorage.setItem(STORAGE_KEY, preference);
    window.dispatchEvent(new Event('theme-preference-change'));
};

