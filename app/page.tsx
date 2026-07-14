'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithCsrf, safeParseJson } from '@/lib/api-client';
import Navbar from '@/components/Navbar';
import { 
  ArrowRight, 
  Activity, 
  Terminal, 
  ShieldAlert, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  Layers, 
  Zap, 
  Lock, 
  Eye 
} from 'lucide-react';
import { motion } from 'motion/react';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateWebhook = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithCsrf('/api/webhooks/generate', {
        method: 'POST',
      });
      const data = await safeParseJson(res);
      if (data.success && data.webhook) {
        router.push(`/dashboard?slug=${data.webhook.slug}`);
      } else {
        setError(data.error || 'Failed to create webhook URL. Please try again.');
      }
    } catch (e) {
      console.error(e);
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Layers className="h-6 w-6 text-teal-400" />,
      title: 'Universal Capture',
      description: 'Accepts all HTTP methods (GET, POST, PUT, DELETE, etc.) and captures headers, bodies, parameters, and client IPs instantly.',
    },
    {
      icon: <Eye className="h-6 w-6 text-teal-400" />,
      title: 'Real-Time Inspection',
      description: 'Watch incoming webhooks stream live onto your dashboard via Server-Sent Events (SSE). No manual page refresh needed.',
    },
    {
      icon: <RefreshCw className="h-6 w-6 text-teal-400" />,
      title: 'Instant Replay',
      description: 'Forward captured requests to your local development environment or production target, logging the exact downstream responses.',
    },
    {
      icon: <Download className="h-6 w-6 text-teal-400" />,
      title: 'Multi-Format Export',
      description: 'Export captured request logs into JSON, CSV, fully compatible HAR files, or clean, copy-pasteable cURL shell scripts.',
    },
    {
      icon: <Lock className="h-6 w-6 text-teal-400" />,
      title: 'Rest Encryption',
      description: 'Sensible resting data like authorization headers and raw body payloads are encrypted on the disk using AES-256-GCM.',
    },
    {
      icon: <ShieldAlert className="h-6 w-6 text-teal-400" />,
      title: 'Slack Webhook Integrations',
      description: 'Configure real-time notifications to your internal channels whenever endpoints receive traffic or experience 4xx/5xx failures.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-between">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="relative py-20 sm:py-32 overflow-hidden">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

          {/* Ambient glow */}
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-full max-w-7xl rounded-full bg-teal-500/10 blur-[120px]" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-bold uppercase tracking-wider mb-8"
            >
              <Zap className="h-3.5 w-3.5 fill-teal-400/20" /> Self-Hosted Webhook Debugger
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-6xl font-black font-sans tracking-tighter text-zinc-100 max-w-3xl mx-auto leading-[1.05] uppercase mb-6"
            >
              Debug webhooks <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300">
                in seconds.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10"
            >
              Generate secure, encrypted callback endpoints to capture HTTP requests in real-time. 
              Inspect payloads, replay headers, and sync straight into Slack without any external SaaS accounts.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto"
            >
              <button
                id="btn-generate-webhook"
                disabled={loading}
                onClick={handleGenerateWebhook}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-black uppercase tracking-tight px-8 py-4 rounded text-base shadow-lg shadow-teal-600/15 hover:shadow-teal-600/30 transition-all cursor-pointer group"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Creating your URL...</span>
                  </>
                ) : (
                  <>
                    <span>Get Your Webhook URL</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </motion.div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 mt-4 text-sm font-medium"
              >
                {error}
              </motion.p>
            )}

            {/* Simulated terminal preview of curl command */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-16 max-w-2xl mx-auto text-left rounded border border-zinc-800 bg-zinc-950/80 shadow-2xl p-4 font-mono text-xs sm:text-sm text-zinc-300 relative group"
            >
              <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/25 font-bold uppercase tracking-wider">
                <Terminal className="h-3 w-3" /> Quick Test
              </div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <p className="text-teal-400 mb-1"># Test your endpoint instantly using cURL</p>
              <p className="text-zinc-300 select-all overflow-x-auto whitespace-nowrap scrollbar-none py-1">
                curl -X POST -H &quot;Content-Type: application/json&quot; -d &apos;&lbrace;&quot;status&quot;: &quot;active&quot;&rbrace;&apos; &quot;https://webhookwatch.com/webhook/slug&quot;
              </p>
            </motion.div>
          </div>
        </div>

        {/* Feature Grid Section */}
        <section className="py-20 border-t border-zinc-800 bg-zinc-950/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-black uppercase tracking-tight text-zinc-100 mb-4">
                Everything you need to debug third-party APIs
              </h2>
              <p className="text-zinc-400 font-medium">
                A single developer-focused sandbox. Zero third-party cookies, zero latency, and pure performance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition-all hover:translate-y-[-2px] group"
                >
                  <div className="mb-4 p-2 rounded bg-zinc-900/60 w-fit group-hover:bg-teal-600/10 transition-colors">
                    {feat.icon}
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-tight mb-2">{feat.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{feat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs text-zinc-500 font-mono">
          <p>© 2026 Webhook Watch. All rights reserved.</p>
          <p>
            Proprietary — users may use but NOT modify. Feedback to{' '}
            <a href="mailto:myserio26@gmail.com" className="text-teal-400 hover:underline">
              myserio26@gmail.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
