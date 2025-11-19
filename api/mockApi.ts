import { Tenant, Outlet, User, Order, MenuItem, FloorPlanObject, Shift, Payment, InventoryItem, StockMovement, OrderItem, Variant, Tax, DeliveryDetails, UserRole, ActivityLog, Customer, CustomerAddress } from '../types';
import { initializeDb } from './mockData';
import { ToastType } from '../context/AppContext';

// Initialize the DB on first load
initializeDb();

// Batching and debouncing for localStorage writes
let batchUpdateTimer: NodeJS.Timeout | null = null;
const pendingWrites: Map<string, any[]> = new Map();

const scheduleBatchWrite = () => {
    if (batchUpdateTimer) return;
    
    batchUpdateTimer = setTimeout(() => {
        pendingWrites.forEach((data, tableName) => {
            localStorage.setItem(`db_${tableName}`, JSON.stringify(data));
        });
        pendingWrites.clear();
        batchUpdateTimer = null;
    }, 100); // Batch writes every 100ms
};

// --- Helper Functions to simulate a DB ---
const getTable = <T>(tableName: string): T[] => {
    // Check pending writes first
    if (pendingWrites.has(tableName)) {
        return pendingWrites.get(tableName) as T[];
    }
    
    try {
        return JSON.parse(localStorage.getItem(`db_${tableName}`) || '[]');
    } catch {
        return [];
    }
};

const setTable = <T>(tableName: string, data: T[]): void => {
    pendingWrites.set(tableName, data);
    scheduleBatchWrite();
};

const addToTable = <T extends { id: string }>(tableName: string, record: T): T => {
    const table = getTable<T>(tableName);
    table.push(record);
    setTable(tableName, table);
    return record;
};

const updateInTable = <T extends { id: string }>(tableName: string, record: T): T => {
    const table = getTable<T>(tableName);
    const index = table.findIndex(r => r.id === record.id);
    if (index > -1) {
        table[index] = record;
        setTable(tableName, table);
    }
    return record;
};

const deleteFromTable = <T extends { id: string }>(tableName: string, id: string): void => {
    let table = getTable<T>(tableName);
    table = table.filter(r => r.id !== id);
    setTable(tableName, table);
};


// --- API Simulation ---
class Api {
    private isOnline = true;
    private actionQueue: { actionName: string; args: any[] }[] = [];
    private stateChangeCallback: (() => void) | null = null;
    private toastCallback: ((message: string, type?: ToastType) => void) | null = null;
    
    // Auth context (set after login or for public session)
    private tenantId: string | null = null;
    private outletId: string | null = null;
    private userId: string | null = null;
    private userRole: UserRole | null = null;

    constructor() {
        this.loadActionQueue();
    }

    // Optimized delay: 0ms for instant operations, 50ms for operations that should feel async
    private async simulateDelay<T>(data: T, delayMs: number = 0): Promise<T> {
        if (delayMs === 0) return Promise.resolve(data);
        return new Promise(resolve => setTimeout(() => resolve(data), delayMs));
    }
    
    private queueAction(actionName: string, ...args: any[]) {
        this.actionQueue.push({ actionName, args });
        this.saveActionQueue();
        if (this.toastCallback) {
            this.toastCallback("You are offline. Action saved and will sync when you're back online.", 'warning');
        }
    }

    private saveActionQueue() {
        localStorage.setItem('action_queue', JSON.stringify(this.actionQueue));
    }

    private loadActionQueue() {
        this.actionQueue = JSON.parse(localStorage.getItem('action_queue') || '[]');
    }
    
    async processQueue() {
        if (this.actionQueue.length === 0) return;
        if (!this.userId) {
            console.log("Action queue has items, but user is not authenticated. Postponing sync.");
            return;
        }

        console.log(`Processing ${this.actionQueue.length} queued actions...`);
        if (this.toastCallback) this.toastCallback(`Syncing ${this.actionQueue.length} offline actions...`, 'info');
        const queueToProcess = [...this.actionQueue];
        this.actionQueue = [];
        this.saveActionQueue();

        for (const { actionName, args } of queueToProcess) {
            const method = (this as any)[actionName];
            if (typeof method === 'function') {
                try {
                    await method.apply(this, args);
                    console.log(`Successfully executed queued action: ${actionName}`);
                } catch (error) {
                    console.error(`Failed to execute queued action: ${actionName}`, error);
                }
            }
        }
        
        console.log("Queue processing finished.");
        if (this.stateChangeCallback) this.stateChangeCallback();
    }

    async syncPendingOrders() {
        if (!this.isOnline) return;
        const orders = getTable<Order>('orders');
        const pendingOrders = orders.filter(o => o.needsSync && o.outletId === this.outletId);

        if (pendingOrders.length === 0) return;

        console.log(`Syncing ${pendingOrders.length} orders...`);
        if (this.toastCallback) this.toastCallback(`Syncing ${pendingOrders.length} offline orders...`, 'info');
        
        for (const order of pendingOrders) {
            await this.simulateDelay(null); // Simulate network request
            order.needsSync = false;
            updateInTable('orders', order);
        }
        
        console.log("Sync complete.");
        if (this.stateChangeCallback) this.stateChangeCallback();
    }
    
    setIsOnline(isOnline: boolean, toastCallback?: (message: string, type?: ToastType) => void) {
        this.isOnline = isOnline;
        if (toastCallback) this.toastCallback = toastCallback;
        if (isOnline) {
            this.syncPendingOrders();
            this.processQueue();
        }
    }

    onStateChange(callback: () => void) {
        this.stateChangeCallback = callback;
    }

    // --- Public API Methods ---

    // Auth & Context (can keep minimal delay for auth)
    getTenants = () => this.simulateDelay(getTable<Tenant>('tenants'), 0);
    getOutlets = (tenantId: string) => this.simulateDelay(getTable<Outlet>('outlets').filter(o => o.tenantId === tenantId), 0);
    getUsers = (outletId: string) => this.simulateDelay(getTable<User>('users').filter(u => u.assignedOutletIds.includes(outletId)), 0);

    // Public methods for QR session setup
    getOutletById = (outletId: string) => this.simulateDelay(getTable<Outlet>('outlets').find(o => o.id === outletId), 0);
    getTenantById = (tenantId: string) => this.simulateDelay(getTable<Tenant>('tenants').find(t => t.id === tenantId), 0);

    setPublicContext(tenantId: string, outletId: string) {
        this.tenantId = tenantId;
        this.outletId = outletId;
        this.userId = null;
        this.userRole = null;
    }

    async loginSuperAdmin(username: string, password: string): Promise<boolean> {
        await this.simulateDelay(null, 100); // Small delay for auth to feel secure
        
        // Get SuperAdmin account from storage
        const superAdmins = getTable<import('../types').SuperAdminAccount>('superAdmins');
        
        // Debug logging
        console.log('SuperAdmin accounts found:', superAdmins);
        console.log('Attempting login with username:', username);
        
        // If no superAdmins exist, create a default one
        if (superAdmins.length === 0) {
            const defaultAdmin: import('../types').SuperAdminAccount = {
                id: 'sa1',
                username: 'admin',
                password: 'admin123',
                name: 'System Administrator',
                email: 'admin@system.com'
            };
            superAdmins.push(defaultAdmin);
            setTable('superAdmins', superAdmins);
            console.log('Created default SuperAdmin account');
        }
        
        const admin = superAdmins.find(a => a.username === username && a.password === password);
        
        if (!admin) {
            console.error('Login failed - no matching admin found');
            throw new Error("Invalid username or password");
        }

        // Set authentication context for SuperAdmin
        this.userId = admin.id;
        this.userRole = 'SuperAdmin';
        // SuperAdmin doesn't need tenant/outlet context
        
        console.log('SuperAdmin login successful:', admin.name);
        return true;
    }

    async login(userId: string, pin: string) {
        await this.simulateDelay(null, 100); // Small delay for auth to feel secure
        const users = getTable<User>('users');
        const user = users.find(u => u.id === userId);
        if (!user || user.pin !== pin) throw new Error("Invalid user or PIN");

        const tenants = getTable<Tenant>('tenants');
        const tenant = tenants.find(t => t.id === user.tenantId);
        if (!tenant) throw new Error("Tenant not found");

        const outlets = getTable<Outlet>('outlets');
        const outlet = outlets.find(o => o.id === user.assignedOutletIds[0]);
        if (!outlet) throw new Error("Outlet not found");

        this.userId = user.id;
        this.userRole = user.role;
        this.tenantId = tenant.id;
        this.outletId = outlet.id;

        return { user, tenant, outlet };
    }

    logout() {
        this.userId = null;
        this.userRole = null;
        this.tenantId = null;
        this.outletId = null;
    }

    // Data Fetching (read operations can be instant)
    getActiveOrders = () => this.simulateDelay(getTable<Order>('orders').filter(o => o.outletId === this.outletId && o.status !== 'PAID' && o.status !== 'CANCELLED'), 0);
    getCompletedOrders = (outletId: string | 'all' = this.outletId!) => {
        const orders = getTable<Order>('orders').filter(o => o.status === 'PAID' || o.status === 'CANCELLED');
        if (outletId === 'all' && (this.userRole === 'BrandAdmin')) {
            return this.simulateDelay(orders.filter(o => o.tenantId === this.tenantId), 0);
        }
        return this.simulateDelay(orders.filter(o => o.outletId === outletId), 0);
    };
    
    getMenu = () => {
        const allMenuItems = getTable<MenuItem>('menuItems').filter(m => m.tenantId === this.tenantId);
        
        // Filter by outlet availability if outlet is set
        if (this.outletId) {
            return this.simulateDelay(
                allMenuItems.filter(item => 
                    !item.availableOutletIds || // If not specified, available everywhere
                    item.availableOutletIds.length === 0 || // If empty array, available everywhere
                    item.availableOutletIds.includes(this.outletId!) // Otherwise, check if current outlet is in the list
                ),
                0
            );
        }
        
        return this.simulateDelay(allMenuItems, 0);
    };
    
    getFloorPlan = () => {
        const outlet = getTable<Outlet>('outlets').find(o => o.id === this.outletId);
        return this.simulateDelay(outlet?.floorPlan || [], 0);
    };
    getInventory = () => this.simulateDelay(getTable<InventoryItem>('inventoryItems').filter(i => i.tenantId === this.tenantId), 0);
    getAllUsersForTenant = () => this.simulateDelay(getTable<User>('users').filter(u => u.tenantId === this.tenantId), 0);
    getStockMovements = (outletId: string | 'all' = this.outletId!) => {
        const movements = getTable<StockMovement>('stockMovements');
         if (outletId === 'all' && (this.userRole === 'BrandAdmin')) {
            return this.simulateDelay(movements.filter(sm => sm.tenantId === this.tenantId), 0);
        }
        return this.simulateDelay(movements.filter(sm => sm.outletId === outletId), 0);
    };
    
    // Order Management (Offline-first)
    createOrder = async (data: { type: Order['type'], table?: string, customer?: { name: string, phone: string}, deliveryDetails?: DeliveryDetails }): Promise<Order> => {
        if (!this.tenantId || !this.outletId) throw new Error("Not authenticated");
        
        const orders = getTable<Order>('orders').filter(o => o.outletId === this.outletId);
        const maxOrderNumber = orders.reduce((max, o) => o.orderNumber > max ? o.orderNumber : max, 0);

        // Create or update customer if customer info provided
        let customerId: string | undefined;
        if (data.customer?.phone) {
            customerId = await this._upsertCustomerFromOrder(
                data.customer.phone,
                data.customer.name,
                data.deliveryDetails?.address
            );
        } else if (data.deliveryDetails?.customerPhone) {
            customerId = await this._upsertCustomerFromOrder(
                data.deliveryDetails.customerPhone,
                data.deliveryDetails.customerName,
                data.deliveryDetails.address
            );
        }
        
        const newOrder: Order = {
            id: `ord_${Date.now()}`,
            tenantId: this.tenantId,
            outletId: this.outletId,
            orderNumber: maxOrderNumber + 1,
            type: data.type,
            table: data.table,
            customer: data.customer,
            customerId,
            deliveryDetails: data.deliveryDetails,
            status: data.type === 'QR' ? 'PENDING_APPROVAL' : 'OPEN',
            items: [],
            subtotal: 0,
            totalTax: 0,
            serviceCharge: 0,
            totalAmount: 0,
            discount: { amount: 0, reason: '', appliedBy: '' },
            payments: [],
            createdAt: Date.now(),
            createdBy: this.userId || 'qr_customer',
            needsSync: !this.isOnline,
        };
        addToTable('orders', newOrder);
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(newOrder, 0); // Instant for creating orders
    };

    addItemToOrder = async (orderId: string, itemData: { itemId: string, variantId?: string, modifierIds?: string[] }): Promise<Order> => {
        let order = getTable<Order>('orders').find(o => o.id === orderId);
        if (!order || !['OPEN', 'PENDING_APPROVAL'].includes(order.status)) throw new Error("Order not found or is locked");

        const menuItems = getTable<MenuItem>('menuItems');
        const menuItem = menuItems.find(m => m.id === itemData.itemId);
        if (!menuItem) throw new Error("Menu item not found");
        
        const variant = menuItem.variants?.find(v => v.id === itemData.variantId);
        
        const newItem: OrderItem = {
            uniqueId: `item_${Date.now()}`,
            itemId: menuItem.id,
            name: menuItem.name,
            category: menuItem.category, // Include category for reporting
            quantity: 1,
            price: variant ? variant.price : menuItem.basePrice,
            variant: variant,
            selectedModifiers: [],
            kotStatus: 'NEW',
            station: menuItem.station,
        };
        
        order.items.push(newItem);
        this.recalculateTotals(order);
        if (!this.isOnline) order.needsSync = true;

        updateInTable('orders', order);
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(order, 0); // Instant for adding items
    };
    
    updateItemQuantity = async (orderId: string, uniqueId: string, quantity: number): Promise<Order> => {
         let order = getTable<Order>('orders').find(o => o.id === orderId);
         if (!order) throw new Error("Order not found");

         const itemIndex = order.items.findIndex(i => i.uniqueId === uniqueId);
         if (itemIndex > -1) {
             if (quantity <= 0) {
                 order.items.splice(itemIndex, 1);
             } else {
                 order.items[itemIndex].quantity = quantity;
             }
             this.recalculateTotals(order);
             if (!this.isOnline) order.needsSync = true;
             updateInTable('orders', order);
             if (this.stateChangeCallback) this.stateChangeCallback();
         }
         return this.simulateDelay(order, 0); // Instant for quantity updates
    };
    
    updateItemNotes = async (orderId: string, uniqueId: string, notes: string): Promise<Order> => {
         let order = getTable<Order>('orders').find(o => o.id === orderId);
         if (!order) throw new Error("Order not found");
         const item = order.items.find(i => i.uniqueId === uniqueId);
         if (item) {
             item.notes = notes;
             if (!this.isOnline) order.needsSync = true;
             updateInTable('orders', order);
             if (this.stateChangeCallback) this.stateChangeCallback();
         }
         return this.simulateDelay(order, 0); // Instant for notes
    };
    
    updateKotStatus = async (orderId: string, uniqueId: string, status: OrderItem['kotStatus']): Promise<Order> => {
        let order = getTable<Order>('orders').find(o => o.id === orderId);
        if (!order) throw new Error("Order not found");
        const item = order.items.find(i => i.uniqueId === uniqueId);
        if (item) {
            item.kotStatus = status;
            if (!this.isOnline) order.needsSync = true;
            updateInTable('orders', order);
            if (this.stateChangeCallback) this.stateChangeCallback();
        }
        return this.simulateDelay(order, 0); // Instant for KOT status
    }

    recalculateTotals(order: Order) {
        const outlet = getTable<Outlet>('outlets').find(o => o.id === order.outletId);
        if (!outlet) return;

        order.subtotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        
        order.totalTax = outlet.settings.taxes.reduce((acc, tax) => {
            if (!tax.isInclusive) {
                return acc + (order.subtotal * (tax.rate / 100));
            }
            return acc;
        }, 0);
        
        const serviceChargeRate = outlet.settings.serviceCharge.isEnabled ? outlet.settings.serviceCharge.rate : 0;
        order.serviceCharge = order.subtotal * (serviceChargeRate / 100);
        
        order.totalAmount = order.subtotal + order.totalTax + order.serviceCharge - order.discount.amount;
    }
    
    applyDiscount = async (orderId: string, discountAmount: number, reason: string): Promise<Order> => {
        let order = getTable<Order>('orders').find(o => o.id === orderId);
        if (!order) throw new Error("Order not found");
        if (order.status !== 'OPEN') throw new Error("Cannot apply discount to closed order");
        
        const maxDiscount = order.subtotal + order.totalTax + order.serviceCharge;
        if (discountAmount < 0 || discountAmount > maxDiscount) {
            throw new Error("Invalid discount amount");
        }
        
        order.discount = {
            amount: discountAmount,
            reason: reason,
            appliedBy: this.userId!
        };
        
        this.recalculateTotals(order);
        updateInTable('orders', order);
        
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(order, 0); // Instant for discounts
    };

    completePayment = async (orderId: string, payments: Payment[]): Promise<Order> => {
        let order = getTable<Order>('orders').find(o => o.id === orderId);
        if (!order) throw new Error("Order not found");
        
        order.status = 'PAID';
        order.payments = payments;
        order.closedAt = Date.now();
        order.closedBy = this.userId!;
        if (!this.isOnline) order.needsSync = true;
        
        updateInTable('orders', order);
        
        await this._deductInventoryForOrder(order);

        // Update customer's total spent
        if (order.customerId) {
            const customer = getTable<Customer>('customers').find(c => c.id === order.customerId);
            if (customer) {
                customer.totalSpent += order.totalAmount;
                customer.updatedAt = Date.now();
                updateInTable('customers', customer);
            }
        }

        // Update shift with cash payments
        const currentShift = await this.getCurrentShift();
        const cashPayment = payments.find(p => p.method === 'Cash');
        
        if (cashPayment) {
            if (!currentShift) {
                // Warning: No active shift but accepting payment anyway
                if (this.toastCallback) {
                    this.toastCallback('Warning: No active shift. Cash payment accepted but not tracked in shift.', 'warning');
                }
            } else {
                currentShift.cashPayments += cashPayment.amount;
                currentShift.expectedCash += cashPayment.amount;
                updateInTable('shifts', currentShift);
            }
        }

        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(order, 0); // Instant
    };

    cancelOrder = async (orderId: string, reason: string): Promise<Order> => {
        let order = getTable<Order>('orders').find(o => o.id === orderId);
        if (!order) throw new Error("Order not found");
        order.status = 'CANCELLED';
        if (!this.isOnline) order.needsSync = true;
        updateInTable('orders', order);
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(order, 0); // Instant
    };

    // Park/Hold order - moves order to parked orders list
    parkOrder = async (orderId: string): Promise<Order> => {
        let orders = getTable<Order>('orders');
        let order = orders.find(o => o.id === orderId);
        if (!order) throw new Error("Order not found");
        if (order.status !== 'OPEN') throw new Error("Only open orders can be parked");
        
        // Move to parked orders table
        const parkedOrders = getTable<Order>('parkedOrders');
        order.parkedAt = new Date().toISOString();
        parkedOrders.push(order);
        setTable('parkedOrders', parkedOrders);
        
        // Remove from active orders
        const remainingOrders = orders.filter(o => o.id !== orderId);
        setTable('orders', remainingOrders);
        
        if (this.stateChangeCallback) this.stateChangeCallback();
        if (this.toastCallback) this.toastCallback(`Order ${order.orderNumber} parked`, 'info');
        return this.simulateDelay(order, 0); // Instant for parking
    };

    // Retrieve parked order - moves order back to active orders
    retrieveParkedOrder = async (orderId: string): Promise<Order> => {
        let parkedOrders = getTable<Order>('parkedOrders');
        let order = parkedOrders.find(o => o.id === orderId);
        if (!order) throw new Error("Parked order not found");
        
        // Remove from parked orders
        const remainingParked = parkedOrders.filter(o => o.id !== orderId);
        setTable('parkedOrders', remainingParked);
        
        // Add back to active orders
        delete order.parkedAt;
        const orders = getTable<Order>('orders');
        orders.push(order);
        setTable('orders', orders);
        
        if (this.stateChangeCallback) this.stateChangeCallback();
        if (this.toastCallback) this.toastCallback(`Order ${order.orderNumber} retrieved`, 'success');
        return this.simulateDelay(order, 0); // Instant for retrieving
    };

    // Get all parked orders
    getParkedOrders = async (): Promise<Order[]> => {
        const parkedOrders = getTable<Order>('parkedOrders');
        return this.simulateDelay(parkedOrders, 0); // Instant read
    };

    approveOrder = async (orderId: string): Promise<Order> => {
        let order = getTable<Order>('orders').find(o => o.id === orderId);
        if (!order) throw new Error("Order not found");
        if (order.status !== 'PENDING_APPROVAL') throw new Error("Order is not pending approval.");

        order.status = 'OPEN';
        if (!this.isOnline) order.needsSync = true;
        
        updateInTable('orders', order);
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(order, 0); // Instant for approval
    };

    transferOrder = async (orderId: string, newTableName: string): Promise<Order> => {
        let order = getTable<Order>('orders').find(o => o.id === orderId);
        if (!order || order.type !== 'Dine-In') throw new Error("Order not found or is not a Dine-In order.");
        
        order.table = newTableName;
        if (!this.isOnline) order.needsSync = true;
        
        updateInTable('orders', order);
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(order, 0); // Instant for transfer
    };

    mergeOrders = async (fromOrderId: string, toOrderId: string): Promise<Order> => {
        const orders = getTable<Order>('orders');
        let fromOrder = orders.find(o => o.id === fromOrderId);
        let toOrder = orders.find(o => o.id === toOrderId);
        if (!fromOrder || !toOrder) throw new Error("One or both orders could not be found.");
        if (fromOrder.status !== 'OPEN' || toOrder.status !== 'OPEN') throw new Error("Orders must be open to be merged.");

        toOrder.items.push(...fromOrder.items);
        this.recalculateTotals(toOrder);

        fromOrder.items = [];
        fromOrder.status = 'CANCELLED'; // Mark as cancelled with a note? Or a new 'MERGED' status.
        this.recalculateTotals(fromOrder);

        if (!this.isOnline) {
            toOrder.needsSync = true;
            fromOrder.needsSync = true;
        }

        updateInTable('orders', toOrder);
        updateInTable('orders', fromOrder);

        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(toOrder, 0); // Instant
    };
    
    splitOrder = async (orderId: string, itemUniqueIdToSplit: string): Promise<Order> => {
        const orders = getTable<Order>('orders');
        let originalOrder = orders.find(o => o.id === orderId);
        if (!originalOrder || originalOrder.type !== 'Dine-In') throw new Error("Order not found or is not a Dine-In order.");

        const itemIndex = originalOrder.items.findIndex(i => i.uniqueId === itemUniqueIdToSplit);
        if (itemIndex === -1) throw new Error("Item not found in order.");

        const [itemToSplit] = originalOrder.items.splice(itemIndex, 1);
        
        this.recalculateTotals(originalOrder);
        updateInTable('orders', originalOrder);

        const newOrder = await this.createOrder({ type: 'Dine-In', table: originalOrder.table });
        newOrder.items.push(itemToSplit);
        this.recalculateTotals(newOrder);

        if (!this.isOnline) {
            originalOrder.needsSync = true;
            newOrder.needsSync = true;
        }
        
        updateInTable('orders', newOrder);
        
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(newOrder, 0); // Instant
    };

    private _deductInventoryForOrder = async(order: Order) => {
        // This is a background task, can be queued if offline
        if (!this.isOnline) {
            this.queueAction('_deductInventoryForOrder', order);
            return;
        }
        const menuItems = getTable<MenuItem>('menuItems');
        const inventoryItems = getTable<InventoryItem>('inventoryItems');
        
        for (const item of order.items) {
            const menuItem = menuItems.find(m => m.id === item.itemId);
            if (menuItem?.recipe) {
                for (const recipeComponent of menuItem.recipe) {
                    const inventoryItem = inventoryItems.find(i => i.id === recipeComponent.inventoryItemId);
                    if (inventoryItem) {
                        const quantityToDeduct = recipeComponent.quantity * item.quantity;
                        const currentStock = inventoryItem.stockByOutlet[order.outletId] || 0;
                        inventoryItem.stockByOutlet[order.outletId] = currentStock - quantityToDeduct;
                        updateInTable('inventoryItems', inventoryItem);

                        addToTable<StockMovement>('stockMovements', {
                            id: `sm_${Date.now()}_${Math.random()}`,
                            tenantId: order.tenantId,
                            outletId: order.outletId,
                            inventoryItemId: inventoryItem.id,
                            type: 'SALE',
                            quantityChange: -quantityToDeduct,
                            relatedOrderId: order.id,
                            processedBy: this.userId || 'qr_customer',
                            timestamp: Date.now()
                        });
                    }
                }
            }
        }
    }
    
    adjustStock = async(inventoryItemId: string, outletId: string, newQuantity: number, reason: string): Promise<InventoryItem | undefined> => {
        if (!this.isOnline) {
            this.queueAction('adjustStock', inventoryItemId, outletId, newQuantity, reason);
            return Promise.resolve(undefined);
        }
        let inventoryItems = getTable<InventoryItem>('inventoryItems');
        const item = inventoryItems.find(i => i.id === inventoryItemId);
        if (!item) throw new Error("Inventory item not found");
        
        const oldQuantity = item.stockByOutlet[outletId] || 0;
        item.stockByOutlet[outletId] = newQuantity;
        
        addToTable<StockMovement>('stockMovements', {
            id: `sm_${Date.now()}`,
            tenantId: this.tenantId!,
            outletId: outletId,
            inventoryItemId: inventoryItemId,
            type: 'ADJUSTMENT',
            quantityChange: newQuantity - oldQuantity,
            reason: reason,
            processedBy: this.userId!,
            timestamp: Date.now()
        });
        
        updateInTable('inventoryItems', item);
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(item, 0); // Instant
    };

    // Shift Management
    getCurrentShift = async (): Promise<Shift | null> => {
        const shifts = getTable<Shift>('shifts');
        const openShift = shifts.find(s => s.outletId === this.outletId && s.userId === this.userId && !s.endTime);
        return this.simulateDelay(openShift || null, 0); // Instant
    };

    getShifts = async (outletId: string | 'all' = this.outletId!): Promise<Shift[]> => {
        const shifts = getTable<Shift>('shifts');
        if (outletId === 'all' && (this.userRole === 'BrandAdmin')) {
            return this.simulateDelay(shifts.filter(s => s.tenantId === this.tenantId));
        }
        return this.simulateDelay(shifts.filter(s => s.outletId === outletId));
    };

    startShift = async (openingCash: number): Promise<Shift | undefined> => {
        if (!this.isOnline) {
            this.queueAction('startShift', openingCash);
            return Promise.resolve(undefined);
        }
        const openShift = await this.getCurrentShift();
        if (openShift) throw new Error("A shift is already open for this user.");
        
        const newShift: Shift = {
            id: `sh_${Date.now()}`,
            tenantId: this.tenantId!,
            outletId: this.outletId!,
            userId: this.userId!,
            startTime: Date.now(),
            openingCash,
            cashPayments: 0,
            cashRefunds: 0,
            transactions: [],
            expectedCash: openingCash,
        };
        addToTable('shifts', newShift);
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(newShift, 0); // Instant
    };
    
    endShift = async (closingCash: number): Promise<Shift | undefined> => {
        if (!this.isOnline) {
            this.queueAction('endShift', closingCash);
            return Promise.resolve(undefined);
        }
        let shift = await this.getCurrentShift();
        if (!shift) throw new Error("No active shift found.");

        shift.endTime = Date.now();
        shift.closingCash = closingCash;
        shift.cashVariance = closingCash - shift.expectedCash;
        
        updateInTable('shifts', shift);
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(shift, 0); // Instant
    };
    
    addCashTransaction = async (type: 'CASH_IN' | 'CASH_OUT', amount: number, reason: string): Promise<Shift | undefined> => {
        if (!this.isOnline) {
            this.queueAction('addCashTransaction', type, amount, reason);
            return Promise.resolve(undefined);
        }
        let shift = await this.getCurrentShift();
        if (!shift) throw new Error("No active shift found.");

        shift.transactions.push({type, amount, reason, timestamp: Date.now()});
        if (type === 'CASH_IN') {
            shift.expectedCash += amount;
        } else {
            shift.expectedCash -= amount;
        }
        updateInTable('shifts', shift);
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(shift, 0); // Instant
    };

    // Settings Management
    saveFloorPlan = async(outletId: string, floorPlan: FloorPlanObject[]): Promise<Outlet | undefined> => {
        if (!this.isOnline) {
            this.queueAction('saveFloorPlan', outletId, floorPlan);
            return Promise.resolve(undefined);
        }
        const outlets = getTable<Outlet>('outlets');
        const outlet = outlets.find(o => o.id === outletId);
        if (!outlet) throw new Error("Outlet not found");
        
        outlet.floorPlan = floorPlan;
        updateInTable('outlets', outlet);

        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(outlet, 0); // Instant
    };

    saveUser = async (user: Omit<User, 'tenantId'>): Promise<User | undefined> => {
        if (!this.isOnline) {
            this.queueAction('saveUser', user);
            return Promise.resolve(undefined);
        }
        if (!this.tenantId) throw new Error("Not authenticated");
        
        const userWithTenant: User = { ...user, tenantId: this.tenantId };

        if (user.id) { // Update existing
            updateInTable('users', userWithTenant);
        } else { // Create new
            userWithTenant.id = `u_${Date.now()}`;
            addToTable('users', userWithTenant);
        }
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(userWithTenant, 0); // Instant
    }

    deleteUser = async (userId: string): Promise<boolean | undefined> => {
        if (!this.isOnline) {
            this.queueAction('deleteUser', userId);
            return Promise.resolve(undefined);
        }
        deleteFromTable('users', userId);
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(true, 0); // Instant
    }

    // ========= CUSTOMER MANAGEMENT =========
    
    getCustomers = () => {
        if (!this.tenantId) throw new Error("Not authenticated");
        return this.simulateDelay(
            getTable<Customer>('customers').filter(c => c.tenantId === this.tenantId),
            0
        );
    }

    getCustomerByPhone = (phone: string) => {
        if (!this.tenantId) throw new Error("Not authenticated");
        const customers = getTable<Customer>('customers');
        return this.simulateDelay(
            customers.find(c => c.tenantId === this.tenantId && c.phone === phone) || null,
            0
        );
    }

    searchCustomers = (query: string) => {
        if (!this.tenantId) throw new Error("Not authenticated");
        const customers = getTable<Customer>('customers').filter(c => c.tenantId === this.tenantId);
        const lowerQuery = query.toLowerCase();
        return this.simulateDelay(
            customers.filter(c => 
                c.name.toLowerCase().includes(lowerQuery) ||
                c.phone.includes(query) ||
                c.email?.toLowerCase().includes(lowerQuery)
            ),
            0
        );
    }

    saveCustomer = async (customer: Omit<Customer, 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<Customer | undefined> => {
        if (!this.isOnline) {
            this.queueAction('saveCustomer', customer);
            return Promise.resolve(undefined);
        }
        if (!this.tenantId) throw new Error("Not authenticated");

        const now = Date.now();
        const customerWithTenant: Customer = {
            ...customer,
            tenantId: this.tenantId,
            createdAt: customer.id ? (getTable<Customer>('customers').find(c => c.id === customer.id)?.createdAt || now) : now,
            updatedAt: now
        };

        if (customer.id) {
            // Update existing
            updateInTable('customers', customerWithTenant);
        } else {
            // Create new
            customerWithTenant.id = `cust_${Date.now()}`;
            addToTable('customers', customerWithTenant);
        }
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(customerWithTenant, 0);
    }

    deleteCustomer = async (customerId: string): Promise<boolean | undefined> => {
        if (!this.isOnline) {
            this.queueAction('deleteCustomer', customerId);
            return Promise.resolve(undefined);
        }
        deleteFromTable('customers', customerId);
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(true, 0);
    }

    getCustomerOrderHistory = async (customerId: string): Promise<Order[]> => {
        if (!this.tenantId) throw new Error("Not authenticated");
        const orders = getTable<Order>('orders');
        return this.simulateDelay(
            orders.filter(o => o.customerId === customerId && o.status === 'PAID')
                .sort((a, b) => b.createdAt - a.createdAt),
            0
        );
    }

    // Helper to create or update customer from order
    _upsertCustomerFromOrder = async (phone: string, name: string, address?: string): Promise<string> => {
        const existing = await this.getCustomerByPhone(phone);
        
        if (existing) {
            // Update stats only - don't modify addresses unless new one provided
            const updated: Customer = {
                ...existing,
                name: name || existing.name, // Update name if provided
                totalOrders: existing.totalOrders + 1,
                lastOrderDate: Date.now(),
                updatedAt: Date.now()
            };

            // If new address provided and not already in list, add it
            if (address && !existing.addresses.some(a => a.address === address)) {
                updated.addresses.push({
                    id: `addr_${Date.now()}`,
                    label: `Address ${existing.addresses.length + 1}`,
                    address: address,
                    isDefault: existing.addresses.length === 0
                });
            }

            await this.saveCustomer(updated);
            return existing.id;
        } else {
            // Create new customer
            const newCustomer = await this.saveCustomer({
                id: '',
                phone,
                name,
                addresses: address ? [{
                    id: `addr_${Date.now()}`,
                    label: 'Home',
                    address,
                    isDefault: true
                }] : [],
                totalOrders: 1,
                totalSpent: 0,
                lastOrderDate: Date.now()
            });
            return newCustomer!.id;
        }
    }
    
    saveMenuItem = async (menuItem: Omit<MenuItem, 'tenantId'>): Promise<MenuItem | undefined> => {
        if (!this.isOnline) {
            this.queueAction('saveMenuItem', menuItem);
            return Promise.resolve(undefined);
        }
         if (!this.tenantId) throw new Error("Not authenticated");
        
        const itemWithTenant: MenuItem = { ...menuItem, tenantId: this.tenantId };
        
        if (menuItem.id) { // Update
            updateInTable('menuItems', itemWithTenant);
        } else { // Create
            itemWithTenant.id = `m_${Date.now()}`;
            addToTable('menuItems', itemWithTenant);
        }
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(itemWithTenant, 0); // Instant
    }

    bulkSaveMenuItems = async (menuItems: Omit<MenuItem, 'tenantId' | 'id'>[]): Promise<void> => {
        if (!this.isOnline) {
            this.queueAction('bulkSaveMenuItems', menuItems);
            return Promise.resolve(undefined);
        }
        if (!this.tenantId) throw new Error("Not authenticated");
        
        const allMenuItems = getTable<MenuItem>('menuItems');

        for (const item of menuItems) {
             const newItem: MenuItem = {
                 ...item,
                 id: `m_${Date.now()}_${Math.random()}`,
                 tenantId: this.tenantId,
             };
             allMenuItems.push(newItem);
        }

        setTable('menuItems', allMenuItems);
        if (this.stateChangeCallback) this.stateChangeCallback();
        // FIX: Pass undefined to simulateDelay as it expects one argument.
        return this.simulateDelay(undefined, 0); // Instant
    }
    
    deleteMenuItem = async(itemId: string): Promise<boolean | undefined> => {
        if (!this.isOnline) {
            this.queueAction('deleteMenuItem', itemId);
            return Promise.resolve(undefined);
        }
        deleteFromTable('menuItems', itemId);
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(true, 0); // Instant
    }

    updateOutletSettings = async(outletId: string, settings: Outlet['settings']): Promise<Outlet | undefined> => {
        if (!this.isOnline) {
            this.queueAction('updateOutletSettings', outletId, settings);
            return Promise.resolve(undefined);
        }
        const outlets = getTable<Outlet>('outlets');
        const outlet = outlets.find(o => o.id === outletId);
        if (!outlet) throw new Error("Outlet not found");

        outlet.settings = settings;

        updateInTable('outlets', outlet);
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(outlet, 0); // Instant
    }
    
    saveOutlet = async(outlet: Outlet): Promise<Outlet | undefined> => {
        if (!this.isOnline) {
            this.queueAction('saveOutlet', outlet);
            return Promise.resolve(undefined);
        }
        const outlets = getTable<Outlet>('outlets');
        const existingIndex = outlets.findIndex(o => o.id === outlet.id);
        
        if (existingIndex !== -1) {
            outlets[existingIndex] = outlet;
        } else {
            outlets.push(outlet);
        }
        
        updateInTable('outlets', outlet);
        if (this.stateChangeCallback) this.stateChangeCallback();
        return this.simulateDelay(outlet, 0);
    }

    createOutlet = async(outlet: Omit<Outlet, 'id'>): Promise<Outlet | undefined> => {
        if (!this.isOnline) {
            this.queueAction('createOutlet', outlet);
            return Promise.resolve(undefined);
        }
        if (!this.tenantId) throw new Error("Not authenticated");
        
        const newOutlet: Outlet = {
            ...outlet,
            id: `o${Date.now()}`,
            tenantId: this.tenantId
        };
        
        addToTable('outlets', newOutlet);
        
        // Log activity
        this.logActivity({
            tenantId: this.tenantId,
            outletId: this.outletId || newOutlet.id,
            userId: this.userId || 'system',
            action: 'CREATE_OUTLET',
            details: { outletId: newOutlet.id, outletName: newOutlet.name }
        });
        
        if (this.stateChangeCallback) this.stateChangeCallback();
        if (this.toastCallback) this.toastCallback(`Outlet "${newOutlet.name}" created successfully`, 'success');
        return this.simulateDelay(newOutlet, 100);
    }

    updateOutlet = async(outletId: string, updates: Partial<Outlet>): Promise<Outlet | undefined> => {
        if (!this.isOnline) {
            this.queueAction('updateOutlet', outletId, updates);
            return Promise.resolve(undefined);
        }
        if (!this.tenantId) throw new Error("Not authenticated");
        
        const outlets = getTable<Outlet>('outlets');
        const outlet = outlets.find(o => o.id === outletId && o.tenantId === this.tenantId);
        if (!outlet) throw new Error("Outlet not found");
        
        const updatedOutlet: Outlet = { ...outlet, ...updates, id: outlet.id, tenantId: outlet.tenantId };
        updateInTable('outlets', updatedOutlet);
        
        // Log activity
        this.logActivity({
            tenantId: this.tenantId,
            outletId: this.outletId || updatedOutlet.id,
            userId: this.userId || 'system',
            action: 'UPDATE_OUTLET',
            details: { outletId: updatedOutlet.id, outletName: updatedOutlet.name }
        });
        
        if (this.stateChangeCallback) this.stateChangeCallback();
        if (this.toastCallback) this.toastCallback(`Outlet "${updatedOutlet.name}" updated successfully`, 'success');
        return this.simulateDelay(updatedOutlet, 100);
    }

    deleteOutlet = async(outletId: string): Promise<void> => {
        if (!this.isOnline) {
            this.queueAction('deleteOutlet', outletId);
            return Promise.resolve();
        }
        if (!this.tenantId) throw new Error("Not authenticated");
        
        const outlets = getTable<Outlet>('outlets');
        const outlet = outlets.find(o => o.id === outletId && o.tenantId === this.tenantId);
        if (!outlet) throw new Error("Outlet not found");
        
        // Check if there are any orders associated with this outlet
        const orders = getTable<Order>('orders').filter(o => o.outletId === outletId);
        
        if (orders.length > 0) {
            if (this.toastCallback) {
                this.toastCallback(
                    `Cannot delete outlet "${outlet.name}". It has ${orders.length} orders.`,
                    'error'
                );
            }
            throw new Error("Cannot delete outlet with existing orders");
        }
        
        deleteFromTable('outlets', outletId);
        
        // Log activity
        this.logActivity({
            tenantId: this.tenantId,
            outletId: this.outletId || outletId,
            userId: this.userId || 'system',
            action: 'DELETE_OUTLET',
            details: { outletId: outlet.id, outletName: outlet.name }
        });
        
        if (this.stateChangeCallback) this.stateChangeCallback();
        if (this.toastCallback) this.toastCallback(`Outlet "${outlet.name}" deleted successfully`, 'success');
        return this.simulateDelay(undefined, 100);
    }

    // Tenant Management (SuperAdmin only)
    createTenant = async(tenantData: Omit<Tenant, 'id'>): Promise<Tenant> => {
        if (!this.isOnline) {
            this.queueAction('createTenant', tenantData);
            throw new Error("Cannot create tenant while offline");
        }

        const tenants = getTable<Tenant>('tenants');
        
        // Check if subdomain already exists
        if (tenants.some(t => t.subdomain === tenantData.subdomain)) {
            throw new Error("Subdomain already exists");
        }

        const tenant: Tenant = {
            id: `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...tenantData
        };

        addToTable('tenants', tenant);

        // Log activity
        await this.logActivity({
            tenantId: tenant.id,
            outletId: '',
            userId: this.userId || 'system',
            action: 'CREATE_TENANT',
            details: { tenantId: tenant.id, tenantName: tenant.name }
        });

        if (this.stateChangeCallback) this.stateChangeCallback();
        if (this.toastCallback) this.toastCallback(`Tenant "${tenant.name}" created successfully`, 'success');
        return this.simulateDelay(tenant, 100);
    }

    deleteTenant = async(tenantId: string): Promise<void> => {
        if (!this.isOnline) {
            this.queueAction('deleteTenant', tenantId);
            throw new Error("Cannot delete tenant while offline");
        }

        const tenants = getTable<Tenant>('tenants');
        const tenant = tenants.find(t => t.id === tenantId);
        if (!tenant) throw new Error("Tenant not found");

        // Check if tenant has any outlets
        const outlets = getTable<Outlet>('outlets').filter(o => o.tenantId === tenantId);
        if (outlets.length > 0) {
            throw new Error(`Cannot delete tenant with ${outlets.length} active outlet(s). Delete outlets first.`);
        }

        deleteFromTable<Tenant>('tenants', tenantId);

        // Also delete all users associated with this tenant
        const users = getTable<User>('users').filter(u => u.tenantId === tenantId);
        users.forEach(u => deleteFromTable<User>('users', u.id));

        // Log activity
        await this.logActivity({
            tenantId: tenantId,
            outletId: '',
            userId: this.userId || 'system',
            action: 'DELETE_TENANT',
            details: { tenantId, tenantName: tenant.name }
        });

        if (this.stateChangeCallback) this.stateChangeCallback();
        if (this.toastCallback) this.toastCallback(`Tenant "${tenant.name}" deleted successfully`, 'success');
        return this.simulateDelay(undefined, 100);
    }

    updateTenant = async(tenantId: string, tenantData: Partial<Omit<Tenant, 'id' | 'subdomain'>>): Promise<Tenant | undefined> => {
        if (!this.isOnline) {
            this.queueAction('updateTenant', tenantId, tenantData);
            return Promise.resolve(undefined);
        }
        
        const tenants = getTable<Tenant>('tenants');
        const tenant = tenants.find(t => t.id === tenantId);
        if (!tenant) throw new Error("Tenant not found");

        const updatedTenant = { ...tenant, ...tenantData };
        updateInTable('tenants', updatedTenant);

        // Log activity
        await this.logActivity({
            tenantId: tenantId,
            outletId: '',
            userId: this.userId || 'system',
            action: 'UPDATE_TENANT',
            details: { tenantId, changes: tenantData }
        });

        if (this.stateChangeCallback) this.stateChangeCallback();
        if (this.toastCallback) this.toastCallback(`Tenant "${updatedTenant.name}" updated successfully`, 'success');
        return this.simulateDelay(updatedTenant, 0); // Instant
    }

    // Activity Logging for audit trail
    logActivity = async(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> => {
        const activityLog: ActivityLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            ...log
        };
        
        addToTable('activityLogs', activityLog);
        return this.simulateDelay(activityLog, 0); // Instant logging
    }

    getActivityLogs = async(outletId?: string, startDate?: number, endDate?: number): Promise<ActivityLog[]> => {
        if (!this.isOnline) return Promise.resolve([]);
        
        let logs = getTable<ActivityLog>('activityLogs');
        
        // Filter by tenant
        if (this.tenantId) {
            logs = logs.filter(l => l.tenantId === this.tenantId);
        }
        
        // Filter by outlet if specified
        if (outletId && outletId !== 'all') {
            logs = logs.filter(l => l.outletId === outletId);
        }
        
        // Filter by date range
        if (startDate) {
            logs = logs.filter(l => l.timestamp >= startDate);
        }
        if (endDate) {
            logs = logs.filter(l => l.timestamp <= endDate);
        }
        
        // Sort by most recent first
        logs.sort((a, b) => b.timestamp - a.timestamp);
        
        return this.simulateDelay(logs, 0);
    }
}

export const api = new Api();
export type MockApi = Api;

