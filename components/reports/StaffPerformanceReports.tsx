import React, { useState, useEffect, useMemo } from 'react';
import { Order, User } from '../../types';
import { useAppContext } from '../../hooks/useAppContext';
import { formatCurrency, exportToCsv } from '../../utils/helpers';

interface StaffPerformanceReportsProps {
    reportData: Order[];
}

const StaffPerformanceReports: React.FC<StaffPerformanceReportsProps> = ({ reportData }) => {
    const { api } = useAppContext();
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        api.getAllUsersForTenant().then(setUsers);
    }, [api]);

    const performanceStats = useMemo(() => {
        const stats = new Map<string, { name: string; sales: number; bills: number }>();

        users.forEach(user => {
            stats.set(user.id, { name: user.name, sales: 0, bills: 0 });
        });

        reportData.forEach(order => {
            if (order.status === 'PAID' && order.createdBy) {
                const userStat = stats.get(order.createdBy);
                if (userStat) {
                    userStat.sales += order.totalAmount;
                    userStat.bills += 1;
                }
            }
        });

        return Array.from(stats.values())
            .filter(s => s.bills > 0)
            .sort((a, b) => b.sales - a.sales);
    }, [reportData, users]);
    
    const handleExport = () => {
        const dataToExport = performanceStats.map(stat => ({
            staffName: stat.name,
            billsHandled: stat.bills,
            totalSales: stat.sales.toFixed(2),
            averageBillSize: (stat.bills > 0 ? stat.sales / stat.bills : 0).toFixed(2),
        }));
        exportToCsv('staff_performance_report.csv', dataToExport);
    };

    if (performanceStats.length === 0) {
        return <p className="text-[var(--text-secondary)] text-center py-8">No staff performance data available.</p>;
    }

    return (
         <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg max-w-3xl mx-auto">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Staff Performance</h2>
                <button onClick={handleExport} className="bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover)] text-white font-bold py-2 px-4 rounded-lg text-sm">
                    Export to CSV
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-color)]">
                    <thead className="bg-[var(--background-secondary)]">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Staff Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Bills Handled</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Total Sales</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Avg. Bill Size</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {performanceStats.map(stat => (
                            <tr key={stat.name}>
                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-primary)] font-medium">{stat.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-tertiary)]">{stat.bills}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-tertiary)]">{formatCurrency(stat.sales)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-tertiary)]">{formatCurrency(stat.bills > 0 ? stat.sales / stat.bills : 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StaffPerformanceReports;