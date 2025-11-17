import React, { useMemo } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { formatTimestamp, exportToCsv } from '../../utils/helpers';

interface InventoryReportsProps {
    selectedOutletId: string | 'all';
}

const InventoryReports: React.FC<InventoryReportsProps> = ({ selectedOutletId }) => {
    const { inventory, stockMovements, allOutlets } = useAppContext();

    const filteredMovements = useMemo(() => {
        return stockMovements
            .filter(m => selectedOutletId === 'all' || m.outletId === selectedOutletId)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 100); // Limit to last 100 movements for performance
    }, [stockMovements, selectedOutletId]);

    const getItemName = (id: string) => inventory.find(i => i.id === id)?.name || 'Unknown Item';
    const getOutletName = (id: string) => allOutlets.find(o => o.id === id)?.name || 'Unknown Outlet';
    
    const handleExport = () => {
        const stockLevelsData = inventory.map(item => {
            const stock = selectedOutletId === 'all' 
                ? Object.values(item.stockByOutlet).reduce((a, b) => a + b, 0)
                : item.stockByOutlet[selectedOutletId] ?? 0;
            return {
                itemName: item.name,
                category: item.category,
                currentStock: stock,
                unit: item.unit,
            };
        });
        exportToCsv('current_stock_levels.csv', stockLevelsData);

        const movementsData = filteredMovements.map(m => ({
            date: new Date(m.timestamp).toLocaleString(),
            item: getItemName(m.inventoryItemId),
            outlet: getOutletName(m.outletId),
            type: m.type,
            change: m.quantityChange,
            reason: m.reason || '-',
            processedBy: m.processedBy,
        }));
        exportToCsv('recent_stock_movements.csv', movementsData);
    };

    return (
        <div>
             <div className="flex justify-end mb-4">
                <button onClick={handleExport} className="bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover)] text-white font-bold py-2 px-4 rounded-lg text-sm">
                    Export to CSV
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg h-fit">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Current Stock Levels</h2>
                    <div className="max-h-96 overflow-y-auto">
                        <ul className="divide-y divide-[var(--border-color)]">
                        {inventory.map(item => {
                            const stock = selectedOutletId === 'all' 
                                ? Object.values(item.stockByOutlet).reduce((a, b) => a + b, 0)
                                : item.stockByOutlet[selectedOutletId] ?? 0;
                            const isLow = selectedOutletId !== 'all' && stock < (item.reorderLevelByOutlet[selectedOutletId] ?? 0);
                            
                            return (
                                <li key={item.id} className="py-2 flex justify-between">
                                    <span className={isLow ? "text-[var(--negative)]" : "text-[var(--text-tertiary)]"}>{item.name}</span>
                                    <span className={`font-semibold ${isLow ? "text-[var(--negative)]" : "text-[var(--text-primary)]"}`}>{stock} {item.unit}</span>
                                </li>
                            )
                        })}
                        </ul>
                    </div>
                </div>
                <div className="lg:col-span-2 bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Recent Stock Movements</h2>
                     <div className="overflow-x-auto max-h-[60vh]">
                        <table className="min-w-full divide-y divide-[var(--border-color)]">
                            <thead className="bg-[var(--background-tertiary)] sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Item</th>
                                    {selectedOutletId === 'all' && <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Outlet</th>}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Change</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Reason</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-[var(--border-color)]">
                                 {filteredMovements.map(m => (
                                     <tr key={m.id}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)]">{formatTimestamp(m.timestamp)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--text-primary)]">{getItemName(m.inventoryItemId)}</td>
                                        {selectedOutletId === 'all' && <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--text-tertiary)]">{getOutletName(m.outletId)}</td>}
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--text-tertiary)]">{m.type}</td>
                                        <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold ${m.quantityChange > 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                                            {m.quantityChange > 0 ? '+' : ''}{m.quantityChange}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)]">{m.reason || '-'}</td>
                                     </tr>
                                 ))}
                             </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryReports;