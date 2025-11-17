import React from 'react';
import { Order, Tenant, Outlet } from '../types';
import { formatCurrency, formatTimestamp } from '../utils/helpers';

interface PrintableReceiptProps {
    order: Order;
    tenant: Tenant;
    outlet: Outlet;
}

const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ order, tenant, outlet }) => {
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
                <div className="flex justify-between font-bold text-sm mt-1"><span>TOTAL:</span><span>{formatCurrency(order.totalAmount)}</span></div>
            </div>
            <div className="text-center mt-4">
                <p>Thank you for your visit!</p>
            </div>
        </div>
    );
};

export default PrintableReceipt;