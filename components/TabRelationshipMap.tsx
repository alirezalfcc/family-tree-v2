
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { FamilyTab, Person } from '../types';
import { flattenTree } from '../utils/genealogy';

interface TabRelationshipMapProps {
  tabs: FamilyTab[];
  onClose: () => void;
  onSelectTab: (id: string) => void;
  onCreateMergedTab: (selectedTabIds: string[]) => void;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  owner?: string;
  dataCount: number;
  group: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  connectionInfo?: string; // Information about who connects them
}

const TabRelationshipMap: React.FC<TabRelationshipMapProps> = ({ tabs, onClose, onSelectTab, onCreateMergedTab }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  // Function to analyze connections
  const analyzeConnections = (sourceTab: FamilyTab, targetTab: FamilyTab) => {
      const sourceMembers = flattenTree(sourceTab.data);
      const targetMembers = flattenTree(targetTab.data);
      const targetMemberMap = new Map(targetMembers.map(m => [m.id, m]));
      
      const connections: string[] = [];

      sourceMembers.forEach(m => {
          if (m.spouseId && targetMemberMap.has(m.spouseId)) {
              const spouse = targetMemberMap.get(m.spouseId);
              connections.push(`${m.name} (از ${sourceTab.title}) همسر ${spouse?.name} (از ${targetTab.title})`);
          }
          if (m.secondSpouseId && targetMemberMap.has(m.secondSpouseId)) {
              const spouse = targetMemberMap.get(m.secondSpouseId);
              connections.push(`${m.name} (از ${sourceTab.title}) همسر دوم ${spouse?.name} (از ${targetTab.title})`);
          }
      });
      
      if (connections.length === 0 && sourceTab.linkedTabIds?.includes(targetTab.id)) {
          return "ارتباط دستی تعریف شده (بدون فرد مشترک مشخص)";
      }

      return connections.join(' | ');
  };

  useEffect(() => {
    if (!svgRef.current || tabs.length === 0) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Prepare Data
    const nodes: Node[] = tabs.map((tab, index) => ({
      id: tab.id,
      title: tab.title,
      owner: tab.owner,
      dataCount: 1, 
      group: index,
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100
    }));

    const links: Link[] = [];
    tabs.forEach(tab => {
        // Only look at tabs that have links defined
        if (tab.linkedTabIds) {
            tab.linkedTabIds.forEach(targetId => {
                // Check if target exists in visible tabs
                const targetTab = tabs.find(t => t.id === targetId);
                if (targetTab) {
                    // Avoid duplicate links
                    const existing = links.find(l => 
                        (l.source === tab.id && l.target === targetId) || 
                        (l.source === targetId && l.target === tab.id)
                    );
                    if (!existing) {
                        const info = analyzeConnections(tab, targetTab) || analyzeConnections(targetTab, tab);
                        links.push({ source: tab.id, target: targetId, connectionInfo: info });
                    }
                }
            });
        }
    });

    // 2. Clear previous SVG
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .style("font-family", "Vazirmatn, sans-serif");

    // Add generic marker
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .join("marker")
      .attr("id", d => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#94a3b8")
      .attr("d", "M0,-5L10,0L0,5");

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(250))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(80));

    // Links Group
    const linkGroup = svg.append("g");
    
    const link = linkGroup
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("class", "hover:stroke-amber-500 cursor-pointer transition-colors");

    // Link Labels (Connection Info)
    const linkLabels = svg.append("g")
        .selectAll("text")
        .data(links)
        .enter()
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", -5)
        .attr("font-size", "10px")
        .attr("fill", "#64748b")
        .attr("class", "bg-white p-1 rounded opacity-0 transition-opacity hover:opacity-100 pointer-events-auto cursor-help")
        .text(d => d.connectionInfo && d.connectionInfo.length > 50 ? d.connectionInfo.substring(0, 50) + "..." : d.connectionInfo || '')
        .each(function(d) {
             // Add tooltip title for full text
             d3.select(this).append("title").text(d.connectionInfo || '');
        });

    // Make labels visible on hover of line
    link.on("mouseover", function(event, d) {
        d3.select(this).attr("stroke", "#f59e0b").attr("stroke-width", 4);
        // Find corresponding label and show it (simplified logic needed here or just rely on title)
    }).on("mouseout", function(event, d) {
        d3.select(this).attr("stroke", "#94a3b8").attr("stroke-width", 2);
    });


    const nodeGroup = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Card/Box shape
    nodeGroup.append("rect")
      .attr("width", 140)
      .attr("height", 60)
      .attr("x", -70)
      .attr("y", -30)
      .attr("rx", 10)
      .attr("fill", "white")
      .attr("stroke", (d) => selectedNodeIds.has(d.id) ? "#f59e0b" : "#cbd5e1")
      .attr("stroke-width", (d) => selectedNodeIds.has(d.id) ? 3 : 1)
      .style("filter", "drop-shadow(0px 4px 6px rgba(0,0,0,0.1))")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
          // Toggle selection
          setSelectedNodeIds(prev => {
              const newSet = new Set(prev);
              if (newSet.has(d.id)) newSet.delete(d.id);
              else newSet.add(d.id);
              return newSet;
          });
      });

    // Header Color Bar
    nodeGroup.append("rect")
      .attr("width", 140)
      .attr("height", 5)
      .attr("x", -70)
      .attr("y", -30)
      .attr("rx", 2) // rounded top
      .attr("fill", (d) => d3.schemeTableau10[d.group % 10]);

    // Title
    nodeGroup.append("text")
      .attr("dy", "-5")
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .attr("font-size", "12px")
      .attr("fill", "#1e293b")
      .text(d => d.title.length > 18 ? d.title.substring(0, 15) + "..." : d.title)
      .style("pointer-events", "none");
    
    // Owner/Subtitle
    nodeGroup.append("text")
      .attr("dy", "15")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#64748b")
      .text(d => d.owner ? `مالک: ${d.owner}` : 'عمومی')
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkLabels
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2)
        .style("opacity", 1); // Always show for now, or use logic

      nodeGroup.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
  }, [tabs]); // Re-run if tabs change

  useEffect(() => {
     if(!svgRef.current) return;
     const svg = d3.select(svgRef.current);
     svg.selectAll("rect")
        .filter(function() { return this.getAttribute("height") === "60"; }) 
        .attr("stroke", (d: any) => selectedNodeIds.has(d.id) ? "#f59e0b" : "#cbd5e1")
        .attr("stroke-width", (d: any) => selectedNodeIds.has(d.id) ? 3 : 1);
  }, [selectedNodeIds]);


  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[100] flex flex-col backdrop-blur-sm animate-in fade-in">
        <div className="flex justify-between items-center p-4 bg-white/10 border-b border-white/10 text-white">
            <h2 className="text-lg font-black flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                نقشه ارتباطات خاندان‌ها
            </h2>
            <div className="flex gap-3">
                 {selectedNodeIds.size > 1 && (
                     <button 
                        onClick={() => onCreateMergedTab(Array.from(selectedNodeIds))}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 animate-pulse"
                     >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                         ایجاد تب تلفیقی ({selectedNodeIds.size})
                     </button>
                 )}
                 <button onClick={onClose} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
            </div>
        </div>
        <div className="flex-1 relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]">
             <div className="absolute top-4 right-4 bg-black/40 text-white p-3 rounded-xl text-xs backdrop-blur-md max-w-xs z-10">
                 <p className="font-bold mb-1">راهنما:</p>
                 <ul className="list-disc list-inside space-y-1 opacity-80">
                     <li>روی باکس‌ها کلیک کنید تا انتخاب شوند.</li>
                     <li>برای مشاهده تلفیقی، چند خاندان را انتخاب و دکمه بالا را بزنید.</li>
                     <li>خطوط نقطه چین نشان دهنده ارتباط تعریف شده بین خاندان‌هاست.</li>
                     <li>متن روی خطوط (با هاور) افراد مشترک را نشان می‌دهد.</li>
                 </ul>
             </div>
             <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing"></svg>
        </div>
    </div>
  );
};

export default TabRelationshipMap;
