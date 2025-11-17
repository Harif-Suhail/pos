import React from 'react';
import { Order, Tenant, Outlet } from '../types';
import { formatCurrency, formatTimestamp } from '../utils/helpers';
import PrintableReceipt from './PrintableReceipt';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    tenant: Tenant | null;
    outlet: Outlet | null;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, order, tenant, outlet }) => {
    if (!isOpen || !order || !tenant || !outlet) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" aria-modal="true" role="dialog">
                <div className="bg-[var(--background-secondary)] rounded-lg shadow-xl p-6 w-full max-w-sm m-4 text-[var(--text-primary)]" onClick={e => e.stopPropagation()}>
                    <div className="text-center">
                        <svg className="w-16 h-16 mx-auto text-[var(--positive)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h2 className="text-2xl font-bold mt-4">Payment Successful</h2>
                        <p className="text-[var(--text-secondary)]">Order #{order.orderNumber} Closed</p>
                    </div>
                    <div className="bg-[var(--background-primary)] my-6 p-4 rounded-lg space-y-2 max-h-60 overflow-y-auto">
                        {order.items.map(item => (
                            <div key={item.uniqueId} className="flex justify-between text-sm">
                                <span className="text-[var(--text-tertiary)]">{item.quantity} x {item.name} {item.variant ? `(${item.variant.name})` : ''}</span>
                                <span className="text-[var(--text-primary)]">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-[var(--border-color)] pt-4 space-y-2">
                        <div className="flex justify-between text-[var(--text-tertiary)]">
                            <span>Subtotal</span>
                            <span>{formatCurrency(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-[var(--text-tertiary)]">
                            <span>Taxes</span>
                            <span>{formatCurrency(order.totalTax)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-xl text-[var(--text-primary)]">
                            <span>Total Paid</span>
                            <span>{formatCurrency(order.totalAmount)}</span>
                        </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <button 
                            onClick={handlePrint} 
                            className="w-full bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold py-3 rounded-lg transition-colors duration-200"
                        >
                            Print Receipt
                        </button>
                        <button 
                            onClick={onClose} 
                            className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold py-3 rounded-lg transition-colors duration-200"
                        >
                            Next Order
                        </button>
                    </div>
                </div>
            </div>
            {/* Hidden printable component */}
            <div className="hidden">
                 <PrintableReceipt order={order} tenant={tenant} outlet={outlet} />
            </div>
        </>
    );
};

export default ReceiptModal;