/**
 * KnowledgeMap — Interactive AI-generated radial mind map
 *
 * - Tree is generated from source documents only (never benchmarks)
 * - Only renders when the app is live (caller responsibility — only mount when isLive)
 * - Root node always visible; topic nodes expand/collapse on click
 * - Clicking a leaf (subtopic) fires onAsk(question) into the main chat
 * - Regenerates when invalidateMindMap() is called (e.g. new source doc uploaded)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { Loader2, Network, RefreshCw } from 'lucide-react';
import { liaisonService, type MindMapNode } from '../services/liaisonService';

interface KnowledgeMapProps {
  branding: {
    primaryColor: string;
    secondaryColor: string;
  };
  onAsk: (question: string) => void;
}

export function KnowledgeMap({ branding, onAsk }: KnowledgeMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tree, setTree] = useState<MindMapNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const primary = branding.primaryColor;
  const secondary = branding.secondaryColor;

  const loadTree = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await liaisonService.generateMindMapTree(force);
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

  useEffect(() => {
    if (!svgRef.current || !tree) return;

    const width = containerRef.current?.clientWidth || 360;
    const height = 360;
    const cx = width / 2;
    const cy = height / 2;

    // Build visible tree: topics always shown, subtopics only if expanded
    const visibleTree: MindMapNode = {
      ...tree,
      children: (tree.children || []).map((topic) => ({
        ...topic,
        children: expanded.has(topic.id) ? (topic.children || []) : [],
      })),
    };

    const hierarchy = d3.hierarchy<MindMapNode>(visibleTree, (d) =>
      d.children && d.children.length > 0 ? d.children : null
    );

    const radius = Math.min(width, height) / 2 - 50;
    const treeLayout = d3.tree<MindMapNode>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1.2 : 2) / a.depth);

    const root = treeLayout(hierarchy);

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    // Links
    const linkGen = d3.linkRadial<any, any>()
      .angle((d: any) => d.x)
      .radius((d: any) => d.y);

    g.append('g')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.35)
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr('stroke', (d: any) => d.target.depth === 1 ? primary : secondary)
      .attr('stroke-width', (d: any) => d.target.depth === 1 ? 1.5 : 1)
      .attr('d', linkGen);

    // Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(root.descendants())
      .join('g')
      .attr('transform', (d: any) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`)
      .style('cursor', (d: any) => d.depth > 0 ? 'pointer' : 'default')
      .on('click', (_event: any, d: any) => {
        if (d.depth === 0) return;
        if (d.depth === 1) {
          setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(d.data.id)) next.delete(d.data.id);
            else next.add(d.data.id);
            return next;
          });
        } else {
          onAsk(`Tell me about "${d.data.label}" as it relates to this project.`);
        }
      });

    node.append('circle')
      .attr('r', (d: any) => d.depth === 0 ? 10 : d.depth === 1 ? 7 : 5)
      .attr('fill', (d: any) => {
        if (d.depth === 0) return primary;
        if (d.depth === 1) return expanded.has(d.data.id) ? primary : primary + '55';
        return secondary;
      })
      .attr('stroke', (d: any) => d.depth === 0 ? '#fff' : 'transparent')
      .attr('stroke-width', 1.5)
      .style('filter', (d: any) => d.depth < 2 ? `drop-shadow(0 0 5px ${primary}90)` : 'none');

    node.append('text')
      .attr('dy', '0.31em')
      .attr('x', (d: any) => (d.x < Math.PI) !== !!d.children ? 10 : -10)
      .attr('text-anchor', (d: any) => (d.x < Math.PI) !== !!d.children ? 'start' : 'end')
      .attr('transform', (d: any) => d.x >= Math.PI ? 'rotate(180)' : null)
      .style('font-size', (d: any) => d.depth === 0 ? '10px' : d.depth === 1 ? '9px' : '8px')
      .style('font-family', 'JetBrains Mono, monospace')
      .style('font-weight', (d: any) => d.depth < 2 ? 'bold' : 'normal')
      .style('fill', (d: any) =>
        d.depth === 0 ? '#fff' : d.depth === 1 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)'
      )
      .style('pointer-events', 'none')
      .text((d: any) => d.data.label);

    // +/- indicator on topic nodes
    node.filter((d: any) => d.depth === 1)
      .append('text')
      .attr('dy', '0.31em')
      .attr('x', (d: any) => (d.x < Math.PI) !== !!d.children ? -5 : 5)
      .attr('text-anchor', 'middle')
      .attr('transform', (d: any) => d.x >= Math.PI ? 'rotate(180)' : null)
      .style('font-size', '8px')
      .style('fill', primary)
      .style('pointer-events', 'none')
      .text((d: any) => expanded.has(d.data.id) ? '−' : '+');

  }, [tree, expanded, primary, secondary, onAsk]);

  return (
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
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-white/30">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: primary }} />
          <p className="text-[10px] font-mono uppercase tracking-widest">Mapping source documents…</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
          <Network className="w-7 h-7 text-white/10" />
          <p className="text-xs text-white/30">{error}</p>
        </div>
      )}

      {!loading && tree && (
        <div ref={containerRef}>
          <svg ref={svgRef} className="w-full" />
          <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest text-center mt-1">
            Click topic to expand · Click subtopic to ask
          </p>
        </div>
      )}
    </div>
  );
}
