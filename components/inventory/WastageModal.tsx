import React, { useState } from 'react';
import { InventoryItem } from '../../types';
import Modal from '../common/Modal';
import { useAppContext } from '../../hooks/useAppContext';

interface WastageModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: InventoryItem;
    outletId: string;
    currentStock: number;
    onSave: (quantity: number, reason: string) => Promise<void>;
}

const WASTAGE_REASONS = [
    'Expired/Spoiled',
    'Damaged Goods',
    'Over-preparation',
    'Kitchen Accident',
    'Quality Control',
    'Customer Return',
    'Other'
];

const WastageModal: React.FC<WastageModalProps> = ({ isOpen, onClose, item, outletId, currentStock, onSave }) => {
    const { addToast } = useAppContext();
    const [quantity, setQuantity] = useState<string>('');
    const [reason, setReason] = useState<string>(WASTAGE_REASONS[0]);
    const [customReason, setCustomReason] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setError('');
        const finalReason = reason === 'Other' ? customReason.trim() : reason;
        const qty = parseFloat(quantity);
        
        if (isNaN(qty) || qty <= 0) {
            setError('Please enter a valid positive quantity');
            return;
        }

        if (qty > currentStock) {
            setError(`Quantity cannot exceed current stock (${currentStock} ${item.unit})`);
            return;
        }

        if (!finalReason) {
            setError('Please provide a reason for the wastage');
            return;
        }

        setIsSaving(true);
        try {
            await onSave(qty, finalReason);
            addToast('Wastage recorded successfully', 'success');
            onClose();
            setQuantity('');
            setCustomReason('');
            setReason(WASTAGE_REASONS[0]);
        } catch (err: any) {
            setError(err.message || 'Failed to record wastage');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Record Wastage">
            <div className="space-y-4">
                {/* Item Info */}
                <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-color)]">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{item.name}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Current Stock: <span className="font-bold text-[var(--text-primary)]">{currentStock} {item.unit}</span>
                    </p>
                </div>

                {/* Quantity */}
                <div>
                    <label htmlFor="wastageQuantity" className="block text-sm font-medium text-[var(--text-tertiary)] mb-1">
                        Wastage Quantity <span className="text-[var(--negative)]">*</span>
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            id="wastageQuantity"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            step="0.01"
                            min="0"
                            max={currentStock}
                            className="flex-1 bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-md shadow-sm py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                            placeholder="Enter quantity"
                            autoFocus
                        />
                        <span className="flex items-center px-3 bg-[var(--background-interactive)] border border-[var(--border-color)] rounded-md text-[var(--text-secondary)]">
                            {item.unit}
                        </span>
                    </div>
                </div>

                {/* Reason */}
                <div>
                    <label htmlFor="wastageReason" className="block text-sm font-medium text-[var(--text-tertiary)] mb-1">
                        Reason <span className="text-[var(--negative)]">*</span>
                    </label>
                    <select
                        id="wastageReason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-md shadow-sm py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                    >
                        {WASTAGE_REASONS.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>

                {/* Custom Reason */}
                {reason === 'Other' && (
                    <div>
                        <label htmlFor="customReason" className="block text-sm font-medium text-[var(--text-tertiary)] mb-1">
                            Please Specify <span className="text-[var(--negative)]">*</span>
                        </label>
                        <input
                            type="text"
                            id="customReason"
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-md shadow-sm py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                            placeholder="Enter reason for wastage"
                        />
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-900/20 border border-[var(--negative)] rounded-md p-3">
                        <p className="text-sm text-[var(--negative)]">{error}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-color)]">
                    <button
                        onClick={onClose}
                        className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold py-2 px-6 rounded-lg"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-[var(--negative)] hover:opacity-80 text-white font-bold py-2 px-6 rounded-lg disabled:bg-[var(--disabled)] flex items-center"
                    >
                        {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                        {isSaving ? 'Recording...' : 'Record Wastage'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default WastageModal;
