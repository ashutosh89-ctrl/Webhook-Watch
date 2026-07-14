'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { fetchWithCsrf, safeParseJson } from '@/lib/api-client';
import Navbar from '@/components/Navbar';
import { Lock, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const t = searchParams.get('token');
    const timer = setTimeout(() => {
      if (t) {
        setToken(t);
      } else {
        setError('Missing token query parameter in URL. Please request a new password reset link.');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!token) {
      setError('Cannot submit. Token is missing.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetchWithCsrf('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });

      const data = await safeParseJson(res);
      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.error || 'Failed to reset password. Token may have expired.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded border border-zinc-800 bg-zinc-950/80 shadow-2xl p-8 relative overflow-hidden"
    >
      {/* Soft decorative glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500" />

      <div className="text-center mb-8">
        <h2 className="text-2xl font-black tracking-tight text-white uppercase font-sans">Set New Password</h2>
        <p className="text-zinc-400 text-sm mt-2 font-medium">
          Specify a secure new password for your account
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 uppercase font-bold text-[11px]">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm flex items-start gap-3 uppercase font-bold text-[11px]">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Password updated successfully! Redirecting to login...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
            <input
              type="password"
              required
              disabled={!token || success}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-zinc-950 border border-zinc-800 rounded py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-mono disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
            <input
              type="password"
              required
              disabled={!token || success}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full bg-zinc-950 border border-zinc-800 rounded py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-mono disabled:opacity-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !token || success}
          className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 px-4 rounded text-xs transition-all cursor-pointer disabled:opacity-50 uppercase tracking-tight"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Updating password...</span>
            </>
          ) : (
            <span>Update Password</span>
          )}
        </button>
      </form>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-between">
      <Navbar />

      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <Suspense fallback={
            <div className="rounded border border-zinc-800 bg-zinc-950/80 p-8 text-center text-zinc-500 animate-pulse font-mono uppercase font-bold text-xs tracking-wider">
              Loading Reset Page...
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>

      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
        Webhook Watch — Proprietary Tool.
      </footer>
    </div>
  );
}
