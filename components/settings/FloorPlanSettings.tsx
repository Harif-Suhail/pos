import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { FloorPlanObject, TableShape } from '../../types';
import Spinner from '../common/Spinner';

type InteractionMode = 'drag' | 'resize' | 'rotate' | null;

const FloorPlanSettings: React.FC = () => {
    const { currentOutlet, floorPlan, api, addToast, syncData } = useAppContext();
    const [objects, setObjects] = useState<FloorPlanObject[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingObjectId, setEditingObjectId] = useState<string | null>(null); // For modal editing

    const canvasRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef<{ 
        id: string; 
        offsetX: number; 
        offsetY: number;
        mode: InteractionMode;
        startX?: number;
        startY?: number;
        startWidth?: number;
        startHeight?: number;
        startRotation?: number;
    } | null>(null);
    
    useEffect(() => {
        if (!isEditMode) {
            setObjects(JSON.parse(JSON.stringify(floorPlan))); // Deep copy
        }
    }, [floorPlan, isEditMode]);

    const updateObject = useCallback((id: string, updates: Partial<FloorPlanObject>) => {
        setObjects(prev => {
            const updated = prev.map(obj => obj.id === id ? { ...obj, ...updates } : obj);
            return updated;
        });
    }, []);

    const addObject = (type: FloorPlanObject['type'], shape?: TableShape) => {
        // Add object to center of visible canvas area
        const canvas = canvasRef.current;
        const centerX = canvas ? (canvas.scrollLeft + canvas.clientWidth / 2 - 50) : 200;
        const centerY = canvas ? (canvas.scrollTop + canvas.clientHeight / 2 - 40) : 200;

        const newObject: FloorPlanObject = {
            id: `${type}-${Date.now()}`,
            type,
            x: centerX, 
            y: centerY,
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
        if (window.confirm('Are you sure you want to delete this object?')) {
            setObjects(prev => prev.filter(obj => obj.id !== id));
            setSelectedId(null);
        }
    };

    const duplicateObject = (id: string) => {
        const obj = objects.find(o => o.id === id);
        if (!obj) return;
        
        const newObject = { 
            ...obj, 
            id: `${obj.type}-${Date.now()}`,
            x: obj.x + 20,
            y: obj.y + 20,
            ...(obj.name && { name: obj.name + ' (copy)' })
        };
        setObjects(prev => [...prev, newObject]);
        setSelectedId(newObject.id);
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
        if (window.confirm('Are you sure you want to discard all changes?')) {
            setObjects(JSON.parse(JSON.stringify(floorPlan))); // Revert changes
            setIsEditMode(false);
            setSelectedId(null);
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, id: string, mode: InteractionMode = 'drag') => {
        if (!isEditMode) return;
        
        e.stopPropagation();
        setSelectedId(id);
        
        const obj = objects.find(o => o.id === id);
        if (!obj) return;

        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;
        
        draggingRef.current = {
            id,
            mode,
            offsetX: e.clientX - (canvasRect.left + obj.x - (canvasRef.current?.scrollLeft || 0)),
            offsetY: e.clientY - (canvasRect.top + obj.y - (canvasRef.current?.scrollTop || 0)),
            startX: e.clientX,
            startY: e.clientY,
            startWidth: obj.width,
            startHeight: obj.height,
            startRotation: obj.rotation
        };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!draggingRef.current || !canvasRef.current) return;
        
        const { id, mode, offsetX, offsetY, startX, startY, startWidth, startHeight } = draggingRef.current;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const scrollLeft = canvasRef.current.scrollLeft;
        const scrollTop = canvasRef.current.scrollTop;

        if (mode === 'drag') {
            const x = e.clientX - canvasRect.left - offsetX + scrollLeft;
            const y = e.clientY - canvasRect.top - offsetY + scrollTop;
            
            setObjects(prev => prev.map(obj => 
                obj.id === id ? { ...obj, x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) } : obj
            ));
        } 
        else if (mode === 'resize' && startWidth && startHeight && startX && startY) {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            const newWidth = Math.max(30, startWidth + deltaX);
            const newHeight = Math.max(30, startHeight + deltaY);
            
            setObjects(prev => prev.map(obj => 
                obj.id === id ? { ...obj, width: Math.round(newWidth), height: Math.round(newHeight) } : obj
            ));
        }
        else if (mode === 'rotate' && startX && startY) {
            setObjects(prev => {
                const obj = prev.find(o => o.id === id);
                if (!obj) return prev;
                
                const centerX = canvasRect.left + obj.x + obj.width / 2 - scrollLeft;
                const centerY = canvasRect.top + obj.y + obj.height / 2 - scrollTop;
                
                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                const degrees = (angle * 180 / Math.PI) + 90;
                
                return prev.map(o => 
                    o.id === id ? { ...o, rotation: Math.round(degrees) % 360 } : o
                );
            });
        }
    }, []);

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
            <div className="flex-grow flex overflow-hidden">
                {/* Canvas */}
                <div 
                    className="flex-grow bg-[var(--background-primary)] relative overflow-auto" 
                    ref={canvasRef} 
                    onClick={() => isEditMode && setSelectedId(null)}
                >
                    {/* Canvas Content Area with minimum size */}
                    <div className="relative min-w-[1200px] min-h-[800px]">
                        <div className="absolute inset-0 pointer-events-none" style={{
                            backgroundImage: 'linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(to right, var(--border-color) 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                        }}></div>
                        
                        {/* Info text when in edit mode with no objects */}
                        {isEditMode && objects.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <p className="text-[var(--text-secondary)] text-lg">Click "Add Table" or other buttons above to start designing your floor plan</p>
                            </div>
                        )}

                        {objects.map(obj => {
                            const isSelected = isEditMode && selectedId === obj.id;
                            return (
                                <div 
                                    key={obj.id}
                                    onMouseDown={(e) => {
                                        if (!isEditMode) return;
                                        e.stopPropagation();
                                        handleMouseDown(e, obj.id, 'drag');
                                    }}
                                    onClick={(e) => {
                                        if (!isEditMode) return;
                                        e.stopPropagation();
                                        setSelectedId(obj.id);
                                    }}
                                    onDoubleClick={(e) => {
                                        if (!isEditMode) return;
                                        e.stopPropagation();
                                        if (obj.type === 'table') {
                                            setEditingObjectId(obj.id);
                                        }
                                    }}
                                    style={{
                                        position: 'absolute',
                                        left: obj.x, 
                                        top: obj.y,
                                        width: obj.width, 
                                        height: obj.height,
                                        transform: `rotate(${obj.rotation}deg)`,
                                        backgroundColor: obj.type === 'table' ? 'var(--accent-secondary)' : 'var(--background-tertiary)',
                                        borderRadius: obj.shape === 'circle' ? '50%' : '4px',
                                        border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                        boxShadow: isSelected ? '0 0 0 3px rgba(99, 102, 241, 0.3)' : 'none',
                                        cursor: isEditMode ? 'move' : 'default',
                                        userSelect: 'none',
                                        transition: isSelected ? 'none' : 'box-shadow 0.2s'
                                    }}
                                    className="flex items-center justify-center text-sm font-semibold text-white"
                                >
                                    <span className="pointer-events-none">{obj.name || obj.label}</span>
                                    
                                    {/* Resize handle */}
                                    {isEditMode && isSelected && obj.shape !== 'circle' && (
                                        <div
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                handleMouseDown(e, obj.id, 'resize');
                                            }}
                                            className="absolute bottom-0 right-0 w-5 h-5 bg-[var(--accent-primary)] rounded-tl cursor-se-resize z-10 hover:bg-[var(--accent-primary-hover)]"
                                            style={{ transform: `rotate(-${obj.rotation}deg)` }}
                                            title="Drag to resize"
                                        />
                                    )}
                                    
                                    {/* Rotate handle */}
                                    {isEditMode && isSelected && (
                                        <div
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                handleMouseDown(e, obj.id, 'rotate');
                                            }}
                                            className="absolute -top-8 left-1/2 w-7 h-7 bg-[var(--accent-primary)] rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center text-base z-10 hover:bg-[var(--accent-primary-hover)]"
                                            style={{ transform: `translateX(-50%) rotate(-${obj.rotation}deg)`, marginLeft: '0' }}
                                            title="Drag to rotate"
                                        >
                                            ↻
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Properties Panel */}
                {isEditMode && (
                    <div className="w-80 flex-shrink-0 bg-[var(--background-secondary)] p-4 overflow-y-auto shadow-lg border-l border-[var(--border-color)]">
                        <h3 className="text-lg font-bold mb-4 text-[var(--text-primary)]">
                            {selectedObject ? `Edit ${selectedObject.type === 'table' ? 'Table' : selectedObject.type}` : 'Properties'}
                        </h3>
                        {selectedObject ? (
                            <div className="space-y-4">
                                {/* Basic Properties */}
                                <div className="space-y-3">
                                    {selectedObject.type === 'table' && (
                                        <>
                                            <PropertyInput 
                                                label="Table Name" 
                                                value={selectedObject.name || ''} 
                                                onChange={val => updateObject(selectedId!, { name: val })} 
                                            />
                                            <PropertyInput 
                                                label="Capacity (seats)" 
                                                type="number" 
                                                value={selectedObject.capacity || 0} 
                                                onChange={val => updateObject(selectedId!, { capacity: Math.max(1, parseInt(val, 10) || 1) })} 
                                            />
                                            <div>
                                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Shape</label>
                                                <select
                                                    value={selectedObject.shape || 'rectangle'}
                                                    onChange={(e) => updateObject(selectedId!, { shape: e.target.value as TableShape })}
                                                    className="w-full bg-[var(--background-tertiary)] rounded p-2 text-sm border border-transparent focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] text-[var(--text-primary)]"
                                                >
                                                    <option value="rectangle">Rectangle</option>
                                                    <option value="circle">Circle</option>
                                                </select>
                                            </div>
                                        </>
                                    )}
                                    {selectedObject.type !== 'table' && (
                                        <PropertyInput 
                                            label="Label" 
                                            value={selectedObject.label || ''} 
                                            onChange={val => updateObject(selectedId!, { label: val })} 
                                        />
                                    )}
                                </div>
                                
                                <hr className="border-[var(--border-color)]" />
                                
                                {/* Dimensions & Transform */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">Dimensions & Position</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <PropertyInput 
                                            label="X Position" 
                                            type="number" 
                                            value={selectedObject.x} 
                                            onChange={val => updateObject(selectedId!, { x: parseInt(val, 10) || 0 })} 
                                        />
                                        <PropertyInput 
                                            label="Y Position" 
                                            type="number" 
                                            value={selectedObject.y} 
                                            onChange={val => updateObject(selectedId!, { y: parseInt(val, 10) || 0 })} 
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <PropertyInput 
                                            label="Width (px)" 
                                            type="number" 
                                            value={selectedObject.width} 
                                            onChange={val => updateObject(selectedId!, { width: Math.max(30, parseInt(val, 10) || 30) })} 
                                        />
                                        <PropertyInput 
                                            label="Height (px)" 
                                            type="number" 
                                            value={selectedObject.height} 
                                            onChange={val => updateObject(selectedId!, { height: Math.max(30, parseInt(val, 10) || 30) })} 
                                        />
                                    </div>
                                    <PropertyInput 
                                        label="Rotation (degrees)" 
                                        type="number" 
                                        value={selectedObject.rotation} 
                                        onChange={val => updateObject(selectedId!, { rotation: parseInt(val, 10) || 0 })} 
                                    />
                                </div>

                                <hr className="border-[var(--border-color)]" />
                                
                                {/* Actions */}
                                <div className="space-y-2">
                                    <button 
                                        onClick={() => duplicateObject(selectedId!)} 
                                        className="w-full bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover)] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                                    >
                                        Duplicate
                                    </button>
                                    <button 
                                        onClick={() => deleteObject(selectedId!)} 
                                        className="w-full bg-[var(--negative)] hover:bg-[var(--negative-hover)] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>

                                {/* Tips */}
                                <div className="mt-4 p-3 bg-[var(--background-tertiary)] rounded-lg text-xs text-[var(--text-secondary)]">
                                    <p className="font-semibold mb-1">💡 Tips:</p>
                                    <ul className="space-y-1 list-disc list-inside">
                                        <li>Drag to move objects</li>
                                        <li>Use corner handle to resize</li>
                                        <li>Use top handle to rotate</li>
                                        <li>Double-click table for quick edit</li>
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-3">👆</div>
                                <p className="text-sm text-[var(--text-secondary)]">Select an object on the canvas to edit its properties</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Table Modal */}
            {editingObjectId && (
                <EditTableModal
                    object={objects.find(o => o.id === editingObjectId)!}
                    onClose={() => setEditingObjectId(null)}
                    onSave={(updates) => {
                        updateObject(editingObjectId, updates);
                        setEditingObjectId(null);
                    }}
                />
            )}
        </div>
    );
};

const PropertyInput: React.FC<{ label: string, value: string | number, type?: string, onChange: (value: string) => void }> = ({ label, value, type = "text", onChange }) => (
    <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>
        <input 
            type={type} 
            value={value} 
            onChange={e => onChange(e.target.value)}
            className="w-full bg-[var(--background-tertiary)] rounded p-2 text-sm border border-transparent focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] text-[var(--text-primary)]"
        />
    </div>
);

// Edit Table Modal Component
const EditTableModal: React.FC<{
    object: FloorPlanObject;
    onClose: () => void;
    onSave: (updates: Partial<FloorPlanObject>) => void;
}> = ({ object, onClose, onSave }) => {
    const [name, setName] = useState(object.name || '');
    const [capacity, setCapacity] = useState(object.capacity || 4);

    const handleSave = () => {
        onSave({ name, capacity });
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" 
            onClick={onClose}
        >
            <div 
                className="bg-[var(--background-secondary)] rounded-lg shadow-xl p-6 w-full max-w-md m-4"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Edit Table</h2>
                
                <div className="space-y-4 mb-6">
                    <PropertyInput 
                        label="Table Name" 
                        value={name} 
                        onChange={setName} 
                    />
                    <PropertyInput 
                        label="Capacity (seats)" 
                        type="number" 
                        value={capacity} 
                        onChange={val => setCapacity(Math.max(1, parseInt(val, 10) || 1))} 
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold py-3 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-3 rounded-lg transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FloorPlanSettings;