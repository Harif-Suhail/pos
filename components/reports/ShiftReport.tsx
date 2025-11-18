import React, { useMemo } from 'react';
import { Shift, Order } from '../../types';
import { formatCurrency } from '../../utils/helpers';

interface ShiftReportProps {
    shift: Shift;
    orders: Order[];
}

const ShiftReport: React.FC<ShiftReportProps> = ({ shift, orders }) => {
    
    const stats = useMemo(() => {
        // Filter orders for this shift
        const shiftOrders = orders.filter(o => 
            o.status === 'PAID' && 
            o.closedAt && 
            o.closedAt >= shift.startTime && 
            (!shift.endTime || o.closedAt <= shift.endTime)
        );

        // Calculate payment method breakdown
        const paymentBreakdown: Record<string, number> = {};
        let totalSales = 0;
        
        shiftOrders.forEach(order => {
            totalSales += order.totalAmount;
            order.payments.forEach(payment => {
                paymentBreakdown[payment.method] = (paymentBreakdown[payment.method] || 0) + payment.amount;
            });
        });

        // Calculate cash transactions totals
        const cashIn = shift.transactions
            .filter(t => t.type === 'CASH_IN')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const cashOut = shift.transactions
            .filter(t => t.type === 'CASH_OUT')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            shiftOrders,
            totalOrders: shiftOrders.length,
            totalSales,
            paymentBreakdown,
            cashIn,
            cashOut,
        };
    }, [shift, orders]);

    const shiftDuration = shift.endTime 
        ? Math.floor((shift.endTime - shift.startTime) / (1000 * 60))
        : Math.floor((Date.now() - shift.startTime) / (1000 * 60));
    
    const hours = Math.floor(shiftDuration / 60);
    const minutes = shiftDuration % 60;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Shift Header */}
            <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Shift Report</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-[var(--text-secondary)]">Shift ID:</span>
                        <p className="font-semibold text-[var(--text-primary)]">{shift.id}</p>
                    </div>
                    <div>
                        <span className="text-[var(--text-secondary)]">Duration:</span>
                        <p className="font-semibold text-[var(--text-primary)]">{hours}h {minutes}m</p>
                    </div>
                    <div>
                        <span className="text-[var(--text-secondary)]">Start Time:</span>
                        <p className="font-semibold text-[var(--text-primary)]">
                            {new Date(shift.startTime).toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <span className="text-[var(--text-secondary)]">End Time:</span>
                        <p className="font-semibold text-[var(--text-primary)]">
                            {shift.endTime ? new Date(shift.endTime).toLocaleString() : 'In Progress'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Sales Summary */}
            <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Sales Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[var(--background-tertiary)] p-4 rounded-lg">
                        <span className="text-sm text-[var(--text-secondary)]">Total Orders</span>
                        <p className="text-2xl font-bold text-[var(--accent-primary)]">{stats.totalOrders}</p>
                    </div>
                    <div className="bg-[var(--background-tertiary)] p-4 rounded-lg">
                        <span className="text-sm text-[var(--text-secondary)]">Total Sales</span>
                        <p className="text-2xl font-bold text-[var(--positive)]">{formatCurrency(stats.totalSales)}</p>
                    </div>
                </div>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Payment Method Breakdown</h3>
                <div className="space-y-3">
                    {Object.entries(stats.paymentBreakdown).map(([method, amount]) => (
                        <div key={method} className="flex justify-between items-center bg-[var(--background-tertiary)] p-3 rounded-lg">
                            <span className="font-semibold text-[var(--text-primary)]">{method}</span>
                            <span className="text-lg font-bold text-[var(--accent-primary)]">{formatCurrency(amount as number)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cash Flow Detail */}
            <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Cash Flow Detail</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-[var(--border-color)]">
                        <span className="text-[var(--text-secondary)]">Opening Cash:</span>
                        <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(shift.openingCash)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pb-2 border-b border-[var(--border-color)]">
                        <span className="text-[var(--text-secondary)]">Cash Sales:</span>
                        <span className="font-semibold text-[var(--positive)]">+{formatCurrency(shift.cashPayments)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pb-2 border-b border-[var(--border-color)]">
                        <span className="text-[var(--text-secondary)]">Cash Refunds:</span>
                        <span className="font-semibold text-[var(--negative)]">-{formatCurrency(shift.cashRefunds)}</span>
                    </div>
                    
                    {stats.cashIn > 0 && (
                        <div className="flex justify-between items-center pb-2 border-b border-[var(--border-color)]">
                            <span className="text-[var(--text-secondary)]">Cash In:</span>
                            <span className="font-semibold text-[var(--positive)]">+{formatCurrency(stats.cashIn)}</span>
                        </div>
                    )}
                    
                    {stats.cashOut > 0 && (
                        <div className="flex justify-between items-center pb-2 border-b border-[var(--border-color)]">
                            <span className="text-[var(--text-secondary)]">Cash Out:</span>
                            <span className="font-semibold text-[var(--negative)]">-{formatCurrency(stats.cashOut)}</span>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2 bg-[var(--background-tertiary)] p-3 rounded-lg">
                        <span className="font-semibold text-[var(--text-primary)]">Expected Cash:</span>
                        <span className="text-xl font-bold text-[var(--accent-primary)]">{formatCurrency(shift.expectedCash)}</span>
                    </div>
                    
                    {shift.closingCash !== undefined && (
                        <>
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-[var(--text-primary)]">Actual Cash Count:</span>
                                <span className="text-xl font-bold text-[var(--text-primary)]">{formatCurrency(shift.closingCash)}</span>
                            </div>
                            
                            <div className={`flex justify-between items-center p-4 rounded-lg ${
                                shift.cashVariance === 0 
                                    ? 'bg-green-500/10 border-2 border-green-500' 
                                    : shift.cashVariance! > 0 
                                        ? 'bg-yellow-500/10 border-2 border-yellow-500' 
                                        : 'bg-red-500/10 border-2 border-red-500'
                            }`}>
                                <span className="font-bold text-lg">Cash Variance:</span>
                                <span className={`text-2xl font-bold ${
                                    shift.cashVariance === 0 
                                        ? 'text-[var(--positive)]' 
                                        : shift.cashVariance! > 0 
                                            ? 'text-[var(--warning)]' 
                                            : 'text-[var(--negative)]'
                                }`}>
                                    {shift.cashVariance === 0 
                                        ? '✓ Perfect Match' 
                                        : (shift.cashVariance! > 0 ? '+' : '') + formatCurrency(shift.cashVariance!)
                                    }
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Transaction History */}
            {shift.transactions.length > 0 && (
                <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Cash Transactions ({shift.transactions.length})</h3>
                    <div className="space-y-2">
                        {shift.transactions.map((transaction, index) => (
                            <div key={index} className="flex justify-between items-start bg-[var(--background-tertiary)] p-3 rounded-lg">
                                <div className="flex-1">
                                    <div className={`font-semibold ${transaction.type === 'CASH_IN' ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                                        {transaction.type === 'CASH_IN' ? '+ Cash In' : '- Cash Out'}
                                    </div>
                                    <div className="text-[var(--text-secondary)] text-sm">{transaction.reason}</div>
                                    <div className="text-[var(--text-tertiary)] text-xs">
                                        {new Date(transaction.timestamp).toLocaleString()}
                                    </div>
                                </div>
                                <div className={`font-bold text-lg ${transaction.type === 'CASH_IN' ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                                    {formatCurrency(transaction.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftReport;
