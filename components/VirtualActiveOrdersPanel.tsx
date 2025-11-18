import React, { memo, useRef, useEffect, useState } from 'react';
import { Order } from '../types';

interface VirtualActiveOrdersPanelProps {
    orders: Order[];
    selectedOrderId: string | null;
    onSelectOrder: (orderId: string) => void;
    onNewTakeoutOrder: () => void;
    onNewDeliveryOrder: () => void;
    onApproveOrder: (orderId: string) => void;
    threshold?: number;
}

const OrderButton: React.FC<{
    order: Order;
    isSelected: boolean;
    onSelectOrder: (orderId: string) => void;
    onApproveOrder: (orderId: string) => void;
}> = memo(({ order, isSelected, onSelectOrder, onApproveOrder }) => {
    const getOrderName = (order: Order) => {
        if (order.type === 'QR' && order.table) return `QR Table ${order.table}`;
        if (order.type === 'Dine-In' && order.table) return `Table ${order.table}`;
        return `${order.type} #${order.orderNumber}`;
    };

    const isPendingQR = order.type === 'QR' && order.status === 'PENDING_APPROVAL';
    
    const baseClasses = 'w-full text-left p-3 rounded-md transition-colors duration-200';
    const selectedClasses = 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)] shadow';
    const defaultClasses = 'bg-[var(--background-tertiary)] text-[var(--text-tertiary)] hover:bg-[var(--background-interactive)]';
    const pendingClasses = 'bg-yellow-500/20 border border-yellow-500 text-[var(--text-primary)] hover:bg-yellow-500/30';

    let buttonClasses = `${baseClasses} ${defaultClasses}`;
    if (isSelected) {
        buttonClasses = `${baseClasses} ${selectedClasses}`;
    } else if (isPendingQR) {
        buttonClasses = `${baseClasses} ${pendingClasses}`;
    }

    return (
        <div>
            <button
                onClick={() => onSelectOrder(order.id)}
                className={buttonClasses}
                aria-pressed={isSelected}
            >
                <div className="flex justify-between items-center">
                    <span className="font-semibold">{getOrderName(order)}</span>
                    {order.needsSync && (
                        <span className="text-xs bg-[var(--warning)] text-white px-2 py-0.5 rounded-full animate-pulse">Pending</span>
                    )}
                </div>
                <div className="text-xs opacity-80">{order.items.length} items &bull; Status: {order.status}</div>
            </button>
            {isPendingQR && (
                <button
                    onClick={() => onApproveOrder(order.id)}
                    className="w-full mt-1 bg-[var(--positive)] hover:bg-[var(--positive-hover)] text-white text-sm font-bold py-1.5 rounded-md"
                >
                    Approve Order
                </button>
            )}
        </div>
    );
});

OrderButton.displayName = 'OrderButton';

/**
 * Active orders panel with automatic virtualization for many orders
 */
const VirtualActiveOrdersPanel: React.FC<VirtualActiveOrdersPanelProps> = memo(({ 
    orders, 
    selectedOrderId, 
    onSelectOrder, 
    onNewTakeoutOrder, 
    onNewDeliveryOrder, 
    onApproveOrder,
    threshold = 20 
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: threshold });
    const shouldVirtualize = orders.length > threshold;

    useEffect(() => {
        if (!shouldVirtualize || !containerRef.current) return;

        const container = containerRef.current;
        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            const itemHeight = 80; // Approximate height of order button
            const overscan = 3;

            const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
            const visibleCount = Math.ceil(containerHeight / itemHeight);
            const endIndex = Math.min(orders.length, startIndex + visibleCount + overscan * 2);

            setVisibleRange({ start: startIndex, end: endIndex });
        };

        handleScroll();
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [orders.length, shouldVirtualize]);

    const renderOrders = () => {
        if (!shouldVirtualize) {
            return orders.map(order => (
                <OrderButton
                    key={order.id}
                    order={order}
                    isSelected={selectedOrderId === order.id}
                    onSelectOrder={onSelectOrder}
                    onApproveOrder={onApproveOrder}
                />
            ));
        }

        const visibleOrders = orders.slice(visibleRange.start, visibleRange.end);
        const totalHeight = orders.length * 80;

        return (
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div 
                    style={{
                        position: 'absolute',
                        top: visibleRange.start * 80,
                        left: 0,
                        right: 0,
                    }}
                >
                    {visibleOrders.map(order => (
                        <div key={order.id} className="mb-2">
                            <OrderButton
                                order={order}
                                isSelected={selectedOrderId === order.id}
                                onSelectOrder={onSelectOrder}
                                onApproveOrder={onApproveOrder}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <aside className="bg-[var(--background-secondary)] rounded-lg shadow-lg flex flex-col p-4">
            <h2 className="text-xl font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 mb-3">Active Orders</h2>
            <div 
                ref={containerRef}
                className="flex-grow overflow-y-auto space-y-2 -mr-2 pr-2"
            >
                {renderOrders()}
                {orders.length === 0 && <p className="text-[var(--text-secondary)] text-center text-sm pt-4">No active orders.</p>}
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--border-color)] grid grid-cols-2 gap-2">
                <button
                    onClick={onNewTakeoutOrder}
                    className="w-full bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover)] text-[var(--accent-primary-text)] font-bold py-3 rounded-lg transition-colors duration-200"
                >
                    New Takeout
                </button>
                <button
                    onClick={onNewDeliveryOrder}
                    className="w-full bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover)] text-[var(--accent-primary-text)] font-bold py-3 rounded-lg transition-colors duration-200"
                >
                    New Delivery
                </button>
            </div>
        </aside>
    );
});

VirtualActiveOrdersPanel.displayName = 'VirtualActiveOrdersPanel';

export default VirtualActiveOrdersPanel;
