import React from 'react';
import { OrderItem } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import Spinner from '../common/Spinner';

interface QROrderSummaryProps {
    items: OrderItem[];
    onUpdateQuantity: (uniqueId: string, newQuantity: number) => void;
    onPlaceOrder: () => void;
    isPlacingOrder: boolean;
}

const QROrderSummary: React.FC<QROrderSummaryProps> = ({ items, onUpdateQuantity, onPlaceOrder, isPlacingOrder }) => {
    
    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    // Note: Taxes and service charges are calculated server-side/in the main POS, not shown to customer here for simplicity.

    return (
        <div className="bg-[var(--background-secondary)] rounded-lg shadow-lg h-full flex flex-col p-4 sticky top-24">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 mb-3">Your Order</h2>
            
            {items.length === 0 ? (
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-[var(--text-secondary)]">Your cart is empty.</p>
                </div>
            ) : (
                <div className="flex-grow overflow-y-auto -mr-2 pr-2">
                    {items.map(item => (
                        <div key={item.uniqueId} className="flex items-start justify-between py-3">
                            <div className="flex-grow">
                                <p className="font-semibold text-[var(--text-primary)]">{item.name}</p>
                                {item.variant && <div className="text-xs text-[var(--text-secondary)] pl-2">- {item.variant.name}</div>}
                            </div>
                            <div className="flex items-center space-x-2 shrink-0 ml-2">
                                <button onClick={() => onUpdateQuantity(item.uniqueId, item.quantity - 1)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">&minus;</button>
                                <span className="font-bold text-[var(--text-primary)] w-5 text-center">{item.quantity}</span>
                                <button onClick={() => onUpdateQuantity(item.uniqueId, item.quantity + 1)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">&#43;</button>
                                <p className="w-16 text-right font-semibold text-[var(--text-primary)]">{formatCurrency(item.price * item.quantity)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="border-t border-[var(--border-color)] mt-auto pt-4 space-y-2">
                <div className="flex justify-between font-bold text-xl text-[var(--text-primary)] pt-1">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] text-center">Final total including taxes and service charges will be shown on the bill.</p>
                 <button
                    onClick={onPlaceOrder}
                    disabled={items.length === 0 || isPlacingOrder}
                    className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:bg-[var(--disabled)] disabled:cursor-not-allowed text-[var(--accent-primary-text)] font-bold py-3 rounded-lg transition-colors duration-200 mt-2 flex items-center justify-center"
                >
                    {isPlacingOrder ? <Spinner /> : 'Place Order & Notify Staff'}
                </button>
            </div>
        </div>
    );
};

export default QROrderSummary;