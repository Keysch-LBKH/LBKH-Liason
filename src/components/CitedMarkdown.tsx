/**
 * CitedMarkdown
 *
 * Renders AI response text with clickable numbered citation superscripts.
 * - Parses [SOURCE: "quote" — DocName] or [SOURCE: "quote" — DocName](url) patterns
 *   from the raw answer text and replaces them with [N] superscript links.
 * - Clicking a superscript opens a floating CitationPopup showing the snippet,
 *   document name, and optional public filing link.
 * - The popup is portalled to document.body so it escapes any overflow container.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { FileText, ExternalLink, X } from 'lucide-react';

export interface Citation {
  docName: string;
  snippet: string;
  publicUrl: string;
}

interface CitationPopupProps {
  citation: Citation;
  index: number;
  anchorRect: DOMRect;
  primary: string;
  onClose: () => void;
}

function CitationPopup({ citation, index, anchorRect, primary, onClose }: CitationPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Position: prefer above the anchor, fall back to below
  const top = anchorRect.top + window.scrollY - 8;
  const left = Math.min(
    anchorRect.left + window.scrollX,
    window.innerWidth - 320 - 16
  );

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-[9999] w-80 rounded-2xl border shadow-2xl backdrop-blur-xl overflow-hidden"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        transform: 'translateY(-100%)',
        backgroundColor: 'rgba(10, 10, 20, 0.96)',
        borderColor: `${primary}40`,
        boxShadow: `0 0 40px ${primary}20`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: `${primary}20`, backgroundColor: `${primary}10` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
            style={{ backgroundColor: primary, color: '#000' }}
          >
            {index}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: primary }}>
            Source Citation
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-white/30 hover:text-white/60 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Document name */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
        <FileText className="w-3 h-3 shrink-0" style={{ color: primary }} />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/50 truncate">
          {citation.docName}
        </span>
      </div>

      {/* Snippet */}
      <div className="px-4 pb-3">
        <blockquote
          className="text-[12px] text-white/80 leading-relaxed italic border-l-2 pl-3 py-1"
          style={{ borderColor: primary }}
        >
          &ldquo;{citation.snippet}&rdquo;
        </blockquote>
      </div>

      {/* Public filing link */}
      {citation.publicUrl && (
        <div
          className="px-4 py-3 border-t flex items-center gap-2"
          style={{ borderColor: `${primary}20` }}
        >
          <ExternalLink className="w-3 h-3 shrink-0" style={{ color: primary }} />
          <a
            href={citation.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity truncate"
            style={{ color: primary }}
          >
            View Public Filing
          </a>
        </div>
      )}
    </div>,
    document.body
  );
}

interface CitedMarkdownProps {
  text: string;
  citations: Citation[];
  primary: string;
  secondary: string;
  proseClass?: string;
}

/**
 * Renders answer text, replacing [SOURCE: ...] inline patterns with
 * numbered superscript links, and also rendering any structured citations
 * passed via the `citations` prop as a numbered reference list at the bottom.
 */
export function CitedMarkdown({ text, citations, primary, secondary, proseClass = '' }: CitedMarkdownProps) {
  const [openCitation, setOpenCitation] = useState<{ citation: Citation; index: number; rect: DOMRect } | null>(null);

  const handleCitationClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, citation: Citation, index: number) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      setOpenCitation({ citation, index, rect });
    },
    []
  );

  // Strip inline [SOURCE: ...] patterns from the text — structured citations are shown below
  const cleanedText = text
    .replace(/\[SOURCE:\s*"[^"]*"\s*—\s*[^\]]+\]\([^)]*\)/g, '')
    .replace(/\[SOURCE:\s*"[^"]*"\s*—\s*[^\]]+\]/g, '')
    .trim();

  return (
    <div>
      {/* Main answer text */}
      <div className={`prose prose-sm max-w-none prose-invert ${proseClass}`}>
        <ReactMarkdown>{cleanedText}</ReactMarkdown>
      </div>

      {/* Numbered citation reference list */}
      {citations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5">
          {citations.map((cit, i) => (
            <button
              key={i}
              onClick={(e) => handleCitationClick(e, cit, i + 1)}
              className="flex items-center gap-2 text-left group w-full transition-opacity hover:opacity-80"
            >
              <span
                className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
                style={{ backgroundColor: primary, color: '#000' }}
              >
                {i + 1}
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-widest underline underline-offset-2 decoration-dotted truncate"
                style={{ color: primary }}
              >
                {cit.docName}
              </span>
              {cit.publicUrl && (
                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-40 group-hover:opacity-80" style={{ color: primary }} />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Citation popup */}
      {openCitation && (
        <CitationPopup
          citation={openCitation.citation}
          index={openCitation.index}
          anchorRect={openCitation.rect}
          primary={primary}
          onClose={() => setOpenCitation(null)}
        />
      )}
    </div>
  );
}
