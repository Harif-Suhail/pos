import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { FloorPlanObject, TableShape } from '../../types';
import Spinner from '../common/Spinner';

const FloorPlanSettings: React.FC = () => {
    const { currentOutlet, floorPlan, api, addToast, syncData } = useAppContext();
    const [objects, setObjects] = useState<FloorPlanObject[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false); // New state for edit mode

    const canvasRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
    
    useEffect(() => {
        setObjects(JSON.parse(JSON.stringify(floorPlan))); // Deep copy
    }, [floorPlan]);

    const updateObject = useCallback((id: string, updates: Partial<FloorPlanObject>) => {
        setObjects(prev => prev.map(obj => obj.id === id ? { ...obj, ...updates } : obj));
    }, []);

    const addObject = (type: FloorPlanObject['type'], shape?: TableShape) => {
        const newObject: FloorPlanObject = {
            id: `${type}-${Date.now()}`,
            type,
            x: 50, y: 50,
            width: type === 'table' ? (shape === 'circle' ? 80 : 100) : 200,
            height: type === 'table' ? 80 : (type === 'wall' ? 10 : 100),
            rotation: 0,
            ...(type === 'table' && {
                shape: shape || 'rectangle',
                name: `T${objects.filter(o => o.type === 'table').length + 1}`,
                capacity: 4
            }),
            ...(type !== 'table' && { label: type.charAt(0).toUpperCase() + type.slice(1) })
        };
        setObjects(prev => [...prev, newObject]);
        setSelectedId(newObject.id);
    };

    const deleteObject = (id: string) => {
        setObjects(prev => prev.filter(obj => obj.id !== id));
        setSelectedId(null);
    };

    const handleSave = async () => {
        if (!currentOutlet) return;
        setIsSaving(true);
        try {
            await api.saveFloorPlan(currentOutlet.id, objects);
            await syncData(); // To refresh context everywhere
            addToast('Floor plan saved successfully!', 'success');
            setIsEditMode(false);
            setSelectedId(null);
        } catch (e: any) {
            addToast(`Error saving floor plan: ${e.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCancel = () => {
        setObjects(JSON.parse(JSON.stringify(floorPlan))); // Revert changes
        setIsEditMode(false);
        setSelectedId(null);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
        if (!isEditMode) return;
        setSelectedId(id);
        const target = e.currentTarget as HTMLDivElement;
        const rect = target.getBoundingClientRect();
        draggingRef.current = {
            id,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
        };
        e.stopPropagation();
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!draggingRef.current || !canvasRef.current) return;
        
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - canvasRect.left - draggingRef.current.offsetX;
        const y = e.clientY - canvasRect.top - draggingRef.current.offsetY;

        updateObject(draggingRef.current.id, { x: Math.round(x), y: Math.round(y) });
    }, [updateObject]);

    const handleMouseUp = useCallback(() => {
        draggingRef.current = null;
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    const selectedObject = objects.find(o => o.id === selectedId);

    return (
        <div className="flex flex-col h-[calc(100vh-250px)]">
            {/* Toolbar */}
            <div className="flex-shrink-0 bg-[var(--background-secondary)] p-3 rounded-t-lg shadow-md flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    {isEditMode ? (
                        <>
                            <button onClick={() => addObject('table', 'rectangle')} className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-semibold py-2 px-3 rounded-lg text-sm transition-colors">Add Table (Rect)</button>
                            <button onClick={() => addObject('table', 'circle')} className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-semibold py-2 px-3 rounded-lg text-sm transition-colors">Add Table (Circle)</button>
                            <button onClick={() => addObject('wall')} className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-semibold py-2 px-3 rounded-lg text-sm transition-colors">Add Wall</button>
                            <button onClick={() => addObject('bar')} className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-semibold py-2 px-3 rounded-lg text-sm transition-colors">Add Bar/Station</button>
                        </>
                    ) : (
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">Floor Plan Preview</h2>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {isEditMode ? (
                        <>
                             <button onClick={handleCancel} disabled={isSaving} className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={isSaving} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-[var(--disabled)] flex items-center gap-2">
                                {isSaving ? <Spinner /> : null}
                                {isSaving ? 'Saving...' : 'Save Floor Plan'}
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditMode(true)} className="bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover)] text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Edit Floor Plan
                        </button>
                    )}
                </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-grow flex">
                {/* Canvas */}
                <div className="flex-grow bg-[var(--background-primary)] relative overflow-auto" ref={canvasRef} onClick={() => isEditMode && setSelectedId(null)}>
                     <div className="absolute inset-0" style={{
                         backgroundImage: 'linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(to right, var(--border-color) 1px, transparent 1px)',
                         backgroundSize: '20px 20px',
                     }}></div>
                    {objects.map(obj => (
                        <div 
                            key={obj.id}
                            onMouseDown={(e) => handleMouseDown(e, obj.id)}
                            onClick={(e) => isEditMode && e.stopPropagation()}
                            style={{
                                position: 'absolute',
                                left: obj.x, top: obj.y,
                                width: obj.width, height: obj.height,
                                transform: `rotate(${obj.rotation}deg)`,
                                backgroundColor: obj.type === 'table' ? 'var(--accent-secondary)' : 'var(--background-tertiary)',
                                borderRadius: obj.shape === 'circle' ? '50%' : '4px',
                                border: `2px solid ${isEditMode && selectedId === obj.id ? 'var(--accent-primary)' : 'transparent'}`,
                                cursor: isEditMode ? 'move' : 'default',
                                userSelect: 'none'
                            }}
                            className="flex items-center justify-center text-sm font-semibold text-white transition-colors"
                        >
                            {obj.name || obj.label}
                        </div>
                    ))}
                </div>

                {/* Properties Panel */}
                {isEditMode && (
                    <div className="w-72 flex-shrink-0 bg-[var(--background-secondary)] p-4 overflow-y-auto shadow-lg">
                        <h3 className="text-lg font-bold mb-4">{selectedObject ? `Edit ${selectedObject.type}` : 'Properties'}</h3>
                        {selectedObject ? (
                            <div className="space-y-3">
                                {selectedObject.type === 'table' && (
                                    <>
                                        <PropertyInput label="Name" value={selectedObject.name || ''} onChange={val => updateObject(selectedId!, { name: val })} />
                                        <PropertyInput label="Capacity" type="number" value={selectedObject.capacity || 0} onChange={val => updateObject(selectedId!, { capacity: parseInt(val, 10) || 0 })} />
                                    </>
                                )}
                                {selectedObject.type !== 'table' && (
                                    <PropertyInput label="Label" value={selectedObject.label || ''} onChange={val => updateObject(selectedId!, { label: val })} />
                                )}
                                <hr className="border-[var(--border-color)]" />
                                <PropertyInput label="Width" type="number" value={selectedObject.width} onChange={val => updateObject(selectedId!, { width: parseInt(val, 10) || 0 })} />
                                <PropertyInput label="Height" type="number" value={selectedObject.height} onChange={val => updateObject(selectedId!, { height: parseInt(val, 10) || 0 })} />
                                <PropertyInput label="Rotation" type="number" value={selectedObject.rotation} onChange={val => updateObject(selectedId!, { rotation: parseInt(val, 10) || 0 })} />
                                <button onClick={() => deleteObject(selectedId!)} className="w-full bg-[var(--negative)] hover:bg-[var(--negative-hover)] text-white font-bold py-2 px-4 rounded-lg transition-colors mt-4">Delete Object</button>
                            </div>
                        ) : (
                            <p className="text-sm text-[var(--text-secondary)]">Select an object to edit its properties.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const PropertyInput: React.FC<{ label: string, value: string | number, type?: string, onChange: (value: string) => void }> = ({ label, value, type = "text", onChange }) => (
    <div>
        <label className="text-xs font-medium text-[var(--text-secondary)]">{label}</label>
        <input 
            type={type} value={value} 
            onChange={e => onChange(e.target.value)}
            className="w-full bg-[var(--background-tertiary)] rounded p-1.5 mt-1 text-sm border border-transparent focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
        />
    </div>
);

export default FloorPlanSettings;