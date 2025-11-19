import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { OrderItem, MenuItem, Order, DeliveryDetails, Permission } from '../types';
import { getUpsellSuggestion } from '../services/geminiService';
import { useAppContext } from '../hooks/useAppContext';
import { hasPermission } from '../utils/helpers';
import { printerService } from '../services/printerService';

// Components
import CategoryTabs from '../components/CategoryTabs';
import MenuGrid from '../components/MenuGrid';
import OrderSummary from '../components/OrderSummary';
import GeminiSuggestionModal from '../components/GeminiSuggestionModal';
import PaymentModal from '../components/PaymentModal';
import ReceiptModal from '../components/ReceiptModal';
import ActiveOrdersPanel from '../components/ActiveOrdersPanel';
import FloorPlanDisplay from '../components/FloorPlanDisplay';
import NotesModal from '../components/NotesModal';
import VariantSelectionModal from '../components/menu/VariantSelectionModal';
import InputDialog from '../components/common/InputDialog';
import ParkedOrdersPanel from '../components/ParkedOrdersPanel';
import DiscountModal from '../components/DiscountModal';


export default function POSView() {
    const { 
        currentUser, 
        currentTenant,
        currentOutlet,
        activeOrders,
        parkedOrders,
        menuItems,
        menuCategories,
        floorPlan,
        api,
        addToast,
    } = useAppContext();

    const [viewMode, setViewMode] = useState<'floorplan' | 'menu'>('floorplan');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    
    // UI State
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null);
    
    // Modal & Dialog State
    const [dialog, setDialog] = useState<{ type: 'transfer' | 'merge' | 'delivery' | null, data?: any }>({ type: null });
    const [itemForVariants, setItemForVariants] = useState<MenuItem | null>(null);
    const [itemForNotes, setItemForNotes] = useState<OrderItem | null>(null);
    const [isSuggestionModalOpen, setSuggestionModalOpen] = useState(false);
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);
    const [isNotesModalOpen, setNotesModalOpen] = useState(false);
    const [isParkedOrdersPanelOpen, setParkedOrdersPanelOpen] = useState(false);
    const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);
    const [suggestion, setSuggestion] = useState('');
    const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
    const [suggestionError, setSuggestionError] = useState('');

    // Set initial category when data loads
    useEffect(() => {
        if (menuCategories.length > 0 && !selectedCategory) {
            setSelectedCategory(menuCategories[0]);
        }
    }, [menuCategories, selectedCategory]);

    const selectedOrder = useMemo(() => {
        return activeOrders.find(order => order.id === selectedOrderId) ?? null;
    }, [activeOrders, selectedOrderId]);

    // Order Creation
    const handleSelectTable = useCallback(async (tableName: string) => {
        const existingOrder = activeOrders.find(o => o.table === tableName && o.status === 'OPEN');
        if (existingOrder) {
            setSelectedOrderId(existingOrder.id);
        } else {
            const newOrder = await api.createOrder({ type: 'Dine-In', table: tableName });
            setSelectedOrderId(newOrder.id);
        }
        setViewMode('menu');
    }, [activeOrders, api]);

    const handleNewTakeoutOrder = useCallback(async () => {
        const newOrder = await api.createOrder({ type: 'Takeout' });
        setSelectedOrderId(newOrder.id);
        setViewMode('menu');
    }, [api]);

    const handleNewDeliveryOrder = useCallback(async (details: DeliveryDetails) => {
        const newOrder = await api.createOrder({ type: 'Delivery', deliveryDetails: details });
        setSelectedOrderId(newOrder.id);
        setViewMode('menu');
        setDialog({ type: null });
    }, [api]);

    const handleApproveOrder = useCallback(async (orderId: string) => {
        await api.approveOrder(orderId);
        addToast(`Order for Table ${activeOrders.find(o => o.id === orderId)?.table} approved!`, 'success');
    }, [api, addToast, activeOrders]);


    // Item Management
    const handleSelectItem = useCallback((item: MenuItem) => {
        if (!selectedOrderId) {
            addToast("Please select an order first.", 'warning');
            return;
        }
        if (item.variants && item.variants.length > 0) {
            setItemForVariants(item);
        } else {
            api.addItemToOrder(selectedOrderId, { itemId: item.id });
        }
    }, [selectedOrderId, addToast, api]);

    const handleAddItemWithVariant = useCallback((item: MenuItem, variant: any) => {
         if (!selectedOrderId) return;
         api.addItemToOrder(selectedOrderId, { itemId: item.id, variantId: variant.id });
         setItemForVariants(null);
    }, [selectedOrderId, api]);

    const handleUpdateQuantity = useCallback((uniqueId: string, newQuantity: number) => {
        if (!selectedOrderId) return;
        api.updateItemQuantity(selectedOrderId, uniqueId, newQuantity);
    }, [selectedOrderId, api]);

    const handleSaveNotes = useCallback((uniqueId: string, notes: string) => {
        if (!selectedOrderId) return;
        api.updateItemNotes(selectedOrderId, uniqueId, notes);
        setNotesModalOpen(false);
        setItemForNotes(null);
    }, [selectedOrderId, api]);

    // Order Status
    const handleSendToKitchen = useCallback(() => {
        if (!selectedOrderId) return;
        // In a real app, this would trigger KOT printing/updates.
        // Here, it's more of a logical step. The KDS view will see items with status 'NEW'
        addToast("Order sent to kitchen!", 'info');
    }, [selectedOrderId, addToast]);

    const handleCancelOrder = useCallback(async () => {
        if (!selectedOrderId) return;
        
        // Permission check: Only users with CAN_CANCEL_ORDER permission can cancel
        if (!hasPermission(currentUser, Permission.CAN_CANCEL_ORDER)) {
            addToast('You do not have permission to cancel orders', 'error');
            return;
        }
        
        if (window.confirm("Are you sure you want to cancel this order? This cannot be undone.")) {
            await api.cancelOrder(selectedOrderId, "Cancelled by manager");
            addToast(`Order #${selectedOrder?.orderNumber} cancelled.`, 'success');
            
            // Log activity
            if (currentUser && currentOutlet) {
                api.logActivity({
                    tenantId: currentUser.tenantId,
                    outletId: currentOutlet.id,
                    userId: currentUser.id,
                    action: 'ORDER_CANCELLED',
                    details: { orderId: selectedOrderId, orderNumber: selectedOrder?.orderNumber }
                });
            }
            
            setSelectedOrderId(null);
        }
    }, [selectedOrderId, currentUser, currentOutlet, api, addToast, selectedOrder]);


    // Payment Flow
    const handleStartPayment = useCallback(() => {
        // Permission check: Only users with CAN_PROCESS_PAYMENT can start payment
        if (!hasPermission(currentUser, Permission.CAN_PROCESS_PAYMENT)) {
            addToast('You do not have permission to process payments', 'error');
            return;
        }
        
        if (selectedOrder?.items.length) setPaymentModalOpen(true);
    }, [selectedOrder, currentUser, addToast]);

    const handleCompletePayment = useCallback(async (payments: any[]) => {
        if (!selectedOrder) return;
        
        // Double-check permission
        if (!hasPermission(currentUser, Permission.CAN_PROCESS_PAYMENT)) {
            addToast('You do not have permission to process payments', 'error');
            return;
        }
        
        const paidOrder = await api.completePayment(selectedOrder.id, payments);
        
        // Log activity
        if (currentUser && currentOutlet) {
            api.logActivity({
                tenantId: currentUser.tenantId,
                outletId: currentOutlet.id,
                userId: currentUser.id,
                action: 'PAYMENT_COMPLETED',
                details: { 
                    orderId: selectedOrder.id, 
                    orderNumber: selectedOrder.orderNumber,
                    total: selectedOrder.total,
                    payments 
                }
            });
        }
        
        // Print receipt if printer is configured
        if (currentOutlet?.settings?.printerSettings?.receiptPrinterUrl && paidOrder && currentTenant) {
            try {
                const printerConfig = {
                    printerUrl: currentOutlet.settings.printerSettings.receiptPrinterUrl,
                    printerType: 'receipt' as const,
                    paperWidth: 80 as const,
                    cashDrawerPin: 2 as const
                };
                
                await printerService.printReceipt(paidOrder, currentTenant, currentOutlet, printerConfig);
                
                // Open cash drawer if payment includes cash
                const hasCashPayment = payments.some(p => p.method === 'Cash');
                if (hasCashPayment) {
                    await printerService.openCashDrawer(printerConfig);
                }
            } catch (error) {
                console.error('Printer error:', error);
                addToast('Payment completed, but printer failed', 'warning');
            }
        }
        
        setLastCompletedOrder(paidOrder);
        setSelectedOrderId(null);
        setPaymentModalOpen(false);
        setReceiptModalOpen(true);
    }, [selectedOrder, currentUser, currentOutlet, api, addToast]);

    const handleNewOrder = useCallback(() => {
        setReceiptModalOpen(false);
        setLastCompletedOrder(null);
        setViewMode('floorplan');
    }, []);

    // Park/Hold and Retrieve Orders
    const handleParkOrder = useCallback(async () => {
        if (!selectedOrderId) return;
        
        // Permission check
        if (!hasPermission(currentUser, Permission.CAN_PARK_ORDER)) {
            addToast('You do not have permission to park orders', 'error');
            return;
        }
        
        if (!selectedOrder?.items.length) {
            addToast('Cannot park an empty order', 'warning');
            return;
        }
        try {
            await api.parkOrder(selectedOrderId);
            setSelectedOrderId(null);
            setViewMode('floorplan');
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
    }, [selectedOrderId, selectedOrder, api, addToast]);

    const handleRetrieveOrder = useCallback(async (orderId: string) => {
        try {
            await api.retrieveParkedOrder(orderId);
            setSelectedOrderId(orderId);
            setViewMode('menu');
            setParkedOrdersPanelOpen(false);
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
    }, [api, addToast]);

    // Discount Management
    const handleApplyDiscount = useCallback(async (amount: number, reason: string) => {
        if (!selectedOrderId) return;
        
        // Permission check: Only users with CAN_APPLY_DISCOUNT can apply discounts
        if (!hasPermission(currentUser, Permission.CAN_APPLY_DISCOUNT)) {
            addToast('You do not have permission to apply discounts', 'error');
            setDiscountModalOpen(false);
            return;
        }
        
        try {
            await api.applyDiscount(selectedOrderId, amount, reason);
            addToast(amount > 0 ? 'Discount applied successfully' : 'Discount removed', 'success');
            
            // Log activity
            if (currentUser && currentOutlet) {
                api.logActivity({
                    tenantId: currentUser.tenantId,
                    outletId: currentOutlet.id,
                    userId: currentUser.id,
                    action: 'DISCOUNT_APPLIED',
                    details: { 
                        orderId: selectedOrderId, 
                        orderNumber: selectedOrder?.orderNumber,
                        amount, 
                        reason 
                    }
                });
            }
        } catch (error: any) {
            addToast(`Error: ${error.message}`, 'error');
        }
        setDiscountModalOpen(false);
    }, [selectedOrderId, currentUser, currentOutlet, selectedOrder, api, addToast]);

    // Gemini Suggestion
    const handleFetchSuggestion = useCallback(async () => {
        if (!selectedOrder?.items.length) {
            setSuggestionError('Add items to the order first.');
            setSuggestionModalOpen(true);
            return;
        }
        setIsLoadingSuggestion(true);
        setSuggestionError('');
        setSuggestion('');
        setSuggestionModalOpen(true);
        try {
            const result = await getUpsellSuggestion(selectedOrder.items);
            setSuggestion(result);
        } catch (error) {
            setSuggestionError('Could not fetch a suggestion.');
        } finally {
            setIsLoadingSuggestion(false);
        }
    }, [selectedOrder]);
    
    // Table Management
    const handleTransferOrder = useCallback(async (newTable: string) => {
        if (!selectedOrderId) return;
        await api.transferOrder(selectedOrderId, newTable);
        addToast(`Order transferred to Table ${newTable}`, 'success');
        setDialog({ type: null });
    }, [api, selectedOrderId, addToast]);

    const handleMergeOrder = useCallback(async (targetOrderNumberStr: string) => {
        if (!selectedOrderId) return;
        const targetOrder = activeOrders.find(o => o.orderNumber.toString() === targetOrderNumberStr && o.status === 'OPEN');
        if (targetOrder) {
            if (window.confirm(`Are you sure you want to merge order #${selectedOrder?.orderNumber} into order #${targetOrder.orderNumber}? This action cannot be undone.`)) {
                await api.mergeOrders(selectedOrderId, targetOrder.id);
                setSelectedOrderId(targetOrder.id);
                addToast('Orders merged successfully!', 'success');
            }
        } else {
            addToast("Target order not found or is not open.", 'error');
        }
        setDialog({ type: null });
    }, [api, selectedOrderId, activeOrders, selectedOrder, addToast]);

    const handleSplitOrder = useCallback(async () => {
        if (!selectedOrder || selectedOrder.items.length < 2) {
            addToast("Order must have at least two items to split.", 'warning');
            return;
        }
        const lastItem = selectedOrder.items[selectedOrder.items.length - 1];
        if (window.confirm(`Are you sure you want to split "${lastItem.name}" into a new, separate bill for this table?`)) {
            const newOrder = await api.splitOrder(selectedOrder.id, lastItem.uniqueId);
            setSelectedOrderId(newOrder.id);
            addToast('Order split successfully!', 'success');
        }
    }, [api, selectedOrder, addToast]);

    const filteredMenuItems = useMemo(() => {
        if (!selectedCategory) return [];
        return menuItems.filter(item => item.category === selectedCategory);
    }, [selectedCategory, menuItems]);

    if (!currentUser || !currentTenant || !currentOutlet) {
        return <div>Loading session...</div>
    }

    return (
        <main className="flex-grow grid grid-cols-1 lg:grid-cols-[300px_1fr_400px] p-4 gap-4 overflow-hidden">
            <ActiveOrdersPanel
                orders={activeOrders}
                selectedOrderId={selectedOrderId}
                onSelectOrder={setSelectedOrderId}
                onNewTakeoutOrder={handleNewTakeoutOrder}
                onNewDeliveryOrder={() => setDialog({ type: 'delivery' })}
                onApproveOrder={handleApproveOrder}
            />
            
            <div className="flex-grow flex flex-col overflow-hidden">
                 <div className="flex-shrink-0 bg-[var(--background-secondary)] p-2 rounded-lg mb-4 flex justify-between items-center">
                    <div className="bg-[var(--background-tertiary)] rounded-md inline-flex">
                        <button onClick={() => setViewMode('floorplan')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'floorplan' ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)]' : 'text-[var(--text-tertiary)] hover:bg-[var(--background-interactive)]'}`} aria-pressed={viewMode === 'floorplan'}>Floor Plan</button>
                        <button onClick={() => setViewMode('menu')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'menu' ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-text)]' : 'text-[var(--text-tertiary)] hover:bg-[var(--background-interactive)]'}`} aria-pressed={viewMode === 'menu'}>Menu</button>
                    </div>
                    <button
                        onClick={() => setParkedOrdersPanelOpen(true)}
                        className="relative bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        Parked Orders
                        {parkedOrders.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                                {parkedOrders.length}
                            </span>
                        )}
                    </button>
                </div>
                {viewMode === 'menu' && (
                    <>
                        <CategoryTabs selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
                        <MenuGrid items={filteredMenuItems} onSelectItem={handleSelectItem} />
                    </>
                )}
                {viewMode === 'floorplan' && <FloorPlanDisplay floorPlan={floorPlan} activeOrders={activeOrders} onSelectTable={handleSelectTable} />}
            </div>

            <aside className="overflow-hidden">
                <OrderSummary
                    order={selectedOrder}
                    currentUser={currentUser}
                    outlet={currentOutlet}
                    onUpdateQuantity={handleUpdateQuantity}
                    onFetchSuggestion={handleFetchSuggestion}
                    onStartPayment={handleStartPayment}
                    onSendToKitchen={handleSendToKitchen}
                    onCancelOrder={handleCancelOrder}
                    onParkOrder={handleParkOrder}
                    onApplyDiscount={() => {
                        if (!hasPermission(currentUser, Permission.CAN_APPLY_DISCOUNT)) {
                            addToast('You do not have permission to apply discounts', 'error');
                            return;
                        }
                        setDiscountModalOpen(true);
                    }}
                    onEditNotes={(item) => { setItemForNotes(item); setNotesModalOpen(true); }}
                    onTransferOrder={() => setDialog({ type: 'transfer'})}
                    onMergeOrder={() => setDialog({ type: 'merge'})}
                    onSplitOrder={handleSplitOrder}
                />
            </aside>

            {/* Modals & Dialogs */}
            <ParkedOrdersPanel
                parkedOrders={parkedOrders}
                onRetrieveOrder={handleRetrieveOrder}
                isOpen={isParkedOrdersPanelOpen}
                onClose={() => setParkedOrdersPanelOpen(false)}
            />
            <DiscountModal
                isOpen={isDiscountModalOpen}
                onClose={() => setDiscountModalOpen(false)}
                order={selectedOrder}
                onApplyDiscount={handleApplyDiscount}
            />
            <GeminiSuggestionModal isOpen={isSuggestionModalOpen} onClose={() => setSuggestionModalOpen(false)} suggestion={suggestion} isLoading={isLoadingSuggestion} error={suggestionError} />
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} order={selectedOrder} onConfirmPayment={handleCompletePayment} />
            <ReceiptModal isOpen={isReceiptModalOpen} onClose={handleNewOrder} order={lastCompletedOrder} tenant={currentTenant} outlet={currentOutlet} />
            <NotesModal isOpen={isNotesModalOpen} onClose={() => setNotesModalOpen(false)} item={itemForNotes} onSave={handleSaveNotes} />
            <VariantSelectionModal isOpen={!!itemForVariants} onClose={() => setItemForVariants(null)} item={itemForVariants} onSelectVariant={handleAddItemWithVariant} />
            
            {dialog.type === 'transfer' && (
                <InputDialog
                    title="Transfer Order"
                    message={`Enter new table number for Order #${selectedOrder?.orderNumber}:`}
                    inputType="text"
                    onConfirm={handleTransferOrder}
                    onClose={() => setDialog({ type: null })}
                />
            )}
            {dialog.type === 'merge' && (
                <InputDialog
                    title="Merge Order"
                    message="Enter the order number of the table you want to merge INTO:"
                    inputType="number"
                    onConfirm={handleMergeOrder}
                    onClose={() => setDialog({ type: null })}
                />
            )}
             {dialog.type === 'delivery' && (
                <InputDialog
                    title="New Delivery Order"
                    message="Enter customer details:"
                    inputType="delivery"
                    onConfirm={(details) => handleNewDeliveryOrder(details as DeliveryDetails)}
                    onClose={() => setDialog({ type: null })}
                />
            )}
        </main>
    );
}