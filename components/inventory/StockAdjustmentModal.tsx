import React, { useState } from 'react';
import { InventoryItem } from '../../types';
import Modal from '../common/Modal';
import { useAppContext } from '../../hooks/useAppContext';

interface StockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: InventoryItem;
    currentStock: number;
    onSave: (item: InventoryItem, newQuantity: number, reason: string) => void;
}

const REASONS = ['Manual Count Correction', 'Wastage', 'Purchase Received', 'Return', 'Other'];

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ isOpen, onClose, item, currentStock, onSave }) => {
    const { addToast } = useAppContext();
    const [newQuantity, setNewQuantity] = useState<string>(currentStock.toString());
    const [reason, setReason] = useState<string>(REASONS[0]);
    const [customReason, setCustomReason] = useState('');
    const [error, setError] = useState('');

    const handleSave = () => {
        setError('');
        const finalReason = reason === 'Other' ? customReason.trim() : reason;
        const quantity = parseInt(newQuantity, 10);
        
        if (isNaN(quantity) || quantity < 0) {
            setError('Please enter a valid, non-negative quantity.');
            return;
        }
        if (!finalReason) {
            setError('Please provide a reason for the adjustment.');
            return;
        }
        
        onSave(item, quantity, finalReason);
        addToast('Stock adjusted successfully!', 'success');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Adjust Stock for ${item.name}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">Current Stock</label>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{currentStock} {item.unit}</p>
                </div>
                <div>
                    <label htmlFor="newQuantity" className="block text-sm font-medium text-[var(--text-tertiary)]">New Stock Quantity</label>
                    <input
                        type="number"
                        id="newQuantity"
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(e.target.value)}
                        className="mt-1 block w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-md shadow-sm py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm"
                        autoFocus
                    />
                </div>
                <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-[var(--text-tertiary)]">Reason for Adjustment</label>
                    <select
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1 block w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-md shadow-sm py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm"
                    >
                        {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                {reason === 'Other' && (
                     <div>
                        <label htmlFor="customReason" className="block text-sm font-medium text-[var(--text-tertiary)]">Please Specify</label>
                        <input
                            type="text"
                            id="customReason"
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            className="mt-1 block w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-md shadow-sm py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm"
                        />
                    </div>
                )}
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                 <div className="flex justify-end space-x-2 pt-4">
                    <button onClick={onClose} className="bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button onClick={handleSave} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold py-2 px-4 rounded-lg">Save Adjustment</button>
                </div>
            </div>
        </Modal>
    );
};

export default StockAdjustmentModal;
