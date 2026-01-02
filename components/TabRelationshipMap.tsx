
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { FamilyTab } from '../types';
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
  x?: number;
  y?: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  connectionInfo?: string; 
}

const TabRelationshipMap: React.FC<TabRelationshipMapProps> = ({ tabs, onClose, onSelectTab, onCreateMergedTab }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Store zoom behavior in a ref to access it reliably in handlers
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Stats
  const [connectionCount, setConnectionCount] = useState(0);

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
          return "ارتباط دستی تعریف شده";
      }

      return connections.join(' | ');
  };

  useEffect(() => {
    if (!svgRef.current || tabs.length === 0) return;

    const width = containerRef.current?.clientWidth || window.innerWidth;
    const height = containerRef.current?.clientHeight || window.innerHeight;

    // 1. Prepare Data
    const nodes: Node[] = tabs.map((tab, index) => ({
      id: tab.id,
      title: tab.title,
      owner: tab.owner,
      dataCount: 1, 
      group: index,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200
    }));

    const links: Link[] = [];
    tabs.forEach(tab => {
        if (tab.linkedTabIds) {
            tab.linkedTabIds.forEach(targetId => {
                const targetTab = tabs.find(t => t.id === targetId);
                if (targetTab) {
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

    setConnectionCount(links.length);

    // 2. Clear previous SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .style("font-family", "Vazirmatn, sans-serif")
      .style("cursor", "grab");

    // Add Zoom Behavior
    const g = svg.append("g");
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom).on("dblclick.zoom", null); // Disable double click zoom
    zoomBehaviorRef.current = zoom; // Save zoom instance

    // Define Markers
    const defs = svg.append("defs");
    defs.selectAll("marker")
      .data(["end"])
      .join("marker")
      .attr("id", d => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 75) // Increased to clear node box
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#94a3b8")
      .attr("d", "M0,-5L10,0L0,5");

    // Simulation Setup
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(300))
      .force("charge", d3.forceManyBody().strength(-800)) // Stronger repulsion
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(100).strength(0.7));

    // Links
    const link = g.append("g")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("class", "hover:stroke-amber-500 cursor-pointer transition-colors");

    const linkLabels = g.append("g")
        .selectAll("text")
        .data(links)
        .enter()
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", -5)
        .attr("font-size", "10px")
        .attr("fill", "#64748b")
        .text(d => d.connectionInfo && d.connectionInfo.length > 40 ? "..." : d.connectionInfo || '')
        .style("pointer-events", "none");

    // Nodes
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "node-group")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node Box
    node.append("rect")
      .attr("width", 160)
      .attr("height", 70)
      .attr("x", -80)
      .attr("y", -35)
      .attr("rx", 12)
      .attr("fill", "white")
      .attr("stroke", (d) => selectedNodeIds.has(d.id) ? "#f59e0b" : "#cbd5e1")
      .attr("stroke-width", (d) => selectedNodeIds.has(d.id) ? 3 : 1)
      .style("filter", "drop-shadow(0px 4px 6px rgba(0,0,0,0.1))")
      .style("cursor", "pointer");
    
    // Header Color Bar
    node.append("rect")
      .attr("width", 160)
      .attr("height", 6)
      .attr("x", -80)
      .attr("y", -35)
      .attr("rx", 2)
      .attr("fill", (d) => d3.schemeTableau10[d.group % 10]);

    // Title
    node.append("text")
      .attr("dy", "-5")
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .attr("font-size", "13px")
      .attr("fill", "#1e293b")
      .text(d => d.title.length > 20 ? d.title.substring(0, 18) + "..." : d.title)
      .style("pointer-events", "none");

    // Owner info
    node.append("text")
      .attr("dy", "15")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#64748b")
      .text(d => d.owner ? `مالک: ${d.owner}` : 'عمومی')
      .style("pointer-events", "none");

    // Selection Click Handler
    node.on("click", (event, d) => {
        setSelectedNodeIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(d.id)) newSet.delete(d.id);
            else newSet.add(d.id);
            return newSet;
        });
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkLabels
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      svg.style("cursor", "grabbing");
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
      svg.style("cursor", "grab");
    }
    
  }, [tabs]);

  // Update selection visually
  useEffect(() => {
     if(!svgRef.current) return;
     const g = d3.select(svgRef.current).select("g");
     g.selectAll("rect")
        .filter(function(this: SVGElement) { return this.getAttribute("height") === "70"; }) 
        .attr("stroke", (d: any) => selectedNodeIds.has(d.id) ? "#f59e0b" : "#cbd5e1")
        .attr("stroke-width", (d: any) => selectedNodeIds.has(d.id) ? 3 : 1);
  }, [selectedNodeIds]);

  // Handle Search Zoom
  useEffect(() => {
     if(!searchTerm || !svgRef.current || !zoomBehaviorRef.current) return;
     const svg = d3.select(svgRef.current);
     const nodes = svg.selectAll(".node-group").data();
     const found = nodes.find((n: any) => n.title.includes(searchTerm));
     
     if(found) {
         const transform = d3.zoomIdentity
             .translate(window.innerWidth / 2, window.innerHeight / 2)
             .scale(1.5)
             .translate(-(found as any).x, -(found as any).y);
         
         svg.transition().duration(750).call(zoomBehaviorRef.current.transform, transform);
     }
  }, [searchTerm]);

  const handleResetView = () => {
      if(!svgRef.current || !zoomBehaviorRef.current) return;
      const svg = d3.select(svgRef.current);
      const nodes = svg.selectAll(".node-group").data() as Node[];
      
      if (nodes.length === 0) return;

      // Calculate Bounding Box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(n => {
          if (n.x !== undefined && n.y !== undefined) {
              if (n.x < minX) minX = n.x;
              if (n.x > maxX) maxX = n.x;
              if (n.y < minY) minY = n.y;
              if (n.y > maxY) maxY = n.y;
          }
      });

      // Add padding (node width/height approx 160x70)
      const padding = 100;
      minX -= padding; maxX += padding;
      minY -= padding; maxY += padding;

      const boundsWidth = maxX - minX;
      const boundsHeight = maxY - minY;
      
      const width = containerRef.current?.clientWidth || window.innerWidth;
      const height = containerRef.current?.clientHeight || window.innerHeight;

      const scale = Math.min(width / boundsWidth, height / boundsHeight) * 0.9; // 0.9 for safety margin
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const transform = d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(scale)
          .translate(-centerX, -centerY);

      svg.transition().duration(1000).call(zoomBehaviorRef.current.transform, transform);
  };

  const handleExportImage = () => {
      if (!svgRef.current) return;
      const svg = svgRef.current;
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svg);
      const canvas = document.createElement('canvas');
      canvas.width = svg.clientWidth;
      canvas.height = svg.clientHeight;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
      img.onload = () => {
          ctx?.drawImage(img, 0, 0);
          const a = document.createElement('a');
          a.download = 'connections_map.png';
          a.href = canvas.toDataURL();
          a.click();
      };
  };


  return (
    <div className="fixed inset-0 bg-slate-900/95 z-[100] flex flex-col backdrop-blur-sm animate-in fade-in">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center p-4 bg-white/10 border-b border-white/10 text-white gap-4">
            <h2 className="text-lg font-black flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                نقشه ارتباطات خاندان‌ها
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-normal">{tabs.length} خاندان، {connectionCount} ارتباط</span>
            </h2>
            
            <div className="flex flex-wrap items-center gap-3">
                 {/* Search Box */}
                 <div className="relative">
                    <input 
                        type="text" 
                        placeholder="جستجوی خاندان..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-black/30 border border-white/20 rounded-xl px-3 py-1.5 text-sm text-white placeholder-white/50 outline-none focus:border-amber-500 w-48"
                    />
                    <svg className="w-4 h-4 text-white/50 absolute left-2 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                 </div>

                 <button onClick={handleResetView} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors">
                    بازنشانی دید
                 </button>

                 <button onClick={handleExportImage} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    تصویر
                 </button>

                 {selectedNodeIds.size === 1 && (
                     <button 
                        onClick={() => {
                            onSelectTab(Array.from(selectedNodeIds)[0]);
                            onClose();
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 animate-pulse"
                     >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                         مشاهده و ورود به این خاندان
                     </button>
                 )}

                 {selectedNodeIds.size > 1 && (
                     <button 
                        onClick={() => onCreateMergedTab(Array.from(selectedNodeIds))}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 animate-pulse"
                     >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                         ایجاد تب تلفیقی ({selectedNodeIds.size})
                     </button>
                 )}
                 <button onClick={onClose} className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
            </div>
        </div>
        
        {/* Main Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]" ref={containerRef}>
             <div className="absolute top-4 right-4 bg-black/60 text-white p-3 rounded-xl text-xs backdrop-blur-md max-w-xs z-10 pointer-events-none select-none">
                 <p className="font-bold mb-1 border-b border-white/20 pb-1">راهنما:</p>
                 <ul className="list-disc list-inside space-y-1 opacity-90">
                     <li>با اسکرول موس زوم کنید.</li>
                     <li>با درگ کردن صفحه را جابجا کنید.</li>
                     <li>روی باکس‌ها کلیک کنید تا انتخاب شوند.</li>
                     <li>دو بار کلیک روی صفحه زوم را ریست نمیکند.</li>
                 </ul>
             </div>
             
             {/* Zoom Controls */}
             <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
                 <button onClick={() => { if(svgRef.current && zoomBehaviorRef.current) { const svg = d3.select(svgRef.current); svg.transition().call(zoomBehaviorRef.current.scaleBy, 1.2); } }} className="bg-white text-slate-700 p-2 rounded-lg shadow-lg hover:bg-slate-100 font-bold">+</button>
                 <button onClick={() => { if(svgRef.current && zoomBehaviorRef.current) { const svg = d3.select(svgRef.current); svg.transition().call(zoomBehaviorRef.current.scaleBy, 0.8); } }} className="bg-white text-slate-700 p-2 rounded-lg shadow-lg hover:bg-slate-100 font-bold">-</button>
             </div>

             <svg ref={svgRef} className="w-full h-full touch-action-none"></svg>
        </div>
    </div>
  );
};

export default TabRelationshipMap;
