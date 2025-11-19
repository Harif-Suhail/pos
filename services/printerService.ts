/**
 * Printer Service
 * Handles printing to ESC/POS compatible thermal printers
 * Supports: Receipt printing, KOT printing, Cash drawer opening
 */

import { Order, Outlet, Tenant, OrderItem, KitchenStation } from '../types';
import { formatCurrency, formatTimestamp } from '../utils/helpers';

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';

export const ESC_POS = {
    // Initialization
    INIT: `${ESC}@`,
    
    // Text formatting
    BOLD_ON: `${ESC}E1`,
    BOLD_OFF: `${ESC}E0`,
    UNDERLINE_ON: `${ESC}-1`,
    UNDERLINE_OFF: `${ESC}-0`,
    DOUBLE_HEIGHT: `${ESC}!0x10`,
    DOUBLE_WIDTH: `${ESC}!0x20`,
    NORMAL_TEXT: `${ESC}!0`,
    
    // Alignment
    ALIGN_LEFT: `${ESC}a0`,
    ALIGN_CENTER: `${ESC}a1`,
    ALIGN_RIGHT: `${ESC}a2`,
    
    // Line feed
    LINE_FEED: '\n',
    FEED_LINE: `${ESC}d1`,
    CUT_PAPER: `${GS}V0`, // Full cut
    PARTIAL_CUT: `${GS}V1`, // Partial cut
    
    // Cash drawer
    OPEN_DRAWER: `${ESC}p048`, // Opens cash drawer on pin 2
    OPEN_DRAWER_ALT: `${ESC}p148`, // Opens cash drawer on pin 5
    
    // Character size
    FONT_A: `${ESC}M0`,
    FONT_B: `${ESC}M1`,
};

export interface PrinterConfig {
    printerUrl: string; // IP address or USB path
    printerType: 'receipt' | 'kitchen';
    paperWidth: 48 | 58 | 80; // mm
    cashDrawerPin?: 2 | 5; // Pin for cash drawer
    codePage?: number; // Code page for character encoding
}

export class PrinterService {
    private static instance: PrinterService;
    
    private constructor() {}
    
    static getInstance(): PrinterService {
        if (!PrinterService.instance) {
            PrinterService.instance = new PrinterService();
        }
        return PrinterService.instance;
    }
    
    /**
     * Send raw ESC/POS commands to printer
     */
    private async sendToPrinter(url: string, data: string): Promise<boolean> {
        try {
            // For web-based printing, we need to use the Web Printing API or a bridge
            // This is a simplified version - in production, you'd use:
            // 1. QZ Tray (recommended for ESC/POS printing)
            // 2. WebUSB API (for USB printers)
            // 3. Network printing to printer's IP
            // 4. Desktop app bridge
            
            // Check if we're running in Electron or have a printing bridge
            if ((window as any).electronAPI?.print) {
                // Electron printing
                return await (window as any).electronAPI.print(url, data);
            } else if ((window as any).printBridge) {
                // Custom print bridge
                return await (window as any).printBridge.send(url, data);
            } else {
                // Fallback to network printing
                const response = await fetch(`http://${url}/print`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain',
                    },
                    body: data,
                });
                return response.ok;
            }
        } catch (error) {
            console.error('Printing error:', error);
            // Fallback to browser print dialog
            this.browserPrint();
            return false;
        }
    }
    
    /**
     * Fallback to browser print dialog
     */
    private browserPrint(): void {
        window.print();
    }
    
    /**
     * Format text to fit printer width
     */
    private padLine(left: string, right: string, width: number = 42): string {
        const totalLen = left.length + right.length;
        if (totalLen >= width) {
            return `${left}${right}\n`;
        }
        const spaces = ' '.repeat(width - totalLen);
        return `${left}${spaces}${right}\n`;
    }
    
    /**
     * Create horizontal line
     */
    private line(width: number = 42, char: string = '-'): string {
        return char.repeat(width) + '\n';
    }
    
    /**
     * Center text
     */
    private centerText(text: string, width: number = 42): string {
        const padding = Math.floor((width - text.length) / 2);
        return ' '.repeat(Math.max(0, padding)) + text + '\n';
    }
    
    /**
     * Print customer receipt
     */
    async printReceipt(
        order: Order,
        tenant: Tenant,
        outlet: Outlet,
        config: PrinterConfig
    ): Promise<boolean> {
        const currency = tenant.settings?.currency || 'USD';
        let receipt = ESC_POS.INIT;
        
        // Header
        receipt += ESC_POS.ALIGN_CENTER;
        receipt += ESC_POS.DOUBLE_HEIGHT;
        receipt += ESC_POS.BOLD_ON;
        receipt += tenant.name.toUpperCase() + '\n';
        receipt += ESC_POS.NORMAL_TEXT;
        receipt += ESC_POS.BOLD_OFF;
        receipt += outlet.name + '\n';
        receipt += outlet.address + '\n';
        receipt += this.line();
        
        // Order info
        receipt += ESC_POS.ALIGN_LEFT;
        receipt += `Order #: ${order.orderNumber}\n`;
        receipt += `Date: ${formatTimestamp(order.createdAt)}\n`;
        receipt += `Type: ${order.type}`;
        if (order.table) receipt += ` - Table ${order.table}`;
        receipt += '\n';
        
        if (order.customer) {
            receipt += `Customer: ${order.customer.name}\n`;
            receipt += `Phone: ${order.customer.phone}\n`;
        }
        
        if (order.deliveryDetails) {
            receipt += `Delivery to:\n`;
            receipt += `${order.deliveryDetails.customerName}\n`;
            receipt += `${order.deliveryDetails.customerPhone}\n`;
            receipt += `${order.deliveryDetails.address}\n`;
        }
        
        receipt += this.line();
        
        // Items
        receipt += ESC_POS.BOLD_ON;
        receipt += this.padLine('QTY ITEM', 'AMOUNT');
        receipt += ESC_POS.BOLD_OFF;
        receipt += this.line();
        
        order.items.forEach(item => {
            const itemName = item.variant 
                ? `${item.name} (${item.variant.name})`
                : item.name;
            const total = item.price * item.quantity;
            
            receipt += this.padLine(
                `${item.quantity}x ${itemName}`,
                formatCurrency(total, currency)
            );
            
            if (item.selectedModifiers && item.selectedModifiers.length > 0) {
                item.selectedModifiers.forEach(mod => {
                    receipt += `  + ${mod.name}\n`;
                });
            }
            
            if (item.notes) {
                receipt += `  Note: ${item.notes}\n`;
            }
        });
        
        receipt += this.line();
        
        // Totals
        receipt += this.padLine('Subtotal:', formatCurrency(order.subtotal, currency));
        receipt += this.padLine('Tax:', formatCurrency(order.totalTax, currency));
        
        if (order.serviceCharge > 0) {
            receipt += this.padLine('Service Charge:', formatCurrency(order.serviceCharge, currency));
        }
        
        if (order.discount.amount > 0) {
            receipt += this.padLine(
                `Discount (${order.discount.reason}):`,
                `-${formatCurrency(order.discount.amount, currency)}`
            );
        }
        
        receipt += this.line(42, '=');
        receipt += ESC_POS.DOUBLE_HEIGHT;
        receipt += ESC_POS.BOLD_ON;
        receipt += this.padLine('TOTAL:', formatCurrency(order.totalAmount, currency));
        receipt += ESC_POS.NORMAL_TEXT;
        receipt += ESC_POS.BOLD_OFF;
        receipt += this.line(42, '=');
        
        // Payment details
        if (order.payments && order.payments.length > 0) {
            receipt += '\n';
            receipt += ESC_POS.BOLD_ON;
            receipt += 'PAYMENT:\n';
            receipt += ESC_POS.BOLD_OFF;
            order.payments.forEach(payment => {
                receipt += this.padLine(payment.method, formatCurrency(payment.amount, currency));
            });
            
            const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
            const change = totalPaid - order.totalAmount;
            
            if (change > 0) {
                receipt += this.padLine('Change:', formatCurrency(change, currency));
            }
            receipt += this.line();
        }
        
        // Footer
        receipt += '\n';
        receipt += ESC_POS.ALIGN_CENTER;
        receipt += 'THANK YOU!\n';
        receipt += 'Please visit again\n';
        receipt += '\n';
        
        // Cut paper
        receipt += ESC_POS.FEED_LINE;
        receipt += ESC_POS.FEED_LINE;
        receipt += ESC_POS.CUT_PAPER;
        
        // Send to printer
        if (config.printerUrl) {
            return await this.sendToPrinter(config.printerUrl, receipt);
        } else {
            console.warn('No printer URL configured');
            return false;
        }
    }
    
    /**
     * Print KOT (Kitchen Order Ticket)
     */
    async printKOT(
        order: Order,
        outlet: Outlet,
        station: KitchenStation,
        items: OrderItem[],
        config: PrinterConfig
    ): Promise<boolean> {
        let kot = ESC_POS.INIT;
        
        // Header
        kot += ESC_POS.ALIGN_CENTER;
        kot += ESC_POS.DOUBLE_HEIGHT;
        kot += ESC_POS.BOLD_ON;
        kot += `*** ${station.toUpperCase()} ***\n`;
        kot += ESC_POS.NORMAL_TEXT;
        kot += ESC_POS.BOLD_OFF;
        kot += this.line();
        
        // Order info
        kot += ESC_POS.ALIGN_LEFT;
        kot += ESC_POS.DOUBLE_HEIGHT;
        kot += ESC_POS.BOLD_ON;
        kot += `Order #${order.orderNumber}\n`;
        kot += ESC_POS.NORMAL_TEXT;
        kot += ESC_POS.BOLD_OFF;
        
        kot += `${order.type}`;
        if (order.table) kot += ` - Table ${order.table}`;
        kot += '\n';
        kot += `Time: ${new Date(order.createdAt).toLocaleTimeString()}\n`;
        kot += this.line();
        
        // Items
        items.forEach(item => {
            kot += ESC_POS.DOUBLE_HEIGHT;
            kot += ESC_POS.BOLD_ON;
            kot += `${item.quantity}x ${item.name}\n`;
            kot += ESC_POS.NORMAL_TEXT;
            kot += ESC_POS.BOLD_OFF;
            
            if (item.variant) {
                kot += `   Variant: ${item.variant.name}\n`;
            }
            
            if (item.selectedModifiers && item.selectedModifiers.length > 0) {
                kot += '   Modifiers:\n';
                item.selectedModifiers.forEach(mod => {
                    kot += `   + ${mod.name}\n`;
                });
            }
            
            if (item.notes) {
                kot += ESC_POS.BOLD_ON;
                kot += `   NOTE: ${item.notes}\n`;
                kot += ESC_POS.BOLD_OFF;
            }
            
            kot += '\n';
        });
        
        kot += this.line();
        
        // Footer
        kot += ESC_POS.ALIGN_CENTER;
        kot += `${new Date().toLocaleTimeString()}\n`;
        
        // Cut paper
        kot += '\n\n';
        kot += ESC_POS.CUT_PAPER;
        
        // Send to printer
        if (config.printerUrl) {
            return await this.sendToPrinter(config.printerUrl, kot);
        } else {
            console.warn(`No printer URL configured for ${station}`);
            return false;
        }
    }
    
    /**
     * Open cash drawer
     */
    async openCashDrawer(config: PrinterConfig): Promise<boolean> {
        const command = config.cashDrawerPin === 5 
            ? ESC_POS.OPEN_DRAWER_ALT 
            : ESC_POS.OPEN_DRAWER;
        
        if (config.printerUrl) {
            return await this.sendToPrinter(config.printerUrl, command);
        } else {
            console.warn('No printer URL configured for cash drawer');
            return false;
        }
    }
    
    /**
     * Test printer connection
     */
    async testPrinter(config: PrinterConfig): Promise<boolean> {
        let test = ESC_POS.INIT;
        test += ESC_POS.ALIGN_CENTER;
        test += ESC_POS.BOLD_ON;
        test += 'PRINTER TEST\n';
        test += ESC_POS.BOLD_OFF;
        test += this.line();
        test += ESC_POS.ALIGN_LEFT;
        test += `Type: ${config.printerType}\n`;
        test += `Paper: ${config.paperWidth}mm\n`;
        test += `URL: ${config.printerUrl}\n`;
        test += this.line();
        test += ESC_POS.ALIGN_CENTER;
        test += 'Test successful!\n';
        test += '\n\n';
        test += ESC_POS.CUT_PAPER;
        
        return await this.sendToPrinter(config.printerUrl, test);
    }
    
    /**
     * Print daily Z-report (end of day report)
     */
    async printZReport(
        reportData: {
            date: Date;
            totalSales: number;
            totalOrders: number;
            cashSales: number;
            cardSales: number;
            upiSales: number;
            discounts: number;
            voids: number;
        },
        outlet: Outlet,
        config: PrinterConfig
    ): Promise<boolean> {
        let report = ESC_POS.INIT;
        
        report += ESC_POS.ALIGN_CENTER;
        report += ESC_POS.DOUBLE_HEIGHT;
        report += ESC_POS.BOLD_ON;
        report += 'Z REPORT\n';
        report += ESC_POS.NORMAL_TEXT;
        report += ESC_POS.BOLD_OFF;
        report += outlet.name + '\n';
        report += reportData.date.toLocaleDateString() + '\n';
        report += this.line();
        
        report += ESC_POS.ALIGN_LEFT;
        report += this.padLine('Total Orders:', reportData.totalOrders.toString());
        report += this.line();
        
        report += ESC_POS.BOLD_ON;
        report += 'SALES BREAKDOWN:\n';
        report += ESC_POS.BOLD_OFF;
        report += this.padLine('Cash:', formatCurrency(reportData.cashSales));
        report += this.padLine('Card:', formatCurrency(reportData.cardSales));
        report += this.padLine('UPI:', formatCurrency(reportData.upiSales));
        report += this.line();
        
        report += this.padLine('Discounts:', `-${formatCurrency(reportData.discounts)}`);
        report += this.padLine('Voids:', reportData.voids.toString());
        report += this.line(42, '=');
        
        report += ESC_POS.DOUBLE_HEIGHT;
        report += ESC_POS.BOLD_ON;
        report += this.padLine('TOTAL SALES:', formatCurrency(reportData.totalSales));
        report += ESC_POS.NORMAL_TEXT;
        report += ESC_POS.BOLD_OFF;
        report += this.line(42, '=');
        
        report += '\n';
        report += ESC_POS.ALIGN_CENTER;
        report += new Date().toLocaleString() + '\n';
        report += '\n\n';
        report += ESC_POS.CUT_PAPER;
        
        return await this.sendToPrinter(config.printerUrl, report);
    }
}

// Export singleton instance
export const printerService = PrinterService.getInstance();
