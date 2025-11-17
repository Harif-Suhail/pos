import React, { useState, useEffect } from 'react';
import { DeliveryDetails } from '../../types';
import Modal from './Modal';

type InputType = 'text' | 'number' | 'delivery' | 'readonly';

interface InputDialogProps {
    isOpen?: boolean;
    title: string;
    message: string;
    inputType: InputType;
    initialValue?: string;
    onConfirm: (value: string | DeliveryDetails) => void;
    onClose: () => void;
}

const InputDialog: React.FC<InputDialogProps> = ({
    isOpen = true,
    title,
    message,
    inputType,
    initialValue = '',
    onConfirm,
    onClose,
}) => {
    const [value, setValue] = useState(initialValue);
    const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetails>({
        customerName: '',
        customerPhone: '',
        address: '',
    });

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const handleConfirm = () => {
        if (inputType === 'delivery') {
            if (deliveryDetails.customerName && deliveryDetails.customerPhone && deliveryDetails.address) {
                onConfirm(deliveryDetails);
            }
        } else {
            if (value.trim() || inputType === 'readonly') {
                onConfirm(value);
            }
        }
    };

    const renderInput = () => {
        switch (inputType) {
            case 'delivery':
                return (
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Customer Name"
                            value={deliveryDetails.customerName}
                            onChange={(e) => setDeliveryDetails(prev => ({ ...prev, customerName: e.target.value }))}
                            className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-md p-2"
                            autoFocus
                        />
                         <input
                            type="tel"
                            placeholder="Customer Phone"
                            value={deliveryDetails.customerPhone}
                            onChange={(e) => setDeliveryDetails(prev => ({ ...prev, customerPhone: e.target.value }))}
                            className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-md p-2"
                        />
                         <textarea
                            placeholder="Delivery Address"
                            value={deliveryDetails.address}
                            onChange={(e) => setDeliveryDetails(prev => ({ ...prev, address: e.target.value }))}
                            className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-md p-2 min-h-[80px]"
                        />
                    </div>
                );
            case 'readonly':
                 return (
                    <input
                        type="text"
                        value={value}
                        readOnly
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-2.5"
                    />
                );
            default:
                return (
                    <input
                        type={inputType}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg p-2.5"
                        autoFocus
                    />
                );
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <p className="text-[var(--text-tertiary)]">{message}</p>
                {renderInput()}
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold transition-colors">
                        {inputType === 'readonly' ? 'Close' : 'Confirm'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default InputDialog;
