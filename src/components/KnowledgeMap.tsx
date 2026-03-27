/**
 * KnowledgeMap
 * Displays uploaded source and benchmark documents as clickable nodes.
 * Clicking a node fetches an AI-generated summary (never the full document).
 * If a public URL is set, a "View Public Filing" link appears in the summary card.
 */
import React, { useState, useEffect } from 'react';
import { FileText, FileAudio, FileVideo, Presentation, Network, ExternalLink, Loader2, X, BookOpen, Shield } from 'lucide-react';
import { listDocuments, fetchDocumentContent, type R2Document } from '../services/r2Service';

const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL as string;
const UPLOAD_SECRET = import.meta.env.VITE_R2_UPLOAD_SECRET as string;
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY as string;

interface KnowledgeMapProps {
  branding: {
    primaryColor: string;
    secondaryColor: string;
  };
}

interface DocNode extends R2Document {
  summary?: string;
  summaryLoading?: boolean;
  summaryError?: string;
}

function getFileIcon(type: string) {
  const t = type.toLowerCase();
  if (t === 'pdf' || t === 'doc' || t === 'docx' || t === 'txt' || t === 'md') return FileText;
  if (t === 'mp3' || t === 'wav' || t === 'm4a') return FileAudio;
  if (t === 'mp4' || t === 'mov' || t === 'webm') return FileVideo;
  if (t === 'ppt' || t === 'pptx') return Presentation;
  return FileText;
}

async function generateSummary(content: string, docName: string): Promise<string> {
  // Use the OpenAI-compatible endpoint (Gemini via proxy)
  const apiKey = OPENAI_KEY || (import.meta.env.VITE_GEMINI_API_KEY as string);
  if (!apiKey) return 'Summary unavailable — AI key not configured.';

  const prompt = `You are a document analyst. Provide a concise 3-5 sentence summary of the following document titled "${docName}". Focus on the key facts, purpose, and relevance to a community project. Do NOT reproduce any personally identifiable information. Do NOT quote more than 20 words verbatim.\n\nDocument content (first 3000 chars):\n${content.slice(0, 3000)}`;

  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 256, temperature: 0.3 },
      }),
    });
    if (!res.ok) throw new Error('AI request failed');
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Summary unavailable.';
  } catch {
    return 'Summary could not be generated at this time.';
  }
}

export function KnowledgeMap({ branding }: KnowledgeMapProps) {
  const [sourceDocs, setSourceDocs] = useState<DocNode[]>([]);
  const [benchmarkDocs, setBenchmarkDocs] = useState<DocNode[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDocs() {
      setLoading(true);
      try {
        const [sources, benchmarks] = await Promise.all([
          listDocuments('sources'),
          listDocuments('benchmarks'),
        ]);
        setSourceDocs(sources);
        setBenchmarkDocs(benchmarks);
      } catch {
        // Silently fail — no docs loaded
      } finally {
        setLoading(false);
      }
    }
    loadDocs();
  }, []);

  const handleNodeClick = async (doc: DocNode, folder: 'sources' | 'benchmarks') => {
    // Open card immediately with loading state
    const node: DocNode = { ...doc, summaryLoading: true };
    setSelectedDoc(node);

    try {
      const contentData = await fetchDocumentContent(doc.key);
      const summary = await generateSummary(contentData.content, doc.name);
      setSelectedDoc(prev => prev?.key === doc.key ? { ...prev, summary, summaryLoading: false } : prev);
    } catch {
      setSelectedDoc(prev => prev?.key === doc.key
        ? { ...prev, summaryLoading: false, summaryError: 'Could not load document summary.' }
        : prev);
    }
  };

  const allDocs = [...sourceDocs, ...benchmarkDocs];
  const isEmpty = !loading && allDocs.length === 0;

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4" style={{ color: branding.secondaryColor }}>
        <Network className="w-5 h-5" />
        <h2 className="text-sm font-black uppercase tracking-widest">Knowledge Map</h2>
        {!loading && allDocs.length > 0 && (
          <span className="ml-auto text-[10px] font-mono text-white/30 uppercase">
            {allDocs.length} doc{allDocs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-white/30">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading knowledge base...</span>
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <BookOpen className="w-8 h-8 text-white/10 mb-3" />
          <p className="text-xs text-white/30 leading-relaxed">
            No documents uploaded yet.<br />
            Add source material in Settings to populate the knowledge map.
          </p>
        </div>
      )}

      {/* Source Nodes */}
      {sourceDocs.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30 mb-2">
            Source Material
          </p>
          <div className="flex flex-col gap-2">
            {sourceDocs.map(doc => {
              const Icon = getFileIcon(doc.type);
              return (
                <button
                  key={doc.key}
                  onClick={() => handleNodeClick(doc, 'sources')}
                  className="flex items-center gap-3 p-3 rounded-lg border text-left transition-all hover:scale-[1.01] group"
                  style={{
                    borderColor: branding.primaryColor + '30',
                    backgroundColor: branding.primaryColor + '08',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = branding.primaryColor + '70')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = branding.primaryColor + '30')}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: branding.primaryColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white/80 truncate group-hover:text-white">{doc.name}</p>
                    <p className="text-[9px] font-mono text-white/30 uppercase">{doc.type} • Click for summary</p>
                  </div>
                  {doc.publicUrl && (
                    <ExternalLink className="w-3 h-3 shrink-0 text-white/20 group-hover:text-white/60" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Benchmark Nodes */}
      {benchmarkDocs.length > 0 && (
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30 mb-2">
            Benchmark Sources
          </p>
          <div className="flex flex-col gap-2">
            {benchmarkDocs.map(doc => {
              const Icon = getFileIcon(doc.type);
              return (
                <button
                  key={doc.key}
                  onClick={() => handleNodeClick(doc, 'benchmarks')}
                  className="flex items-center gap-3 p-3 rounded-lg border text-left transition-all hover:scale-[1.01] group"
                  style={{
                    borderColor: '#f59e0b30',
                    backgroundColor: '#f59e0b08',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#f59e0b70')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#f59e0b30')}
                >
                  <Icon className="w-4 h-4 shrink-0 text-amber-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white/80 truncate group-hover:text-white">{doc.name}</p>
                    <p className="text-[9px] font-mono text-white/30 uppercase">{doc.type} • Benchmark • Click for summary</p>
                  </div>
                  {doc.publicUrl && (
                    <ExternalLink className="w-3 h-3 shrink-0 text-white/20 group-hover:text-white/60" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Modal Overlay */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="relative w-full max-w-lg rounded-2xl border p-6 bg-black/90 shadow-2xl"
            style={{ borderColor: branding.primaryColor + '50' }}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedDoc(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Doc header */}
            <div className="flex items-start gap-3 mb-4">
              {(() => {
                const Icon = getFileIcon(selectedDoc.type);
                return <Icon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: branding.primaryColor }} />;
              })()}
              <div>
                <h3 className="text-sm font-black text-white leading-tight">{selectedDoc.name}</h3>
                <p className="text-[10px] font-mono text-white/30 uppercase mt-1">
                  {selectedDoc.type} • {selectedDoc.folder === 'sources' ? 'Source Material' : 'Benchmark Source'}
                </p>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
              <Shield className="w-3 h-3 shrink-0 text-white/40" />
              <p className="text-[10px] text-white/40 leading-relaxed">
                Document content is never displayed in full. This summary is AI-generated from the uploaded file.
              </p>
            </div>

            {/* Summary content */}
            {selectedDoc.summaryLoading && (
              <div className="flex items-center gap-2 text-white/50 py-4">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: branding.primaryColor }} />
                <span className="text-xs">Generating summary...</span>
              </div>
            )}

            {selectedDoc.summaryError && (
              <p className="text-xs text-red-400 py-2">{selectedDoc.summaryError}</p>
            )}

            {selectedDoc.summary && (
              <p className="text-sm text-white/80 leading-relaxed">{selectedDoc.summary}</p>
            )}

            {/* Public filing link */}
            {selectedDoc.publicUrl && (
              <a
                href={selectedDoc.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors"
                style={{ color: branding.primaryColor }}
              >
                <ExternalLink className="w-3 h-3" />
                View Public Filing
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
