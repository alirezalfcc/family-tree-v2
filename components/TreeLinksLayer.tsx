
import React from 'react';
import { Person } from '../types';

interface TreeLinksLayerProps {
    links: Array<{source: any, target: any, type: 'parent-child' | 'spouse'}>;
    viewMode: string;
    isSimple: boolean;
    isOverview: boolean;
    configNodeId: string | null;
    customOffsets: Record<string, { elbow?: number, entryX?: number }>;
}

const TreeLinksLayer: React.FC<TreeLinksLayerProps> = ({ 
    links, viewMode, isSimple, isOverview, configNodeId, customOffsets 
}) => {
    return (
        <g>
            {links.map((link, i) => {
                const sX = link.source.x;
                const sY = link.source.y;
                const tX = link.target.x;
                const tY = link.target.y;

                let pathData;
                if (link.type === 'spouse') {
                    return null; 
                } else if (viewMode === 'vertical_tree') {
                    const targetId = link.target.data.id;
                    const elbowRatio = customOffsets[targetId]?.elbow ?? 0.5;
                    const entryX = customOffsets[targetId]?.entryX ?? 0;
                    
                    const midY = sY + (tY - sY) * elbowRatio;
                    const finalTX = tX + entryX; 

                    pathData = `M${sX},${sY} V${midY} H${finalTX} V${tY}`;
                } else if (viewMode === 'simple_tree') {
                    const parentStub = 50;
                    pathData = `M${sX},${sY} V${sY + parentStub} H${tX} V${tY}`;
                } else {
                    pathData = `M${sX},${sY} C${sX},${(sY + tY) / 2} ${tX},${(sY + tY) / 2} ${tX},${tY}`;
                }
                
                const isSelectedLine = configNodeId === link.target.data.id;
                
                return (
                  <path 
                    key={i} 
                    d={pathData} 
                    fill="none" 
                    stroke={isSelectedLine ? "#6366f1" : (isSimple ? "#94a3b8" : (isOverview ? "#cbd5e1" : "#e2e8f0"))} 
                    strokeWidth={isSelectedLine ? "4" : (isSimple ? "2" : (isOverview ? "6" : "4"))} 
                    className={`transition-all duration-300 ${isSelectedLine ? 'z-50' : ''}`}
                    strokeDasharray={(!isSimple && !isOverview) ? "8,8" : "0"} 
                  />
                );
            })}
        </g>
    );
};

export default TreeLinksLayer;
