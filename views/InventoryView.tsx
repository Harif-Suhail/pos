import React, { useState, useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { InventoryItem, Outlet } from '../types';
import StockAdjustmentModal from '../components/inventory/StockAdjustmentModal';
import Spinner from '../components/common/Spinner';

export default function InventoryView() {
    const { currentUser, currentOutlet, allOutlets, inventory, api, syncData } = useAppContext();
    const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(currentOutlet);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleAdjustStock = (item: InventoryItem) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleSaveStock = async (item: InventoryItem, newQuantity: number, reason: string) => {
        if (!selectedOutlet) return;
        setIsLoading(true);
        await api.adjustStock(item.id, selectedOutlet.id, newQuantity, reason);
        await syncData();
        setIsLoading(false);
        setIsModalOpen(false);
        setSelectedItem(null);
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
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Adjust Stock</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-[var(--background-secondary)] divide-y divide-[var(--border-color)]">
                        {displayedInventory.map((item) => {
                            const isLowStock = item.currentStock < item.reorderLevel;
                            return (
                                <tr key={item.id} className={isLowStock ? 'bg-red-900/20' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">{item.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-tertiary)]">{item.category}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${isLowStock ? 'text-[var(--negative)]' : 'text-[var(--text-primary)]'}`}>{item.currentStock}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-tertiary)]">{item.unit}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-tertiary)]">{item.reorderLevel}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleAdjustStock(item)} className="text-[var(--accent-primary)] hover:opacity-80">Adjust Stock</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {isLoading && <div className="p-4 text-center"><Spinner /></div>}
            </div>

            {selectedItem && selectedOutlet && (
                 <StockAdjustmentModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    item={selectedItem}
                    currentStock={selectedItem.stockByOutlet[selectedOutlet.id] ?? 0}
                    onSave={handleSaveStock}
                />
            )}
        </main>
    );
}