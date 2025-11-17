import React, { useMemo } from 'react';
import { Order } from '../../types';
import { formatCurrency, exportToCsv } from '../../utils/helpers';

interface SalesReportsProps {
    reportData: Order[];
}

interface StatCardProps {
    title: string;
    value: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value }) => (
    <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">{title}</h3>
        <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{value}</p>
    </div>
);

const SalesReports: React.FC<SalesReportsProps> = ({ reportData }) => {
    
    const stats = useMemo(() => {
        const paidOrders = reportData.filter(o => o.status === 'PAID');
        const totalSales = paidOrders.reduce((acc, order) => acc + order.totalAmount, 0);
        const totalOrders = paidOrders.length;
        const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        const itemCounts = new Map<string, { quantity: number, revenue: number }>();
        const categoryCounts = new Map<string, { quantity: number, revenue: number }>();

        paidOrders.forEach(order => {
            order.items.forEach(item => {
                const itemEntry = itemCounts.get(item.name) || { quantity: 0, revenue: 0 };
                itemEntry.quantity += item.quantity;
                itemEntry.revenue += item.price * item.quantity;
                itemCounts.set(item.name, itemEntry);

                // Assuming menu item data would be joined to get category in a real app
                // For now, we'll skip category reporting as item doesn't have it directly.
            });
        });

        const topSellingItems = Array.from(itemCounts.entries())
            .sort(([, a], [, b]) => b.quantity - a.quantity)
            .slice(0, 10);
        
        return { totalSales, totalOrders, avgOrderValue, topSellingItems };
    }, [reportData]);

    const handleExport = () => {
        const summaryData = [
            { metric: 'Total Sales', value: stats.totalSales },
            { metric: 'Total Orders', value: stats.totalOrders },
            { metric: 'Average Order Value', value: stats.avgOrderValue },
        ];
        exportToCsv('sales_summary.csv', summaryData);

        const itemData = stats.topSellingItems.map(([name, data]) => ({
            itemName: name,
            quantitySold: data.quantity,
            revenue: data.revenue.toFixed(2),
        }));
        exportToCsv('top_selling_items.csv', itemData);
    };

    if (reportData.length === 0) {
        return <p className="text-[var(--text-secondary)] text-center py-8">No sales data available for this period or outlet.</p>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                <button onClick={handleExport} className="bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover)] text-white font-bold py-2 px-4 rounded-lg text-sm">
                    Export to CSV
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Sales" value={formatCurrency(stats.totalSales)} />
                <StatCard title="Total Orders" value={stats.totalOrders.toString()} />
                <StatCard title="Average Order Value" value={formatCurrency(stats.avgOrderValue)} />
            </div>

            <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Top Selling Items (by Quantity)</h2>
                {stats.topSellingItems.length > 0 ? (
                    <ul className="divide-y divide-[var(--border-color)]">
                        {stats.topSellingItems.map(([name, data]) => (
                            <li key={name} className="py-3 flex justify-between">
                                <span className="text-[var(--text-tertiary)]">{name}</span>
                                <span className="font-semibold text-[var(--text-primary)]">{data.quantity} sold</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-[var(--text-secondary)]">No item data available.</p>
                )}
            </div>
        </div>
    );
};

export default SalesReports;