import React, { useState, useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { InventoryItem, Outlet, Permission } from '../types';
import StockAdjustmentModal from '../components/inventory/StockAdjustmentModal';
import InventoryItemModal from '../components/inventory/InventoryItemModal';
import WastageModal from '../components/inventory/WastageModal';
import Spinner from '../components/common/Spinner';

export default function InventoryView() {
    const { currentUser, currentOutlet, allOutlets, inventory, api, syncData, hasPermission } = useAppContext();
    const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(currentOutlet);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canManageInventory = hasPermission(Permission.CAN_MANAGE_INVENTORY);

    const handleAdjustStock = (item: InventoryItem) => {
        setSelectedItem(item);
        setIsStockModalOpen(true);
    };

    const handleRecordWastage = (item: InventoryItem) => {
        setSelectedItem(item);
        setIsWastageModalOpen(true);
    };

    const handleEditItem = (item: InventoryItem) => {
        setEditingItem(item);
        setIsItemModalOpen(true);
    };

    const handleDeleteItem = async (item: InventoryItem) => {
        if (!confirm(`Are you sure you want to delete "${item.name}"?\n\nThis action cannot be undone and will fail if the item is used in any menu recipes.`)) {
            return;
        }

        setIsLoading(true);
        try {
            await api.deleteInventoryItem(item.id);
            await syncData();
        } catch (error: any) {
            alert(error.message || 'Failed to delete inventory item');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveStock = async (item: InventoryItem, newQuantity: number, reason: string) => {
        if (!selectedOutlet) return;
        setIsLoading(true);
        await api.adjustStock(item.id, selectedOutlet.id, newQuantity, reason);
        await syncData();
        setIsLoading(false);
        setIsStockModalOpen(false);
        setSelectedItem(null);
    };

    const handleSaveWastage = async (quantity: number, reason: string) => {
        if (!selectedItem || !selectedOutlet) return;
        setIsLoading(true);
        await api.recordWastage(selectedItem.id, selectedOutlet.id, quantity, reason);
        await syncData();
        setIsLoading(false);
        setIsWastageModalOpen(false);
        setSelectedItem(null);
    };

    const handleSaveItem = async (itemData: Omit<InventoryItem, 'id'> | InventoryItem) => {
        setIsLoading(true);
        if ('id' in itemData) {
            await api.updateInventoryItem(itemData.id, itemData);
        } else {
            await api.createInventoryItem(itemData);
        }
        await syncData();
        setIsLoading(false);
        setIsItemModalOpen(false);
        setEditingItem(null);
    };
    
    const displayedInventory = useMemo(() => {
        if (!selectedOutlet) return [];
        return inventory.map(item => ({
            ...item,
            currentStock: item.stockByOutlet[selectedOutlet.id] ?? 0,
            reorderLevel: item.reorderLevelByOutlet[selectedOutlet.id] ?? 0,
        }));
    }, [inventory, selectedOutlet]);
    
    if (!currentOutlet) return <Spinner />;

    return (
        <main className="flex-grow p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">Inventory Management</h1>
                <div className="flex items-center gap-3">
                    {currentUser?.role === 'BrandAdmin' && allOutlets.length > 1 && (
                        <select
                            value={selectedOutlet?.id}
                            onChange={(e) => setSelectedOutlet(allOutlets.find(o => o.id === e.target.value) || null)}
                            className="bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-lg focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] block p-2.5"
                        >
                            {allOutlets.map(outlet => (
                                <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                            ))}
                        </select>
                    )}
                    {canManageInventory && (
                        <button
                            onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }}
                            className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                        >
                            <span className="text-xl">+</span>
                            Add Item
                        </button>
                    )}
                </div>
            </div>
            
            <div className="bg-[var(--background-secondary)] rounded-lg shadow-lg overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-[var(--background-tertiary)]">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Item Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Category</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Current Stock</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Unit</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Reorder Level</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-[var(--background-secondary)] divide-y divide-[var(--border-color)]">
                        {displayedInventory.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-[var(--text-secondary)]">
                                    No inventory items found. {canManageInventory && 'Click "Add Item" to create one.'}
                                </td>
                            </tr>
                        ) : (
                            displayedInventory.map((item) => {
                                const isLowStock = item.currentStock < item.reorderLevel;
                                return (
                                    <tr key={item.id} className={isLowStock ? 'bg-red-900/20' : ''}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">{item.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-tertiary)]">{item.category}</td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${isLowStock ? 'text-[var(--negative)]' : 'text-[var(--text-primary)]'}`}>{item.currentStock}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-tertiary)]">{item.unit}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-tertiary)]">{item.reorderLevel}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-3">
                                                <button 
                                                    onClick={() => handleAdjustStock(item)} 
                                                    className="text-[var(--accent-primary)] hover:opacity-80"
                                                    title="Adjust Stock"
                                                >
                                                    📊 Adjust
                                                </button>
                                                <button 
                                                    onClick={() => handleRecordWastage(item)} 
                                                    className="text-[var(--negative)] hover:opacity-80"
                                                    title="Record Wastage"
                                                >
                                                    🗑️ Wastage
                                                </button>
                                                {canManageInventory && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleEditItem(item)} 
                                                            className="text-blue-400 hover:opacity-80"
                                                            title="Edit Item"
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteItem(item)} 
                                                            className="text-[var(--negative)] hover:opacity-80"
                                                            title="Delete Item"
                                                        >
                                                            ❌ Delete
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                 {isLoading && <div className="p-4 text-center"><Spinner /></div>}
            </div>

            {/* Stock Adjustment Modal */}
            {selectedItem && selectedOutlet && (
                 <StockAdjustmentModal
                    isOpen={isStockModalOpen}
                    onClose={() => { setIsStockModalOpen(false); setSelectedItem(null); }}
                    item={selectedItem}
                    currentStock={selectedItem.stockByOutlet[selectedOutlet.id] ?? 0}
                    onSave={handleSaveStock}
                />
            )}

            {/* Wastage Modal */}
            {selectedItem && selectedOutlet && (
                <WastageModal
                    isOpen={isWastageModalOpen}
                    onClose={() => { setIsWastageModalOpen(false); setSelectedItem(null); }}
                    item={selectedItem}
                    outletId={selectedOutlet.id}
                    currentStock={selectedItem.stockByOutlet[selectedOutlet.id] ?? 0}
                    onSave={handleSaveWastage}
                />
            )}

            {/* Create/Edit Item Modal */}
            <InventoryItemModal
                isOpen={isItemModalOpen}
                onClose={() => { setIsItemModalOpen(false); setEditingItem(null); }}
                item={editingItem}
                onSave={handleSaveItem}
            />
        </main>
    );
}