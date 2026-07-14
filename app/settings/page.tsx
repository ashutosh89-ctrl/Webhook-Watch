'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithCsrf, safeParseJson } from '@/lib/api-client';
import Navbar from '@/components/Navbar';
import { 
  User, 
  ShieldAlert, 
  RefreshCw, 
  Check, 
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  isPro: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Profile fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Account deletion
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await safeParseJson(res);
      if (data.success && data.user) {
        setUser(data.user);
        setName(data.user.name || '');
        setEmail(data.user.email || '');
      } else {
        // Not logged in
        router.push('/login');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUserData();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const res = await fetchWithCsrf('/api/auth/profile', {
        method: 'POST',
        body: JSON.stringify({ name, email, password: password || undefined }),
      });
      const data = await safeParseJson(res);
      if (res.ok && data.success) {
        setProfileSuccess(data.message);
        setPassword('');
        if (user) {
          setUser({ ...user, name, email });
        }
      } else {
        setProfileError(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      setProfileError('An error occurred during profile update.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const res = await fetchWithCsrf('/api/auth/delete-account', {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        alert('Failed to delete account. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during account deletion.');
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 text-teal-500 animate-spin" />
            <p className="text-sm font-mono text-zinc-500">Loading User Account...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-black font-sans text-white uppercase tracking-tight">Account Settings</h1>
          <p className="text-zinc-400 text-sm mt-1 font-medium">
            Manage your personal profile and account credentials
          </p>
        </div>

        <div className="space-y-8">
          {/* Profile Card */}
          <section className="bg-zinc-950 border border-zinc-800 rounded p-6 relative">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4 mb-6">
              <User className="h-5 w-5 text-teal-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Personal Profile</h2>
            </div>

            {profileError && (
              <div className="mb-5 p-4 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3 uppercase font-bold text-[11px]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="mb-5 p-4 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs flex items-start gap-3 uppercase font-bold text-[11px]">
                <Check className="h-4 w-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded py-2.5 px-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-800 rounded py-2.5 px-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                  Change Password (Leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New secure password (min 6 chars)"
                  className="w-full bg-[#09090b] border border-zinc-800 rounded py-2.5 px-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 placeholder-zinc-600 font-mono"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold py-2 px-5 rounded text-xs transition-colors cursor-pointer uppercase tracking-tight"
                >
                  {updatingProfile ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </section>

          {/* Danger Zone Card */}
          <section className="bg-zinc-950 border border-red-500/10 bg-red-500/[0.01] rounded p-6">
            <div className="flex items-center gap-3 border-b border-red-500/10 pb-4 mb-6">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              <h2 className="text-sm font-black text-red-500 uppercase tracking-wider">Danger Zone</h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white uppercase tracking-tight text-xs">Delete User Account</p>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed font-medium">
                  Permanently erase your Webhook Watch user account, configured channels, and deletes all webhook endpoints and captured payloads immediately. This action cannot be undone.
                </p>
              </div>

              <div>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full sm:w-auto bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 font-bold px-5 py-2 rounded text-xs transition-colors cursor-pointer uppercase tracking-tight"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black text-red-400 font-mono text-center uppercase tracking-widest">Are you absolutely sure?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold px-3.5 py-1.5 rounded text-xs cursor-pointer uppercase tracking-tight"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={deletingAccount}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold px-3.5 py-1.5 rounded text-xs flex items-center gap-1 cursor-pointer uppercase tracking-tight"
                      >
                        {deletingAccount ? 'Erasing...' : 'Yes, Delete All'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
        Webhook Watch — Proprietary Tool.
      </footer>
    </div>
  );
}
