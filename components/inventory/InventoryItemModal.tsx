import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../../types';
import Modal from '../common/Modal';
import { useAppContext } from '../../hooks/useAppContext';

interface InventoryItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    item?: InventoryItem | null;
    onSave: (item: Omit<InventoryItem, 'id'> | InventoryItem) => Promise<void>;
}

const CATEGORIES = ['Dough', 'Sauces', 'Dairy', 'Meats', 'Vegetables', 'Beverages', 'Spices', 'Other'];
const UNITS: ('kg' | 'g' | 'litre' | 'ml' | 'piece')[] = ['kg', 'g', 'litre', 'ml', 'piece'];

const InventoryItemModal: React.FC<InventoryItemModalProps> = ({ isOpen, onClose, item, onSave }) => {
    const { allOutlets, currentTenant, addToast } = useAppContext();
    const tenantOutlets = allOutlets.filter(o => o.tenantId === currentTenant?.id);

    const [formData, setFormData] = useState({
        name: '',
        unit: 'kg' as 'kg' | 'g' | 'litre' | 'ml' | 'piece',
        category: 'Other',
        stockByOutlet: {} as Record<string, number>,
        reorderLevelByOutlet: {} as Record<string, number>,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (item) {
            setFormData({
                name: item.name,
                unit: item.unit,
                category: item.category,
                stockByOutlet: { ...item.stockByOutlet },
                reorderLevelByOutlet: { ...item.reorderLevelByOutlet },
            });
        } else {
            // Initialize with 0 stock for all outlets
            const initialStock: Record<string, number> = {};
            const initialReorder: Record<string, number> = {};
            tenantOutlets.forEach(outlet => {
                initialStock[outlet.id] = 0;
                initialReorder[outlet.id] = 10;
            });
            setFormData({
                name: '',
                unit: 'kg',
                category: 'Other',
                stockByOutlet: initialStock,
                reorderLevelByOutlet: initialReorder,
            });
        }
        setErrors({});
    }, [item, isOpen, tenantOutlets.length]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Item name is required';
        }

        if (!formData.category) {
            newErrors.category = 'Category is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            addToast('Please fix the errors before saving', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const dataToSave = item 
                ? { ...item, ...formData } 
                : { ...formData, tenantId: currentTenant!.id };
            
            await onSave(dataToSave);
            addToast(item ? 'Inventory item updated successfully!' : 'Inventory item created successfully!', 'success');
            onClose();
        } catch (error: any) {
            addToast(error.message || 'Failed to save inventory item', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleStockChange = (outletId: string, value: string, field: 'stock' | 'reorder') => {
        const numValue = parseInt(value, 10) || 0;
        if (field === 'stock') {
            setFormData(prev => ({
                ...prev,
                stockByOutlet: { ...prev.stockByOutlet, [outletId]: numValue }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                reorderLevelByOutlet: { ...prev.reorderLevelByOutlet, [outletId]: numValue }
            }));
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Edit Inventory Item' : 'Add New Inventory Item'} size="2xl">
            <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-tertiary)] mb-1">
                            Item Name <span className="text-[var(--negative)]">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-md py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                            placeholder="e.g., Tomato Sauce"
                        />
                        {errors.name && <p className="text-xs text-[var(--negative)] mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-tertiary)] mb-1">
                            Unit <span className="text-[var(--negative)]">*</span>
                        </label>
                        <select
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                            className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-md py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                        >
                            {UNITS.map(unit => (
                                <option key={unit} value={unit}>{unit}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-tertiary)] mb-1">
                        Category <span className="text-[var(--negative)]">*</span>
                    </label>
                    <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-md py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                    >
                        {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    {errors.category && <p className="text-xs text-[var(--negative)] mt-1">{errors.category}</p>}
                </div>

                {/* Stock by Outlet */}
                <div>
                    <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Stock & Reorder Levels by Outlet</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-color)]">
                        {tenantOutlets.map(outlet => (
                            <div key={outlet.id} className="grid grid-cols-3 gap-3 items-center">
                                <div className="font-medium text-[var(--text-secondary)]">{outlet.name}</div>
                                <div>
                                    <label className="block text-xs text-[var(--text-tertiary)] mb-1">Initial Stock</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.stockByOutlet[outlet.id] || 0}
                                        onChange={(e) => handleStockChange(outlet.id, e.target.value, 'stock')}
                                        className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded py-1 px-2 text-sm text-[var(--text-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--text-tertiary)] mb-1">Reorder Level</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.reorderLevelByOutlet[outlet.id] || 0}
                                        onChange={(e) => handleStockChange(outlet.id, e.target.value, 'reorder')}
                                        className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded py-1 px-2 text-sm text-[var(--text-primary)]"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

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
                        className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold py-2 px-6 rounded-lg disabled:bg-[var(--disabled)] flex items-center"
                    >
                        {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default InventoryItemModal;
