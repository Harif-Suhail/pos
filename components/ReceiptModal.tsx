import React, { useState } from 'react';
import { Order, Tenant, Outlet } from '../types';
import { formatCurrency, formatTimestamp } from '../utils/helpers';
import PrintableReceipt from './PrintableReceipt';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    tenant: Tenant | null;
    outlet: Outlet | null;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, order, tenant, outlet }) => {
    const [showWhatsAppInput, setShowWhatsAppInput] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');

    if (!isOpen || !order || !tenant || !outlet) return null;

    const handlePrint = () => {
        window.print();
    };

    const generateReceiptText = () => {
        let text = `*${tenant.name}*\n`;
        text += `${outlet.name}\n`;
        text += `${outlet.address}\n\n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n`;
        text += `*RECEIPT*\n`;
        text += `Order #${order.orderNumber}\n`;
        text += `${formatTimestamp(order.createdAt)}\n`;
        text += `Type: ${order.type}${order.table ? ` (Table ${order.table})` : ''}\n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        order.items.forEach(item => {
            text += `${item.quantity}x ${item.name}`;
            if (item.variant) text += ` (${item.variant.name})`;
            text += ` - ${formatCurrency(item.price * item.quantity)}\n`;
        });
        
        text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        text += `Subtotal: ${formatCurrency(order.subtotal)}\n`;
        text += `Tax: ${formatCurrency(order.totalTax)}\n`;
        if (order.serviceCharge > 0) {
            text += `Service Charge: ${formatCurrency(order.serviceCharge)}\n`;
        }
        if (order.discount.amount > 0) {
            text += `Discount: -${formatCurrency(order.discount.amount)}\n`;
        }
        text += `━━━━━━━━━━━━━━━━━━━━\n`;
        text += `*TOTAL: ${formatCurrency(order.totalAmount)}*\n`;
        
        if (order.payments && order.payments.length > 0) {
            text += `\nPayment:\n`;
            order.payments.forEach(p => {
                text += `${p.method}: ${formatCurrency(p.amount)}\n`;
            });
        }
        
        text += `\nThank you for your visit! 🙏`;
        return text;
    };

    const handleWhatsAppShare = () => {
        if (!phoneNumber.trim()) {
            alert('Please enter a valid phone number');
            return;
        }

        // Remove any non-digit characters from phone number
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        
        // Generate receipt text
        const receiptText = generateReceiptText();
        
        // Encode the message for URL
        const encodedMessage = encodeURIComponent(receiptText);
        
        // Open WhatsApp with pre-filled message
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        
        // Reset state
        setShowWhatsAppInput(false);
        setPhoneNumber('');
    };

    const handleClose = () => {
        setShowWhatsAppInput(false);
        setPhoneNumber('');
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" aria-modal="true" role="dialog">
                <div className="bg-[var(--background-secondary)] rounded-lg shadow-xl p-6 w-full max-w-sm m-4 text-[var(--text-primary)]" onClick={e => e.stopPropagation()}>
                    <div className="text-center">
                        <svg className="w-16 h-16 mx-auto text-[var(--positive)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h2 className="text-2xl font-bold mt-4">Payment Successful</h2>
                        <p className="text-[var(--text-secondary)]">Order #{order.orderNumber} Closed</p>
                    </div>
                    <div className="bg-[var(--background-primary)] my-6 p-4 rounded-lg space-y-2 max-h-60 overflow-y-auto">
                        {order.items.map(item => (
                            <div key={item.uniqueId} className="flex justify-between text-sm">
                                <span className="text-[var(--text-tertiary)]">{item.quantity} x {item.name} {item.variant ? `(${item.variant.name})` : ''}</span>
                                <span className="text-[var(--text-primary)]">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-[var(--border-color)] pt-4 space-y-2">
                        <div className="flex justify-between text-[var(--text-tertiary)]">
                            <span>Subtotal</span>
                            <span>{formatCurrency(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-[var(--text-tertiary)]">
                            <span>Taxes</span>
                            <span>{formatCurrency(order.totalTax)}</span>
                        </div>
                        {order.serviceCharge > 0 && (
                            <div className="flex justify-between text-[var(--text-tertiary)]">
                                <span>Service Charge</span>
                                <span>{formatCurrency(order.serviceCharge)}</span>
                            </div>
                        )}
                        {order.discount.amount > 0 && (
                            <div className="flex justify-between text-[var(--warning)]">
                                <span>Discount</span>
                                <span>- {formatCurrency(order.discount.amount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-xl text-[var(--text-primary)]">
                            <span>Total Paid</span>
                            <span>{formatCurrency(order.totalAmount)}</span>
                        </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <button 
                            onClick={handlePrint} 
                            className="w-full bg-[var(--background-interactive)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold py-3 rounded-lg transition-colors duration-200"
                        >
                            Print Receipt
                        </button>
                        <button 
                            onClick={() => setShowWhatsAppInput(!showWhatsAppInput)} 
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                            WhatsApp Receipt
                        </button>
                    </div>
                    
                    {showWhatsAppInput && (
                        <div className="mt-4 p-3 bg-[var(--background-primary)] rounded-lg">
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Customer Phone Number
                            </label>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+1234567890 or 1234567890"
                                className="bg-[var(--background-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-lg focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] block w-full p-2.5 mb-2"
                            />
                            <button
                                onClick={handleWhatsAppShare}
                                disabled={!phoneNumber.trim()}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-[var(--disabled)] disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg transition-colors duration-200"
                            >
                                Send via WhatsApp
                            </button>
                        </div>
                    )}
                    
                    <button 
                        onClick={handleClose} 
                        className="w-full mt-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--accent-primary-text)] font-bold py-3 rounded-lg transition-colors duration-200"
                    >
                        Next Order
                    </button>
                </div>
            </div>
            {/* Hidden printable component - visible only when printing */}
            <div className="print-only" style={{ display: 'none' }}>
                <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .print-only, .print-only * {
                            visibility: visible !important;
                            display: block !important;
                        }
                        .print-only {
                            position: absolute;
                            left: 0;
                            top: 0;
                        }
                    }
                `}} />
                 <PrintableReceipt order={order} tenant={tenant} outlet={outlet} />
            </div>
        </>
    );
};

export default ReceiptModal;