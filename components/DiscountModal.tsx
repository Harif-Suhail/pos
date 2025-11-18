import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Order } from '../types';
import { formatCurrency } from '../utils/helpers';

interface DiscountModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    onApplyDiscount: (amount: number, reason: string) => void;
}

const DiscountModal: React.FC<DiscountModalProps> = ({ isOpen, onClose, order, onApplyDiscount }) => {
    const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('percentage');
    const [discountValue, setDiscountValue] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

    useEffect(() => {
        // Only run this effect when the modal is newly opened
        if (isOpen && !prevIsOpen && order) {
            if (order.discount.amount > 0) {
                setDiscountValue(order.discount.amount.toString());
                setDiscountType('amount');
                setReason(order.discount.reason);
            } else {
                // Reset to default state for a new discount
                setDiscountValue('');
                setReason('');
                setDiscountType('percentage');
            }
            setError('');
        }
        // Update the previous state for the next render
        setPrevIsOpen(isOpen);
    }, [isOpen, prevIsOpen, order]);

    if (!isOpen || !order) {
        return null;
    }

    const maxDiscountAmount = order.subtotal + order.totalTax + order.serviceCharge;

    const calculateDiscountAmount = (): number => {
        const value = parseFloat(discountValue);
        if (isNaN(value) || value <= 0) return 0;

        if (discountType === 'percentage') {
            if (value > 100) return 0;
            return (maxDiscountAmount * value) / 100;
        } else {
            return value;
        }
    };

    const discountAmount = calculateDiscountAmount();
    const finalTotal = maxDiscountAmount - discountAmount;

    const handleApply = () => {
        if (!discountValue || parseFloat(discountValue) <= 0) {
            setError('Please enter a valid discount value');
            return;
        }

        if (discountType === 'percentage' && parseFloat(discountValue) > 100) {
            setError('Discount percentage cannot exceed 100%');
            return;
        }

        if (discountAmount > maxDiscountAmount) {
            setError('Discount amount cannot exceed order total');
            return;
        }

        if (!reason.trim()) {
            setError('Please provide a reason for the discount');
            return;
        }

        onApplyDiscount(discountAmount, reason);
        onClose();
    };

    const handleRemoveDiscount = () => {
        onApplyDiscount(0, '');
        onClose();
    };

    const modalContent = (
        <div 
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70"
            style={{ zIndex: 50 }}
            onClick={onClose}
        >
            <div 
                className="bg-[var(--background-secondary)] rounded-lg shadow-xl p-6 w-full max-w-md m-4 text-[var(--text-primary)]"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-center mb-4">Apply Discount</h2>

                <div className="bg-[var(--background-primary)] p-4 rounded-lg mb-4 space-y-2">
                    <div className="flex justify-between text-[var(--text-tertiary)]">
                        <span>Order Total:</span>
                        <span>{formatCurrency(maxDiscountAmount)}</span>
                    </div>
                    {discountAmount > 0 && (
                        <>
                            <div className="flex justify-between text-[var(--warning)]">
                                <span>Discount:</span>
                                <span>- {formatCurrency(discountAmount)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg text-[var(--accent-primary)] border-t border-[var(--border-color)] pt-2">
                                <span>New Total:</span>
                                <span>{formatCurrency(finalTotal)}</span>
                            </div>
                        </>
                    )}
                </div>

                {order.discount.amount > 0 && (
                    <div className="mb-4 p-3 bg-[var(--info-background)] border border-[var(--info-border)] rounded-lg">
                        <p className="text-sm text-[var(--text-secondary)]">
                            <strong>Current Discount:</strong> {formatCurrency(order.discount.amount)}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">
                            Reason: {order.discount.reason}
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Discount Type
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setDiscountType('percentage')}
                                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                                    discountType === 'percentage'
                                        ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)]'
                                        : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-interactive)]'
                                }`}
                            >
                                Percentage (%)
                            </button>
                            <button
                                type="button"
                                onClick={() => setDiscountType('amount')}
                                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                                    discountType === 'amount'
                                        ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)]'
                                        : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-interactive)]'
                                }`}
                            >
                                Fixed Amount
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            {discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
                        </label>
                        <input
                            key={discountType}
                            type="number"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                            placeholder={discountType === 'percentage' ? 'e.g., 10' : 'e.g., 50.00'}
                            className="bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] block w-full p-2.5"
                            min="0"
                            step={discountType === 'percentage' ? '1' : '0.01'}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Reason <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Birthday discount, Customer loyalty"
                            className="bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] block w-full p-2.5"
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm">{error}</p>
                    )}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold py-3 rounded-lg transition-colors duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold py-3 rounded-lg transition-colors duration-200"
                    >
                        Apply Discount
                    </button>
                </div>

                {order.discount.amount > 0 && (
                    <button
                        type="button"
                        onClick={handleRemoveDiscount}
                        className="w-full mt-3 bg-[var(--negative)] hover:bg-[var(--negative-hover)] text-white font-bold py-2 rounded-lg transition-colors duration-200"
                    >
                        Remove Discount
                    </button>
                )}
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default DiscountModal;
