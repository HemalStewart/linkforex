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
    accentRgb: string;
    chart: string;
}> = {
    teal: {
        start: '#2dd4bf',
        middle: '#14b8a6',
        end: '#0d9488',
        accent: '#0ea5a4',
        accentRgb: '14 165 164',
        chart: '#0ea5a4',
    },
    blue: {
        start: '#60a5fa',
        middle: '#3b82f6',
        end: '#2563eb',
        accent: '#2563eb',
        accentRgb: '37 99 235',
        chart: '#3b82f6',
    },
    emerald: {
        start: '#6ee7b7',
        middle: '#34d399',
        end: '#059669',
        accent: '#059669',
        accentRgb: '5 150 105',
        chart: '#10b981',
    },
    slate: {
        start: '#94a3b8',
        middle: '#64748b',
        end: '#475569',
        accent: '#475569',
        accentRgb: '71 85 105',
        chart: '#64748b',
    },
};

const TABLE_FONT_PRESETS: Record<TableFontSizePreset, { body: string; head: string }> = {
    small: { body: '0.8125rem', head: '0.65rem' },
    medium: { body: '0.875rem', head: '0.7rem' },
    large: { body: '0.95rem', head: '0.78rem' },
};

const themePaletteNames: ThemeColorPreset[] = ['teal', 'blue', 'emerald', 'slate'];
const themeShadeRegex = /\b(teal|blue|emerald|slate)-(50|100|200|300|400|500|600|700|800|900|950)\b/g;

const rewriteClassStringForTheme = (className: string, preset: ThemeColorPreset): string =>
    className.replace(themeShadeRegex, (_match, _family, shade) => `${preset}-${shade}`);

const rewriteElementThemeClasses = (element: Element, preset: ThemeColorPreset): void => {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) return;
    const className = element.getAttribute('class');
    if (!className) return;
    const next = rewriteClassStringForTheme(className, preset);
    if (next !== className) {
        element.setAttribute('class', next);
    }
};

const rewriteThemeClassesInTree = (root: ParentNode, preset: ThemeColorPreset): void => {
    if (root instanceof Element) {
        rewriteElementThemeClasses(root, preset);
    }
    const elements = root.querySelectorAll?.('[class]');
    if (!elements) return;
    elements.forEach((element) => rewriteElementThemeClasses(element, preset));
};

const ensureThemeClassObserver = (): MutationObserver | null => {
    if (typeof window === 'undefined') return null;
    const win = window as Window & { __lfThemeClassObserver?: MutationObserver };
    if (win.__lfThemeClassObserver) return win.__lfThemeClassObserver;

    const observer = new MutationObserver((mutations) => {
        const currentPreset = ((window as Window & { __lfCurrentThemePreset?: ThemeColorPreset }).__lfCurrentThemePreset) || 'teal';
        for (const mutation of mutations) {
            if (mutation.type === 'attributes') {
                rewriteElementThemeClasses(mutation.target as Element, currentPreset);
                continue;
            }
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof Element) {
                        rewriteThemeClassesInTree(node, currentPreset);
                    }
                });
            }
        }
    });

    observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class'],
    });

    win.__lfThemeClassObserver = observer;
    return observer;
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
    root.style.setProperty('--accent-primary-rgb', palette.accentRgb);
    root.style.setProperty('--accent-success', palette.accent);
    root.style.setProperty('--chart-primary', palette.chart);
    root.style.setProperty('--table-font-size', table.body);
    root.style.setProperty('--table-head-font-size', table.head);

    const win = window as Window & { __lfCurrentThemePreset?: ThemeColorPreset };
    win.__lfCurrentThemePreset = normalized.themeColorPreset;
    rewriteThemeClassesInTree(document.body, normalized.themeColorPreset);
    ensureThemeClassObserver();

    window.localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event('ui-settings-change'));
};
