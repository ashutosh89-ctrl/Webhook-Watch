'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchWithCsrf, safeParseJson } from '@/lib/api-client';
import Navbar from '@/components/Navbar';
import { 
  Activity, 
  Copy, 
  Check, 
  RefreshCw, 
  Trash2, 
  Download, 
  Plus, 
  HelpCircle, 
  ArrowRight, 
  SlidersHorizontal, 
  Terminal, 
  Layers, 
  Clock, 
  Info, 
  Send, 
  Filter, 
  FileCode, 
  Sparkles,
  Search,
  CheckSquare,
  Square,
  Globe,
  Shuffle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Webhook {
  id: string;
  slug: string;
  label: string | null;
  expiresAt: string | null;
  requestCount: number;
  dailyLimit: number;
  isPro: boolean;
  createdAt: string;
}

interface CapturedRequest {
  id: string;
  webhookId: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  query: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  statusCode: number;
  responseTime: number;
  replayCount: number;
  createdAt: string;
}

interface ReplayLog {
  id: string;
  targetUrl: string;
  responseStatus: number;
  responseTime: number;
  responsePreview: string;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slugParam = searchParams.get('slug');

  // App states
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [activeWebhook, setActiveWebhook] = useState<Webhook | null>(null);
  const [requestsList, setRequestsList] = useState<CapturedRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CapturedRequest | null>(null);

  // Filters and utilities
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [checkedRequestIds, setCheckedRequestIds] = useState<string[]>([]);
  
  // Modals & UI Toggles
  const [showGuide, setShowGuide] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [compareData, setCompareData] = useState<{ req1: CapturedRequest; req2: CapturedRequest } | null>(null);
  const [guideTab, setGuideTab] = useState<'stripe' | 'github' | 'shopify' | 'custom'>('stripe');

  // Loading/Trigger states
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [newWebhookLabel, setNewWebhookLabel] = useState('');
  const [showNewLabelInput, setShowNewLabelInput] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [compareWarning, setCompareWarning] = useState<string | null>(null);

  // Replay fields
  const [replayTargetUrl, setReplayTargetUrl] = useState('');
  const [replaying, setReplaying] = useState(false);
  const [replaySuccess, setReplaySuccess] = useState<any | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);

  // Compute full webhook URL
  const webhookFullUrl = useMemo(() => {
    if (!activeWebhook) return '';
    const host = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `${host}/webhook/${activeWebhook.slug}`;
  }, [activeWebhook]);

  // Fetch webhooks list
  const fetchWebhooks = async (selectSlug?: string) => {
    setLoadingWebhooks(true);
    try {
      const res = await fetch('/api/webhooks');
      const data = await safeParseJson(res);
      if (data.success && data.webhooks) {
        setWebhooks(data.webhooks);

        // Determine which webhook to activate
        let targetWebhook = null;
        if (selectSlug) {
          targetWebhook = data.webhooks.find((w: Webhook) => w.slug === selectSlug);
        } else if (slugParam) {
          targetWebhook = data.webhooks.find((w: Webhook) => w.slug === slugParam);
        }

        // Fallback: load details directly if it's anonymous (not in user list)
        if (!targetWebhook && (selectSlug || slugParam)) {
          const slugToFetch = selectSlug || slugParam;
          const detailRes = await fetch(`/api/webhooks/${slugToFetch}`);
          const detailData = await safeParseJson(detailRes);
          if (detailData.success && detailData.webhook) {
            targetWebhook = detailData.webhook;
          }
        }

        // Fallback 2: take first in list
        if (!targetWebhook && data.webhooks.length > 0) {
          targetWebhook = data.webhooks[0];
        }

        if (targetWebhook) {
          setActiveWebhook(targetWebhook);
          fetchRequests(targetWebhook.slug);
        } else {
          setActiveWebhook(null);
          setRequestsList([]);
          setSelectedRequest(null);
        }
      }
    } catch (e) {
      console.error('Error fetching webhooks:', e);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  // Fetch requests for selected webhook
  const fetchRequests = async (slug: string) => {
    setLoadingRequests(true);
    setSelectedRequest(null);
    setCheckedRequestIds([]);
    try {
      const res = await fetch(`/api/webhooks/${slug}/requests`);
      const data = await safeParseJson(res);
      if (data.success && data.requests) {
        setRequestsList(data.requests);
        if (data.requests.length > 0) {
          setSelectedRequest(data.requests[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWebhooks();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam]);

  // SSE Stream Listening
  useEffect(() => {
    if (!activeWebhook) return;

    const eventSource = new EventSource(`/api/webhooks/${activeWebhook.slug}/stream`);

    eventSource.addEventListener('request', (event: MessageEvent) => {
      try {
        const newRequest = JSON.parse(event.data) as CapturedRequest;
        // Prepend new request
        setRequestsList((prev) => {
          const updated = [newRequest, ...prev];
          // Auto-select if none selected
          if (prev.length === 0) {
            setSelectedRequest(newRequest);
          }
          return updated;
        });

        // Increment counts locally
        setActiveWebhook((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            requestCount: (prev.requestCount || 0) + 1,
          };
        });
      } catch (e) {
        console.error('SSE JSON error:', e);
      }
    });

    eventSource.onerror = () => {
      // Reconnects automatically by default
    };

    return () => {
      eventSource.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWebhook?.slug]);

  // Create new named/anonymous webhook
  const handleCreateWebhook = async () => {
    try {
      const res = await fetchWithCsrf('/api/webhooks/generate', {
        method: 'POST',
        body: JSON.stringify({ label: newWebhookLabel || undefined }),
      });
      const data = await safeParseJson(res);
      if (data.success && data.webhook) {
        setNewWebhookLabel('');
        setShowNewLabelInput(false);
        router.push(`/dashboard?slug=${data.webhook.slug}`);
        fetchWebhooks(data.webhook.slug);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete a webhook endpoint
  const handleDeleteWebhook = async (whSlug: string) => {
    setDeleteError(null);
    try {
      const res = await fetchWithCsrf(`/api/webhooks/${whSlug}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        // Remove from list
        setWebhooks((prev) => prev.filter((wh) => wh.slug !== whSlug));
        setDeletingSlug(null);
        
        // If the active webhook is the one deleted, clear it or select another
        if (activeWebhook?.slug === whSlug) {
          const remaining = webhooks.filter((wh) => wh.slug !== whSlug);
          if (remaining.length > 0) {
            const nextWh = remaining[0];
            router.push(`/dashboard?slug=${nextWh.slug}`);
            setActiveWebhook(nextWh);
            fetchRequests(nextWh.slug);
          } else {
            router.push('/dashboard');
            setActiveWebhook(null);
            setRequestsList([]);
            setSelectedRequest(null);
          }
        }
      } else {
        const data = await safeParseJson(res);
        setDeleteError(data.error || 'Failed to delete webhook.');
      }
    } catch (e) {
      console.error(e);
      setDeleteError('Error deleting webhook.');
    }
  };

  // Delete single request
  const handleDeleteRequest = async (id: string) => {
    if (!activeWebhook) return;
    try {
      const res = await fetchWithCsrf(`/api/webhooks/${activeWebhook.slug}/requests?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRequestsList((prev) => prev.filter((r) => r.id !== id));
        if (selectedRequest?.id === id) {
          setSelectedRequest(null);
        }
        setCheckedRequestIds((prev) => prev.filter((cid) => cid !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Clear all requests
  const handleClearAllRequests = async () => {
    if (!activeWebhook) return;
    if (!confirm('Are you absolutely sure you want to clear all requests?')) return;
    try {
      const res = await fetchWithCsrf(`/api/webhooks/${activeWebhook.slug}/requests`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRequestsList([]);
        setSelectedRequest(null);
        setCheckedRequestIds([]);
        setActiveWebhook((prev) => prev ? { ...prev, requestCount: 0 } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Replay Action
  const handleReplayRequest = async () => {
    if (!activeWebhook || !selectedRequest || !replayTargetUrl) return;
    setReplaying(true);
    setReplaySuccess(null);
    setReplayError(null);

    try {
      const res = await fetchWithCsrf(`/api/webhooks/${activeWebhook.slug}/replay/${selectedRequest.id}`, {
        method: 'POST',
        body: JSON.stringify({ targetUrl: replayTargetUrl }),
      });
      const data = await safeParseJson(res);
      if (res.ok && data.success) {
        setReplaySuccess(data.log);
        // Increment replay count locally
        setSelectedRequest((prev) => prev ? { ...prev, replayCount: (prev.replayCount || 0) + 1 } : null);
        setRequestsList((prev) => prev.map((r) => r.id === selectedRequest.id ? { ...r, replayCount: (r.replayCount || 0) + 1 } : r));
      } else {
        setReplayError(data.error || 'Failed to replay request.');
      }
    } catch (e) {
      setReplayError('Replay forward connection failed.');
    } finally {
      setReplaying(false);
    }
  };

  // Perform Request Diff Comparison
  const handleCompareChecked = async () => {
    if (!activeWebhook) return;
    if (checkedRequestIds.length !== 2) {
      setCompareWarning(`Please select exactly 2 requests using the checkboxes in the request list to compare them.`);
      setTimeout(() => setCompareWarning(null), 5000);
      return;
    }
    try {
      const [id1, id2] = checkedRequestIds;
      const res = await fetch(`/api/webhooks/${activeWebhook.slug}/compare?id1=${id1}&id2=${id2}`);
      const data = await safeParseJson(res);
      if (data.success) {
        setCompareData({ req1: data.request1, req2: data.request2 });
        setShowCompare(true);
        setCompareWarning(null);
      } else {
        setCompareWarning(data.error || 'Failed to compare requests.');
      }
    } catch (e) {
      console.error(e);
      setCompareWarning('Error fetching payload comparison.');
    }
  };

  const handleCheckboxToggle = (id: string) => {
    setCheckedRequestIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      } else {
        if (prev.length >= 2) {
          // Keep only last selected and add new
          return [prev[1], id];
        }
        return [...prev, id];
      }
    });
  };

  // Filter & Search Requests list
  const filteredRequests = useMemo(() => {
    return requestsList.filter((r) => {
      // 1. Method filter
      if (methodFilter !== 'ALL') {
        if (methodFilter === 'FAILED') {
          if (r.statusCode < 400) return false;
        } else if (r.method.toUpperCase() !== methodFilter) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter !== 'ALL') {
        const codeClass = Math.floor(r.statusCode / 100);
        if (statusFilter === '2XX' && codeClass !== 2) return false;
        if (statusFilter === '4XX' && codeClass !== 4) return false;
        if (statusFilter === '5XX' && codeClass !== 5) return false;
      }

      // 3. Search text (headers or body)
      if (searchTerm.trim() !== '') {
        const text = searchTerm.toLowerCase();
        const bodyMatch = r.body && r.body.toLowerCase().includes(text);
        const methodMatch = r.method.toLowerCase().includes(text);
        const ipMatch = r.ipAddress && r.ipAddress.includes(text);
        const headersMatch = Object.entries(r.headers).some(
          ([k, v]) => k.toLowerCase().includes(text) || String(v).toLowerCase().includes(text)
        );
        return bodyMatch || methodMatch || ipMatch || headersMatch;
      }

      return true;
    });
  }, [requestsList, methodFilter, statusFilter, searchTerm]);

  // Copy Clipboard Helper
  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Construct copy cURL statement
  const curlStringForSelected = useMemo(() => {
    if (!selectedRequest || !activeWebhook) return '';
    const hFlags = Object.entries(selectedRequest.headers)
      .map(([name, value]) => `-H "${name}: ${value}"`)
      .join(' ');
    
    const bodyFlag = selectedRequest.body ? `-d '${selectedRequest.body.replace(/'/g, "'\\''")}'` : '';
    const queryStr = Object.keys(selectedRequest.query).length > 0
      ? '?' + new URLSearchParams(selectedRequest.query).toString()
      : '';

    return `curl -X ${selectedRequest.method} ${hFlags} ${bodyFlag} "${webhookFullUrl}${queryStr}"`;
  }, [selectedRequest, activeWebhook, webhookFullUrl]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col h-screen overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-zinc-800 bg-zinc-950 flex flex-col justify-between shrink-0 hidden md:flex">
          <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Webhook Endpoints
              </span>
              <button
                onClick={() => setShowNewLabelInput(!showNewLabelInput)}
                className="p-1 rounded bg-zinc-900 hover:bg-teal-600 hover:text-white text-zinc-400 transition-colors cursor-pointer"
                title="Create Named Webhook"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Create Webhook Form Inline */}
            {showNewLabelInput && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded border border-zinc-800 bg-zinc-950 space-y-2.5"
              >
                <input
                  type="text"
                  placeholder="Webhook Label (e.g. Stripe)"
                  value={newWebhookLabel}
                  onChange={(e) => setNewWebhookLabel(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded py-1.5 px-2.5 text-xs focus:outline-none focus:border-teal-500 text-white"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowNewLabelInput(false)}
                    className="px-2 py-1 text-[10px] bg-zinc-900 hover:bg-zinc-800 rounded text-zinc-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateWebhook}
                    className="px-2 py-1 text-[10px] bg-teal-600 hover:bg-teal-500 text-white font-bold rounded uppercase tracking-tight"
                  >
                    Generate
                  </button>
                </div>
              </motion.div>
            )}

            {/* Webhooks list */}
            {loadingWebhooks ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-12 bg-zinc-900 rounded" />
                <div className="h-12 bg-zinc-900 rounded" />
              </div>
            ) : webhooks.length === 0 && !activeWebhook ? (
              <div className="text-center py-8">
                <p className="text-xs text-zinc-500 font-mono mb-3">No webhooks generated yet.</p>
                <button
                  onClick={handleCreateWebhook}
                  className="w-full text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded uppercase tracking-tight"
                >
                  Create Your First URL
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {webhooks.map((wh) => {
                  const isActive = wh.slug === activeWebhook?.slug;
                  const isPendingDelete = deletingSlug === wh.slug;

                  if (isPendingDelete) {
                    return (
                      <div
                        key={wh.id}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-left p-3 rounded border border-rose-500/20 bg-rose-500/5 text-zinc-100 block"
                      >
                        <div className="text-xs font-bold mb-1 text-rose-400 font-sans uppercase tracking-tight">
                          Confirm Delete?
                        </div>
                        <p className="text-[10px] text-zinc-400 mb-2.5 font-sans leading-relaxed">
                          Are you sure you want to delete <strong className="text-zinc-200">{wh.label || wh.slug}</strong>? This will permanently erase all its recorded requests.
                        </p>
                        {deleteError && (
                          <div className="text-[10px] text-rose-400 font-mono mb-2 bg-rose-500/10 p-1.5 rounded border border-rose-500/20">
                            {deleteError}
                          </div>
                        )}
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setDeletingSlug(null);
                              setDeleteError(null);
                            }}
                            className="px-2 py-1 text-[10px] bg-zinc-900 hover:bg-zinc-800 rounded text-zinc-300 font-sans font-bold cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteWebhook(wh.slug);
                            }}
                            className="px-2 py-1 text-[10px] bg-rose-600 hover:bg-rose-500 text-white font-sans font-bold rounded cursor-pointer transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={wh.id}
                      onClick={() => {
                        router.push(`/dashboard?slug=${wh.slug}`);
                        setActiveWebhook(wh);
                        fetchRequests(wh.slug);
                      }}
                      className={`w-full text-left p-3 rounded border transition-all cursor-pointer relative group block ${
                        isActive
                          ? 'bg-teal-500/5 border-teal-500/20 text-white'
                          : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs truncate max-w-[120px] text-zinc-100 uppercase tracking-tight">
                          {wh.label || wh.slug}
                        </span>
                        <div className="flex items-center gap-1.5">

                          <button
                            title="Delete Webhook"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingSlug(wh.slug);
                              setDeleteError(null);
                            }}
                            className="text-zinc-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer hover:bg-zinc-900"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] font-mono font-medium opacity-70 mb-2 truncate">
                        {wh.slug}
                      </p>
                      
                      {/* Quota display */}
                      <div className="mt-2 text-[9px] font-mono text-zinc-500 flex justify-between items-center">
                        <span>{wh.requestCount} request{wh.requestCount === 1 ? '' : 's'} total</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Active Webhook Metadata card */}
          {activeWebhook && (
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/80">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Globe className="h-3.5 w-3.5 text-teal-400" />
                <span className="text-xs font-bold text-zinc-100 font-sans uppercase tracking-tight">Active Webhook URL</span>
              </div>
              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-2 rounded">
                <span className="text-[10px] font-mono text-teal-400 truncate flex-1">
                  {webhookFullUrl}
                </span>
                <button
                  onClick={() => copyToClipboard(webhookFullUrl, setCopiedUrl)}
                  className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                >
                  {copiedUrl ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              {activeWebhook.expiresAt ? (
                <div className="text-[9px] font-mono text-amber-400 flex items-center gap-1 mt-2 font-bold uppercase">
                  <Clock className="h-3 w-3" /> Anonymous 24h Expiry
                </div>
              ) : (
                <div className="text-[9px] font-mono text-teal-400 flex items-center gap-1 mt-2 font-bold uppercase">
                  <Sparkles className="h-3 w-3" /> Persistent Webhook
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Main Log Console split */}
        <section className="flex-grow flex flex-col bg-[#050505] overflow-hidden">
          {/* Top filtering bar */}
          <div className="h-14 border-b border-zinc-800 px-4 flex items-center justify-between gap-3 bg-zinc-950">
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none flex-grow">
              <div className="relative max-w-xs w-44 sm:w-60 hidden sm:block">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search request body, headers, IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded py-1.5 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-teal-500 placeholder-zinc-600 font-bold uppercase tracking-tight"
                />
              </div>

              {/* Method filter */}
              <div className="flex items-center border border-zinc-800 rounded p-0.5 bg-zinc-950 text-[11px] font-mono font-bold uppercase">
                {['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'FAILED'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethodFilter(m)}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      methodFilter === m 
                        ? 'bg-teal-600 text-white font-black' 
                        : 'text-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Status filter */}
              <div className="flex items-center border border-zinc-800 rounded p-0.5 bg-zinc-950 text-[11px] font-mono font-bold uppercase">
                {['ALL', '2XX', '4XX', '5XX'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      statusFilter === s 
                        ? 'bg-zinc-800 text-zinc-100 font-black' 
                        : 'text-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Diff Compare button */}
              <button
                onClick={handleCompareChecked}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-bold uppercase tracking-tight cursor-pointer transition-colors ${
                  checkedRequestIds.length === 2
                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-300 hover:bg-teal-600 hover:text-white'
                    : 'border-zinc-800 text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-400'
                }`}
                title={
                  checkedRequestIds.length === 2
                    ? "Click to compare the 2 selected requests"
                    : "Select exactly 2 requests to compare them"
                }
              >
                <Shuffle className={`h-3.5 w-3.5 ${checkedRequestIds.length === 2 ? 'text-teal-400 font-bold' : ''}`} />
                <span className="hidden lg:inline">
                  {checkedRequestIds.length === 0 && "Compare (Select 2)"}
                  {checkedRequestIds.length === 1 && "Compare (Select 1 More)"}
                  {checkedRequestIds.length === 2 && "Compare (2 Selected)"}
                </span>
                <span className="inline lg:hidden">
                  Compare ({checkedRequestIds.length})
                </span>
              </button>

              {/* Export triggers */}
              <div className="flex items-center border border-zinc-800 rounded p-0.5">
                {['json', 'csv', 'har', 'curl'].map((fmt) => (
                  <a
                    key={fmt}
                    href={activeWebhook ? `/api/webhooks/${activeWebhook.slug}/export?format=${fmt}` : '#'}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase text-zinc-400 hover:text-white transition-colors ${
                      !activeWebhook ? 'pointer-events-none opacity-40' : ''
                    }`}
                    title={`Export as ${fmt.toUpperCase()}`}
                  >
                    {fmt}
                  </a>
                ))}
              </div>

              <button
                onClick={() => setShowGuide(true)}
                className="flex items-center justify-center gap-1 bg-zinc-900 hover:bg-teal-600 hover:text-white text-zinc-300 p-2 rounded transition-all cursor-pointer"
                title="Integration Setup Guide"
              >
                <HelpCircle className="h-4 w-4" />
              </button>

              <button
                onClick={handleClearAllRequests}
                disabled={requestsList.length === 0}
                className="flex items-center justify-center gap-1 bg-red-500/10 hover:bg-red-600 hover:text-white text-red-400 p-2 rounded transition-all cursor-pointer disabled:opacity-40"
                title="Clear All Requests"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Left Hand: Requests logs stack */}
            <div className="w-1/2 border-r border-zinc-800 overflow-y-auto flex flex-col justify-between h-full bg-zinc-950">
              {compareWarning && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-[10px] px-3.5 py-2.5 font-mono flex items-center justify-between font-bold shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-500">⚠️</span>
                    <span>{compareWarning}</span>
                  </div>
                  <button 
                    onClick={() => setCompareWarning(null)} 
                    className="text-zinc-500 hover:text-white uppercase font-black text-[9px] cursor-pointer ml-2 shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              {loadingRequests ? (
                <div className="p-8 text-center space-y-3">
                  <RefreshCw className="h-6 w-6 text-teal-500 animate-spin mx-auto" />
                  <p className="text-xs font-mono text-zinc-500">Decrypting caught webhooks...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="p-10 text-center space-y-4 my-auto">
                  <Activity className="h-10 w-10 text-zinc-800 animate-pulse mx-auto" />
                  <p className="text-sm font-bold text-zinc-100 uppercase tracking-tight">Awaiting Webhook Payload</p>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed font-medium">
                    Trigger your webhook callback! Dispatch requests using the full URL on the right, or click the Setup Guide to sync tools like Stripe.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-900/40">
                  {filteredRequests.map((r) => {
                    const isSelected = selectedRequest?.id === r.id;
                    const isChecked = checkedRequestIds.includes(r.id);
                    const statusClass = 
                      r.statusCode >= 500 ? 'text-red-400 bg-red-500/10 border-red-500/20 font-bold uppercase' :
                      r.statusCode >= 400 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20 font-bold uppercase' :
                      'text-teal-400 bg-teal-500/10 border-teal-500/20 font-bold uppercase';

                    return (
                      <div
                        key={r.id}
                        className={`p-3.5 flex items-center gap-3 transition-colors ${
                          isSelected ? 'bg-teal-500/5 border-l-4 border-teal-500' : 'hover:bg-zinc-900 border-l-4 border-transparent'
                        }`}
                      >
                        {/* Checkbox for compare */}
                        <button
                          onClick={() => handleCheckboxToggle(r.id)}
                          className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-teal-500" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>

                        {/* Interactive list area */}
                        <div
                          onClick={() => setSelectedRequest(r)}
                          className="flex-grow flex items-center justify-between gap-3 cursor-pointer min-w-0"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`text-xs font-black px-1.5 py-0.5 rounded shrink-0 w-14 text-center ${
                              isSelected ? 'bg-teal-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
                            }`}>
                              {r.method}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${statusClass}`}>
                              {r.statusCode}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 truncate">
                              IP: {r.ipAddress}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 shrink-0">
                            <span suppressHydrationWarning>{new Date(r.createdAt).toLocaleTimeString()}</span>
                            <span className="hidden lg:inline">• {r.responseTime}ms</span>
                            {r.replayCount > 0 && (
                              <span className="text-[9px] bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded font-black border border-teal-500/20">
                                {r.replayCount}R
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Hand: Detailed Request inspector & Replay log console */}
            <div className="w-1/2 overflow-y-auto bg-zinc-950/40 p-4 space-y-6">
              {selectedRequest ? (
                <div className="space-y-6">
                  {/* Top Stats Banner */}
                  <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
                    <div className="flex justify-between items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider bg-teal-500 text-zinc-950 px-2.5 py-1 rounded">
                          {selectedRequest.method}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                          ID: {selectedRequest.id.slice(0, 8)}...
                        </span>
                      </div>
                      
                      <button
                        onClick={() => copyToClipboard(curlStringForSelected, setCopiedCurl)}
                        className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded border border-zinc-800 cursor-pointer font-bold uppercase tracking-tight"
                      >
                        {copiedCurl ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Copied cURL!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy as cURL</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono text-zinc-400 pt-2 border-t border-zinc-800/50">
                      <div>
                        <p className="text-[10px] uppercase text-zinc-500 font-black tracking-widest">Client IP</p>
                        <p className="text-zinc-300 mt-1 font-bold">{selectedRequest.ipAddress}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-zinc-500 font-black tracking-widest">Response Time</p>
                        <p className="text-zinc-300 mt-1 font-bold">{selectedRequest.responseTime} ms</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-zinc-500 font-black tracking-widest">Replays</p>
                        <p className="text-zinc-300 mt-1 font-bold">{selectedRequest.replayCount} runs</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-zinc-500 font-black tracking-widest">Captured Time</p>
                        <p className="text-zinc-300 mt-1 font-bold" suppressHydrationWarning>{new Date(selectedRequest.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Query Parameters Section */}
                  {Object.keys(selectedRequest.query).length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        Query Parameters
                      </h3>
                      <div className="rounded border border-zinc-800 bg-zinc-950/40 divide-y divide-zinc-800 font-mono text-xs overflow-hidden">
                        {Object.entries(selectedRequest.query).map(([k, v]) => (
                          <div key={k} className="p-2.5 flex items-start gap-4">
                            <span className="text-teal-400 font-bold w-1/3 shrink-0 truncate">{k}</span>
                            <span className="text-zinc-300 select-all break-all">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Headers Section */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      HTTP Request Headers
                    </h3>
                    <div className="rounded border border-zinc-800 bg-zinc-950/40 divide-y divide-zinc-800 font-mono text-xs max-h-60 overflow-y-auto">
                      {Object.entries(selectedRequest.headers).map(([k, v]) => (
                        <div key={k} className="p-2.5 flex items-start gap-4">
                          <span className="text-teal-400 font-bold w-1/3 shrink-0 truncate">{k}</span>
                          <span className="text-zinc-300 select-all break-all">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Decrypted Payload Body */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      Payload Body
                    </h3>
                    <div className="rounded border border-zinc-800 bg-zinc-950 overflow-hidden relative">
                      <div className="bg-zinc-900/40 border-b border-zinc-800 px-4 py-2 flex items-center justify-between text-xs font-mono text-zinc-500">
                        <span>
                          {selectedRequest.body ? `${selectedRequest.body.length} bytes` : 'Empty Body'}
                        </span>
                        {selectedRequest.body && (
                          <button
                            onClick={() => copyToClipboard(selectedRequest.body, () => {})}
                            className="text-zinc-400 hover:text-white font-bold uppercase text-[10px] tracking-tight"
                          >
                            Copy Payload
                          </button>
                        )}
                      </div>
                      <pre className="p-4 font-mono text-xs text-teal-200 overflow-x-auto max-h-96 whitespace-pre-wrap select-all">
                        {selectedRequest.body ? (
                          (() => {
                            try {
                              return JSON.stringify(JSON.parse(selectedRequest.body), null, 2);
                            } catch (e) {
                              return selectedRequest.body;
                            }
                          })()
                        ) : (
                          <span className="text-zinc-600 font-mono text-[11px] italic">No body payload included with this webhook call.</span>
                        )}
                      </pre>
                    </div>
                  </div>

                  {/* Replay Console Tool */}
                  <div className="rounded border border-zinc-800 bg-zinc-950 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-teal-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                        Replay & Forward Trigger
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://localhost:8080/api/stripe-callback"
                        value={replayTargetUrl}
                        onChange={(e) => setReplayTargetUrl(e.target.value)}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded py-2 px-3 text-xs text-white focus:outline-none focus:border-teal-500 font-mono placeholder-zinc-600"
                      />
                      <button
                        onClick={handleReplayRequest}
                        disabled={replaying || !replayTargetUrl}
                        className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold py-2 px-4 rounded text-xs transition-colors cursor-pointer uppercase tracking-tight"
                      >
                        {replaying ? 'Forwarding...' : 'Forward'}
                      </button>
                    </div>

                    {replayError && (
                      <p className="text-[11px] font-mono text-red-400 font-bold uppercase">{replayError}</p>
                    )}

                    {replaySuccess && (
                      <div className="mt-3 p-3.5 bg-zinc-950 rounded border border-zinc-800 font-mono text-xs space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 border-b border-zinc-800 pb-2 mb-2">
                          <span>HTTP STATUS: <strong className={replaySuccess.responseStatus >= 400 ? 'text-red-400' : 'text-teal-400'}>{replaySuccess.responseStatus}</strong></span>
                          <span>LATENCY: <strong>{replaySuccess.responseTime}ms</strong></span>
                        </div>
                        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">
                          Downstream Response Preview:
                        </p>
                        <pre className="bg-zinc-950 p-2 border border-zinc-800 text-zinc-400 rounded overflow-x-auto whitespace-pre-wrap font-mono text-[10px]">
                          {replaySuccess.responsePreview || '[Empty Response]'}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center p-8">
                  <div className="text-zinc-600 font-mono text-xs">
                    Select any webhook request on the left stack to inspect raw payloads and replay callbacks.
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Integration Guide Modal */}
      <AnimatePresence>
        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#09090b] border border-zinc-800 rounded max-w-2xl w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-teal-400" /> Integration Setup Guide
                </h3>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-zinc-500 hover:text-white font-mono text-xs cursor-pointer font-bold uppercase"
                >
                  Close [X]
                </button>
              </div>

              {/* Guide tabs */}
              <div className="flex border-b border-zinc-800 text-xs font-mono">
                {(['stripe', 'github', 'shopify', 'custom'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setGuideTab(tab)}
                    className={`px-4 py-2 border-b-2 font-bold uppercase cursor-pointer transition-colors ${
                      guideTab === tab 
                        ? 'border-teal-500 text-white' 
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Guide Code Templates */}
              <div className="space-y-4">
                <p className="text-xs text-zinc-400 font-mono leading-relaxed font-medium">
                  Configure this active webhook callback URL on the third-party portal to debug live requests. Your exact endpoint URL:
                </p>
                <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded select-all text-xs font-mono text-teal-400 break-all font-bold">
                  {webhookFullUrl || 'Select or create a Webhook endpoint first'}
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded p-4 overflow-x-auto max-h-64">
                  {guideTab === 'stripe' && (
                    <pre className="text-xs font-mono text-teal-200">
{`# Stripe Webhook CLI testing:
stripe listen --forward-to=${webhookFullUrl || 'YOUR_URL'}

# Or configure on Dashboard > Developers > Webhooks
# Select Events to listen (e.g. checkout.session.completed)`}
                    </pre>
                  )}
                  {guideTab === 'github' && (
                    <pre className="text-xs font-mono text-teal-200">
{`# GitHub Repository Webhook Config:
# 1. Settings > Webhooks > Add Webhook
# 2. Payload URL: ${webhookFullUrl || 'YOUR_URL'}
# 3. Content type: application/json
# 4. Which events: Just push events, or select individual.`}
                    </pre>
                  )}
                  {guideTab === 'shopify' && (
                    <pre className="text-xs font-mono text-teal-200">
{`# Shopify App Webhook Config:
# 1. Store Admin > Settings > Notifications
# 2. Scroll to Webhooks > Create Webhook
# 3. URL: ${webhookFullUrl || 'YOUR_URL'}
# 4. Format: JSON`}
                    </pre>
                  )}
                  {guideTab === 'custom' && (
                    <pre className="text-xs font-mono text-teal-200">
{`# Dispatch a manual request via curl:
curl -X POST -H "Content-Type: application/json" \\
  -d '{"event": "test.ping", "data": {"status": "ok"}}' \\
  "${webhookFullUrl || 'YOUR_URL'}"`}
                    </pre>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compare Diff Modal */}
      <AnimatePresence>
        {showCompare && compareData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#09090b] border border-zinc-800 rounded max-w-5xl w-full p-6 shadow-2xl flex flex-col h-[85vh] overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 shrink-0 mb-4">
                <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Shuffle className="h-5 w-5 text-teal-400" /> Webhook Payload Comparison
                </h3>
                <button
                  onClick={() => setShowCompare(false)}
                  className="text-zinc-500 hover:text-white font-mono text-xs cursor-pointer font-bold uppercase"
                >
                  Close [X]
                </button>
              </div>

              {/* Scrollable Compare area */}
              <div className="flex-grow flex gap-4 overflow-y-auto">
                {/* Request 1 */}
                <div className="w-1/2 bg-zinc-950 border border-zinc-800 rounded p-4 flex flex-col overflow-hidden h-full">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-3 text-xs font-mono text-teal-400 font-bold">
                    <span>REQ 1 ({compareData.req1.id.slice(0, 8)})</span>
                    <span>{compareData.req1.method}</span>
                  </div>
                  
                  <div className="flex-grow space-y-4 overflow-y-auto pr-1">
                    <div className="space-y-1 text-xs font-mono text-zinc-400">
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Captured Time</p>
                      <p className="font-bold" suppressHydrationWarning>{new Date(compareData.req1.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest font-mono">Headers</p>
                      <pre className="bg-zinc-950 border border-zinc-800 p-2.5 rounded font-mono text-[10px] text-teal-300 whitespace-pre-wrap">
                        {JSON.stringify(compareData.req1.headers, null, 2)}
                      </pre>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest font-mono">Body</p>
                      <pre className="bg-zinc-950 border border-zinc-800 p-2.5 rounded font-mono text-[10px] text-emerald-300 whitespace-pre-wrap select-all">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(compareData.req1.body), null, 2);
                          } catch (e) {
                            return compareData.req1.body || '[No Body]';
                          }
                        })()}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Request 2 */}
                <div className="w-1/2 bg-zinc-950 border border-zinc-800 rounded p-4 flex flex-col overflow-hidden h-full">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-3 text-xs font-mono text-teal-400 font-bold">
                    <span>REQ 2 ({compareData.req2.id.slice(0, 8)})</span>
                    <span>{compareData.req2.method}</span>
                  </div>

                  <div className="flex-grow space-y-4 overflow-y-auto pr-1">
                    <div className="space-y-1 text-xs font-mono text-zinc-400">
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Captured Time</p>
                      <p className="font-bold" suppressHydrationWarning>{new Date(compareData.req2.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest font-mono">Headers</p>
                      <pre className="bg-zinc-950 border border-zinc-800 p-2.5 rounded font-mono text-[10px] text-teal-300 whitespace-pre-wrap">
                        {JSON.stringify(compareData.req2.headers, null, 2)}
                      </pre>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest font-mono">Body</p>
                      <pre className="bg-zinc-950 border border-zinc-800 p-2.5 rounded font-mono text-[10px] text-emerald-300 whitespace-pre-wrap select-all">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(compareData.req2.body), null, 2);
                          } catch (e) {
                            return compareData.req2.body || '[No Body]';
                          }
                        })()}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 text-teal-500 animate-spin" />
            <p className="text-sm font-mono text-zinc-500">Initializing Dashboard...</p>
          </div>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
