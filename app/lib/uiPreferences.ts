'use client';

export type TableFontSizePreset = 'small' | 'medium' | 'large';

export type UiSettings = {
    tableFontSize: TableFontSizePreset;
};

const UI_SETTINGS_KEY = 'uiSettings';

const defaultSettings: UiSettings = {
    tableFontSize: 'medium',
};

const TABLE_FONT_PRESETS: Record<TableFontSizePreset, { body: string; head: string }> = {
    small: { body: '0.75rem', head: '0.62rem' },
    medium: { body: '0.9rem', head: '0.72rem' },
    large: { body: '1.05rem', head: '0.85rem' },
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
            tableFontSize: normalizeTableFontPreset(parsed?.tableFontSize),
        };
    } catch {
        return defaultSettings;
    }
};

export const applyUiSettings = (settings: UiSettings): void => {
    if (typeof window === 'undefined') return;

    const normalized: UiSettings = {
        tableFontSize: normalizeTableFontPreset(settings.tableFontSize),
    };

    const table = TABLE_FONT_PRESETS[normalized.tableFontSize];
    const root = document.documentElement;

    root.style.setProperty('--table-font-size', table.body);
    root.style.setProperty('--table-head-font-size', table.head);

    window.localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event('ui-settings-change'));
};
