import { Tenant, Outlet, User, MenuItem, InventoryItem, FloorPlanObject, DayOfWeek, OpeningHour, Customer, SuperAdminAccount } from '../types';

// SuperAdmin Accounts (separate from restaurant users)
export const MOCK_SUPER_ADMINS: SuperAdminAccount[] = [
    { 
        id: 'sa1', 
        username: 'admin', 
        password: 'admin123', // In production, this should be hashed
        name: 'System Administrator',
        email: 'admin@system.com'
    },
];

export const MOCK_TENANTS: Tenant[] = [
    { id: 't1', name: 'The Pizza Palace', subdomain: 'pizzapalace', logoUrl: 'https://cdn-icons-png.flaticon.com/512/3595/3595458.png', settings: { currency: 'USD', timezone: 'UTC-5' } },
    { id: 't2', name: 'Sushi Sensation', subdomain: 'sushisensation', settings: { currency: 'JPY', timezone: 'UTC+9' } },
];

const defaultFloorPlan: FloorPlanObject[] = Array.from({ length: 12 }, (_, i) => ({
    id: `tbl-${i + 1}`,
    type: 'table',
    shape: 'rectangle',
    x: 50 + (i % 6) * 120,
    y: 50 + Math.floor(i / 6) * 140,
    width: 100,
    height: 80,
    rotation: 0,
    name: `T${i + 1}`,
    capacity: 4,
}));

const defaultOpeningHours: OpeningHour[] = (['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as DayOfWeek[]).map(day => ({
    day,
    open: '11:00',
    close: '22:00',
    isClosed: day === 'Monday',
}));


export const MOCK_OUTLETS: Outlet[] = [
    { 
        id: 'o1', 
        tenantId: 't1', 
        name: 'Downtown Core', 
        address: '123 Main St', 
        settings: { 
            taxes: [{ id: 'tax1', name: 'Sales Tax', rate: 8, isInclusive: false }], 
            serviceCharge: { rate: 10, isEnabled: true },
            openingHours: defaultOpeningHours,
            printerSettings: {
                receiptPrinterUrl: '192.168.1.100',
                kitchenPrinters: {
                    'Main Kitchen': '192.168.1.101',
                    'Bar': '192.168.1.102'
                }
            },
            kitchenConfig: {
                'Main Kitchen': 'KDS',
                'Bar': 'Printer',
                'Desserts': 'KDS'
            }
        },
        floorPlan: defaultFloorPlan,
    },
    { 
        id: 'o2', 
        tenantId: 't1', 
        name: 'East Side Mall', 
        address: '456 Mall Rd', 
        settings: { 
            taxes: [{ id: 'tax2', name: 'VAT', rate: 8, isInclusive: false }], 
            serviceCharge: { rate: 0, isEnabled: false },
            openingHours: defaultOpeningHours,
            // FIX: Add missing 'kitchenPrinters' property to satisfy the Outlet type.
            printerSettings: { kitchenPrinters: {} },
            kitchenConfig: { 'Main Kitchen': 'KDS' }
        },
        floorPlan: defaultFloorPlan,
    },
    { 
        id: 'o3', 
        tenantId: 't2', 
        name: 'Shibuya Crossing', 
        address: '789 Shibuya Ave', 
        settings: { 
            taxes: [{ id: 'tax3', name: 'Consumption Tax', rate: 10, isInclusive: true }], 
            serviceCharge: { rate: 0, isEnabled: false },
            openingHours: defaultOpeningHours,
            // FIX: Add missing 'kitchenPrinters' property to satisfy the Outlet type.
            printerSettings: { kitchenPrinters: {} },
            kitchenConfig: {}
        },
        floorPlan: [],
    },
];

export const MOCK_USERS: User[] = [
    // Tenant 1 users
    { id: 'u1', tenantId: 't1', name: 'Alice Admin', pin: '1111', role: 'BrandAdmin', assignedOutletIds: ['o1', 'o2'] },
    { id: 'u2', tenantId: 't1', name: 'Mike Manager', pin: '2222', role: 'OutletManager', assignedOutletIds: ['o1'] },
    { id: 'u3', tenantId: 't1', name: 'Charlie Cashier', pin: '3333', role: 'Cashier', assignedOutletIds: ['o1'] },
    { id: 'u4', tenantId: 't1', name: 'Kevin Kitchen', pin: '4444', role: 'KitchenStaff', assignedOutletIds: ['o1'] },
    { id: 'u7', tenantId: 't1', name: 'Walter Waiter', pin: '7777', role: 'Waiter', assignedOutletIds: ['o1'] },
    { id: 'u8', tenantId: 't1', name: 'Amy Accountant', pin: '8888', role: 'Accountant', assignedOutletIds: ['o1', 'o2'] },
    // Tenant 2 users
    { id: 'u5', tenantId: 't2', name: 'Yuki Owner', pin: '5555', role: 'BrandAdmin', assignedOutletIds: ['o3'] },
    { id: 'u6', tenantId: 't2', name: 'Kenji Cashier', pin: '6666', role: 'Cashier', assignedOutletIds: ['o3'] },
];

export const MOCK_INVENTORY: InventoryItem[] = [
    { id: 'inv1', tenantId: 't1', name: 'Pizza Dough', unit: 'piece', category: 'Dough', stockByOutlet: { o1: 100, o2: 80 }, reorderLevelByOutlet: { o1: 20, o2: 20 } },
    { id: 'inv2', tenantId: 't1', name: 'Tomato Sauce', unit: 'g', category: 'Sauces', stockByOutlet: { o1: 5000, o2: 4000 }, reorderLevelByOutlet: { o1: 1000, o2: 1000 } },
    { id: 'inv3', tenantId: 't1', name: 'Mozzarella Cheese', unit: 'g', category: 'Dairy', stockByOutlet: { o1: 8000, o2: 6000 }, reorderLevelByOutlet: { o1: 2000, o2: 1500 } },
    { id: 'inv4', tenantId: 't1', name: 'Pepperoni', unit: 'g', category: 'Meats', stockByOutlet: { o1: 2000, o2: 1500 }, reorderLevelByOutlet: { o1: 500, o2: 500 } },
    { id: 'inv5', tenantId: 't1', name: 'Coke Can', unit: 'piece', category: 'Beverages', stockByOutlet: { o1: 200, o2: 150 }, reorderLevelByOutlet: { o1: 50, o2: 50 } },
];

export const MOCK_CUSTOMERS: Customer[] = [
    {
        id: 'cust_1',
        tenantId: 't1',
        phone: '+1234567890',
        name: 'John Doe',
        email: 'john.doe@email.com',
        addresses: [
            {
                id: 'addr_1',
                label: 'Home',
                address: '123 Main St, Apt 4B, New York, NY 10001',
                isDefault: true
            },
            {
                id: 'addr_2',
                label: 'Office',
                address: '456 Business Ave, Suite 200, New York, NY 10002',
                isDefault: false
            }
        ],
        tags: ['Regular', 'VIP'],
        notes: 'Prefers extra cheese',
        totalOrders: 15,
        totalSpent: 285.50,
        lastOrderDate: Date.now() - 86400000, // 1 day ago
        createdAt: Date.now() - 7776000000, // 90 days ago
        updatedAt: Date.now() - 86400000
    },
    {
        id: 'cust_2',
        tenantId: 't1',
        phone: '+9876543210',
        name: 'Jane Smith',
        email: 'jane.smith@email.com',
        addresses: [
            {
                id: 'addr_3',
                label: 'Home',
                address: '789 Park Avenue, Brooklyn, NY 11201',
                isDefault: true
            }
        ],
        tags: ['Regular'],
        totalOrders: 8,
        totalSpent: 142.30,
        lastOrderDate: Date.now() - 259200000, // 3 days ago
        createdAt: Date.now() - 5184000000, // 60 days ago
        updatedAt: Date.now() - 259200000
    },
    {
        id: 'cust_3',
        tenantId: 't1',
        phone: '+1122334455',
        name: 'Mike Johnson',
        addresses: [
            {
                id: 'addr_4',
                label: 'Home',
                address: '321 Oak Street, Queens, NY 11354',
                isDefault: true
            }
        ],
        tags: [],
        totalOrders: 3,
        totalSpent: 67.80,
        lastOrderDate: Date.now() - 604800000, // 7 days ago
        createdAt: Date.now() - 2592000000, // 30 days ago
        updatedAt: Date.now() - 604800000
    }
];

export const MOCK_MENU_ITEMS: MenuItem[] = [
    { 
        id: 'm1', tenantId: 't1', name: 'Margherita Pizza', description: 'Classic cheese and tomato pizza.', category: 'Pizzas', basePrice: 12.00, 
        image: 'https://images.unsplash.com/photo-1598021680133-eb8a25a33c02?auto=format&fit=crop&w=400',
        station: 'Main Kitchen',
        variants: [
            { id: 'v1', name: '12-inch', price: 12.00 },
            { id: 'v2', name: '16-inch', price: 16.00 },
        ],
        recipe: [
            { inventoryItemId: 'inv1', quantity: 1 },
            { inventoryItemId: 'inv2', quantity: 100 },
            { inventoryItemId: 'inv3', quantity: 150 },
        ]
    },
    { 
        id: 'm2', tenantId: 't1', name: 'Pepperoni Pizza', description: 'Pizza with pepperoni topping.', category: 'Pizzas', basePrice: 14.00,
        image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=400',
        station: 'Main Kitchen',
         variants: [
            { id: 'v3', name: '12-inch', price: 14.00 },
            { id: 'v4', name: '16-inch', price: 18.00 },
        ],
        recipe: [
            { inventoryItemId: 'inv1', quantity: 1 },
            { inventoryItemId: 'inv2', quantity: 100 },
            { inventoryItemId: 'inv3', quantity: 120 },
            { inventoryItemId: 'inv4', quantity: 80 },
        ]
    },
     { 
        id: 'm3', tenantId: 't1', name: 'Coca-Cola', description: 'Refreshing soft drink.', category: 'Drinks', basePrice: 2.50,
        image: 'https://images.unsplash.com/photo-1622483767028-3f6e9241a796?auto=format&fit=crop&w=400',
        station: 'Bar',
        stock: 200 // Simple stock for items without a recipe
    },
    { 
        id: 'm4', tenantId: 't1', name: 'Garlic Bread', description: 'Toasted bread with garlic butter.', category: 'Appetizers', basePrice: 6.00,
        image: 'https://images.unsplash.com/photo-1589458373956-613618a2b5a1?auto=format&fit=crop&w=400',
        station: 'Main Kitchen',
        stock: 50
    },
     { 
        id: 'm5', tenantId: 't1', name: 'Tiramisu', description: 'Classic Italian dessert.', category: 'Desserts', basePrice: 8.00,
        image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=400',
        station: 'Desserts',
        stock: 30
    },
    // Sushi Tenant Menu
    {
        id: 's1', tenantId: 't2', name: 'Salmon Nigiri', description: 'Fresh salmon over rice.', category: 'Nigiri', basePrice: 500,
        image: 'https://plus.unsplash.com/premium_photo-1668143362833-23255145a490?auto=format&fit=crop&w=400',
        station: 'Main Kitchen',
        stock: 100
    }
];

// This function initializes the mock database in localStorage if it doesn't exist
export const initializeDb = () => {
    // Check if superAdmins table exists, if not, reinitialize
    if (!localStorage.getItem('db_tenants') || !localStorage.getItem('db_superAdmins')) {
        const MOCK_QR_ORDER = {
            id: 'ord_qr_12345',
            tenantId: 't1',
            outletId: 'o1',
            orderNumber: 1,
            type: 'QR',
            table: 'T5',
            status: 'PENDING_APPROVAL',
            items: [{
                uniqueId: 'item_1654109442678',
                itemId: 'm3',
                name: 'Coca-Cola',
                quantity: 2,
                price: 2.5,
                kotStatus: 'NEW',
                station: 'Bar'
            }],
            subtotal: 5,
            totalTax: 0.4,
            serviceCharge: 0.5,
            totalAmount: 5.9,
            discount: { amount: 0, reason: '', appliedBy: '' },
            payments: [],
            createdAt: Date.now() - 60000,
            createdBy: 'u3'
        };
        localStorage.setItem('db_tenants', JSON.stringify(MOCK_TENANTS));
        localStorage.setItem('db_outlets', JSON.stringify(MOCK_OUTLETS));
        localStorage.setItem('db_users', JSON.stringify(MOCK_USERS));
        localStorage.setItem('db_superAdmins', JSON.stringify(MOCK_SUPER_ADMINS));
        localStorage.setItem('db_menuItems', JSON.stringify(MOCK_MENU_ITEMS));
        localStorage.setItem('db_inventoryItems', JSON.stringify(MOCK_INVENTORY));
        localStorage.setItem('db_customers', JSON.stringify(MOCK_CUSTOMERS));
        localStorage.setItem('db_orders', JSON.stringify([MOCK_QR_ORDER]));
        localStorage.setItem('db_shifts', JSON.stringify([]));
        localStorage.setItem('db_stockMovements', JSON.stringify([]));
        localStorage.setItem('db_activityLogs', JSON.stringify([]));
        console.log("Mock database initialized in localStorage.");
    }
};