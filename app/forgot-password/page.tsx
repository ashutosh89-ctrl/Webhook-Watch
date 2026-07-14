'use client';

import { useState } from 'react';
import Link from 'next/link';
import { fetchWithCsrf, safeParseJson } from '@/lib/api-client';
import Navbar from '@/components/Navbar';
import { Mail, RefreshCw, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setDevResetLink(null);

    try {
      const res = await fetchWithCsrf('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const data = await safeParseJson(res);
      if (res.ok && data.success) {
        setSuccessMsg(data.message);
        if (data.resetLink) {
          setDevResetLink(data.resetLink);
        }
      } else {
        setError(data.error || 'Failed to trigger password reset.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
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

            <div className="mb-6">
              <Link href="/login" className="inline-flex items-center gap-1 text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest font-mono mb-4">
                <ArrowLeft className="h-3 w-3" /> Back to Login
              </Link>
              <h2 className="text-2xl font-black tracking-tight text-white uppercase font-sans">Reset Password</h2>
              <p className="text-zinc-400 text-sm mt-2 font-medium">
                We will generate a secure reset link to modify your password
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 uppercase font-bold text-[11px]">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm flex flex-col gap-3">
                <div className="flex items-start gap-3 uppercase font-bold text-[11px]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>

                {devResetLink && (
                  <div className="mt-3 p-3.5 bg-zinc-950 rounded border border-zinc-800 font-mono text-xs">
                    <p className="text-zinc-500 text-[9px] uppercase font-black tracking-widest mb-2">
                      🛠️ Self-Hosted Dev Callout
                    </p>
                    <p className="text-zinc-400 mb-2 leading-relaxed">
                      Since external email APIs are disabled, use this generated link:
                    </p>
                    <Link
                      href={devResetLink}
                      className="text-teal-400 hover:text-teal-300 font-bold break-all underline"
                    >
                      {devResetLink}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {!successMsg && (
              <form onSubmit={handleSubmit} className="space-y-5">
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 px-4 rounded text-xs transition-all cursor-pointer disabled:opacity-50 uppercase tracking-tight"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Sending link...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>

      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
        Webhook Watch — Proprietary Tool.
      </footer>
    </div>
  );
}
