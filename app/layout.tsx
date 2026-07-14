import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Webhook Watch — Debug & Inspect Webhooks in Real-Time',
  description: 'Instantly capture, inspect, replay, and monitor HTTP webhooks. Custom unique URLs, SSE stream, AES rest-encryption, and Slack notifications.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <body className="bg-[#09090b] text-zinc-100 min-h-screen font-sans antialiased selection:bg-teal-500/30 selection:text-teal-200" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

