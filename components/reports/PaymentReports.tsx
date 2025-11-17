import React, { useMemo } from 'react';
import { Order, Payment } from '../../types';
import { formatCurrency, exportToCsv } from '../../utils/helpers';

interface PaymentReportsProps {
    reportData: Order[];
}

const PaymentReports: React.FC<PaymentReportsProps> = ({ reportData }) => {
    const paymentStats = useMemo(() => {
        const stats: Record<Payment['method'], { count: number, total: number }> = {
            Cash: { count: 0, total: 0 },
            Card: { count: 0, total: 0 },
            UPI: { count: 0, total: 0 },
            Other: { count: 0, total: 0 },
        };

        reportData.forEach(order => {
            if (order.status === 'PAID') {
                order.payments.forEach(payment => {
                    stats[payment.method].count += 1;
                    stats[payment.method].total += payment.amount;
                });
            }
        });

        return Object.entries(stats).map(([method, data]) => ({
            method: method as Payment['method'],
            ...data
        })).filter(d => d.count > 0);
    }, [reportData]);

    const handleExport = () => {
        const dataToExport = paymentStats.map(stat => ({
            paymentMethod: stat.method,
            transactionCount: stat.count,
            totalAmount: stat.total.toFixed(2),
        }));
        exportToCsv('payment_methods_report.csv', dataToExport);
    };

    if (paymentStats.length === 0) {
        return <p className="text-[var(--text-secondary)] text-center py-8">No payment data available for this period or outlet.</p>;
    }

    return (
        <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Payments by Method</h2>
                <button onClick={handleExport} className="bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover)] text-white font-bold py-2 px-4 rounded-lg text-sm">
                    Export to CSV
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-color)]">
                    <thead className="bg-[var(--background-secondary)]">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Payment Method</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Transaction Count</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {paymentStats.map(({ method, count, total }) => (
                            <tr key={method}>
                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-primary)] font-medium">{method}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-tertiary)]">{count}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-[var(--text-tertiary)]">{formatCurrency(total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PaymentReports;