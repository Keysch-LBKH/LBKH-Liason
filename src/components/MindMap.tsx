import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  group: number;
  citation?: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
}

// Mind map data is populated from uploaded project documents.
// Replace these placeholder nodes with your project-specific topics.
const data: { nodes: Node[]; links: Link[] } = {
  nodes: [
    { id: "Your Project", group: 1 },
    { id: "Topic Area 1", group: 2 },
    { id: "Topic Area 2", group: 3 },
    { id: "Topic Area 3", group: 4 },
    { id: "Topic Area 4", group: 5 },
    { id: "Sub-topic 1A", group: 2 },
    { id: "Sub-topic 1B", group: 2 },
    { id: "Sub-topic 2A", group: 3 },
    { id: "Sub-topic 2B", group: 3 },
    { id: "Sub-topic 3A", group: 4 },
    { id: "Sub-topic 3B", group: 4 },
    { id: "Sub-topic 4A", group: 5 },
    { id: "Sub-topic 4B", group: 5 },
  ],
  links: [
    { source: "Your Project", target: "Topic Area 1" },
    { source: "Your Project", target: "Topic Area 2" },
    { source: "Your Project", target: "Topic Area 3" },
    { source: "Your Project", target: "Topic Area 4" },
    { source: "Topic Area 1", target: "Sub-topic 1A" },
    { source: "Topic Area 1", target: "Sub-topic 1B" },
    { source: "Topic Area 2", target: "Sub-topic 2A" },
    { source: "Topic Area 2", target: "Sub-topic 2B" },
    { source: "Topic Area 3", target: "Sub-topic 3A" },
    { source: "Topic Area 3", target: "Sub-topic 3B" },
    { source: "Topic Area 4", target: "Sub-topic 4A" },
    { source: "Topic Area 4", target: "Sub-topic 4B" },
  ]
};

export const MindMap: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 400;
    const height = 400;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .style("width", "100%")
      .style("height", "auto");

    svg.selectAll("*").remove();

    const simulation = d3.forceSimulation<Node>(data.nodes)
      .force("link", d3.forceLink<Node, Link>(data.links).id(d => d.id).distance(60))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .attr("stroke", "rgba(147, 51, 234, 0.2)")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke-width", 1);

    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .selectAll<SVGGElement, Node>("g")
      .data(data.nodes)
      .join("g")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("circle")
      .attr("r", d => d.group === 1 ? 8 : 5)
      .attr("fill", d => {
        if (d.group === 1) return "#9333EA";
        if (d.group === 2) return "#06B6D4";
        return "#A855F7";
      })
      .attr("class", "glow-purple");

    node.append("text")
      .text(d => d.id)
      .attr("x", 10)
      .attr("y", 4)
      .style("font-size", "8px")
      .style("font-family", "JetBrains Mono")
      .style("fill", "rgba(255, 255, 255, 0.7)")
      .style("pointer-events", "none");

    node.append("title")
      .text(d => d.citation ? `${d.id}\nCitation: ${d.citation}` : d.id);

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => { simulation.stop(); };
  }, []);

  return (
    <div className="w-full h-[400px] relative">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute bottom-2 right-2 text-[8px] font-mono text-white/30 uppercase tracking-widest">
        Interactive Knowledge Graph
      </div>
    </div>
  );
};
