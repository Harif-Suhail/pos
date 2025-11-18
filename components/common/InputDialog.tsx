import React, { useState, useEffect } from 'react';
import { DeliveryDetails, Customer } from '../../types';
import { useAppContext } from '../../hooks/useAppContext';
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
    const { api } = useAppContext();
    const [value, setValue] = useState(initialValue);
    const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetails>({
        customerName: '',
        customerPhone: '',
        address: '',
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Customer[]>([]);
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        if (inputType === 'delivery' && searchQuery.length >= 2) {
            api.searchCustomers(searchQuery).then(results => {
                setSearchResults(results);
            });
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, inputType, api]);

    const handleSelectCustomer = (customer: Customer) => {
        const defaultAddress = customer.addresses.find(a => a.isDefault) || customer.addresses[0];
        setDeliveryDetails({
            customerName: customer.name,
            customerPhone: customer.phone,
            address: defaultAddress?.address || '',
            instructions: ''
        });
        setSearchQuery('');
        setShowCustomerSearch(false);
    };

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
                        {/* Customer Search */}
                        {!deliveryDetails.customerPhone && (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="🔍 Search existing customer by name or phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setShowCustomerSearch(true)}
                                    className="w-full bg-[var(--background-tertiary)] border border-[var(--accent-primary)] rounded-md p-2 text-sm"
                                />
                                {showCustomerSearch && searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-[var(--background-secondary)] border border-[var(--border-color)] rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        {searchResults.map((customer) => (
                                            <button
                                                key={customer.id}
                                                onClick={() => handleSelectCustomer(customer)}
                                                className="w-full text-left p-3 hover:bg-[var(--background-tertiary)] border-b border-[var(--border-color)] transition-colors"
                                            >
                                                <div className="font-semibold text-[var(--text-primary)]">{customer.name}</div>
                                                <div className="text-xs text-[var(--text-secondary)]">{customer.phone}</div>
                                                {customer.addresses.length > 0 && (
                                                    <div className="text-xs text-[var(--text-tertiary)] mt-1 truncate">
                                                        {customer.addresses.find(a => a.isDefault)?.address || customer.addresses[0].address}
                                                    </div>
                                                )}
                                                <div className="text-xs text-[var(--accent-primary)] mt-1">
                                                    {customer.totalOrders} orders • Repeat customer
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-[var(--border-color)]"></div>
                            <span className="text-xs text-[var(--text-secondary)]">or enter new customer</span>
                            <div className="flex-1 h-px bg-[var(--border-color)]"></div>
                        </div>

                        <input
                            type="text"
                            placeholder="Customer Name"
                            value={deliveryDetails.customerName}
                            onChange={(e) => setDeliveryDetails(prev => ({ ...prev, customerName: e.target.value }))}
                            className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-md p-2"
                            autoFocus={!showCustomerSearch}
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
                         <input
                            type="text"
                            placeholder="Delivery Instructions (optional)"
                            value={deliveryDetails.instructions || ''}
                            onChange={(e) => setDeliveryDetails(prev => ({ ...prev, instructions: e.target.value }))}
                            className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-md p-2"
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
