import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Data Chat - Dashboard Builder",
  description:
    "Conversational dashboard builder powered by AI. Connect your database, ask questions, get interactive charts.",
};

/**
 * Inline script to apply the theme class BEFORE first paint.
 * This prevents the "flash of wrong theme" (FOWT).
 */
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var mode = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
    var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased bg-surface-primary text-text-primary">
        {children}
      </body>
    </html>
  );
}
