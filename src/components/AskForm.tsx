import React, { useState, useEffect } from 'react';
import { Shield, Send, CheckCircle2, AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

interface Branding {
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
}

interface AskFormProps {
  branding: Branding;
}

const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL || 'https://lbkh-r2-proxy.mickey-474.workers.dev';

export function AskForm({ branding }: AskFormProps) {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('event') || 'default';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch(`${WORKER_URL}/event/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          text: question.trim(),
          source: 'web-form',
          name: name.trim() || null,
          email: email.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }

      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const handleReset = () => {
    setQuestion('');
    setName('');
    setEmail('');
    setStatus('idle');
    setErrorMsg('');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 liaison-bg wireframe-grid"
      style={{ backgroundColor: '#050505' }}
    >
      {/* Brand header */}
      <div className="mb-8 text-center space-y-3">
        <Link to="/" className="inline-flex items-center gap-3 group">
          {branding.logo ? (
            <img src={branding.logo} alt="Logo" className="w-10 h-10 object-contain" />
          ) : (
            <div
              className="w-10 h-10 rounded-sm flex items-center justify-center transform rotate-45 glow-cyan"
              style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
            >
              <Shield className="w-6 h-6 text-white transform -rotate-45" />
            </div>
          )}
          <span
            className="text-2xl font-black tracking-tighter uppercase bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(to right, white, ${branding.primaryColor})` }}
          >
            {branding.companyName}
          </span>
        </Link>
        <p className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color: `${branding.primaryColor}80` }}>
          Community Liaison · Public Q&amp;A
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-lg rounded-2xl border p-8 space-y-6 shadow-2xl"
        style={{
          backgroundColor: '#0a1a19',
          borderColor: `${branding.primaryColor}30`,
          boxShadow: `0 0 60px ${branding.primaryColor}10`,
        }}
      >
        {status === 'success' ? (
          /* ── Success state ─────────────────────────────────────────────── */
          <div className="text-center space-y-6 py-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: `${branding.primaryColor}20`, border: `2px solid ${branding.primaryColor}` }}
            >
              <CheckCircle2 className="w-8 h-8" style={{ color: branding.primaryColor }} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase tracking-tighter text-white">Question Received</h2>
              <p className="text-sm text-white/50 leading-relaxed">
                Your question has been submitted to the board. It will be addressed during the event.
              </p>
              {email && (
                <p className="text-xs text-white/40 mt-3">
                  Updates and answers will be sent to <span className="font-mono" style={{ color: branding.primaryColor }}>{email}</span>
                </p>
              )}
            </div>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors hover:bg-white/5"
              style={{ borderColor: `${branding.primaryColor}40`, color: branding.primaryColor }}
            >
              Submit Another Question
            </button>
          </div>
        ) : (
          /* ── Form state ────────────────────────────────────────────────── */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1" style={{ color: branding.primaryColor }}>
                <MessageSquare className="w-4 h-4" />
                <h2 className="text-sm font-black uppercase tracking-widest">Ask the Board</h2>
              </div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest">
                Your question is anonymous by default. Name and email are optional.
              </p>
            </div>

            {/* Question — mandatory */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/60">
                Your Question or Concern <span style={{ color: branding.primaryColor }}>*</span>
              </label>
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                required
                rows={4}
                placeholder="What would you like the board to address?"
                className="w-full rounded-xl border bg-white/5 text-white placeholder-white/20 text-sm leading-relaxed resize-none focus:outline-none focus:ring-1 p-4 transition-colors"
                style={{
                  borderColor: question.trim() ? `${branding.primaryColor}60` : 'rgba(255,255,255,0.1)',
                  // @ts-ignore
                  '--tw-ring-color': branding.primaryColor,
                }}
              />
            </div>

            {/* Name — optional */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/60">
                Name <span className="text-white/25 normal-case font-normal tracking-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border bg-white/5 text-white placeholder-white/20 text-sm focus:outline-none focus:ring-1 px-4 py-3 transition-colors"
                style={{
                  borderColor: 'rgba(255,255,255,0.1)',
                  // @ts-ignore
                  '--tw-ring-color': branding.primaryColor,
                }}
              />
            </div>

            {/* Email — optional, with update promise */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/60">
                Email <span className="text-white/25 normal-case font-normal tracking-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border bg-white/5 text-white placeholder-white/20 text-sm focus:outline-none focus:ring-1 px-4 py-3 transition-colors"
                style={{
                  borderColor: 'rgba(255,255,255,0.1)',
                  // @ts-ignore
                  '--tw-ring-color': branding.primaryColor,
                }}
              />
              <p className="text-[9px] text-white/25 leading-relaxed">
                If provided, you will receive answers and project updates only. No marketing emails, ever.
              </p>
            </div>

            {/* Error */}
            {status === 'error' && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{errorMsg}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!question.trim() || status === 'submitting'}
              className="w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: question.trim() && status !== 'submitting' ? branding.primaryColor : undefined,
                color: question.trim() && status !== 'submitting' ? '#000' : 'white',
                border: !question.trim() || status === 'submitting' ? `1px solid ${branding.primaryColor}30` : undefined,
                boxShadow: question.trim() && status !== 'submitting' ? `0 0 24px ${branding.primaryColor}40` : undefined,
              }}
            >
              {status === 'submitting' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                <><Send className="w-4 h-4" /> Submit Question</>
              )}
            </button>

            <p className="text-center text-[9px] text-white/20 uppercase tracking-widest">
              All submissions are anonymous unless you choose to share your name.
            </p>
          </form>
        )}
      </div>

      <p className="mt-6 text-[9px] text-white/15 uppercase tracking-widest text-center">
        Powered by LBKH Liaison · Source-Locked Community AI
      </p>
    </div>
  );
}
