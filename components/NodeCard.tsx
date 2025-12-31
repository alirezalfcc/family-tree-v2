
import React from 'react';
import { Person, ViewMode } from '../types';
import { SimpleNodeView, OverviewNodeView, RichNodeView } from './NodeCardViews';

interface NodeCardProps {
  person: Person;
  isRoot?: boolean;
  onSelectDetails: (person: Person) => void;
  onActivateNavigation: (person: Person) => void;
  onSelectSpouse: (spouseName: string, spouseId?: string) => void; 
  depth: number;
  isSelectedForNav?: boolean;
  isOverview?: boolean; 
  onExpand?: () => void;
  onSelectByName?: (name: string) => void;
  ancestors?: Person[]; 
  viewMode: ViewMode;
  isDragMode?: boolean; 
  fontSizeScale?: number;
  viewRootId?: string | null; 
  onToggleViewRoot?: (id: string) => void; 
}

const NodeCard: React.FC<NodeCardProps> = ({ 
  person, 
  isRoot, 
  onSelectDetails, 
  onActivateNavigation, 
  onSelectSpouse, 
  depth,
  isSelectedForNav,
  isOverview,
  onExpand,
  onSelectByName,
  ancestors = [],
  viewMode,
  isDragMode = false,
  fontSizeScale = 1,
  viewRootId,
  onToggleViewRoot
}) => {
  const isDeceased = person.status?.includes('مرحوم');
  const isShahid = person.status?.includes('شهید');
  const isSingle = person.status?.includes('مجرد');

  const isSimple = viewMode === 'simple_tree' || viewMode === 'vertical_tree';
  const isViewRoot = viewRootId === person.id;
  const isLinkedFamilyRoot = !!person.originalTabTitle;

  const handleDetailsClick = (e: React.MouseEvent, p: Person = person) => {
      e.stopPropagation();
      if (!isDragMode) onSelectDetails(p);
  };

  const handleNavClick = (e: React.MouseEvent, p: Person) => {
      e.stopPropagation();
      if (!isDragMode) onActivateNavigation(p);
  };

  const handleAnchorClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onToggleViewRoot && !isDragMode) onToggleViewRoot(person.id);
  };

  if (isSimple) {
      return (
          <SimpleNodeView 
              person={person}
              fontSizeScale={fontSizeScale}
              isSelectedForNav={isSelectedForNav}
              isViewRoot={isViewRoot}
              isLinkedFamilyRoot={isLinkedFamilyRoot}
              isDragMode={isDragMode}
              isShahid={isShahid}
              isDeceased={isDeceased}
              onDetails={(e) => handleDetailsClick(e)}
              onAnchor={handleAnchorClick}
          />
      );
  }

  // Styles for Rich/Overview
  const depthStyles = [
    'from-amber-700 to-amber-900 border-amber-500 text-white shadow-amber-900/20',
    'from-slate-700 to-slate-900 border-slate-500 text-white shadow-slate-900/20',
    'from-emerald-600 to-emerald-800 border-emerald-400 text-white shadow-emerald-900/10',
    'from-blue-600 to-blue-800 border-blue-400 text-white shadow-blue-900/10',
    'from-indigo-500 to-indigo-700 border-indigo-300 text-white shadow-indigo-900/10',
    'from-purple-500 to-purple-700 border-purple-300 text-white shadow-purple-900/10',
    'from-white to-slate-100 border-slate-200 text-slate-800 shadow-slate-200',
  ];
  const currentStyle = depthStyles[Math.min(depth, depthStyles.length - 1)];
  const isLight = depth >= 6;

  if (isOverview) {
    return (
        <OverviewNodeView 
            person={person}
            styleClass={currentStyle}
            isRoot={isRoot}
            isSelectedForNav={isSelectedForNav}
            isViewRoot={isViewRoot}
            isLinkedFamilyRoot={isLinkedFamilyRoot}
            isDragMode={isDragMode}
            isShahid={isShahid}
            isDeceased={isDeceased}
            isLight={isLight}
            onExpand={onExpand}
        />
    );
  }

  return (
      <RichNodeView 
          person={person}
          styleClass={currentStyle}
          isRoot={isRoot}
          isSelectedForNav={isSelectedForNav}
          isViewRoot={isViewRoot}
          isLinkedFamilyRoot={isLinkedFamilyRoot}
          isDragMode={isDragMode}
          isShahid={isShahid}
          isDeceased={isDeceased}
          isSingle={isSingle}
          isLight={isLight}
          fontSizeScale={fontSizeScale}
          depth={depth}
          ancestors={ancestors}
          onDetails={(e) => handleDetailsClick(e)}
          onNav={handleNavClick}
          onAnchor={handleAnchorClick}
          onSelectSpouse={(name, id) => { if(!isDragMode) onSelectSpouse(name, id); }}
          onSelectByName={onSelectByName}
      />
  );
};

export default NodeCard;
