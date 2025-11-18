import React, { useMemo } from 'react';
import { Order, Payment } from '../../types';
import { formatCurrency, exportToCsv } from '../../utils/helpers';

interface DailySummaryReportProps {
    reportData: Order[];
    selectedDate?: Date;
}

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    bgColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, bgColor = 'bg-[var(--background-secondary)]' }) => (
    <div className={`${bgColor} p-6 rounded-lg shadow-lg border border-[var(--border-color)]`}>
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">{title}</h3>
        <p className="text-3xl font-bold text-[var(--text-primary)]">{value}</p>
        {subtitle && <p className="text-xs text-[var(--text-tertiary)] mt-1">{subtitle}</p>}
    </div>
);

const DailySummaryReport: React.FC<DailySummaryReportProps> = ({ reportData, selectedDate }) => {
    const dailyStats = useMemo(() => {
        // Filter for paid orders only
        const paidOrders = reportData.filter(o => o.status === 'PAID');
        const cancelledOrders = reportData.filter(o => o.status === 'CANCELLED');
        
        // Total Sales
        const totalSales = paidOrders.reduce((acc, order) => acc + order.totalAmount, 0);
        
        // Order Count
        const orderCount = paidOrders.length;
        const cancelledCount = cancelledOrders.length;
        
        // Average Order Value
        const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;
        
        // Payment Breakdown (Cash/Card/UPI)
        const paymentBreakdown: Record<Payment['method'], number> = {
            Cash: 0,
            Card: 0,
            UPI: 0,
            Other: 0,
        };
        
        paidOrders.forEach(order => {
            order.payments.forEach(payment => {
                paymentBreakdown[payment.method] += payment.amount;
            });
        });
        
        // Category-wise Sales
        const categorySales = new Map<string, { quantity: number, revenue: number }>();
        
        paidOrders.forEach(order => {
            order.items.forEach(item => {
                // Use actual category if available, otherwise fall back to station
                const category = item.category || item.station || 'Uncategorized';
                const existing = categorySales.get(category) || { quantity: 0, revenue: 0 };
                existing.quantity += item.quantity;
                existing.revenue += item.price * item.quantity;
                categorySales.set(category, existing);
            });
        });
        
        const categorySalesArray = Array.from(categorySales.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue);
        
        // Total Discounts Given
        const totalDiscounts = paidOrders.reduce((acc, order) => {
            return acc + (order.discount?.amount || 0);
        }, 0);
        
        const discountCount = paidOrders.filter(o => o.discount && o.discount.amount > 0).length;
        
        // Tax & Service Charge
        const totalTax = paidOrders.reduce((acc, order) => acc + order.totalTax, 0);
        const totalServiceCharge = paidOrders.reduce((acc, order) => acc + order.serviceCharge, 0);
        const subtotal = paidOrders.reduce((acc, order) => acc + order.subtotal, 0);
        
        // Cancelled Order Details
        const cancelledRevenueLoss = cancelledOrders.reduce((acc, order) => acc + order.totalAmount, 0);
        
        return {
            totalSales,
            orderCount,
            cancelledCount,
            avgOrderValue,
            paymentBreakdown,
            categorySalesArray,
            totalDiscounts,
            discountCount,
            totalTax,
            totalServiceCharge,
            subtotal,
            cancelledRevenueLoss,
        };
    }, [reportData]);

    const handleExport = () => {
        const dateStr = selectedDate ? selectedDate.toLocaleDateString() : 'all_time';
        
        // Summary Data
        const summaryData = [
            { Metric: 'Total Sales', Value: dailyStats.totalSales.toFixed(2) },
            { Metric: 'Total Orders', Value: dailyStats.orderCount },
            { Metric: 'Average Order Value', Value: dailyStats.avgOrderValue.toFixed(2) },
            { Metric: 'Cancelled Orders', Value: dailyStats.cancelledCount },
            { Metric: 'Cancelled Revenue Loss', Value: dailyStats.cancelledRevenueLoss.toFixed(2) },
            { Metric: 'Total Discounts', Value: dailyStats.totalDiscounts.toFixed(2) },
            { Metric: 'Discount Count', Value: dailyStats.discountCount },
            { Metric: 'Subtotal', Value: dailyStats.subtotal.toFixed(2) },
            { Metric: 'Total Tax', Value: dailyStats.totalTax.toFixed(2) },
            { Metric: 'Total Service Charge', Value: dailyStats.totalServiceCharge.toFixed(2) },
        ];
        exportToCsv(`daily_summary_${dateStr}.csv`, summaryData);

        // Payment Breakdown
        const paymentData = Object.entries(dailyStats.paymentBreakdown)
            .filter(([, amount]) => (amount as number) > 0)
            .map(([method, amount]) => ({
                PaymentMethod: method,
                Amount: (amount as number).toFixed(2),
            }));
        exportToCsv(`payment_breakdown_${dateStr}.csv`, paymentData);

        // Category Sales
        const categoryData = dailyStats.categorySalesArray.map(cat => ({
            Category: cat.name,
            Quantity: cat.quantity,
            Revenue: cat.revenue.toFixed(2),
        }));
        exportToCsv(`category_sales_${dateStr}.csv`, categoryData);
    };

    if (reportData.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-[var(--text-secondary)] text-lg">No data available for the selected period.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header with Export */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Daily Summary Report</h1>
                    {selectedDate && (
                        <p className="text-[var(--text-secondary)] mt-1">
                            {selectedDate.toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </p>
                    )}
                </div>
                <button 
                    onClick={handleExport} 
                    className="bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover)] text-white font-bold py-3 px-6 rounded-lg text-sm shadow-lg transition-colors"
                >
                    📊 Export All Reports
                </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Sales" 
                    value={formatCurrency(dailyStats.totalSales)}
                    subtitle={`Subtotal: ${formatCurrency(dailyStats.subtotal)}`}
                    bgColor="bg-green-500/10"
                />
                <StatCard 
                    title="Total Orders" 
                    value={dailyStats.orderCount}
                    subtitle={`Avg: ${formatCurrency(dailyStats.avgOrderValue)}`}
                />
                <StatCard 
                    title="Cancelled/Voids" 
                    value={dailyStats.cancelledCount}
                    subtitle={`Loss: ${formatCurrency(dailyStats.cancelledRevenueLoss)}`}
                    bgColor="bg-red-500/10"
                />
                <StatCard 
                    title="Discounts Given" 
                    value={formatCurrency(dailyStats.totalDiscounts)}
                    subtitle={`${dailyStats.discountCount} orders with discount`}
                    bgColor="bg-yellow-500/10"
                />
            </div>

            {/* Additional Charges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard 
                    title="Total Tax Collected" 
                    value={formatCurrency(dailyStats.totalTax)}
                />
                <StatCard 
                    title="Service Charges" 
                    value={formatCurrency(dailyStats.totalServiceCharge)}
                />
            </div>

            {/* Payment Breakdown */}
            <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg border border-[var(--border-color)]">
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Payment Breakdown</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(dailyStats.paymentBreakdown)
                        .filter(([, amount]) => (amount as number) > 0)
                        .map(([method, amount]) => (
                            <div key={method} className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-color)]">
                                <div className="flex items-center justify-between">
                                    <span className="text-[var(--text-secondary)] font-medium">
                                        {method === 'Cash' ? '💵' : method === 'Card' ? '💳' : method === 'UPI' ? '📱' : '💰'} {method}
                                    </span>
                                </div>
                                <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">
                                    {formatCurrency(amount as number)}
                                </p>
                                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                                    {(((amount as number) / dailyStats.totalSales) * 100).toFixed(1)}% of total
                                </p>
                            </div>
                        ))}
                </div>
            </div>

            {/* Category-wise Sales */}
            <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg border border-[var(--border-color)]">
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Category-wise Sales</h2>
                {dailyStats.categorySalesArray.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--border-color)]">
                            <thead>
                                <tr className="bg-[var(--background-primary)]">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                                        Quantity Sold
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                                        Revenue
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                                        % of Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {dailyStats.categorySalesArray.map((cat) => (
                                    <tr key={cat.name} className="hover:bg-[var(--background-primary)] transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-[var(--text-primary)] font-medium">
                                            {cat.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-[var(--text-tertiary)]">
                                            {cat.quantity}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-[var(--text-primary)] font-semibold">
                                            {formatCurrency(cat.revenue)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-[var(--text-tertiary)]">
                                            {((cat.revenue / dailyStats.totalSales) * 100).toFixed(1)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-[var(--background-primary)] font-bold">
                                    <td className="px-6 py-4 text-[var(--text-primary)]">Total</td>
                                    <td className="px-6 py-4 text-right text-[var(--text-primary)]">
                                        {dailyStats.categorySalesArray.reduce((sum, cat) => sum + cat.quantity, 0)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-[var(--text-primary)]">
                                        {formatCurrency(dailyStats.totalSales)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-[var(--text-primary)]">100%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <p className="text-[var(--text-secondary)] text-center py-4">No category data available.</p>
                )}
            </div>

            {/* Summary Cards at Bottom */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 rounded-lg border border-[var(--border-color)]">
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">📈 Quick Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-[var(--text-secondary)]">Orders Completed</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)]">{dailyStats.orderCount}</p>
                    </div>
                    <div>
                        <p className="text-[var(--text-secondary)]">Orders Cancelled</p>
                        <p className="text-2xl font-bold text-red-500">{dailyStats.cancelledCount}</p>
                    </div>
                    <div>
                        <p className="text-[var(--text-secondary)]">Success Rate</p>
                        <p className="text-2xl font-bold text-green-500">
                            {dailyStats.orderCount + dailyStats.cancelledCount > 0
                                ? ((dailyStats.orderCount / (dailyStats.orderCount + dailyStats.cancelledCount)) * 100).toFixed(1)
                                : 0}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailySummaryReport;
