'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { fetchWithCsrf, safeParseJson } from '@/lib/api-client';
import { Activity, LayoutDashboard, Settings, LogOut, LogIn, UserPlus } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  isPro: boolean;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await safeParseJson(res);
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Error fetching user context:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUser();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const res = await fetchWithCsrf('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        setUser(null);
        router.push('/');
        router.refresh();
      }
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-teal-500 rounded flex items-center justify-center transition-colors">
              <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
            </div>
            <span className="text-xl font-black tracking-tighter uppercase text-zinc-100 group-hover:text-teal-400 transition-colors">
              Webhook Watch
            </span>
          </Link>

          {!loading && user && (
            <div className="hidden md:flex gap-6 text-sm font-bold uppercase tracking-tight">
              <Link
                href="/dashboard"
                className={`transition-colors pb-1 ${
                  pathname === '/dashboard'
                    ? 'text-zinc-100 border-b-2 border-teal-500'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className={`transition-colors pb-1 ${
                  pathname === '/settings'
                    ? 'text-zinc-100 border-b-2 border-teal-500'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Settings
              </Link>
            </div>
          )}
        </div>

        <nav className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-mono text-zinc-400">System: Operational</span>
          </div>

          {!loading && user && (
            <div className="flex items-center gap-3">
              {/* Mobile links */}
              <Link
                href="/dashboard"
                className={`md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold uppercase tracking-tight ${
                  pathname === '/dashboard' ? 'bg-zinc-900 text-white' : 'text-zinc-400'
                }`}
              >
                Dash
              </Link>
              <Link
                href="/settings"
                className={`md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold uppercase tracking-tight ${
                  pathname === '/settings' ? 'bg-zinc-900 text-white' : 'text-zinc-400'
                }`}
              >
                Setup
              </Link>


              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded text-sm font-bold uppercase tracking-tight text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}

          {!loading && !user && (
            <>
              <Link
                href="/login"
                className={`flex items-center gap-1.5 px-3 py-2 rounded text-sm font-bold uppercase tracking-tight transition-colors ${
                  pathname === '/login'
                    ? 'text-zinc-100 border-b border-teal-500'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded px-4 py-2.5 text-xs transition-all uppercase tracking-tight"
              >
                <UserPlus className="h-4 w-4" />
                <span>Sign up</span>
              </Link>
            </>
          )}

          {loading && (
            <div className="h-8 w-24 bg-zinc-900 rounded animate-pulse" />
          )}
        </nav>
      </div>
    </header>
  );
}
