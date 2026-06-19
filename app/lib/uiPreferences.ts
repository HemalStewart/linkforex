'use client';

import { useState, useEffect } from 'react';

export type UiSettings = {
    tableFontSizePx: number;
    toastMessageTimerMs: number;
    rowsPerPage: number;
};

const UI_SETTINGS_KEY = 'uiSettings';

const defaultSettings: UiSettings = {
    tableFontSizePx: 14,
    toastMessageTimerMs: 3000,
    rowsPerPage: 10,
};

const LEGACY_PRESET_TO_PX: Record<string, number> = {
    small: 12,
    medium: 14,
    large: 17,
};


const normalizeToastTimerMs = (value: unknown): number => {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return defaultSettings.toastMessageTimerMs;
    return Math.max(1000, Math.min(10000, Math.round(num / 500) * 500));
};

const normalizeTableFontPx = (value: unknown): number => {
    if (typeof value === 'string' && value in LEGACY_PRESET_TO_PX) {
        return LEGACY_PRESET_TO_PX[value];
    }
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return defaultSettings.tableFontSizePx;
    return Math.max(10, Math.min(20, Math.round(num)));
};

const normalizeRowsPerPage = (value: unknown): number => {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return defaultSettings.rowsPerPage;
    return Math.max(5, Math.min(100, Math.round(num)));
};

export const getStoredUiSettings = (): UiSettings => {
    if (typeof window === 'undefined') return defaultSettings;
    const raw = window.localStorage.getItem(UI_SETTINGS_KEY);
    if (!raw) return defaultSettings;

    try {
        const parsed = JSON.parse(raw) as Partial<UiSettings>;
        return {
            tableFontSizePx: normalizeTableFontPx((parsed as Record<string, unknown>)?.tableFontSizePx ?? (parsed as Record<string, unknown>)?.tableFontSize),
            toastMessageTimerMs: normalizeToastTimerMs((parsed as Record<string, unknown>)?.toastMessageTimerMs ?? (parsed as Record<string, unknown>)?.toastTimerMs),
            rowsPerPage: normalizeRowsPerPage((parsed as Record<string, unknown>)?.rowsPerPage ?? defaultSettings.rowsPerPage),
        };
    } catch {
        return defaultSettings;
    }
};

export const applyUiSettings = (settings: UiSettings): void => {
    if (typeof window === 'undefined') return;

    const normalized: UiSettings = {
        tableFontSizePx: normalizeTableFontPx(settings.tableFontSizePx),
        toastMessageTimerMs: normalizeToastTimerMs(settings.toastMessageTimerMs),
        rowsPerPage: normalizeRowsPerPage(settings.rowsPerPage),
    };

    const root = document.documentElement;
    const headPx = normalized.tableFontSizePx + 2;

    root.style.setProperty('--table-font-size', `${normalized.tableFontSizePx}px`);
    root.style.setProperty('--table-head-font-size', `${headPx}px`);

    window.localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event('ui-settings-change'));
};

export const useRowsPerPage = (initialDefault = 10) => {
    const [rowsPerPage, setRowsPerPage] = useState(initialDefault);

    useEffect(() => {
        const syncRowsPerPage = () => {
            setRowsPerPage(getStoredUiSettings().rowsPerPage);
        };

        syncRowsPerPage();
        window.addEventListener('ui-settings-change', syncRowsPerPage);
        return () => window.removeEventListener('ui-settings-change', syncRowsPerPage);
    }, []);

    return [rowsPerPage, setRowsPerPage] as const;
};

export const useTableFontSize = () => {
    const [fontSize, setFontSize] = useState(14);

    useEffect(() => {
        const syncFontSize = () => {
            setFontSize(getStoredUiSettings().tableFontSizePx);
        };

        syncFontSize();
        window.addEventListener('ui-settings-change', syncFontSize);
        return () => window.removeEventListener('ui-settings-change', syncFontSize);
    }, []);

    const updateFontSize = (newSize: number) => {
        const current = getStoredUiSettings();
        const next = { ...current, tableFontSizePx: Math.max(10, Math.min(20, newSize)) };
        applyUiSettings(next);
    };

    return [fontSize, updateFontSize] as const;
};


