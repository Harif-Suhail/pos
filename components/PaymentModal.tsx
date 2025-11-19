import React, { useState, useMemo, useEffect } from 'react';
import { Order, Payment } from '../types';
import { useCurrency } from '../hooks/useCurrency';
import { useAppContext } from '../hooks/useAppContext';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    onConfirmPayment: (payments: Payment[]) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, order, onConfirmPayment }) => {
    const { addToast } = useAppContext();
    const { formatCurrency } = useCurrency();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');
    const [currentPaymentMethod, setCurrentPaymentMethod] = useState<Payment['method']>('Cash');

    const totalPaid = useMemo(() => payments.reduce((acc, p) => acc + p.amount, 0), [payments]);
    const totalDue = order ? order.totalAmount : 0;
    const remainingBalance = totalDue - totalPaid;

    useEffect(() => {
        // Reset state when modal is opened for a new order
        if (isOpen) {
            setPayments([]);
            setCurrentPaymentAmount('');
        }
    }, [isOpen, order]);

    const getPaymentAmountError = (amountStr: string, balance: number, isInputEmpty: boolean): string | null => {
        if (isInputEmpty) return null; // No error if input is empty, as it defaults to full balance
        if (!amountStr) return "Please enter an amount."; // Error if not empty but falsy (shouldn't happen)
        
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
            return "Please enter a positive amount.";
        }
        if (amount > balance + 0.001) { // Allow for floating point inaccuracies
            return "Payment cannot exceed remaining balance.";
        }
        return null;
    };


    const handleAddPayment = () => {
        const isInputEmpty = currentPaymentAmount.trim() === '';
        const amountStr = isInputEmpty ? remainingBalance.toFixed(2) : currentPaymentAmount;
        
        // We pass `isInputEmpty` to the validation function
        const validationError = getPaymentAmountError(amountStr, remainingBalance, isInputEmpty);
        if (validationError) {
            addToast(validationError, 'error');
            return;
        }
        
        const amount = parseFloat(amountStr);
        if (amount <= 0) {
             addToast("Cannot add a zero or negative payment.", 'error');
             return;
        }

        const newPayment: Payment = {
            method: currentPaymentMethod,
            amount,
            timestamp: Date.now()
        };
        setPayments(prev => [...prev, newPayment]);
        setCurrentPaymentAmount('');
    };
    
    const handleConfirm = () => {
        if (remainingBalance > 0.001) {
            // If there's a remaining balance but no payments have been added,
            // and the input is empty, automatically add a payment for the full amount.
            if (payments.length === 0 && currentPaymentAmount.trim() === '') {
                onConfirmPayment([{ method: 'Cash', amount: totalDue, timestamp: Date.now() }]);
                setPayments([]);
                return;
            }
            addToast("The full amount has not been paid yet.", 'error');
            return;
        }
        onConfirmPayment(payments);
        setPayments([]);
    }

    const handleClose = () => {
        setPayments([]);
        onClose();
    };

    if (!isOpen || !order) return null;

    const amountError = getPaymentAmountError(currentPaymentAmount, remainingBalance, currentPaymentAmount.trim() === '');
    const isAddButtonDisabled = !!amountError;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" aria-modal="true" role="dialog" onClick={handleClose}>
            <div className="bg-[var(--background-secondary)] rounded-lg shadow-xl p-6 w-full max-w-md m-4 text-[var(--text-primary)]" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-center mb-4">Payment</h2>
                
                <div className="bg-[var(--background-primary)] p-4 rounded-lg mb-6 space-y-2">
                    <div className="flex justify-between text-lg text-[var(--text-tertiary)]">
                        <span>Total Due:</span>
                        <span>{formatCurrency(totalDue)}</span>
                    </div>
                    {order.discount.amount > 0 && (
                        <div className="flex justify-between text-sm text-[var(--text-tertiary)] border-t border-[var(--border-color)] pt-2">
                            <span>Discount Applied:</span>
                            <span className="text-[var(--warning)]">- {formatCurrency(order.discount.amount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-2xl font-bold text-[var(--accent-primary)]">
                        <span>Remaining:</span>
                        <span>{formatCurrency(remainingBalance)}</span>
                    </div>
                </div>

                {payments.length > 0 && (
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Payments Applied:</h3>
                        <div className="space-y-1">
                            {payments.map((p, i) => (
                                <div key={i} className="flex justify-between bg-[var(--background-tertiary)] p-2 rounded-md text-sm">
                                    <span>{p.method}</span>
                                    <span>{formatCurrency(p.amount)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {remainingBalance > 0.001 && (
                    <div className="border-t border-[var(--border-color)] pt-4">
                        <div className="grid grid-cols-2 gap-4">
                             <input
                                type="number"
                                value={currentPaymentAmount}
                                onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                                placeholder={`Pay full: ${formatCurrency(remainingBalance)}`}
                                className={`bg-[var(--background-tertiary)] border text-[var(--text-primary)] text-sm rounded-lg focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] block w-full p-2.5 ${amountError ? 'border-red-500' : 'border-[var(--border-color)]'}`}
                            />
                            <select
                                value={currentPaymentMethod}
                                onChange={(e) => setCurrentPaymentMethod(e.target.value as Payment['method'])}
                                className="bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-lg focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] block w-full p-2.5"
                            >
                                <option>Cash</option>
                                <option>Card</option>
                                <option>UPI</option>
                                <option>Other</option>
                            </select>
                        </div>
                        {amountError && <p className="text-xs text-red-500 mt-1">{amountError}</p>}
                        <button onClick={handleAddPayment} disabled={isAddButtonDisabled} className="w-full mt-3 bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover)] disabled:bg-[var(--disabled)] disabled:cursor-not-allowed text-[var(--accent-primary-text)] font-bold py-2.5 rounded-lg transition-colors duration-200">
                            Add Payment
                        </button>
                    </div>
                )}
                 
                <div className="mt-6 grid grid-cols-2 gap-3">
                    <button onClick={handleClose} className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold py-3 rounded-lg transition-colors duration-200">
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={remainingBalance > 0.001 && payments.length === 0 && currentPaymentAmount.trim() !== ''}
                        className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:bg-[var(--disabled)] disabled:cursor-not-allowed text-[var(--accent-primary-text)] font-bold py-3 rounded-lg transition-colors duration-200"
                    >
                        Confirm & Close Bill
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;