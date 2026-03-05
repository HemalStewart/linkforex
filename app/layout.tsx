import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkForex Admin",
  description: "LinkForex administration portal",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon-x.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `
    (function () {
      try {
        var KEY = 'theme_preference';
        var UI_KEY = 'uiSettings';
        var getPreference = function () {
          var value = localStorage.getItem(KEY);
          if (value === 'light' || value === 'dark' || value === 'system') return value;
          return 'system';
        };
        var getUiSettings = function () {
          try {
            var raw = localStorage.getItem(UI_KEY);
            if (!raw) return { themeColorPreset: 'teal', tableFontSize: 'medium' };
            var parsed = JSON.parse(raw);
            return {
              themeColorPreset: (parsed && (parsed.themeColorPreset === 'teal' || parsed.themeColorPreset === 'blue' || parsed.themeColorPreset === 'emerald' || parsed.themeColorPreset === 'slate')) ? parsed.themeColorPreset : 'teal',
              tableFontSize: (parsed && (parsed.tableFontSize === 'small' || parsed.tableFontSize === 'medium' || parsed.tableFontSize === 'large')) ? parsed.tableFontSize : 'medium'
            };
          } catch (e) {
            return { themeColorPreset: 'teal', tableFontSize: 'medium' };
          }
        };
        var getSystemTheme = function () {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        };
        var applyUiSettings = function (settings) {
          var palettes = {
            teal: { start: '#2dd4bf', middle: '#14b8a6', end: '#0d9488', accent: '#0ea5a4', chart: '#0ea5a4' },
            blue: { start: '#60a5fa', middle: '#3b82f6', end: '#2563eb', accent: '#2563eb', chart: '#3b82f6' },
            emerald: { start: '#6ee7b7', middle: '#34d399', end: '#059669', accent: '#059669', chart: '#10b981' },
            slate: { start: '#94a3b8', middle: '#64748b', end: '#475569', accent: '#475569', chart: '#64748b' }
          };
          var tables = {
            small: { body: '0.8125rem', head: '0.65rem' },
            medium: { body: '0.875rem', head: '0.7rem' },
            large: { body: '0.95rem', head: '0.78rem' }
          };
          var palette = palettes[settings.themeColorPreset] || palettes.teal;
          var table = tables[settings.tableFontSize] || tables.medium;
          var root = document.documentElement;
          root.style.setProperty('--blue-gradient-start', palette.start);
          root.style.setProperty('--blue-gradient-middle', palette.middle);
          root.style.setProperty('--blue-gradient-end', palette.end);
          root.style.setProperty('--accent-primary', palette.accent);
          root.style.setProperty('--accent-success', palette.accent);
          root.style.setProperty('--chart-primary', palette.chart);
          root.style.setProperty('--table-font-size', table.body);
          root.style.setProperty('--table-head-font-size', table.head);
        };
        var apply = function (preference) {
          var resolved = preference === 'system' ? getSystemTheme() : preference;
          document.documentElement.classList.toggle('dark', resolved === 'dark');
          document.documentElement.style.colorScheme = resolved;
        };

        apply(getPreference());
        applyUiSettings(getUiSettings());

        var media = window.matchMedia('(prefers-color-scheme: dark)');
        var onSystemChange = function () {
          if (getPreference() === 'system') apply('system');
        };

        if (media.addEventListener) {
          media.addEventListener('change', onSystemChange);
        } else if (media.addListener) {
          media.addListener(onSystemChange);
        }

        window.addEventListener('storage', function (event) {
          if (event.key === KEY) apply(getPreference());
          if (event.key === UI_KEY) applyUiSettings(getUiSettings());
        });

        window.addEventListener('theme-preference-change', function () {
          apply(getPreference());
        });

        window.addEventListener('ui-settings-change', function () {
          applyUiSettings(getUiSettings());
        });
      } catch (e) {}
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
