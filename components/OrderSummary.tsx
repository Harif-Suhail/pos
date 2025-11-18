import React, { memo } from 'react';
import { Order, OrderItem, User, Outlet, Permission } from '../types';
import { formatCurrency, hasPermission } from '../utils/helpers';

interface OrderSummaryProps {
    order: Order | null;
    currentUser: User;
    outlet: Outlet;
    onUpdateQuantity: (uniqueId: string, newQuantity: number) => void;
    onFetchSuggestion: () => void;
    onStartPayment: () => void;
    onSendToKitchen: () => void;
    onCancelOrder: () => void;
    onParkOrder: () => void;
    onApplyDiscount: () => void;
    onEditNotes: (item: OrderItem) => void;
    onTransferOrder: () => void;
    onMergeOrder: () => void;
    onSplitOrder: () => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = memo(({ 
    order, currentUser, outlet, 
    onUpdateQuantity, onFetchSuggestion, onStartPayment, onSendToKitchen, onCancelOrder, onParkOrder, onApplyDiscount, onEditNotes,
    onTransferOrder, onMergeOrder, onSplitOrder 
}) => {
    
    if (!order) {
        return (
             <div className="bg-[var(--background-secondary)] rounded-lg shadow-lg h-full flex flex-col p-4 items-center justify-center">
                <p className="text-[var(--text-secondary)] text-center">Select an order, or create a new one to get started.</p>
             </div>
        );
    }

    const { items, subtotal, totalTax, serviceCharge, totalAmount } = order;

    const getOrderTitle = () => {
        if (order.type === 'QR' && order.table) return `QR Table ${order.table}`;
        if (order.type === 'Dine-In' && order.table) return `Table ${order.table}`;
        return `${order.type} #${order.orderNumber}`;
    }

    const isOrderLocked = order.status !== 'OPEN';
    const isDineInOpen = order.type === 'Dine-In' && order.status === 'OPEN';

    return (
        <div className="bg-[var(--background-secondary)] rounded-lg shadow-lg h-full flex flex-col p-4">
            <div className="border-b border-[var(--border-color)] pb-3 mb-3">
                <div className="flex justify-between items-start">
                    <div>
                         <h2 className="text-2xl font-bold text-[var(--text-primary)]">Order: {getOrderTitle()}</h2>
                         {order.deliveryDetails && (
                            <div className="text-xs text-[var(--text-secondary)] mt-1">
                                <p><strong>To:</strong> {order.deliveryDetails.customerName} ({order.deliveryDetails.customerPhone})</p>
                                <p><strong>At:</strong> {order.deliveryDetails.address}</p>
                            </div>
                        )}
                    </div>
                    {hasPermission(currentUser, Permission.CAN_CANCEL_ORDER) && (
                        <button 
                            onClick={onCancelOrder} 
                            className="px-3 py-1 text-xs font-medium rounded-md transition-colors bg-[var(--negative)] hover:bg-[var(--negative-hover)] text-[var(--accent-primary-text)] disabled:bg-[var(--disabled)] disabled:cursor-not-allowed" 
                            aria-label="Cancel Order"
                            disabled={order.status === 'PAID' || order.status === 'CANCELLED'}
                            title={!hasPermission(currentUser, Permission.CAN_CANCEL_ORDER) ? "You don't have permission to cancel orders" : "Cancel this order"}
                        >
                            Cancel
                        </button>
                    )}
                </div>
                {isDineInOpen && (
                    <div className="flex items-center space-x-2 mt-2">
                        <button onClick={onTransferOrder} className="text-xs px-2 py-1 rounded bg-[var(--background-tertiary)] hover:bg-[var(--background-interactive)]">Transfer</button>
                        <button onClick={onMergeOrder} className="text-xs px-2 py-1 rounded bg-[var(--background-tertiary)] hover:bg-[var(--background-interactive)]">Merge</button>
                        <button onClick={onSplitOrder} className="text-xs px-2 py-1 rounded bg-[var(--background-tertiary)] hover:bg-[var(--background-interactive)]">Split Bill</button>
                    </div>
                )}
            </div>
            
            {items.length === 0 ? (
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-[var(--text-secondary)]">Add items to this order.</p>
                </div>
            ) : (
                <div className="flex-grow overflow-y-auto -mr-2 pr-2">
                    {items.map(item => (
                        <div key={item.uniqueId} className="flex items-start justify-between py-3">
                            <div className="flex-grow">
                                <p className="font-semibold text-[var(--text-primary)]">{item.name}</p>
                                <div className="text-xs text-[var(--text-secondary)] pl-2">
                                    {item.variant && <div>- {item.variant.name}</div>}
                                    {item.selectedModifiers?.map(mod => <div key={mod.id}>+ {mod.name}</div>)}
                                </div>
                                {item.notes && <p className="text-xs text-[var(--info-text)] mt-1 pl-2 border-l-2 border-[var(--info-border)]">Note: {item.notes}</p>}
                            </div>
                            <div className="flex items-center space-x-2 shrink-0 ml-2">
                                <button onClick={() => onEditNotes(item)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50" aria-label={`Add note for ${item.name}`} disabled={isOrderLocked}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </button>
                                <button onClick={() => onUpdateQuantity(item.uniqueId, item.quantity - 1)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50" aria-label={`Decrease quantity of ${item.name}`} disabled={isOrderLocked}>&minus;</button>
                                <span className="font-bold text-[var(--text-primary)] w-5 text-center">{item.quantity}</span>
                                <button onClick={() => onUpdateQuantity(item.uniqueId, item.quantity + 1)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50" aria-label={`Increase quantity of ${item.name}`} disabled={isOrderLocked}>&#43;</button>
                                <p className="w-16 text-right font-semibold text-[var(--text-primary)]">{formatCurrency(item.price * item.quantity)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="border-t border-[var(--border-color)] mt-auto pt-4 space-y-2">
                <div className="flex justify-between text-[var(--text-tertiary)]">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                </div>
                {outlet.settings.taxes.map(tax => (
                    <div key={tax.name} className="flex justify-between text-[var(--text-tertiary)]">
                        <span>{tax.name} ({tax.rate}%)</span>
                        <span>{formatCurrency(totalTax)}</span>
                    </div>
                ))}
                {outlet.settings.serviceCharge.isEnabled && (
                     <div className="flex justify-between text-[var(--text-tertiary)]">
                        <span>Service Charge ({outlet.settings.serviceCharge.rate}%)</span>
                        <span>{formatCurrency(serviceCharge)}</span>
                    </div>
                )}
                {order.discount.amount > 0 && (
                    <div className="flex justify-between text-[var(--warning)]">
                        <span>Discount</span>
                        <span>- {formatCurrency(order.discount.amount)}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-xl text-[var(--text-primary)] pt-1">
                    <span>Total</span>
                    <span>{formatCurrency(totalAmount)}</span>
                </div>
                {!isOrderLocked && items.length > 0 && hasPermission(currentUser, Permission.CAN_APPLY_DISCOUNT) && (
                    <button
                        onClick={onApplyDiscount}
                        className="w-full bg-[var(--warning)] hover:bg-[var(--warning-hover)] text-white font-medium py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mt-2"
                        title="Apply or update discount on this order"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {order.discount.amount > 0 ? 'Update Discount' : 'Apply Discount'}
                    </button>
                )}
                <div className="grid grid-cols-2 gap-3 pt-2">
                     <button
                        onClick={onFetchSuggestion}
                        className="w-full bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover)] text-[var(--accent-primary-text)] font-bold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 disabled:bg-[var(--disabled)] disabled:cursor-not-allowed"
                        disabled={items.length === 0 || isOrderLocked}
                    >
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" /></svg>
                        <span>Suggest</span>
                    </button>
                    <button
                        onClick={onSendToKitchen}
                        disabled={items.length === 0 || isOrderLocked}
                        className="w-full bg-[var(--warning)] hover:bg-[var(--warning-hover)] disabled:bg-[var(--disabled)] disabled:cursor-not-allowed text-[var(--accent-primary-text)] font-bold py-3 rounded-lg transition-colors duration-200"
                    >
                        Send to Kitchen
                    </button>
                    {hasPermission(currentUser, Permission.CAN_PARK_ORDER) && (
                        <button
                            onClick={onParkOrder}
                            disabled={items.length === 0}
                            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-[var(--disabled)] disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                            title={!hasPermission(currentUser, Permission.CAN_PARK_ORDER) ? "You don't have permission to park orders" : "Park this order for later"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            Park Order
                        </button>
                    )}
                </div>
                {hasPermission(currentUser, Permission.CAN_PROCESS_PAYMENT) && (
                    <button
                        onClick={onStartPayment}
                        disabled={items.length === 0}
                        className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:bg-[var(--disabled)] disabled:cursor-not-allowed text-[var(--accent-primary-text)] font-bold py-3 rounded-lg transition-colors duration-200 mt-2"
                        title={!hasPermission(currentUser, Permission.CAN_PROCESS_PAYMENT) ? "You don't have permission to process payments" : "Process payment for this order"}
                    >
                        Pay Now
                    </button>
                )}
            </div>
        </div>
    );
});

OrderSummary.displayName = 'OrderSummary';

export default OrderSummary;