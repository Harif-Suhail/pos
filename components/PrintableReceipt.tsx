import React from 'react';
import { Order, Tenant, Outlet } from '../types';
import { formatTimestamp } from '../utils/helpers';
import { useCurrency } from '../hooks/useCurrency';

interface PrintableReceiptProps {
    order: Order;
    tenant: Tenant;
    outlet: Outlet;
}

const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ order, tenant, outlet }) => {
    const { formatCurrency } = useCurrency();
    
    return (
        <div id="printable-receipt" className="bg-white text-black p-4 font-mono text-xs w-[300px]">
            <div className="text-center mb-4">
                {tenant.logoUrl && <img src={tenant.logoUrl} alt={`${tenant.name} Logo`} className="w-20 h-20 mx-auto mb-2 object-contain" />}
                <h1 className="font-bold text-lg">{tenant.name}</h1>
                <p>{outlet.name}</p>
                <p>{outlet.address}</p>
            </div>
            <div className="mb-2">
                <p>Order: #{order.orderNumber}</p>
                <p>Date: {formatTimestamp(order.createdAt)}</p>
                <p>Type: {order.type} {order.table && `(Table ${order.table})`}</p>
            </div>
            <table className="w-full mb-2">
                <thead>
                    <tr className="border-b border-black">
                        <th className="text-left">QTY</th>
                        <th className="text-left">ITEM</th>
                        <th className="text-right">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map(item => (
                        <tr key={item.uniqueId}>
                            <td>{item.quantity}</td>
                            <td>
                                {item.name}
                                {item.variant && <div className="pl-2 text-gray-600">- {item.variant.name}</div>}
                            </td>
                            <td className="text-right">{formatCurrency(item.price * item.quantity)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="border-t border-black pt-2">
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(order.subtotal)}</span></div>
                <div className="flex justify-between"><span>Tax:</span><span>{formatCurrency(order.totalTax)}</span></div>
                {order.serviceCharge > 0 && <div className="flex justify-between"><span>Service Charge:</span><span>{formatCurrency(order.serviceCharge)}</span></div>}
                {order.discount.amount > 0 && (
                    <div className="flex justify-between text-gray-600">
                        <span>Discount ({order.discount.reason}):</span>
                        <span>- {formatCurrency(order.discount.amount)}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-sm mt-1 border-t border-black pt-1">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(order.totalAmount)}</span>
                </div>
            </div>
            
            {order.payments && order.payments.length > 0 && (
                <div className="border-t border-dashed border-black pt-2 mt-2">
                    <div className="font-bold mb-1">PAYMENT DETAILS:</div>
                    {order.payments.map((payment, idx) => (
                        <div key={idx} className="flex justify-between">
                            <span>{payment.method}:</span>
                            <span>{formatCurrency(payment.amount)}</span>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="text-center mt-4">
                <p>Thank you for your visit!</p>
            </div>
        </div>
    );
};

export default PrintableReceipt;