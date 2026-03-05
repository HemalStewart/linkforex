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
            if (!raw) return { tableFontSize: 'medium' };
            var parsed = JSON.parse(raw);
            return {
              tableFontSize: (parsed && (parsed.tableFontSize === 'small' || parsed.tableFontSize === 'medium' || parsed.tableFontSize === 'large')) ? parsed.tableFontSize : 'medium'
            };
          } catch (e) {
            return { tableFontSize: 'medium' };
          }
        };
        var getSystemTheme = function () {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        };
        var applyUiSettings = function (settings) {
          var tables = {
            small: { body: '0.75rem', head: '0.62rem' },
            medium: { body: '0.9rem', head: '0.72rem' },
            large: { body: '1.05rem', head: '0.85rem' }
          };
          var table = tables[settings.tableFontSize] || tables.medium;
          var root = document.documentElement;
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
