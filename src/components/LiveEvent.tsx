import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, TrendingUp, Users, Radio, Activity, CheckCircle2,
  Layout, MessageCircle, ChevronDown, Zap, X, CheckSquare,
  Square, Layers, Loader2, AlertCircle, RefreshCw,
  Maximize2, Copy, Check, Mail, UserCheck, Download
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { liaisonService } from '../services/liaisonService';
import { Footer } from './Footer';

interface Branding {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
}

interface LiveEventProps {
  branding: Branding;
}

interface EventQuestion {
  id: string;
  text: string;
  source: string;
  displayName: string | null;
  status: 'queued' | 'processing' | 'answered';
  topic: string | null;
  answer: string | null;
  answeredAt: string | null;
  receivedAt: string;
}

interface Topic {
  name: string;
  count: number;
  color: string;
}

interface Citation {
  docName: string;
  snippet: string;
  publicUrl: string;
}

interface ApprovedAnswer {
  questions: EventQuestion[];
  answer: string;
  citations: Citation[];
  approvedAt: string;
}

interface ContactEntry {
  questionId: string;
  name: string | null;
  email: string | null;
  questionText: string;
  submittedAt: string;
  notified: boolean;
  notifiedAt?: string;
}

const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL || 'https://lbkh-r2-proxy.mickey-474.workers.dev';
const UPLOAD_SECRET = import.meta.env.VITE_R2_UPLOAD_SECRET || '';
const BUCKET = import.meta.env.VITE_R2_BUCKET || 'liaison';
const EVENT_ID = import.meta.env.VITE_EVENT_ID || 'lbkh';

const TOPIC_COLORS = [
  '#22d3ee', '#a855f7', '#f59e0b', '#10b981', '#ef4444',
  '#3b82f6', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

function deriveTopics(questions: EventQuestion[]): Topic[] {
  const topicMap: Record<string, number> = {};
  questions.forEach(q => {
    const t = q.topic || 'Uncategorized';
    topicMap[t] = (topicMap[t] || 0) + 1;
  });
  // Only surface topics with 2+ questions; the rest go into "Other"
  const qualified: Array<[string, number]> = [];
  let otherCount = 0;
  Object.entries(topicMap)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, count]) => {
      if (count >= 2) {
        qualified.push([name, count]);
      } else {
        otherCount += count;
      }
    });
  // Cap at 7 named topics so there's room for Other
  const capped = qualified.slice(0, 7);
  const result: Topic[] = capped.map(([name, count], i) => ({
    name,
    count,
    color: TOPIC_COLORS[i % TOPIC_COLORS.length],
  }));
  if (otherCount > 0) {
    result.push({ name: 'Other', count: otherCount, color: '#6b7280' });
  }
  return result;
}

export function LiveEvent({ branding }: LiveEventProps) {
  const [questions, setQuestions] = useState<EventQuestion[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAnswer, setGeneratedAnswer] = useState<string | null>(null);
  const [approvedAnswers, setApprovedAnswers] = useState<ApprovedAnswer[]>([]);
  const [displayAnswer, setDisplayAnswer] = useState<ApprovedAnswer | null>(null);
  const [showModeSwitcher, setShowModeSwitcher] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'queue' | 'contacts'>('queue');
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [showQrFullscreen, setShowQrFullscreen] = useState(false);
  const [pendingCitations, setPendingCitations] = useState<Citation[]>([]);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const navigate = useNavigate();
  const heatmapRef = useRef<SVGSVGElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch questions from R2 worker ────────────────────────────────────────
  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch(
        `${WORKER_URL}/event/questions?eventId=${EVENT_ID}`,
        {
          headers: {
            'X-Upload-Secret': UPLOAD_SECRET,
            'X-Bucket': BUCKET,
          },
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const qs: EventQuestion[] = data.questions || [];
      setQuestions(qs);
      setTopics(deriveTopics(qs));
      setLoadError(null);
    } catch (err: any) {
      setLoadError('Could not load questions — ' + err.message);
    }
  }, []);

  // Poll every 4 seconds
  useEffect(() => {
    fetchQuestions();
    pollRef.current = setInterval(fetchQuestions, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchQuestions]);

  // ── D3 Heatmap ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!heatmapRef.current || topics.length === 0) return;
    const svg = d3.select(heatmapRef.current);
    svg.selectAll('*').remove();
    const W = 380, H = 380;
    const pack = d3.pack<Topic>().size([W, H]).padding(10);
    const root = d3.hierarchy({ children: topics } as any).sum((d: any) => d.count);
    const nodes = pack(root as any).leaves();
    const leaf = svg.selectAll('g').data(nodes).enter().append('g')
      .attr('transform', d => `translate(${d.x},${d.y})`);
    leaf.append('circle')
      .attr('r', d => d.r)
      .attr('fill', (d: any) => d.data.color)
      .attr('fill-opacity', 0.18)
      .attr('stroke', (d: any) => d.data.color)
      .attr('stroke-width', 2);
    leaf.append('text').attr('dy', '.3em')
      .style('text-anchor', 'middle')
      .style('font-size', d => Math.min(d.r / 3.5, 11) + 'px')
      .style('font-weight', '900').style('fill', 'white')
      .style('text-transform', 'uppercase').style('letter-spacing', '0.08em')
      .text((d: any) => d.data.name);
    leaf.append('text').attr('dy', '1.6em')
      .style('text-anchor', 'middle').style('font-size', '9px')
      .style('fill', 'white').style('opacity', 0.5)
      .text((d: any) => d.data.count + ' Qs');
  }, [topics]);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(questions.filter(q => q.status === 'queued').map(q => q.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const selectedQuestions = questions.filter(q => selectedIds.has(q.id));

  // ── Generate answer for selected questions ────────────────────────────────
  const handleGenerateAnswer = async () => {
    if (selectedQuestions.length === 0) return;
    setIsGenerating(true);
    setGeneratedAnswer(null);
    setPendingCitations([]);
    try {
      const combinedPrompt = selectedQuestions.length === 1
        ? selectedQuestions[0].text
        : `Please address all of the following related community questions in a single, comprehensive response:\n\n${selectedQuestions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')}`;
      const { answer, citations } = await liaisonService.chatWithCitations(combinedPrompt, [], false, 'liveEvent');
      setGeneratedAnswer(answer);
      setPendingCitations(citations);
    } catch (err: any) {
      setGeneratedAnswer('Error generating answer: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Approve answer → push to display ─────────────────────────────────────
  const handleApprove = async () => {
    if (!generatedAnswer) return;
    const approved: ApprovedAnswer = {
      questions: selectedQuestions,
      answer: generatedAnswer,
      citations: pendingCitations,
      approvedAt: new Date().toISOString(),
    };

    // Save answers back to worker for each question
    for (const q of selectedQuestions) {
      try {
        await fetch(`${WORKER_URL}/event/answer`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Upload-Secret': UPLOAD_SECRET,
            'X-Bucket': BUCKET,
          },
          body: JSON.stringify({
            eventId: EVENT_ID,
            questionId: q.id,
            answer: generatedAnswer,
            approved: true,
          }),
        });
      } catch (_) {}
    }

    setApprovedAnswers(prev => [approved, ...prev]);
    setDisplayAnswer(approved);
    setGeneratedAnswer(null);
    setPendingCitations([]);
    setSelectedIds(new Set());
    fetchQuestions();
  };

  // ── Fetch private contacts log ────────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    setContactsLoading(true);
    try {
      const res = await fetch(
        `${WORKER_URL}/event/contacts?eventId=${EVENT_ID}`,
        { headers: { 'X-Upload-Secret': UPLOAD_SECRET, 'X-Bucket': BUCKET } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (_) {}
    finally { setContactsLoading(false); }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const exportContacts = () => {
    const rows = [
      ['Name', 'Email', 'Question', 'Submitted At', 'Notified'],
      ...contacts.map(c => [
        c.name || 'Anonymous',
        c.email || '',
        c.questionText,
        c.submittedAt,
        c.notified ? 'Yes' : 'No',
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-contacts-${EVENT_ID}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyWebhook = () => {
    const url = `${WORKER_URL}/event/question`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const queuedCount = questions.filter(q => q.status === 'queued').length;
  const answeredCount = questions.filter(q => q.status === 'answered').length;

  return (
    <div className="flex flex-col h-screen liaison-bg wireframe-grid overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-black/80 backdrop-blur-md text-white p-4 border-b border-teal-400/30 flex justify-between items-center shadow-2xl relative z-20">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            {branding.logo ? (
              <img src={branding.logo} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <div
                className="w-8 h-8 rounded-sm flex items-center justify-center transform rotate-45 glow-cyan group-hover:scale-110 transition-transform"
                style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
              >
                <Shield className="w-5 h-5 text-white transform -rotate-45" />
              </div>
            )}
            <div className="flex flex-col">
              <span
                className="text-xl font-black tracking-tighter uppercase leading-none bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(to right, white, ${branding.primaryColor})` }}
              >
                {branding.companyName}
              </span>
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-[0.3em] mt-0.5">Live Event Liaison</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats pills */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white/50">
              {queuedCount} Queued
            </span>
            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              {answeredCount} Answered
            </span>
          </div>

          {/* Refresh */}
          <button onClick={fetchQuestions} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Mode switcher */}
          <div className="relative">
            <button
              onClick={() => setShowModeSwitcher(!showModeSwitcher)}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/10"
              style={{ color: branding.primaryColor }}
            >
              <Radio className="w-4 h-4 animate-pulse" />
              Live
              <ChevronDown className={`w-3 h-3 transition-transform ${showModeSwitcher ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showModeSwitcher && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute top-full right-0 mt-2 w-44 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-2 space-y-1">
                    {[
                      { icon: Layout, label: 'Develop', path: '/settings' },
                      { icon: Radio, label: 'Live Event', path: '/event' },
                      { icon: MessageCircle, label: 'Chat Liaison', path: '/' },
                    ].map(({ icon: Icon, label, path }) => (
                      <button
                        key={path}
                        onClick={() => { navigate(path); setShowModeSwitcher(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white text-[10px] font-black uppercase tracking-widest text-left transition-colors"
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link to="/settings" className="text-white/40 hover:text-white transition-colors">
            <Users className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Panel: QR + Question Queue ──────────────────────────────── */}
        <aside
          className="w-[350px] border-r flex flex-col overflow-hidden"
          style={{ backgroundColor: `${branding.primaryColor}05`, borderColor: `${branding.primaryColor}20` }}
        >
          {/* QR Code */}
          <div
            className="p-4 border-b text-center space-y-3"
            style={{ backgroundColor: `${branding.primaryColor}05`, borderColor: `${branding.primaryColor}20` }}
          >
            <div
              className="inline-block p-2 bg-white rounded-xl shadow-2xl cursor-pointer hover:scale-[1.02] transition-transform group relative"
              onClick={() => setShowQrFullscreen(true)}
              title="Click to expand"
            >
              <QRCodeSVG
                value={`${window.location.origin}/ask?event=${EVENT_ID}`}
                size={290}
                level="H"
                includeMargin={false}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 rounded-xl transition-colors">
                <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </div>
            <div className="space-y-0.5">
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Scan to Ask</h3>
              <p className="text-[9px] text-white/40 uppercase tracking-widest">Tap to expand · Submit your question</p>
            </div>
            {/* Webhook URL for SMS providers */}
            <button
              onClick={handleCopyWebhook}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-[9px] font-mono transition-colors hover:bg-white/5"
              style={{ borderColor: `${branding.primaryColor}30`, color: `${branding.primaryColor}80` }}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy Webhook URL'}
            </button>
          </div>

          {/* Tab switcher: Queue / Contacts */}
          <div
            className="flex border-b"
            style={{ borderColor: `${branding.primaryColor}20` }}
          >
            {(['queue', 'contacts'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setSidebarTab(tab); if (tab === 'contacts') fetchContacts(); }}
                className="flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                style={sidebarTab === tab ? {
                  color: branding.primaryColor,
                  borderBottom: `2px solid ${branding.primaryColor}`,
                  backgroundColor: `${branding.primaryColor}08`,
                } : { color: 'rgba(255,255,255,0.3)' }}
              >
                {tab === 'queue' ? <Square className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                {tab === 'queue' ? `Queue (${queuedCount})` : `Contacts (${contacts.length})`}
              </button>
            ))}
          </div>

          {/* Queue tab: select-all bar */}
          {sidebarTab === 'queue' && (
          <div
            className="p-3 border-b backdrop-blur-sm z-10 flex justify-between items-center"
            style={{ backgroundColor: `${branding.primaryColor}10`, borderColor: `${branding.primaryColor}20` }}
          >
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Question Queue</span>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button onClick={clearSelection} className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">
                  Clear
                </button>
              )}
              <button
                onClick={queuedCount > 0 && selectedIds.size === queuedCount ? clearSelection : selectAll}
                className="text-[9px] font-black uppercase tracking-widest transition-colors"
                style={{ color: branding.primaryColor }}
              >
                {selectedIds.size === queuedCount && queuedCount > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
          )}

          {/* Error banner */}
          {loadError && sidebarTab === 'queue' && (
            <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
              <p className="text-[9px] text-red-400">{loadError}</p>
            </div>
          )}

          {/* ── Contacts tab ─────────────────────────────────────────────── */}
          {sidebarTab === 'contacts' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              {/* Contacts toolbar */}
              <div
                className="p-3 border-b flex justify-between items-center"
                style={{ borderColor: `${branding.primaryColor}20` }}
              >
                <span className="text-[9px] text-white/30 uppercase tracking-widest">
                  {contacts.filter(c => c.email).length} with email
                </span>
                <button
                  onClick={exportContacts}
                  disabled={contacts.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors disabled:opacity-30"
                  style={{ backgroundColor: `${branding.primaryColor}20`, color: branding.primaryColor }}
                >
                  <Download className="w-3 h-3" />
                  Export CSV
                </button>
              </div>

              {contactsLoading && (
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: branding.primaryColor }} />
                </div>
              )}

              {!contactsLoading && contacts.length === 0 && (
                <div className="p-6 text-center">
                  <UserCheck className="w-6 h-6 text-white/10 mx-auto mb-2" />
                  <p className="text-[10px] text-white/25 uppercase tracking-widest">No contacts yet</p>
                  <p className="text-[9px] text-white/15 mt-1">Submitters who provide their name or email will appear here.</p>
                </div>
              )}

              <div className="divide-y divide-white/5">
                {contacts.map((c, i) => (
                  <div key={i} className="p-3 space-y-1.5 hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3 h-3" style={{ color: branding.primaryColor }} />
                        <span className="text-[10px] font-black text-white">{c.name || 'Anonymous'}</span>
                      </div>
                      {c.notified && (
                        <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Notified</span>
                      )}
                    </div>
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="flex items-center gap-1 text-[9px] font-mono transition-colors hover:opacity-80"
                        style={{ color: `${branding.primaryColor}80` }}
                      >
                        <Mail className="w-2.5 h-2.5" />
                        {c.email}
                      </a>
                    )}
                    <p className="text-[9px] text-white/40 leading-relaxed line-clamp-2">{c.questionText}</p>
                    <p className="text-[8px] text-white/20 font-mono">{new Date(c.submittedAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Queue tab ────────────────────────────────────────────────── */}
          {sidebarTab === 'queue' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
            {questions.length === 0 && !loadError && (
              <div className="p-6 text-center">
                <p className="text-[10px] text-white/30 uppercase tracking-widest">Waiting for questions...</p>
                <p className="text-[9px] text-white/20 mt-2">Questions submitted via the QR code or webhook will appear here in real time.</p>
              </div>
            )}
            {questions.map((q) => {
              const isSelected = selectedIds.has(q.id);
              const isQueued = q.status === 'queued';
              // Look up the topic color from the current topics list; fall back to a neutral grey
              const topicColor = q.topic
                ? (topics.find(t => t.name === q.topic)?.color ?? '#6b7280')
                : '#6b7280';
              return (
                <div
                  key={q.id}
                  onClick={() => isQueued && toggleSelect(q.id)}
                  className={`relative p-3 pl-4 space-y-2 transition-colors ${
                    isQueued ? 'cursor-pointer hover:bg-white/5' : ''
                  } ${isSelected ? 'bg-white/5' : ''}`}
                  style={{
                    // Colored left border: thicker + brighter when selected, subtle when not
                    borderLeft: `3px solid ${topicColor}${isSelected ? 'ff' : '60'}`,
                    backgroundColor: isSelected ? `${topicColor}12` : undefined,
                  }}
                >
                  <div className="flex items-start gap-2">
                    {/* Checkbox */}
                    <div className="mt-0.5 flex-shrink-0">
                      {isQueued ? (
                        isSelected
                          ? <CheckSquare className="w-4 h-4" style={{ color: branding.primaryColor }} />
                          : <Square className="w-4 h-4 text-white/20" />
                      ) : (
                        <CheckCircle2 className={`w-4 h-4 ${q.status === 'answered' ? 'text-emerald-400' : 'text-teal-400 animate-pulse'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Name + status row */}
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-white/50">
                          {q.displayName ? (
                            <span style={{ color: branding.primaryColor }}>{q.displayName}</span>
                          ) : (
                            'Anonymous'
                          )}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                          q.status === 'answered' ? 'bg-emerald-500/20 text-emerald-400' :
                          q.status === 'processing' ? 'bg-teal-400/20 text-teal-300 animate-pulse' :
                          'bg-white/10 text-white/40'
                        }`}>
                          {q.status}
                        </span>
                      </div>
                      {/* Question text */}
                      <p className="text-sm text-white leading-relaxed font-medium">{q.text}</p>
                      {/* Topic pill */}
                      {q.topic && (
                        <div className="mt-1.5">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
                            style={{
                              backgroundColor: `${topicColor}22`,
                              color: topicColor,
                              border: `1px solid ${topicColor}50`,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: topicColor }}
                            />
                            {q.topic}
                          </span>
                        </div>
                      )}
                      {q.answer && (
                        <div
                          className="mt-2 p-2 border-l-2 rounded-sm"
                          style={{ backgroundColor: `${branding.primaryColor}10`, borderColor: branding.primaryColor }}
                        >
                          <p className="text-xs italic leading-relaxed" style={{ color: branding.primaryColor }}>"{q.answer}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </aside>

        {/* ── Main Panel ───────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: `${branding.primaryColor}02` }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full overflow-hidden">

            {/* Topic Heatmap */}
            <div
              className="p-6 border-r flex flex-col items-center justify-start space-y-6 overflow-y-auto custom-scrollbar"
              style={{ backgroundColor: `${branding.primaryColor}03`, borderColor: `${branding.primaryColor}20` }}
            >
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-3" style={{ color: branding.primaryColor }}>
                  <TrendingUp className="w-5 h-5" />
                  <h2 className="text-xl font-black uppercase tracking-tighter">Topic Heatmap</h2>
                </div>
                <p className="text-[9px] uppercase tracking-widest" style={{ color: `${branding.primaryColor}60` }}>
                  Real-time Community Interest Analysis
                </p>
              </div>

              <div className="relative w-full max-w-[380px] aspect-square">
                {topics.length > 0 ? (
                  <svg ref={heatmapRef} width="380" height="380" className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-[10px] text-white/20 uppercase tracking-widest text-center">Topics will appear<br />as questions arrive</p>
                  </div>
                )}
              </div>

              {topics.length > 0 && (
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                  {topics.map(t => (
                    <div
                      key={t.name}
                      className="flex items-center gap-2 p-2 bg-white/5 border rounded-xl"
                      style={{ borderColor: `${branding.primaryColor}20` }}
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white truncate">{t.name}</p>
                        <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full transition-all duration-1000"
                            style={{ backgroundColor: t.color, width: `${Math.min((t.count / Math.max(...topics.map(x => x.count))) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[8px] font-mono text-white/30">{t.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Liaison Engine / Answer Generator */}
            <div
              className="p-6 flex flex-col space-y-5 overflow-y-auto custom-scrollbar"
              style={{ backgroundColor: `${branding.primaryColor}05` }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-3" style={{ color: branding.primaryColor }}>
                    <Activity className="w-5 h-5" />
                    <h2 className="text-xl font-black uppercase tracking-tighter">Liaison Engine</h2>
                  </div>
                  <p className="text-[9px] uppercase tracking-widest" style={{ color: `${branding.primaryColor}60` }}>
                    Select questions from the queue, then generate a grounded answer
                  </p>
                </div>
              </div>

              {/* Selected questions summary */}
              <div
                className="rounded-xl border p-4 space-y-3"
                style={{ borderColor: `${branding.primaryColor}30`, backgroundColor: `${branding.primaryColor}08` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2" style={{ color: branding.primaryColor }}>
                    <Layers className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {selectedIds.size === 0 ? 'No Questions Selected' : `${selectedIds.size} Question${selectedIds.size > 1 ? 's' : ''} Selected`}
                    </span>
                  </div>
                  {selectedIds.size > 0 && (
                    <button onClick={clearSelection} className="text-[9px] text-white/30 hover:text-white/60 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {selectedQuestions.length > 0 && (
                  <div className="space-y-2">
                    {selectedQuestions.map(q => (
                      <div
                        key={q.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-white/5"
                      >
                        <CheckSquare className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: branding.primaryColor }} />
                        <p className="text-[10px] text-white/70 leading-relaxed">{q.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleGenerateAnswer}
                  disabled={selectedIds.size === 0 || isGenerating}
                  className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: selectedIds.size > 0 && !isGenerating ? branding.primaryColor : undefined,
                    color: selectedIds.size > 0 && !isGenerating ? '#000' : 'white',
                    boxShadow: selectedIds.size > 0 && !isGenerating ? `0 0 20px ${branding.primaryColor}40` : undefined,
                    border: selectedIds.size === 0 || isGenerating ? `1px solid ${branding.primaryColor}30` : undefined,
                  }}
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating Answer...</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Generate Answer</>
                  )}
                </button>
              </div>

              {/* Generated answer (pending approval) */}
              <AnimatePresence>
                {generatedAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-xl border p-4 space-y-4"
                    style={{ borderColor: `${branding.secondaryColor}40`, backgroundColor: `${branding.secondaryColor}08` }}
                  >
                    <div className="flex items-center gap-2" style={{ color: branding.secondaryColor }}>
                      <Activity className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Generated Answer — Pending Approval</span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">{generatedAnswer}</p>

                    {/* Citation chips */}
                    {pendingCitations.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {pendingCitations.map((cit, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedCitation(cit)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono transition-all hover:scale-105"
                              style={{
                                borderColor: `${branding.primaryColor}50`,
                                backgroundColor: `${branding.primaryColor}10`,
                                color: branding.primaryColor,
                              }}
                            >
                              <Shield className="w-3 h-3" />
                              {cit.docName.replace(/\.[^.]+$/, '').slice(0, 30)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleApprove}
                        className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                        style={{
                          backgroundColor: branding.secondaryColor,
                          color: '#000',
                          boxShadow: `0 0 20px ${branding.secondaryColor}40`,
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve &amp; Display
                      </button>
                      <button
                        onClick={() => setGeneratedAnswer(null)}
                        className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all"
                      >
                        Discard
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Approved answers history */}
              {approvedAnswers.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: `${branding.primaryColor}60` }}>
                    Approved Answers This Session
                  </p>
                  {approvedAnswers.map((a, i) => (
                    <div
                      key={i}
                      className="rounded-xl border p-4 space-y-2 cursor-pointer hover:bg-white/5 transition-colors"
                      style={{ borderColor: `${branding.primaryColor}20` }}
                      onClick={() => setDisplayAnswer(a)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                            {a.questions.length} Question{a.questions.length > 1 ? 's' : ''} Answered
                          </span>
                        </div>
                        <button
                          className="flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-colors"
                          onClick={(e) => { e.stopPropagation(); setDisplayAnswer(a); }}
                        >
                          <Maximize2 className="w-3 h-3" />
                          Display
                        </button>
                      </div>
                      <p className="text-[10px] text-white/50 leading-relaxed line-clamp-2">{a.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Footer branding={branding} />

      {/* ── Full-Screen Answer Display Overlay ───────────────────────────── */}
      <AnimatePresence>
        {displayAnswer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8"
            style={{ backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}
          >
            {/* Close button */}
            <button
              onClick={() => setDisplayAnswer(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-full max-w-4xl space-y-8">
              {/* Questions being answered */}
              <div className="space-y-3">
                <p
                  className="text-[10px] font-black uppercase tracking-[0.3em] text-center"
                  style={{ color: `${branding.primaryColor}80` }}
                >
                  Questions Being Addressed
                </p>
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(displayAnswer.questions.length, 2)}, 1fr)` }}>
                  {displayAnswer.questions.map((q, i) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-4 rounded-2xl border text-center"
                      style={{
                        borderColor: `${branding.primaryColor}40`,
                        backgroundColor: `${branding.primaryColor}10`,
                      }}
                    >
                      <p className="text-sm text-white/80 leading-relaxed font-medium">{q.text}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px" style={{ backgroundColor: `${branding.primaryColor}30` }} />
                <div className="flex items-center gap-2" style={{ color: branding.primaryColor }}>
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Verified Answer</span>
                </div>
                <div className="flex-1 h-px" style={{ backgroundColor: `${branding.primaryColor}30` }} />
              </div>

              {/* Answer */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-8 rounded-3xl border text-center"
                style={{
                  borderColor: `${branding.secondaryColor}50`,
                  backgroundColor: `${branding.secondaryColor}08`,
                  boxShadow: `0 0 60px ${branding.secondaryColor}20`,
                }}
              >
                <p
                  className="text-xl leading-relaxed font-medium text-white"
                  style={{ textShadow: `0 0 30px ${branding.primaryColor}40` }}
                >
                  {displayAnswer.answer}
                </p>
              </motion.div>

              {/* Citation chips in fullscreen */}
              {displayAnswer.citations && displayAnswer.citations.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {displayAnswer.citations.map((cit, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedCitation(cit)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono transition-all hover:scale-105"
                      style={{
                        borderColor: `${branding.primaryColor}50`,
                        backgroundColor: `${branding.primaryColor}10`,
                        color: branding.primaryColor,
                      }}
                    >
                      <Shield className="w-3 h-3" />
                      {cit.docName.replace(/\.[^.]+$/, '').slice(0, 40)}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-center text-[9px] text-white/20 uppercase tracking-widest">
                Powered by LBKH Liaison · Source-Locked AI · All answers grounded in uploaded project documentation
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Citation Snippet Drawer ───────────────────────────────────────── */}
      <AnimatePresence>
        {selectedCitation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setSelectedCitation(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-2xl rounded-2xl border p-6 space-y-4"
              style={{
                backgroundColor: '#0a0a0a',
                borderColor: `${branding.primaryColor}40`,
                boxShadow: `0 0 60px ${branding.primaryColor}20`,
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2" style={{ color: branding.primaryColor }}>
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-black uppercase tracking-widest">
                    {selectedCitation.docName.replace(/\.[^.]+$/, '')}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCitation(null)}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Snippet */}
              <div
                className="p-4 rounded-xl border-l-4 text-sm text-white/80 leading-relaxed italic"
                style={{
                  borderLeftColor: branding.primaryColor,
                  backgroundColor: `${branding.primaryColor}08`,
                }}
              >
                &ldquo;{selectedCitation.snippet}&rdquo;
              </div>

              {/* Public filing link */}
              {selectedCitation.publicUrl && (
                <a
                  href={selectedCitation.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-mono transition-colors hover:opacity-80"
                  style={{ color: branding.secondaryColor }}
                >
                  <Layout className="w-3 h-3" />
                  View Public Filing →
                </a>
              )}

              <p className="text-[9px] text-white/20 uppercase tracking-widest">
                Source-locked · Snippet extracted from verified project documentation
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── QR Fullscreen Overlay ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showQrFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
            onClick={() => setShowQrFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex flex-col items-center gap-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 bg-white rounded-3xl shadow-2xl" style={{ boxShadow: `0 0 80px ${branding.primaryColor}60` }}>
                <QRCodeSVG
                  value={`${window.location.origin}/ask?event=${EVENT_ID}`}
                  size={520}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-widest text-white">Scan to Ask a Question</h2>
                <p className="text-white/50 text-sm uppercase tracking-widest">{window.location.origin}/ask</p>
              </div>
              <button
                onClick={() => setShowQrFullscreen(false)}
                className="flex items-center gap-2 px-6 py-3 rounded-full border text-sm font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.2)' }}
              >
                <X className="w-4 h-4" /> Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
