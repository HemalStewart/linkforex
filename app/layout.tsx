import type { Metadata } from "next";
import "./globals.css";

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
            if (!raw) return { tableFontSizePx: 14 };
            var parsed = JSON.parse(raw);
            var legacy = { small: 12, medium: 14, large: 17 };
            var rawSize = parsed && (parsed.tableFontSizePx !== undefined ? parsed.tableFontSizePx : parsed.tableFontSize);
            if (typeof rawSize === 'string' && legacy[rawSize]) rawSize = legacy[rawSize];
            var num = Number(rawSize);
            if (!isFinite(num)) num = 14;
            num = Math.max(10, Math.min(20, Math.round(num)));
            return {
              tableFontSizePx: num
            };
          } catch (e) {
            return { tableFontSizePx: 14 };
          }
        };
        var getSystemTheme = function () {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        };
        var applyUiSettings = function (settings) {
          var size = Number(settings && settings.tableFontSizePx);
          if (!isFinite(size)) size = 14;
          size = Math.max(10, Math.min(20, Math.round(size)));
          var headSize = size + 2;
          var root = document.documentElement;
          root.style.setProperty('--table-font-size', size + 'px');
          root.style.setProperty('--table-head-font-size', headSize + 'px');
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
        className="antialiased font-sans"
      >
        {children}
      </body>
    </html>
  );
}
