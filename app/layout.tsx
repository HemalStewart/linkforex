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
        var themeShadeRegex = /\\b(teal|blue|emerald|slate)-(50|100|200|300|400|500|600|700|800|900|950)\\b/g;
        var rewriteClassStringForTheme = function (className, preset) {
          return className.replace(themeShadeRegex, function (_match, _family, shade) { return preset + '-' + shade; });
        };
        var rewriteElementThemeClasses = function (element, preset) {
          if (!element || typeof element.getAttribute !== 'function') return;
          var className = element.getAttribute('class');
          if (!className) return;
          var next = rewriteClassStringForTheme(className, preset);
          if (next !== className) element.setAttribute('class', next);
        };
        var rewriteThemeClassesInTree = function (root, preset) {
          if (!root) return;
          if (root.nodeType === 1) rewriteElementThemeClasses(root, preset);
          var elements = root.querySelectorAll ? root.querySelectorAll('[class]') : [];
          for (var i = 0; i < elements.length; i++) {
            rewriteElementThemeClasses(elements[i], preset);
          }
        };
        var ensureThemeClassObserver = function () {
          if (!document.body) return;
          if (window.__lfThemeClassObserver) return;
          var observer = new MutationObserver(function (mutations) {
            var preset = window.__lfCurrentThemePreset || 'teal';
            for (var i = 0; i < mutations.length; i++) {
              var mutation = mutations[i];
              if (mutation.type === 'attributes') {
                rewriteElementThemeClasses(mutation.target, preset);
              } else if (mutation.type === 'childList') {
                for (var j = 0; j < mutation.addedNodes.length; j++) {
                  var node = mutation.addedNodes[j];
                  if (node && node.nodeType === 1) rewriteThemeClassesInTree(node, preset);
                }
              }
            }
          });
          observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
          window.__lfThemeClassObserver = observer;
        };
        var applyThemeClassRewrite = function (preset) {
          window.__lfCurrentThemePreset = preset;
          if (!document.body) return;
          rewriteThemeClassesInTree(document.body, preset);
          ensureThemeClassObserver();
        };
        var applyUiSettings = function (settings) {
          var palettes = {
            teal: { start: '#2dd4bf', middle: '#14b8a6', end: '#0d9488', accent: '#0ea5a4', accentRgb: '14 165 164', chart: '#0ea5a4' },
            blue: { start: '#60a5fa', middle: '#3b82f6', end: '#2563eb', accent: '#2563eb', accentRgb: '37 99 235', chart: '#3b82f6' },
            emerald: { start: '#6ee7b7', middle: '#34d399', end: '#059669', accent: '#059669', accentRgb: '5 150 105', chart: '#10b981' },
            slate: { start: '#94a3b8', middle: '#64748b', end: '#475569', accent: '#475569', accentRgb: '71 85 105', chart: '#64748b' }
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
          root.style.setProperty('--accent-primary-rgb', palette.accentRgb);
          root.style.setProperty('--accent-success', palette.accent);
          root.style.setProperty('--chart-primary', palette.chart);
          root.style.setProperty('--table-font-size', table.body);
          root.style.setProperty('--table-head-font-size', table.head);
          applyThemeClassRewrite(settings.themeColorPreset || 'teal');
        };
        var apply = function (preference) {
          var resolved = preference === 'system' ? getSystemTheme() : preference;
          document.documentElement.classList.toggle('dark', resolved === 'dark');
          document.documentElement.style.colorScheme = resolved;
        };

        apply(getPreference());
        applyUiSettings(getUiSettings());
        if (!document.body) {
          document.addEventListener('DOMContentLoaded', function () {
            applyThemeClassRewrite(getUiSettings().themeColorPreset || 'teal');
          }, { once: true });
        }

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
