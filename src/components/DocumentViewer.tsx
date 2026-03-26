/**
 * DocumentViewer
 *
 * Renders a document fetched from R2 in the Settings page.
 * Features:
 *  - Full text display (word-by-word for redaction)
 *  - Manual word-click redaction (staged, not permanent until saved)
 *  - AI-powered PII scan via Gemini — highlights detected PII with approve/skip per item
 *  - Public filing URL field (stored in R2 metadata)
 *  - "Save Redacted Version" — writes redacted text back to R2, replacing original
 *  - Documents are NEVER shown publicly — this component is Settings-only
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Scissors, Lock, Globe, Save, X, CheckCircle2,
  AlertTriangle, Loader2, Eye, EyeOff, ExternalLink, RotateCcw,
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import {
  fetchDocumentContent,
  saveRedactedDocument,
  updateDocumentMetadata,
} from '../services/r2Service';

interface DocumentViewerProps {
  docKey: string;
  docName: string;
  docType: string;
  initialPublicUrl?: string;
  isRedacted?: boolean;
  onClose?: () => void;
  onSaved?: (key: string, publicUrl: string) => void;
}

interface PIIHit {
  wordIndex: number;
  word: string;
  category: string; // e.g. "Full Name", "Email", "Phone Number"
  approved: boolean | null; // null = pending, true = approved, false = skipped
}

type WordState = 'normal' | 'redacted' | 'pii-pending' | 'pii-approved';

export function DocumentViewer({
  docKey,
  docName,
  docType,
  initialPublicUrl = '',
  isRedacted = false,
  onClose,
  onSaved,
}: DocumentViewerProps) {
  // ── Document text state ──────────────────────────────────────────────────
  const [words, setWords] = useState<string[]>([]);
  const [wordStates, setWordStates] = useState<WordState[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Redaction state ──────────────────────────────────────────────────────
  const [redactionMode, setRedactionMode] = useState(false);
  const [pendingRedactions, setPendingRedactions] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // ── PII scan state ───────────────────────────────────────────────────────
  const [piiScanning, setPiiScanning] = useState(false);
  const [piiHits, setPiiHits] = useState<PIIHit[]>([]);
  const [piiScanError, setPiiScanError] = useState<string | null>(null);
  const [piiPanelOpen, setPiiPanelOpen] = useState(false);
  const [currentPiiIndex, setCurrentPiiIndex] = useState(0);

  // ── Public URL state ─────────────────────────────────────────────────────
  const [publicUrl, setPublicUrl] = useState(initialPublicUrl);
  const [urlSaving, setUrlSaving] = useState(false);
  const [urlSaved, setUrlSaved] = useState(false);

  // ── Load document on mount ───────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    setWords([]);
    setWordStates([]);
    setPendingRedactions(new Set());
    setPiiHits([]);
    setPiiPanelOpen(false);
    setPublicUrl(initialPublicUrl);

    fetchDocumentContent(docKey)
      .then((result) => {
        if (result.encoding === 'base64') {
          // PDF — attempt basic text extraction from raw bytes
          try {
            const binary = atob(result.content);
            // Extract printable ASCII text from PDF binary
            const text = binary
              .split('')
              .filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127)
              .join('')
              .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            const w = text.split(' ').filter(Boolean);
            setWords(w);
            setWordStates(new Array(w.length).fill('normal'));
          } catch {
            setLoadError('PDF text extraction failed. Upload a .txt or .md version for full redaction support.');
          }
        } else {
          const w = result.content.split(' ').filter(Boolean);
          setWords(w);
          setWordStates(new Array(w.length).fill('normal'));
        }
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [docKey]);

  // ── Manual word redaction ────────────────────────────────────────────────
  const handleWordClick = useCallback(
    (index: number) => {
      if (!redactionMode) return;
      const current = wordStates[index];
      if (current === 'redacted') return; // already saved-redacted, can't undo
      setPendingRedactions((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index); // toggle off
        } else {
          next.add(index);
        }
        return next;
      });
    },
    [redactionMode, wordStates]
  );

  // ── AI PII Scan ──────────────────────────────────────────────────────────
  const handlePiiScan = async () => {
    if (!words.length) return;
    setPiiScanning(true);
    setPiiScanError(null);
    setPiiHits([]);
    setPiiPanelOpen(false);

    const fullText = words.join(' ');
    const prompt = `You are a privacy compliance assistant. Analyse the following document text and identify every instance of Personally Identifiable Information (PII).

For each PII instance, return a JSON array where each item has:
- "phrase": the exact word or phrase as it appears in the text
- "category": one of: Full Name, Email Address, Phone Number, Physical Address, Date of Birth, Social Security Number, Financial Account Number, IP Address, Government ID, Medical Information, Other PII

Return ONLY a valid JSON array, no explanation. If no PII is found return [].

Document text:
${fullText.slice(0, 12000)}`; // cap at ~12k chars to stay within context

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0 },
      });

      const raw = response.text?.trim() ?? '';
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        setPiiHits([]);
        setPiiPanelOpen(true);
        return;
      }

      const items: { phrase: string; category: string }[] = JSON.parse(jsonMatch[0]);

      // Map each detected phrase back to word indices
      const hits: PIIHit[] = [];
      items.forEach(({ phrase, category }) => {
        const phraseWords = phrase.trim().split(/\s+/);
        for (let i = 0; i <= words.length - phraseWords.length; i++) {
          const match = phraseWords.every(
            (pw, j) => words[i + j]?.toLowerCase().replace(/[^a-z0-9]/g, '') === pw.toLowerCase().replace(/[^a-z0-9]/g, '')
          );
          if (match) {
            // Add one hit per word in the phrase
            phraseWords.forEach((_, j) => {
              if (!hits.find((h) => h.wordIndex === i + j)) {
                hits.push({ wordIndex: i + j, word: words[i + j], category, approved: null });
              }
            });
          }
        }
      });

      setPiiHits(hits);
      setCurrentPiiIndex(0);
      setPiiPanelOpen(true);
    } catch (err: any) {
      setPiiScanError(err.message);
    } finally {
      setPiiScanning(false);
    }
  };

  // ── PII approve / skip ───────────────────────────────────────────────────
  const handlePiiDecision = (hitIndex: number, approve: boolean) => {
    setPiiHits((prev) =>
      prev.map((h, i) => (i === hitIndex ? { ...h, approved: approve } : h))
    );
    if (approve) {
      setPendingRedactions((prev) => {
        const next = new Set(prev);
        next.add(piiHits[hitIndex].wordIndex);
        return next;
      });
    }
    // Advance to next pending hit
    const nextIndex = piiHits.findIndex((h, i) => i > hitIndex && h.approved === null);
    if (nextIndex !== -1) setCurrentPiiIndex(nextIndex);
  };

  const approveAllPii = () => {
    setPiiHits((prev) => prev.map((h) => ({ ...h, approved: true })));
    setPendingRedactions((prev) => {
      const next = new Set(prev);
      piiHits.forEach((h) => next.add(h.wordIndex));
      return next;
    });
  };

  // ── Save redacted version to R2 ──────────────────────────────────────────
  const handleSave = async () => {
    if (!pendingRedactions.size) return;
    setSaving(true);
    setSaveError(null);
    try {
      const redactedWords = words.map((w, i) =>
        pendingRedactions.has(i) ? '█'.repeat(w.length) : w
      );
      await saveRedactedDocument(docKey, redactedWords.join(' '));

      // Update local word states to reflect saved redactions
      setWordStates((prev) =>
        prev.map((s, i) => (pendingRedactions.has(i) ? 'redacted' : s))
      );
      // Update displayed words
      setWords((prev) =>
        prev.map((w, i) => (pendingRedactions.has(i) ? '█'.repeat(w.length) : w))
      );
      setPendingRedactions(new Set());
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
      onSaved?.(docKey, publicUrl);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Save public URL ──────────────────────────────────────────────────────
  const handleSavePublicUrl = async () => {
    setUrlSaving(true);
    try {
      await updateDocumentMetadata(docKey, publicUrl);
      setUrlSaved(true);
      setTimeout(() => setUrlSaved(false), 3000);
      onSaved?.(docKey, publicUrl);
    } catch {
      // silently fail — non-critical
    } finally {
      setUrlSaving(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const pendingPiiHits = piiHits.filter((h) => h.approved === null);
  const approvedPiiCount = piiHits.filter((h) => h.approved === true).length;
  const hasPendingRedactions = pendingRedactions.size > 0;

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-bold text-white uppercase tracking-widest truncate">{docName}</span>
          <span className="text-[9px] font-mono text-white/30 uppercase shrink-0">{docType}</span>
          {isRedacted && (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full shrink-0">
              <Lock className="w-3 h-3" /> Redacted
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* AI PII Scan */}
          <button
            onClick={handlePiiScan}
            disabled={piiScanning || loading || !words.length}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 transition-all disabled:opacity-40"
          >
            {piiScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
            {piiScanning ? 'Scanning...' : 'AI PII Scan'}
          </button>
          {/* Redaction mode toggle */}
          <button
            onClick={() => setRedactionMode((v) => !v)}
            disabled={loading || !words.length}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 ${
              redactionMode
                ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'
            }`}
          >
            <Scissors className="w-3 h-3" />
            {redactionMode ? 'Exit Redaction' : 'Redact Mode'}
          </button>
          {/* Save button — only visible when there are pending redactions */}
          {hasPendingRedactions && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-teal-600 text-white hover:bg-teal-500 transition-all disabled:opacity-50 shadow-lg shadow-teal-500/20"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {saving ? 'Saving...' : `Save Redacted Version (${pendingRedactions.size})`}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Permanent redaction notice ───────────────────────────────────── */}
      <div className="px-4 py-2.5 bg-red-950/50 border-b border-red-500/20 flex items-start gap-3">
        <Lock className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
        <p className="text-[10px] font-black uppercase tracking-widest text-red-400 leading-relaxed">
          Permanent Redaction Notice — Once saved, redactions replace the original text and cannot be recovered. To restore redacted material, delete this document and re-upload the original.
        </p>
      </div>

      {/* ── Redaction mode active banner ─────────────────────────────────── */}
      {redactionMode && (
        <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 flex items-center gap-3">
          <Scissors className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
            Redaction mode active — click any word to stage it for redaction. Staged words are highlighted orange. Nothing is permanent until you click <strong>Save Redacted Version</strong>.
          </p>
        </div>
      )}

      {/* ── Save success ─────────────────────────────────────────────────── */}
      {savedSuccess && (
        <div className="px-4 py-2.5 bg-teal-500/10 border-b border-teal-500/20 flex items-center gap-3">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-widest text-teal-400">
            Redacted version saved to R2 — the original has been replaced.
          </p>
        </div>
      )}

      {/* ── Save error ───────────────────────────────────────────────────── */}
      {saveError && (
        <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 flex items-center gap-3">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <p className="text-[10px] font-mono text-red-400">{saveError}</p>
        </div>
      )}

      {/* ── PII scan results panel ───────────────────────────────────────── */}
      {piiPanelOpen && (
        <div className="px-4 py-3 bg-violet-950/60 border-b border-violet-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-violet-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">
                AI PII Scan Complete — {piiHits.length} item{piiHits.length !== 1 ? 's' : ''} detected
                {approvedPiiCount > 0 && ` · ${approvedPiiCount} approved for redaction`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {pendingPiiHits.length > 0 && (
                <button
                  onClick={approveAllPii}
                  className="text-[9px] font-black uppercase tracking-widest text-violet-300 bg-violet-500/20 border border-violet-500/30 px-2 py-1 rounded hover:bg-violet-500/30 transition-all"
                >
                  Approve All ({pendingPiiHits.length})
                </button>
              )}
              <button onClick={() => setPiiPanelOpen(false)} className="text-white/30 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {piiHits.length === 0 && (
            <p className="text-[10px] font-mono text-white/40">No PII detected in this document.</p>
          )}

          {piiHits.length > 0 && (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {piiHits.map((hit, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg border text-[10px] font-mono transition-all ${
                    hit.approved === true
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : hit.approved === false
                      ? 'bg-white/5 border-white/10 text-white/30 line-through'
                      : 'bg-violet-500/10 border-violet-500/30 text-violet-200'
                  }`}
                >
                  <span className="font-bold">{hit.word}</span>
                  <span className="text-[9px] opacity-60">{hit.category}</span>
                  {hit.approved === null && (
                    <>
                      <button
                        onClick={() => handlePiiDecision(i, true)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Approve — stage for redaction"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handlePiiDecision(i, false)}
                        className="text-white/30 hover:text-white/60 transition-colors"
                        title="Skip — keep this word"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  {hit.approved === true && <Lock className="w-3 h-3 text-red-400" />}
                  {hit.approved === false && <EyeOff className="w-3 h-3 text-white/20" />}
                </div>
              ))}
            </div>
          )}

          {piiScanError && (
            <p className="text-[10px] font-mono text-red-400">Scan error: {piiScanError}</p>
          )}
        </div>
      )}

      {/* ── Public filing URL ────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-white/5 bg-black/20 flex items-center gap-3">
        <Globe className="w-3.5 h-3.5 text-teal-400 shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40 shrink-0">Public Filing URL</span>
        <input
          type="url"
          value={publicUrl}
          onChange={(e) => setPublicUrl(e.target.value)}
          placeholder="https://... (optional — linked in AI citations)"
          className="flex-1 bg-transparent text-[11px] font-mono text-white/70 focus:outline-none placeholder:text-white/20 min-w-0"
        />
        {publicUrl && (
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 shrink-0">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          onClick={handleSavePublicUrl}
          disabled={urlSaving}
          className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded transition-all ${
            urlSaved
              ? 'text-teal-400 bg-teal-500/10 border border-teal-500/20'
              : 'text-white/40 bg-white/5 border border-white/10 hover:text-white'
          }`}
        >
          {urlSaving ? '...' : urlSaved ? 'Saved ✓' : 'Save URL'}
        </button>
      </div>

      {/* ── Document body ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 bg-black/20">
        {loading && (
          <div className="flex items-center justify-center h-full gap-3 text-white/30">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs font-mono uppercase tracking-widest">Loading document from R2...</span>
          </div>
        )}

        {loadError && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400/40" />
            <p className="text-xs font-black uppercase tracking-widest text-red-400">Failed to load document</p>
            <p className="text-[11px] font-mono text-white/30 max-w-sm">{loadError}</p>
          </div>
        )}

        {!loading && !loadError && words.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <FileText className="w-12 h-12 text-white/10" />
            <p className="text-xs font-black uppercase tracking-widest text-white/20">Document appears to be empty</p>
          </div>
        )}

        {!loading && !loadError && words.length > 0 && (
          <div className="max-w-3xl mx-auto font-mono text-sm leading-loose text-white/70">
            <div className="flex flex-wrap gap-x-1 gap-y-1">
              {words.map((word, i) => {
                const isPendingRedaction = pendingRedactions.has(i);
                const isSavedRedaction = wordStates[i] === 'redacted';
                const isPiiHighlight = piiHits.some((h) => h.wordIndex === i && h.approved === null);
                const isPiiApproved = piiHits.some((h) => h.wordIndex === i && h.approved === true);

                let cls = '';
                if (isSavedRedaction) {
                  cls = 'bg-red-900/60 text-red-300 px-1 rounded cursor-default select-none';
                } else if (isPendingRedaction || isPiiApproved) {
                  cls = 'bg-orange-500/30 text-orange-200 px-1 rounded cursor-pointer ring-1 ring-orange-400/40';
                } else if (isPiiHighlight) {
                  cls = 'bg-violet-500/20 text-violet-200 px-1 rounded cursor-pointer ring-1 ring-violet-400/40';
                } else if (redactionMode) {
                  cls = 'hover:bg-red-500/20 hover:text-red-200 cursor-crosshair px-1 rounded transition-colors';
                } else {
                  cls = 'px-0.5';
                }

                return (
                  <span
                    key={i}
                    onClick={() => handleWordClick(i)}
                    className={cls}
                    title={
                      isSavedRedaction
                        ? 'Permanently redacted'
                        : isPendingRedaction || isPiiApproved
                        ? 'Staged for redaction — click to un-stage'
                        : isPiiHighlight
                        ? `AI detected: ${piiHits.find((h) => h.wordIndex === i)?.category}`
                        : redactionMode
                        ? 'Click to stage for redaction'
                        : undefined
                    }
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom action bar (only when pending redactions exist) ──────── */}
      {hasPendingRedactions && (
        <div className="px-4 py-3 border-t border-orange-500/20 bg-orange-950/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">
              {pendingRedactions.size} word{pendingRedactions.size !== 1 ? 's' : ''} staged for redaction — not yet permanent
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setPendingRedactions(new Set());
                setPiiHits((prev) => prev.map((h) => ({ ...h, approved: h.approved === true ? null : h.approved })));
              }}
              className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Clear All Staged
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-teal-600 text-white hover:bg-teal-500 transition-all disabled:opacity-50 shadow-lg shadow-teal-500/20"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {saving ? 'Saving to R2...' : 'Save Redacted Version'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
