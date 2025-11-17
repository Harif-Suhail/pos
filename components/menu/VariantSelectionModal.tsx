import React from 'react';
import { MenuItem, Variant } from '../../types';
import Modal from '../common/Modal';
import { formatCurrency } from '../../utils/helpers';

interface VariantSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: MenuItem | null;
    onSelectVariant: (item: MenuItem, variant: Variant) => void;
}

const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({ isOpen, onClose, item, onSelectVariant }) => {
    if (!isOpen || !item || !item.variants) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Select option for ${item.name}`}>
            <div className="space-y-3">
                {item.variants.map(variant => (
                    <button
                        key={variant.id}
                        onClick={() => onSelectVariant(item, variant)}
                        className="w-full flex justify-between items-center p-4 bg-[var(--background-tertiary)] rounded-lg hover:bg-[var(--accent-primary)] hover:text-[var(--accent-primary-text)] transition-colors"
                    >
                        <span className="font-semibold">{variant.name}</span>
                        <span className="font-bold">{formatCurrency(variant.price)}</span>
                    </button>
                ))}
            </div>
        </Modal>
    );
};

export default VariantSelectionModal;