'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchWithCsrf, safeParseJson } from '@/lib/api-client';
import Navbar from '@/components/Navbar';
import { Mail, Lock, User, UserPlus, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetchWithCsrf('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name: name || undefined }),
      });

      const data = await safeParseJson(res);
      if (data.success) {
        setSuccess(true);
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(data.error || 'Failed to create account. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during sign up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-between">
      <Navbar />

      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded border border-zinc-800 bg-zinc-950/80 shadow-2xl p-8 relative overflow-hidden"
          >
            {/* Soft decorative glow */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500" />

            <div className="text-center mb-8">
              <h2 className="text-2xl font-black tracking-tight text-white uppercase font-sans">Get Started</h2>
              <p className="text-zinc-400 text-sm mt-2 font-medium">
                Create an account to save webhooks persistently, set Slack alerts, and replay logs
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
                <span>Account created successfully! Redirecting...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                  Full Name (Optional)
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || success}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 px-4 rounded text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-tight"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-xs text-zinc-500 font-medium">
              Already have an account?{' '}
              <Link href="/login" className="text-teal-400 hover:text-teal-300 font-bold uppercase tracking-tight">
                Log in
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
        Webhook Watch — Proprietary Tool.
      </footer>
    </div>
  );
}
