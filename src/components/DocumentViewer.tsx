/**
 * DocumentViewer
 *
 * Full-screen modal for viewing, scanning, and redacting documents stored in R2.
 *
 * Features:
 *  - Opens as a full-screen overlay modal (works from any tab)
 *  - PDF text extraction via PDF.js (pdfjs-dist) — proper text, not raw binary
 *  - Manual word-click redaction (staged, not permanent until saved)
 *  - AI-powered PII scan via OpenAI GPT-4o-mini — highlights detected PII
 *  - Per-item approve / skip, or "Approve All" in one click
 *  - Preview mode — see exactly what the redacted document will look like
 *  - Public filing URL field (stored in R2 metadata)
 *  - "Save Redacted Version" — writes redacted text back to R2, replacing original
 *  - Documents are NEVER shown publicly — this component is Settings-only
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Scissors, Lock, Globe, Save, X, CheckCircle2,
  AlertTriangle, Loader2, Eye, EyeOff, ExternalLink, RotateCcw,
  ShieldAlert, ScanLine, Crosshair, FlipHorizontal,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  fetchDocumentContent,
  saveRedactedDocument,
  updateDocumentMetadata,
} from '../services/r2Service';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

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
  wordIndices: number[];   // may span multiple words (e.g. "John Smith")
  phrase: string;          // original phrase
  category: string;
  approved: boolean | null;
}

type WordState = 'normal' | 'redacted';

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
  const [previewMode, setPreviewMode] = useState(false);
  const [pendingRedactions, setPendingRedactions] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // ── PII scan state ───────────────────────────────────────────────────────
  const [piiScanning, setPiiScanning] = useState(false);
  const [piiHits, setPiiHits] = useState<PIIHit[]>([]);
  const [piiScanError, setPiiScanError] = useState<string | null>(null);
  const [piiPanelOpen, setPiiPanelOpen] = useState(false);

  // ── Public URL state ─────────────────────────────────────────────────────
  const [publicUrl, setPublicUrl] = useState(initialPublicUrl);
  const [urlSaving, setUrlSaving] = useState(false);
  const [urlSaved, setUrlSaved] = useState(false);

  // ── Custom terms state ────────────────────────────────────────────────────
  // safeWords: terms that should NEVER be redacted (e.g. product names, project names)
  // customRedactTerms: specific phrases to ALWAYS flag for redaction
  const [customTermsPanelOpen, setCustomTermsPanelOpen] = useState(false);
  const [safeWords, setSafeWords] = useState<string[]>([]);
  const [customRedactTerms, setCustomRedactTerms] = useState<string[]>([]);
  const [safeWordInput, setSafeWordInput] = useState('');
  const [customTermInput, setCustomTermInput] = useState('');

  // Parse a bulk-paste input into individual terms (comma, newline, or semicolon separated)
  const parseTermInput = (raw: string): string[] =>
    raw
      .split(/[,\n;]+/)
      .map((t) => t.trim())
      .filter(Boolean);

  const addSafeWords = () => {
    const terms = parseTermInput(safeWordInput);
    if (!terms.length) return;
    setSafeWords((prev) => Array.from(new Set([...prev, ...terms])));
    setSafeWordInput('');
  };

  const addCustomRedactTerms = () => {
    const terms = parseTermInput(customTermInput);
    if (!terms.length) return;
    setCustomRedactTerms((prev) => Array.from(new Set([...prev, ...terms])));
    setCustomTermInput('');
    // Immediately highlight any matching words in the document
    applyCustomRedactHighlights(terms);
  };

  const applyCustomRedactHighlights = (newTerms: string[]) => {
    const allTerms = [...customRedactTerms, ...newTerms];
    if (!allTerms.length || !words.length) return;
    const newPending = new Set(pendingRedactions);
    allTerms.forEach((term) => {
      const termWords = term.trim().split(/\s+/);
      for (let i = 0; i <= words.length - termWords.length; i++) {
        const match = termWords.every(
          (tw, j) =>
            words[i + j]?.toLowerCase().replace(/[^a-z0-9]/g, '') ===
            tw.toLowerCase().replace(/[^a-z0-9]/g, '')
        );
        if (match) {
          termWords.forEach((_, j) => newPending.add(i + j));
        }
      }
    });
    setPendingRedactions(newPending);
  };

  // ── Load document on mount ───────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    setWords([]);
    setWordStates([]);
    setPendingRedactions(new Set());
    setPiiHits([]);
    setPiiPanelOpen(false);
    setRedactionMode(false);
    setPreviewMode(false);
    setPublicUrl(initialPublicUrl);

    fetchDocumentContent(docKey)
      .then(async (result) => {
        if (result.encoding === 'base64') {
          // PDF — use PDF.js for proper text extraction
          try {
            const binary = atob(result.content);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

            const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
            const pageTexts: string[] = [];
            for (let p = 1; p <= pdf.numPages; p++) {
              const page = await pdf.getPage(p);
              const content = await page.getTextContent();
              const pageText = content.items
                .map((item: any) => item.str)
                .join(' ');
              pageTexts.push(pageText);
            }
            const fullText = pageTexts.join('\n\n');
            const w = fullText.split(/\s+/).filter(Boolean);
            setWords(w);
            setWordStates(new Array(w.length).fill('normal'));
          } catch (pdfErr: any) {
            setLoadError(`PDF extraction failed: ${pdfErr.message}. Try uploading a .txt version for full redaction support.`);
          }
        } else {
          const w = result.content.split(/\s+/).filter(Boolean);
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
      if (!redactionMode || previewMode) return;
      if (wordStates[index] === 'redacted') return; // already permanently redacted
      setPendingRedactions((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return next;
      });
    },
    [redactionMode, previewMode, wordStates]
  );

  // ── AI PII Scan via OpenAI ───────────────────────────────────────────────
  const handlePiiScan = async () => {
    if (!words.length) return;
    setPiiScanning(true);
    setPiiScanError(null);
    setPiiHits([]);
    setPiiPanelOpen(false);

    const fullText = words.join(' ');
    const prompt = `You are a privacy compliance assistant. Analyse the following document text and identify every instance of Personally Identifiable Information (PII).

For each PII instance, return a JSON array where each item has:
- "phrase": the exact word or phrase as it appears in the text (preserve original casing and punctuation)
- "category": one of: Full Name, Email Address, Phone Number, Physical Address, Date of Birth, Social Security Number, Financial Account Number, IP Address, Government ID, Medical Information, Other PII

Return ONLY a valid JSON array, no explanation, no markdown. If no PII is found return [].

Document text:
${fullText.slice(0, 14000)}`;

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('No AI API key configured (set VITE_OPENAI_API_KEY in .env.local)');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `OpenAI error ${response.status}`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
      const jsonMatch = raw.match(/\[[\s\S]*\]/);

      if (!jsonMatch) {
        setPiiHits([]);
        setPiiPanelOpen(true);
        return;
      }

      const items: { phrase: string; category: string }[] = JSON.parse(jsonMatch[0]);

      // Filter out any AI-detected phrases that match a safe word
      const safeNormalized = safeWords.map((sw) => sw.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const filteredItems = items.filter(({ phrase }) => {
        const norm = phrase.toLowerCase().replace(/[^a-z0-9]/g, '');
        return !safeNormalized.some((sw) => norm.includes(sw) || sw.includes(norm));
      });

      // Map each detected phrase back to word indices
      const hits: PIIHit[] = [];
      const usedIndices = new Set<number>();

      filteredItems.forEach(({ phrase, category }) => {
        const phraseWords = phrase.trim().split(/\s+/);
        for (let i = 0; i <= words.length - phraseWords.length; i++) {
          if (usedIndices.has(i)) continue;
          const match = phraseWords.every(
            (pw, j) =>
              words[i + j]?.toLowerCase().replace(/[^a-z0-9]/g, '') ===
              pw.toLowerCase().replace(/[^a-z0-9]/g, '')
          );
          if (match) {
            const indices = phraseWords.map((_, j) => i + j);
            indices.forEach((idx) => usedIndices.add(idx));
            hits.push({ wordIndices: indices, phrase, category, approved: null });
            break; // only match first occurrence per phrase
          }
        }
      });

      setPiiHits(hits);
      setPiiPanelOpen(true);
    } catch (err: any) {
      setPiiScanError(err.message);
      setPiiPanelOpen(true);
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
        piiHits[hitIndex].wordIndices.forEach((idx) => next.add(idx));
        return next;
      });
    }
  };

  const approveAllPii = () => {
    setPiiHits((prev) => prev.map((h) => ({ ...h, approved: true })));
    setPendingRedactions((prev) => {
      const next = new Set(prev);
      piiHits.forEach((h) => h.wordIndices.forEach((idx) => next.add(idx)));
      return next;
    });
  };

  const skipAllPii = () => {
    setPiiHits((prev) => prev.map((h) => (h.approved === null ? { ...h, approved: false } : h)));
  };

  // ── Save redacted version to R2 ──────────────────────────────────────────
  const handleSave = async () => {
    if (!pendingRedactions.size) return;
    setSaving(true);
    setSaveError(null);
    try {
      const redactedWords = words.map((w, i) =>
        pendingRedactions.has(i) || wordStates[i] === 'redacted'
          ? '█'.repeat(Math.min(w.length, 8))
          : w
      );
      await saveRedactedDocument(docKey, redactedWords.join(' '));

      // Commit pending redactions to permanent state
      setWordStates((prev) =>
        prev.map((s, i) => (pendingRedactions.has(i) ? 'redacted' : s))
      );
      setWords((prev) =>
        prev.map((w, i) =>
          pendingRedactions.has(i) ? '█'.repeat(Math.min(w.length, 8)) : w
        )
      );
      setPendingRedactions(new Set());
      setPiiHits([]);
      setPiiPanelOpen(false);
      setRedactionMode(false);
      setPreviewMode(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 5000);
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

  // Build a set of all word indices that are PII-highlighted (pending review)
  const piiPendingIndices = new Set(
    piiHits.filter((h) => h.approved === null).flatMap((h) => h.wordIndices)
  );
  const piiApprovedIndices = new Set(
    piiHits.filter((h) => h.approved === true).flatMap((h) => h.wordIndices)
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    // Full-screen modal overlay
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ backgroundColor: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(16px)' }}
    >
      {/* ── Top toolbar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10 bg-black/60 flex-wrap shrink-0">
        {/* Left: doc name + status */}
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-bold text-white uppercase tracking-widest truncate max-w-xs">{docName}</span>
          <span className="text-[9px] font-mono text-white/30 uppercase shrink-0">{docType}</span>
          {isRedacted && (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full shrink-0">
              <Lock className="w-2.5 h-2.5" /> Redacted
            </span>
          )}
          {hasPendingRedactions && (
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full shrink-0 animate-pulse">
              {pendingRedactions.size} staged
            </span>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Custom Terms toggle */}
          <button
            onClick={() => setCustomTermsPanelOpen((v) => !v)}
            disabled={loading || !words.length}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 ${
              customTermsPanelOpen
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'
            }`}
          >
            <Crosshair className="w-3 h-3" />
            Custom Terms
            {(safeWords.length > 0 || customRedactTerms.length > 0) && (
              <span className="ml-1 text-[9px] bg-amber-500/30 text-amber-200 px-1.5 py-0.5 rounded-full">
                {safeWords.length + customRedactTerms.length}
              </span>
            )}
          </button>

          {/* AI PII Scan */}
          <button
            onClick={handlePiiScan}
            disabled={piiScanning || loading || !words.length}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 transition-all disabled:opacity-40"
          >
            {piiScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanLine className="w-3 h-3" />}
            {piiScanning ? 'Scanning…' : 'AI PII Scan'}
          </button>

          {/* Redaction mode toggle */}
          <button
            onClick={() => { setRedactionMode((v) => !v); setPreviewMode(false); }}
            disabled={loading || !words.length}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 ${
              redactionMode
                ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'
            }`}
          >
            <Crosshair className="w-3 h-3" />
            {redactionMode ? 'Exit Redact Mode' : 'Redact Mode'}
          </button>

          {/* Preview toggle — only when there are staged redactions */}
          {hasPendingRedactions && (
            <button
              onClick={() => { setPreviewMode((v) => !v); setRedactionMode(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                previewMode
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20'
                  : 'bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20'
              }`}
            >
              <FlipHorizontal className="w-3 h-3" />
              {previewMode ? 'Exit Preview' : 'Preview Redacted'}
            </button>
          )}

          {/* Save button */}
          {hasPendingRedactions && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-teal-600 text-white hover:bg-teal-500 transition-all disabled:opacity-50 shadow-lg shadow-teal-500/20"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {saving ? 'Saving…' : `Save Redacted (${pendingRedactions.size})`}
            </button>
          )}

          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Status banners ────────────────────────────────────────────────── */}
      <div className="shrink-0">
        {/* Permanent redaction warning */}
        <div className="px-5 py-2 bg-red-950/60 border-b border-red-500/20 flex items-center gap-3">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
            Permanent Redaction Notice — Saved redactions replace the original and cannot be recovered. Delete and re-upload to restore.
          </p>
        </div>

        {/* Redaction mode active */}
        {redactionMode && (
          <div className="px-5 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-3">
            <Crosshair className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
              Redaction mode active — click any word to stage it for redaction. Nothing is permanent until you click <strong>Save Redacted</strong>.
            </p>
          </div>
        )}

        {/* Preview mode active */}
        {previewMode && (
          <div className="px-5 py-2 bg-teal-500/10 border-b border-teal-500/20 flex items-center gap-3">
            <Eye className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-400">
              Preview mode — this is how the document will look after saving. Click <strong>Exit Preview</strong> to continue editing.
            </p>
          </div>
        )}

        {/* Save success */}
        {savedSuccess && (
          <div className="px-5 py-2 bg-teal-500/10 border-b border-teal-500/20 flex items-center gap-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-400">
              Redacted version saved to R2 — the original has been permanently replaced.
            </p>
          </div>
        )}

        {/* Save error */}
        {saveError && (
          <div className="px-5 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-3">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <p className="text-[10px] font-mono text-red-400">{saveError}</p>
          </div>
        )}
      </div>

      {/* ── PII scan results panel ─────────────────────────────────────────── */}
      {piiPanelOpen && (
        <div className="shrink-0 px-5 py-3 bg-violet-950/70 border-b border-violet-500/30 space-y-3 max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ScanLine className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">
                AI PII Scan — {piiHits.length} item{piiHits.length !== 1 ? 's' : ''} detected
                {approvedPiiCount > 0 && ` · ${approvedPiiCount} approved for redaction`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pendingPiiHits.length > 0 && (
                <>
                  <button
                    onClick={approveAllPii}
                    className="text-[9px] font-black uppercase tracking-widest text-red-300 bg-red-500/10 border border-red-500/30 px-2 py-1 rounded hover:bg-red-500/20 transition-all"
                  >
                    Approve All ({pendingPiiHits.length})
                  </button>
                  <button
                    onClick={skipAllPii}
                    className="text-[9px] font-black uppercase tracking-widest text-white/40 bg-white/5 border border-white/10 px-2 py-1 rounded hover:bg-white/10 transition-all"
                  >
                    Skip All
                  </button>
                </>
              )}
              <button onClick={() => setPiiPanelOpen(false)} className="text-white/30 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {piiScanError && (
            <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-[10px] font-mono text-red-400">{piiScanError}</p>
            </div>
          )}

          {piiHits.length === 0 && !piiScanError && (
            <div className="flex items-center gap-2 text-white/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              <p className="text-[10px] font-mono">No PII detected in this document.</p>
            </div>
          )}

          {piiHits.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {piiHits.map((hit, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono transition-all ${
                    hit.approved === true
                      ? 'bg-red-500/15 border-red-500/40 text-red-300'
                      : hit.approved === false
                      ? 'bg-white/5 border-white/10 text-white/25 line-through'
                      : 'bg-violet-500/15 border-violet-500/40 text-violet-200'
                  }`}
                >
                  <span className="font-bold truncate max-w-[120px]">{hit.phrase}</span>
                  <span className="text-[9px] opacity-60 shrink-0">{hit.category}</span>
                  {hit.approved === null && (
                    <>
                      <button
                        onClick={() => handlePiiDecision(i, true)}
                        className="text-red-400 hover:text-red-300 transition-colors shrink-0"
                        title="Approve — stage for redaction"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handlePiiDecision(i, false)}
                        className="text-white/30 hover:text-white/60 transition-colors shrink-0"
                        title="Skip — keep this word"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {hit.approved === true && <Lock className="w-3 h-3 text-red-400 shrink-0" />}
                  {hit.approved === false && <EyeOff className="w-3 h-3 text-white/20 shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}      {/* ── Custom Terms panel ────────────────────────────────────────────────── */}
      {customTermsPanelOpen && (
        <div className="shrink-0 border-b border-amber-500/20 bg-amber-950/40">
          <div className="px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Custom Redaction Terms</p>
            </div>
            <button onClick={() => setCustomTermsPanelOpen(false)} className="text-white/30 hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* ─ Safe Words column ─ */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-sm bg-teal-400 inline-block" />
                <p className="text-[10px] font-black uppercase tracking-widest text-teal-300">Safe Words — Never Redact</p>
              </div>
              <p className="text-[9px] text-white/30 leading-relaxed">
                Product names, project names, or any term the AI should never flag as PII. Paste a comma- or newline-separated list.
              </p>
              <div className="flex gap-2">
                <textarea
                  value={safeWordInput}
                  onChange={(e) => setSafeWordInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addSafeWords(); }}
                  placeholder={`Downtown Transit Corridor\nLBKH Solutions\nProject Liaison`}
                  rows={3}
                  className="flex-1 bg-black/40 border border-teal-500/20 rounded-lg px-3 py-2 text-[11px] font-mono text-white/70 placeholder:text-white/15 focus:outline-none focus:border-teal-400/50 resize-none"
                />
                <button
                  onClick={addSafeWords}
                  disabled={!safeWordInput.trim()}
                  className="px-3 py-2 bg-teal-500/15 border border-teal-500/30 text-teal-300 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-teal-500/25 transition-all disabled:opacity-40 self-start"
                >
                  Add
                </button>
              </div>
              {safeWords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {safeWords.map((sw) => (
                    <span
                      key={sw}
                      className="flex items-center gap-1 px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded-full text-[10px] font-mono text-teal-300"
                    >
                      {sw}
                      <button
                        onClick={() => setSafeWords((prev) => prev.filter((w) => w !== sw))}
                        className="text-teal-400/50 hover:text-teal-300 ml-0.5"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ─ Custom Redact Terms column ─ */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-sm bg-orange-400 inline-block" />
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">Custom Redact Terms — Always Flag</p>
              </div>
              <p className="text-[9px] text-white/30 leading-relaxed">
                Specific names, addresses, proprietary specs, or any phrase to always stage for redaction. Paste a comma- or newline-separated list.
              </p>
              <div className="flex gap-2">
                <textarea
                  value={customTermInput}
                  onChange={(e) => setCustomTermInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addCustomRedactTerms(); }}
                  placeholder={`John Smith\n123 Maple Street\nConfidential Formula XR-7\nProject Budget`}
                  rows={3}
                  className="flex-1 bg-black/40 border border-orange-500/20 rounded-lg px-3 py-2 text-[11px] font-mono text-white/70 placeholder:text-white/15 focus:outline-none focus:border-orange-400/50 resize-none"
                />
                <button
                  onClick={addCustomRedactTerms}
                  disabled={!customTermInput.trim()}
                  className="px-3 py-2 bg-orange-500/15 border border-orange-500/30 text-orange-300 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-500/25 transition-all disabled:opacity-40 self-start"
                >
                  Add
                </button>
              </div>
              {customRedactTerms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customRedactTerms.map((ct) => (
                    <span
                      key={ct}
                      className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] font-mono text-orange-300"
                    >
                      {ct}
                      <button
                        onClick={() => {
                          setCustomRedactTerms((prev) => prev.filter((t) => t !== ct));
                        }}
                        className="text-orange-400/50 hover:text-orange-300 ml-0.5"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div className="px-5 pb-3 flex items-center gap-3">
            <p className="text-[9px] text-white/20 leading-relaxed flex-1">
              Tip: Paste a full list at once — terms are split on commas, newlines, or semicolons. Use Cmd/Ctrl+Enter to add without clicking the button. Custom Redact Terms are immediately staged in the document; Safe Words take effect on the next AI PII Scan.
            </p>
            {(safeWords.length > 0 || customRedactTerms.length > 0) && (
              <button
                onClick={() => { setSafeWords([]); setCustomRedactTerms([]); }}
                className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-red-400 transition-colors shrink-0"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Public filing URL ────────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 py-2.5 border-b border-white/5 bg-black/30 flex items-center gap-3">
        <Globe className="w-3.5 h-3.5 text-teal-400 shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40 shrink-0">Public Filing URL</span>
        <input
          type="url"
          value={publicUrl}
          onChange={(e) => setPublicUrl(e.target.value)}
          placeholder="https://… (optional — linked in AI citations)"
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
          className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded transition-all ${
            urlSaved
              ? 'text-teal-400 bg-teal-500/10 border border-teal-500/20'
              : 'text-white/40 bg-white/5 border border-white/10 hover:text-white'
          }`}
        >
          {urlSaving ? '…' : urlSaved ? 'Saved ✓' : 'Save URL'}
        </button>
      </div>

      {/* ── Document body ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 bg-black/10">
        {loading && (
          <div className="flex items-center justify-center h-full gap-3 text-white/30">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs font-mono uppercase tracking-widest">Extracting document text…</span>
          </div>
        )}

        {loadError && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400/40" />
            <p className="text-xs font-black uppercase tracking-widest text-red-400">Failed to load document</p>
            <p className="text-[11px] font-mono text-white/30 max-w-sm leading-relaxed">{loadError}</p>
          </div>
        )}

        {!loading && !loadError && words.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <FileText className="w-12 h-12 text-white/10" />
            <p className="text-xs font-black uppercase tracking-widest text-white/20">Document appears to be empty</p>
          </div>
        )}

        {!loading && !loadError && words.length > 0 && (
          <div className="max-w-3xl mx-auto">
            {/* Word count + legend */}
            <div className="flex items-center gap-4 mb-4 pb-3 border-b border-white/5">
              <span className="text-[9px] font-mono text-white/20 uppercase">{words.length.toLocaleString()} words</span>
              {(piiPendingIndices.size > 0 || piiApprovedIndices.size > 0 || pendingRedactions.size > 0) && (
                <div className="flex items-center gap-3 text-[9px] font-mono uppercase">
                  {piiPendingIndices.size > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-violet-500/60 inline-block" />
                      <span className="text-violet-300">AI detected</span>
                    </span>
                  )}
                  {(pendingRedactions.size > 0 || piiApprovedIndices.size > 0) && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-orange-500/60 inline-block" />
                      <span className="text-orange-300">Staged</span>
                    </span>
                  )}
                </div>
              )}
              {previewMode && (
                <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-teal-400 animate-pulse">
                  Preview Mode
                </span>
              )}
            </div>

            <div className="font-mono text-sm leading-loose text-white/70 flex flex-wrap gap-x-1 gap-y-1">
              {words.map((word, i) => {
                const isPendingRedaction = pendingRedactions.has(i);
                const isSavedRedaction = wordStates[i] === 'redacted';
                const isPiiPending = piiPendingIndices.has(i);
                const isPiiApproved = piiApprovedIndices.has(i);

                // In preview mode: show redacted blocks for all staged + saved
                if (previewMode) {
                  if (isPendingRedaction || isPiiApproved || isSavedRedaction) {
                    return (
                      <span
                        key={i}
                        className="bg-black text-black select-none px-0.5 rounded"
                        style={{ letterSpacing: '0.05em' }}
                        title="Redacted"
                      >
                        {'█'.repeat(Math.min(word.length, 8))}
                      </span>
                    );
                  }
                  return <span key={i} className="px-0.5">{word}</span>;
                }

                // Normal / editing mode
                let cls = '';
                let title: string | undefined;

                if (isSavedRedaction) {
                  cls = 'bg-red-900/60 text-red-300 px-1 rounded cursor-default select-none';
                  title = 'Permanently redacted';
                } else if (isPendingRedaction || isPiiApproved) {
                  cls = 'bg-orange-500/30 text-orange-200 px-1 rounded cursor-pointer ring-1 ring-orange-400/50 hover:bg-orange-500/50';
                  title = 'Staged for redaction — click to un-stage';
                } else if (isPiiPending) {
                  cls = 'bg-violet-500/20 text-violet-200 px-1 rounded ring-1 ring-violet-400/50';
                  const hit = piiHits.find((h) => h.wordIndices.includes(i));
                  title = hit ? `AI detected: ${hit.category} — review in panel above` : 'AI detected PII';
                } else if (redactionMode) {
                  cls = 'hover:bg-red-500/25 hover:text-red-200 cursor-crosshair px-1 rounded transition-colors';
                  title = 'Click to stage for redaction';
                } else {
                  cls = 'px-0.5';
                }

                return (
                  <span
                    key={i}
                    onClick={() => handleWordClick(i)}
                    className={cls}
                    title={title}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom action bar ─────────────────────────────────────────────── */}
      {hasPendingRedactions && !previewMode && (
        <div className="shrink-0 px-5 py-3 border-t border-orange-500/20 bg-orange-950/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">
              {pendingRedactions.size} word{pendingRedactions.size !== 1 ? 's' : ''} staged — not yet permanent
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
              {saving ? 'Saving to R2…' : `Save Redacted Version (${pendingRedactions.size} words)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
