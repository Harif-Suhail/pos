import React from 'react';
import { Order } from '../types';
import { useCurrency } from '../hooks/useCurrency';

interface ParkedOrdersPanelProps {
    parkedOrders: Order[];
    onRetrieveOrder: (orderId: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

const ParkedOrdersPanel: React.FC<ParkedOrdersPanelProps> = ({
    parkedOrders,
    onRetrieveOrder,
    isOpen,
    onClose
}) => {
    const { formatCurrency } = useCurrency();
    
    if (!isOpen) return null;

    const getParkedDuration = (parkedAt?: string) => {
        if (!parkedAt) return '';
        const minutes = Math.floor((Date.now() - new Date(parkedAt).getTime()) / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m ago`;
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--background-secondary)] rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-[var(--border-color)]">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Parked Orders</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            {parkedOrders.length} order{parkedOrders.length !== 1 ? 's' : ''} on hold
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {parkedOrders.length === 0 ? (
                        <div className="text-center py-12">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-[var(--text-tertiary)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-[var(--text-secondary)]">No parked orders</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {parkedOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="bg-[var(--background-primary)] border border-[var(--border-color)] rounded-lg p-4 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-[var(--text-primary)] text-lg">
                                                #{order.orderNumber}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {order.table && (
                                                    <span className="text-sm text-[var(--text-secondary)]">
                                                        Table {order.table}
                                                    </span>
                                                )}
                                                {order.type && (
                                                    <span className="px-2 py-0.5 bg-[var(--background-tertiary)] text-[var(--text-tertiary)] text-xs rounded-full">
                                                        {order.type}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs text-[var(--text-tertiary)] bg-orange-500/20 px-2 py-1 rounded">
                                            {getParkedDuration(order.parkedAt)}
                                        </span>
                                    </div>

                                    <div className="space-y-1 mb-3">
                                        {order.items.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-[var(--text-secondary)] truncate flex-1">
                                                    {item.quantity}x {item.itemName}
                                                    {item.variantName && <span className="text-[var(--text-tertiary)]"> ({item.variantName})</span>}
                                                </span>
                                                <span className="text-[var(--text-tertiary)] ml-2">
                                                    {formatCurrency(item.price * item.quantity)}
                                                </span>
                                            </div>
                                        ))}
                                        {order.items.length > 3 && (
                                            <p className="text-xs text-[var(--text-tertiary)] italic">
                                                +{order.items.length - 3} more items
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center pt-3 border-t border-[var(--border-color)]">
                                        <span className="font-bold text-[var(--text-primary)]">
                                            {formatCurrency(order.totalAmount)}
                                        </span>
                                        <button
                                            onClick={() => onRetrieveOrder(order.id)}
                                            className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                                        >
                                            Retrieve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParkedOrdersPanel;
