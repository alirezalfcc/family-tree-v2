
import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import { Person } from '../types';

interface NodeOffsets {
    [id: string]: { x: number; y: number; elbow?: number; entryX?: number };
}

interface UseTreeDragAndSelectParams {
    isDragMode: boolean;
    viewMode: string;
    isAuthenticated: boolean;
    setIsDragMode: (val: boolean) => void;
    customOffsets: NodeOffsets;
    setCustomOffsets: React.Dispatch<React.SetStateAction<NodeOffsets>>;
    setConfigNodeId: (id: string | null) => void;
    onSaveLayout?: (layout: NodeOffsets) => void;
    treeLayout: d3.HierarchyPointNode<Person>;
    transformWrapperRef: React.MutableRefObject<any>;
}

export const useTreeDragAndSelect = ({
    isDragMode,
    viewMode,
    isAuthenticated,
    setIsDragMode,
    customOffsets,
    setCustomOffsets,
    setConfigNodeId,
    onSaveLayout,
    treeLayout,
    transformWrapperRef
}: UseTreeDragAndSelectParams) => {
    
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const [multiSelectedIds, setMultiSelectedIds] = useState<Set<string>>(new Set());

    // Refs for drag state
    const customOffsetsRef = useRef<NodeOffsets>(customOffsets);
    const dragState = useRef<{
        startX: number;
        startY: number;
        initialOffsets: NodeOffsets;
        draggedIds: string[];
    } | null>(null);

    useEffect(() => {
        customOffsetsRef.current = customOffsets;
    }, [customOffsets]);

    const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
        if (!isDragMode || viewMode !== 'vertical_tree') {
            setConfigNodeId(nodeId);
            return;
        }
        
        if (!isAuthenticated) {
            alert("برای تغییر چیدمان باید وارد حساب مدیریت شوید.");
            setIsDragMode(false);
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();

        const isMultiSelectModifier = e.ctrlKey || e.shiftKey;
        let newSelectedIds = new Set<string>(multiSelectedIds);

        if (isMultiSelectModifier) {
            if (newSelectedIds.has(nodeId)) {
                newSelectedIds.delete(nodeId);
            } else {
                newSelectedIds.add(nodeId);
            }
            setMultiSelectedIds(newSelectedIds);
            setConfigNodeId(null);
        } else {
            if (!newSelectedIds.has(nodeId)) {
                newSelectedIds.clear();
                newSelectedIds.add(nodeId);
                setMultiSelectedIds(newSelectedIds);
                setConfigNodeId(nodeId);
            } else {
                setConfigNodeId(nodeId);
            }
        }

        startDragLogic(e.clientX, e.clientY, nodeId, newSelectedIds);
    };

    // Mobile Touch Start
    const handleTouchStart = (e: React.TouchEvent, nodeId: string) => {
        if (!isDragMode || viewMode !== 'vertical_tree') {
            setConfigNodeId(nodeId);
            return;
        }
        if (!isAuthenticated) return;

        // Prevent zooming/panning while dragging a node
        e.stopPropagation(); 
        
        const touch = e.touches[0];
        setConfigNodeId(nodeId);
        
        // Mobile usually doesn't have multi-select via shift/ctrl, so straightforward logic
        const newSelectedIds = new Set<string>();
        newSelectedIds.add(nodeId);
        setMultiSelectedIds(newSelectedIds);

        startDragLogic(touch.clientX, touch.clientY, nodeId, newSelectedIds);
    };

    const startDragLogic = (startX: number, startY: number, nodeId: string, selectedIds: Set<string>) => {
        const allTreeNodes = treeLayout.descendants() as d3.HierarchyPointNode<Person>[];
        const nodeMap = new Map<string, d3.HierarchyPointNode<Person>>();
        allTreeNodes.forEach(n => nodeMap.set(n.data.id, n));
        
        const affectedIds = new Set<string>();

        selectedIds.forEach((selectedId: string) => {
            const node = nodeMap.get(selectedId);
            if (node) {
                affectedIds.add(node.data.id);
                node.descendants().forEach(d => {
                    const p = d.data as Person;
                    affectedIds.add(p.id);
                });
            }
        });

        const draggedIds: string[] = Array.from(affectedIds);
        if (draggedIds.length === 0) return;

        const initialOffsets: NodeOffsets = {};
        draggedIds.forEach(id => {
            const existing = customOffsetsRef.current[id] || { x: 0, y: 0 };
            initialOffsets[id] = { ...existing };
        });

        dragState.current = {
            startX: startX,
            startY: startY,
            initialOffsets: initialOffsets,
            draggedIds: draggedIds
        };

        setDraggingNodeId(nodeId);
    }

    const calculateNewOffsets = (clientX: number, clientY: number) => {
        if (!dragState.current) return null;
        const { startX, startY, initialOffsets, draggedIds } = dragState.current;
        
        let scale = 1;
        if (transformWrapperRef.current) {
            const { state } = transformWrapperRef.current;
            if (state && state.scale) scale = state.scale;
        }

        const totalDx = (clientX - startX) / scale;
        const totalDy = (clientY - startY) / scale;

        const nextOffsets = { ...customOffsetsRef.current };

        draggedIds.forEach(id => {
            const init = initialOffsets[id];
            if (init) {
              nextOffsets[id] = {
                  ...init, 
                  x: init.x + totalDx,
                  y: init.y + totalDy,
              };
            }
        });
        return nextOffsets;
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragState.current) return;
        e.preventDefault();
        const nextOffsets = calculateNewOffsets(e.clientX, e.clientY);
        if (nextOffsets) setCustomOffsets(nextOffsets);
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!dragState.current) return;
        // Important: prevent scrolling while dragging
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        const nextOffsets = calculateNewOffsets(touch.clientX, touch.clientY);
        if (nextOffsets) setCustomOffsets(nextOffsets);
    }, []);

    const handleEndDrag = useCallback(() => {
        if (dragState.current) {
            dragState.current = null;
            setDraggingNodeId(null);
            if (onSaveLayout) {
                onSaveLayout(customOffsetsRef.current);
            }
        }
    }, [onSaveLayout]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleEndDrag);
        // Add passive: false to allow preventing default scroll behavior
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleEndDrag);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleEndDrag);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleEndDrag);
        };
    }, [handleMouseMove, handleTouchMove, handleEndDrag]);

    return {
        handleMouseDown,
        handleTouchStart,
        draggingNodeId,
        multiSelectedIds,
        setMultiSelectedIds
    };
};
