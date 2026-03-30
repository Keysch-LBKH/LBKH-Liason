/**
 * KnowledgeMap — Left-to-right expandable topic tree in a full-screen popup
 *
 * - Sidebar card shows a "Explore Topics" button + topic count badge
 * - Clicking opens a modal with a clean left-to-right tree
 * - Root → Topics (click to expand) → Subtopics (click to ask chat)
 * - All labels are horizontal and readable at normal human scale
 * - Tree is AI-generated from source documents only (never benchmarks)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Network, RefreshCw, X, ChevronRight, MessageCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { liaisonService, type MindMapNode } from '../services/liaisonService';

interface KnowledgeMapProps {
  branding: {
    primaryColor: string;
    secondaryColor: string;
  };
  onAsk: (question: string) => void;
}

// ── Tree node component ───────────────────────────────────────────────────────

interface TreeNodeProps {
  node: MindMapNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAsk: (question: string) => void;
  primary: string;
  secondary: string;
}

function TreeNode({ node, depth, expanded, onToggle, onAsk, primary, secondary }: TreeNodeProps) {
  const isRoot = depth === 0;
  const isTopic = depth === 1;
  const isSubtopic = depth === 2;
  const isOpen = expanded.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  const handleClick = () => {
    if (isRoot) return;
    if (isTopic) {
      onToggle(node.id);
    } else {
      onAsk(`Tell me about "${node.label}" as it relates to this project.`);
    }
  };

  return (
    <div className="flex items-start gap-0">
      {/* Node + connector line */}
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-2">
          {/* Horizontal connector from parent */}
          {!isRoot && (
            <div
              className="h-px w-6 shrink-0"
              style={{ backgroundColor: isTopic ? primary + '60' : secondary + '50' }}
            />
          )}

          {/* Node pill */}
          <button
            onClick={handleClick}
            disabled={isRoot}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all',
              isRoot
                ? 'cursor-default'
                : isTopic
                ? 'hover:opacity-90 active:scale-95'
                : 'hover:opacity-90 active:scale-95',
            ].join(' ')}
            style={{
              backgroundColor: isRoot
                ? primary
                : isTopic
                ? isOpen ? primary + '25' : primary + '12'
                : secondary + '18',
              border: `1px solid ${isRoot ? primary : isTopic ? primary + '50' : secondary + '40'}`,
              color: isRoot ? '#fff' : isTopic ? '#fff' : 'rgba(255,255,255,0.7)',
            }}
          >
            {/* Icon */}
            {isTopic && hasChildren && (
              <ChevronRight
                className="w-3 h-3 shrink-0 transition-transform"
                style={{
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  color: primary,
                }}
              />
            )}
            {isSubtopic && (
              <MessageCircle className="w-3 h-3 shrink-0 opacity-50" style={{ color: secondary }} />
            )}

            <span
              className="font-mono uppercase tracking-wide whitespace-nowrap"
              style={{
                fontSize: isRoot ? '11px' : isTopic ? '10px' : '9px',
                fontWeight: isRoot || isTopic ? 700 : 500,
              }}
            >
              {node.label}
            </span>
          </button>
        </div>

        {/* Vertical connector down to children */}
        {isTopic && isOpen && hasChildren && (
          <div
            className="ml-auto w-px"
            style={{
              marginLeft: `calc(1.5rem + 0.75rem)`, // connector width + half pill padding
              height: `${node.children.length * 36}px`,
              backgroundColor: primary + '30',
            }}
          />
        )}
      </div>

      {/* Children column */}
      {hasChildren && (isRoot || (isTopic && isOpen)) && (
        <AnimatePresence>
          <motion.div
            key={node.id + '-children'}
            initial={isRoot ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-2 ml-0"
            style={{ marginTop: isRoot ? 0 : `-${node.children.length * 36 - 8}px` }}
          >
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
                onAsk={onAsk}
                primary={primary}
                secondary={secondary}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function KnowledgeMap({ branding, onAsk }: KnowledgeMapProps) {
  const [tree, setTree] = useState<MindMapNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  const primary = branding.primaryColor;
  const secondary = branding.secondaryColor;

  const loadTree = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      let result = await liaisonService.generateMindMapTree(force);
      // Retry once after a short delay in case docs were still loading on first call
      if (!result) {
        await new Promise((r) => setTimeout(r, 1500));
        result = await liaisonService.generateMindMapTree(force);
      }
      if (result) {
        setTree(result);
        setExpanded(new Set());
      } else {
        setError('No source documents loaded yet.');
      }
    } catch {
      setError('Failed to generate mind map.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTree(); }, [loadTree]);

  const toggleNode = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAsk = (q: string) => {
    setOpen(false);
    onAsk(q);
  };

  const topicCount = tree?.children?.length ?? 0;

  return (
    <>
      {/* ── Sidebar card ── */}
      <div>
        <div className="flex items-center gap-3 mb-4" style={{ color: primary }}>
          <Network className="w-5 h-5" />
          <h2 className="text-sm font-black uppercase tracking-widest flex-1">Knowledge Map</h2>
          {!loading && tree && (
            <button
              onClick={() => { liaisonService.invalidateMindMap(); loadTree(true); }}
              title="Regenerate from documents"
              className="p-1 rounded text-white/30 hover:text-white/70 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-white/30">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: primary }} />
            <p className="text-[10px] font-mono uppercase tracking-widest">Mapping source documents…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
            <Network className="w-6 h-6 text-white/10" />
            <p className="text-xs text-white/30">{error}</p>
          </div>
        )}

        {!loading && tree && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-mono text-white/40 leading-relaxed">
              {topicCount} topic{topicCount !== 1 ? 's' : ''} mapped from your source documents.
              Click a subtopic to send it directly to the chat.
            </p>
            <button
              onClick={() => setOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all hover:opacity-90 active:scale-95"
              style={{
                backgroundColor: primary + '20',
                border: `1px solid ${primary}50`,
                color: primary,
              }}
            >
              <Network className="w-4 h-4" />
              Explore Topics
            </button>
          </div>
        )}
      </div>

      {/* ── Full-screen popup — portalled to body to escape overflow-y-auto stacking context ── */}
      {createPortal(
        <AnimatePresence>
          {open && tree && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
            >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-4xl max-h-[85vh] rounded-2xl border bg-black/95 shadow-2xl flex flex-col"
              style={{ borderColor: primary + '40' }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-3 px-6 py-4 border-b shrink-0"
                style={{ borderColor: primary + '20' }}
              >
                <Network className="w-5 h-5" style={{ color: primary }} />
                <h2 className="text-sm font-black uppercase tracking-widest flex-1" style={{ color: primary }}>
                  {tree.label} — Knowledge Map
                </h2>
                <p className="text-[10px] font-mono text-white/30 uppercase mr-4">
                  Click a subtopic to ask the AI
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tree body */}
              <div className="flex-1 overflow-auto p-8">
                {/* Root row */}
                <div className="flex items-start gap-0">
                  {/* Root node */}
                  <div
                    className="flex items-center px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[11px] text-white shrink-0"
                    style={{ backgroundColor: primary, boxShadow: `0 0 20px ${primary}40` }}
                  >
                    {tree.label}
                  </div>

                  {/* Topics column */}
                  <div className="flex flex-col gap-3 ml-0">
                    {(tree.children || []).map((topic, ti) => (
                      <div key={topic.id} className="flex items-start gap-0">
                        {/* Horizontal connector root→topic */}
                        <div className="flex items-center" style={{ marginTop: '10px' }}>
                          <div className="h-px w-8" style={{ backgroundColor: primary + '50' }} />
                        </div>

                        {/* Topic node */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => toggleNode(topic.id)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all hover:opacity-90 active:scale-95 shrink-0"
                            style={{
                              backgroundColor: expanded.has(topic.id) ? primary + '25' : primary + '12',
                              border: `1px solid ${primary}50`,
                              color: '#fff',
                            }}
                          >
                            <ChevronRight
                              className="w-3.5 h-3.5 shrink-0 transition-transform"
                              style={{
                                transform: expanded.has(topic.id) ? 'rotate(90deg)' : 'rotate(0deg)',
                                color: primary,
                              }}
                            />
                            <span className="font-mono font-bold uppercase tracking-wide text-[10px] whitespace-nowrap">
                              {topic.label}
                            </span>
                          </button>

                          {/* Subtopics */}
                          <AnimatePresence>
                            {expanded.has(topic.id) && topic.children && topic.children.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.15 }}
                                className="flex flex-col gap-1.5 overflow-hidden"
                              >
                                {topic.children.map((sub) => (
                                  <div key={sub.id} className="flex items-center gap-0 ml-2">
                                    {/* Connector topic→subtopic */}
                                    <div className="h-px w-6" style={{ backgroundColor: secondary + '40' }} />
                                    <button
                                      onClick={() => handleAsk(`Tell me about "${sub.label}" as it relates to this project.`)}
                                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all hover:opacity-90 active:scale-95 group"
                                      style={{
                                        backgroundColor: secondary + '15',
                                        border: `1px solid ${secondary}35`,
                                        color: 'rgba(255,255,255,0.65)',
                                      }}
                                    >
                                      <MessageCircle
                                        className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                                        style={{ color: secondary }}
                                      />
                                      <span className="font-mono text-[9px] uppercase tracking-wide whitespace-nowrap group-hover:text-white transition-colors">
                                        {sub.label}
                                      </span>
                                    </button>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer hint */}
              <div
                className="px-6 py-3 border-t shrink-0 flex items-center gap-2"
                style={{ borderColor: primary + '15' }}
              >
                <MessageCircle className="w-3 h-3" style={{ color: secondary }} />
                <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest">
                  Subtopics are derived from your source documents only — benchmark data is excluded
                </p>
              </div>
            </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
