import React from 'react';
import { FloorPlanObject, Order } from '../types';

interface FloorPlanDisplayProps {
    floorPlan: FloorPlanObject[];
    activeOrders: Order[];
    onSelectTable: (tableName: string) => void;
}

type TableStatus = 'available' | 'occupied';

const getStatus = (tableName: string, activeOrders: Order[]): TableStatus => {
    const isOccupied = activeOrders.some(order => 
        order.type === 'Dine-In' && 
        order.table === tableName && 
        order.status === 'OPEN' &&
        order.items.length > 0 // Only mark as occupied if there are items in the order
    );
    return isOccupied ? 'occupied' : 'available';
};

const getObjectStyles = (obj: FloorPlanObject) => {
    const baseStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${obj.x}px`,
        top: `${obj.y}px`,
        width: `${obj.width}px`,
        height: `${obj.height}px`,
        transform: `rotate(${obj.rotation || 0}deg)`,
        transformOrigin: 'center center',
    };

    switch(obj.type) {
        case 'wall':
            return { ...baseStyle, backgroundColor: 'var(--text-tertiary)' };
        case 'bar':
        case 'station':
            return { ...baseStyle, backgroundColor: 'var(--background-tertiary)', border: '2px dashed var(--border-color)' };
        case 'door':
            return { ...baseStyle, backgroundColor: 'var(--background-interactive)' };
        default:
            return baseStyle;
    }
};

const getStatusClasses = (status: TableStatus) => {
    switch (status) {
        case 'available':
            return 'bg-[var(--status-available)] hover:opacity-90 border-green-400';
        case 'occupied':
            return 'bg-[var(--status-occupied)] hover:opacity-90 border-red-400';
        default:
            return 'bg-[var(--disabled)] border-gray-500';
    }
};

const FloorPlanDisplay: React.FC<FloorPlanDisplayProps> = ({ floorPlan, activeOrders, onSelectTable }) => {
    return (
        <div className="flex-grow bg-[var(--background-secondary)] rounded-lg p-4 overflow-auto relative shadow-inner">
            <div className="relative w-full h-full min-w-[1000px] min-h-[600px]">
                {floorPlan.map(obj => {
                    if (obj.type === 'table' && obj.name) {
                        const status = getStatus(obj.name, activeOrders);
                        return (
                            <button
                                key={obj.id}
                                style={getObjectStyles(obj)}
                                onClick={() => onSelectTable(obj.name!)}
                                className={`flex flex-col items-center justify-center text-white font-bold text-lg transition-all duration-200 border-2 border-transparent focus:outline-none focus:ring-4 focus:ring-[var(--accent-primary)] focus:ring-opacity-75 ${getStatusClasses(status)} ${obj.shape === 'circle' ? 'rounded-full' : 'rounded-lg'}`}
                                aria-label={`Table ${obj.name}, status: ${status}`}
                            >
                                <span>{obj.name}</span>
                                <span className="text-xs font-normal capitalize mt-1">{status}</span>
                            </button>
                        );
                    }
                    // Render non-table objects
                    return (
                        <div key={obj.id} style={getObjectStyles(obj)} className={`flex items-center justify-center text-xs text-[var(--text-primary)] p-1 ${obj.shape === 'circle' ? 'rounded-full' : 'rounded-sm'}`}>
                            {obj.label || obj.type}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FloorPlanDisplay;