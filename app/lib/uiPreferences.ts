'use client';

export type ThemeColorPreset = 'teal' | 'blue' | 'emerald' | 'slate';
export type TableFontSizePreset = 'small' | 'medium' | 'large';

export type UiSettings = {
    themeColorPreset: ThemeColorPreset;
    tableFontSize: TableFontSizePreset;
};

const UI_SETTINGS_KEY = 'uiSettings';

const defaultSettings: UiSettings = {
    themeColorPreset: 'teal',
    tableFontSize: 'medium',
};

const COLOR_PRESETS: Record<ThemeColorPreset, {
    start: string;
    middle: string;
    end: string;
    accent: string;
    chart: string;
}> = {
    teal: {
        start: '#2dd4bf',
        middle: '#14b8a6',
        end: '#0d9488',
        accent: '#0ea5a4',
        chart: '#0ea5a4',
    },
    blue: {
        start: '#60a5fa',
        middle: '#3b82f6',
        end: '#2563eb',
        accent: '#2563eb',
        chart: '#3b82f6',
    },
    emerald: {
        start: '#6ee7b7',
        middle: '#34d399',
        end: '#059669',
        accent: '#059669',
        chart: '#10b981',
    },
    slate: {
        start: '#94a3b8',
        middle: '#64748b',
        end: '#475569',
        accent: '#475569',
        chart: '#64748b',
    },
};

const TABLE_FONT_PRESETS: Record<TableFontSizePreset, { body: string; head: string }> = {
    small: { body: '0.8125rem', head: '0.65rem' },
    medium: { body: '0.875rem', head: '0.7rem' },
    large: { body: '0.95rem', head: '0.78rem' },
};

const normalizeThemeColorPreset = (value: unknown): ThemeColorPreset => {
    if (value === 'teal' || value === 'blue' || value === 'emerald' || value === 'slate') return value;
    return defaultSettings.themeColorPreset;
};

const normalizeTableFontPreset = (value: unknown): TableFontSizePreset => {
    if (value === 'small' || value === 'medium' || value === 'large') return value;
    return defaultSettings.tableFontSize;
};

export const getStoredUiSettings = (): UiSettings => {
    if (typeof window === 'undefined') return defaultSettings;
    const raw = window.localStorage.getItem(UI_SETTINGS_KEY);
    if (!raw) return defaultSettings;

    try {
        const parsed = JSON.parse(raw) as Partial<UiSettings>;
        return {
            themeColorPreset: normalizeThemeColorPreset(parsed?.themeColorPreset),
            tableFontSize: normalizeTableFontPreset(parsed?.tableFontSize),
        };
    } catch {
        return defaultSettings;
    }
};

export const applyUiSettings = (settings: UiSettings): void => {
    if (typeof window === 'undefined') return;

    const normalized: UiSettings = {
        themeColorPreset: normalizeThemeColorPreset(settings.themeColorPreset),
        tableFontSize: normalizeTableFontPreset(settings.tableFontSize),
    };

    const palette = COLOR_PRESETS[normalized.themeColorPreset];
    const table = TABLE_FONT_PRESETS[normalized.tableFontSize];
    const root = document.documentElement;

    root.style.setProperty('--blue-gradient-start', palette.start);
    root.style.setProperty('--blue-gradient-middle', palette.middle);
    root.style.setProperty('--blue-gradient-end', palette.end);
    root.style.setProperty('--accent-primary', palette.accent);
    root.style.setProperty('--accent-success', palette.accent);
    root.style.setProperty('--chart-primary', palette.chart);
    root.style.setProperty('--table-font-size', table.body);
    root.style.setProperty('--table-head-font-size', table.head);

    window.localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event('ui-settings-change'));
};
