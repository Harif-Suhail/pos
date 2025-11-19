// ========= TENANCY & ACCOUNT STRUCTURE =========
export interface Tenant {
  id: string;
  name: string; // Restaurant Brand Name
  subdomain: string;
  logoUrl?: string;
  settings: {
    currency: string;
    timezone: string;
  };
}

export type TableShape = 'rectangle' | 'circle';

export interface FloorPlanObject {
  id:string;
  type: 'table' | 'wall' | 'bar' | 'door' | 'station';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  // Table-specific properties
  name?: string;
  capacity?: number;
  shape?: TableShape;
  // Wall/Bar/etc properties
  label?: string;
}

export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface OpeningHour {
    day: DayOfWeek;
    open: string; // "HH:MM"
    close: string; // "HH:MM"
    isClosed: boolean;
}

export interface Outlet {
  id: string;
  tenantId: string;
  name: string; // e.g., "Downtown Core"
  address: string;
  settings: {
    taxes: Tax[];
    serviceCharge: ServiceCharge;
    openingHours: OpeningHour[];
    printerSettings: {
        receiptPrinterUrl?: string;
        kitchenPrinters: Partial<Record<KitchenStation, string>>;
    };
    kitchenConfig: Partial<Record<KitchenStation, 'KDS' | 'Printer'>>;
  };
  floorPlan: FloorPlanObject[];
}

export type UserRole = 'BrandAdmin' | 'OutletManager' | 'Cashier' | 'Waiter' | 'KitchenStaff' | 'Accountant';

// Permissions enum for fine-grained access control
export enum Permission {
  // Billing & Payment
  CAN_PROCESS_PAYMENT = 'CAN_PROCESS_PAYMENT',
  CAN_VIEW_ORDERS = 'CAN_VIEW_ORDERS',
  
  // Order Management
  CAN_CREATE_ORDER = 'CAN_CREATE_ORDER',
  CAN_MODIFY_ORDER = 'CAN_MODIFY_ORDER',
  CAN_CANCEL_ORDER = 'CAN_CANCEL_ORDER',
  CAN_PARK_ORDER = 'CAN_PARK_ORDER',
  
  // Pricing & Discounts
  CAN_APPLY_DISCOUNT = 'CAN_APPLY_DISCOUNT',
  CAN_CHANGE_PRICE = 'CAN_CHANGE_PRICE',
  
  // Menu & Inventory
  CAN_MANAGE_MENU = 'CAN_MANAGE_MENU',
  CAN_MANAGE_INVENTORY = 'CAN_MANAGE_INVENTORY',
  CAN_VIEW_INVENTORY = 'CAN_VIEW_INVENTORY',
  
  // Reports & Analytics
  CAN_VIEW_REPORTS = 'CAN_VIEW_REPORTS',
  CAN_VIEW_ALL_OUTLETS = 'CAN_VIEW_ALL_OUTLETS',
  
  // Settings
  CAN_MANAGE_USERS = 'CAN_MANAGE_USERS',
  CAN_MANAGE_SETTINGS = 'CAN_MANAGE_SETTINGS',
  CAN_MANAGE_FLOOR_PLAN = 'CAN_MANAGE_FLOOR_PLAN',
  CAN_MANAGE_OUTLETS = 'CAN_MANAGE_OUTLETS',
  
  // Shifts
  CAN_MANAGE_SHIFTS = 'CAN_MANAGE_SHIFTS',
  CAN_VIEW_SHIFTS = 'CAN_VIEW_SHIFTS',
  
  // Kitchen
  CAN_VIEW_KDS = 'CAN_VIEW_KDS',
  CAN_MARK_ORDER_READY = 'CAN_MARK_ORDER_READY',
}

// Role-based permission mappings
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  BrandAdmin: [
    // Full access - all permissions
    Permission.CAN_PROCESS_PAYMENT,
    Permission.CAN_VIEW_ORDERS,
    Permission.CAN_CREATE_ORDER,
    Permission.CAN_MODIFY_ORDER,
    Permission.CAN_CANCEL_ORDER,
    Permission.CAN_PARK_ORDER,
    Permission.CAN_APPLY_DISCOUNT,
    Permission.CAN_CHANGE_PRICE,
    Permission.CAN_MANAGE_MENU,
    Permission.CAN_MANAGE_INVENTORY,
    Permission.CAN_VIEW_INVENTORY,
    Permission.CAN_VIEW_REPORTS,
    Permission.CAN_VIEW_ALL_OUTLETS,
    Permission.CAN_MANAGE_USERS,
    Permission.CAN_MANAGE_SETTINGS,
    Permission.CAN_MANAGE_FLOOR_PLAN,
    Permission.CAN_MANAGE_SHIFTS,
    Permission.CAN_VIEW_SHIFTS,
    Permission.CAN_VIEW_KDS,
    Permission.CAN_MARK_ORDER_READY,
  ],
  OutletManager: [
    // Outlet-level management
    Permission.CAN_PROCESS_PAYMENT,
    Permission.CAN_VIEW_ORDERS,
    Permission.CAN_CREATE_ORDER,
    Permission.CAN_MODIFY_ORDER,
    Permission.CAN_CANCEL_ORDER,
    Permission.CAN_PARK_ORDER,
    Permission.CAN_APPLY_DISCOUNT,
    Permission.CAN_CHANGE_PRICE,
    Permission.CAN_MANAGE_MENU,
    Permission.CAN_MANAGE_INVENTORY,
    Permission.CAN_VIEW_INVENTORY,
    Permission.CAN_VIEW_REPORTS,
    Permission.CAN_MANAGE_USERS, // Can manage staff in their outlet
    Permission.CAN_MANAGE_SETTINGS,
    Permission.CAN_MANAGE_FLOOR_PLAN,
    Permission.CAN_MANAGE_SHIFTS,
    Permission.CAN_VIEW_SHIFTS,
    Permission.CAN_VIEW_KDS,
    Permission.CAN_MARK_ORDER_READY,
  ],
  Cashier: [
    // Can bill, limited modifications
    Permission.CAN_PROCESS_PAYMENT,
    Permission.CAN_VIEW_ORDERS,
    Permission.CAN_CREATE_ORDER,
    Permission.CAN_MODIFY_ORDER,
    Permission.CAN_PARK_ORDER,
    Permission.CAN_VIEW_INVENTORY,
    Permission.CAN_VIEW_SHIFTS,
    // CANNOT: Cancel orders, apply discounts, change prices
  ],
  Waiter: [
    // Can take orders, cannot bill
    Permission.CAN_VIEW_ORDERS,
    Permission.CAN_CREATE_ORDER,
    Permission.CAN_MODIFY_ORDER,
    Permission.CAN_PARK_ORDER,
    Permission.CAN_VIEW_INVENTORY,
    // CANNOT: Process payments, cancel, discount, price changes
  ],
  KitchenStaff: [
    // Kitchen display only
    Permission.CAN_VIEW_ORDERS,
    Permission.CAN_VIEW_KDS,
    Permission.CAN_MARK_ORDER_READY,
    Permission.CAN_VIEW_INVENTORY,
    // CANNOT: Any POS operations, billing, modifications
  ],
  Accountant: [
    // View-only for reports and auditing
    Permission.CAN_VIEW_ORDERS,
    Permission.CAN_VIEW_INVENTORY,
    Permission.CAN_VIEW_REPORTS,
    Permission.CAN_VIEW_ALL_OUTLETS,
    Permission.CAN_VIEW_SHIFTS,
    // CANNOT: Any modifications, only viewing
  ],
};

export interface User {
  id: string;
  tenantId: string;
  name: string;
  pin: string; // 4-digit PIN for login
  role: UserRole;
  assignedOutletIds: string[];
  permissions?: Permission[]; // Optional: custom permissions override
}

export interface ActivityLog {
  id: string;
  tenantId: string;
  outletId: string;
  userId: string;
  action: string; // e.g., "ORDER_CANCELLED", "DISCOUNT_APPLIED"
  details: Record<string, any>;
  timestamp: number;
}


// ========= MENU, PRICING & TAX =========
export interface Tax {
  id: string;
  name: string;
  rate: number; // as a percentage, e.g., 8 for 8%
  isInclusive: boolean;
}

export interface ServiceCharge {
  rate: number;
  isEnabled: boolean;
}

export interface Variant {
  id: string;
  name: string; // e.g., "12-inch", "16-inch"
  price: number; // Overrides base price
}

export interface ModifierOption {
  id: string;
  name: string;
  price: number;
}

export interface ModifierGroup {
  id: string;
  name: string; // e.g., "Toppings", "Crust Type"
  options: ModifierOption[];
  minSelection: number;
  maxSelection: number;
}

export interface MenuItem {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  image: string;
  station: KitchenStation; // For KOT routing
  variants?: Variant[];
  modifierGroups?: ModifierGroup[];
  recipe?: RecipeComponent[];
  stock?: number; // Simple stock for items without recipes
  available?: boolean; // Whether item is currently available for ordering
  availableOutletIds?: string[]; // If specified, only available at these outlets. If empty/undefined, available at all outlets
  outletSpecificPricing?: Record<string, number>; // Outlet-specific base prices (outletId -> price)
}


// ========= ORDERING, KITCHEN & BILLING =========
export type OrderType = 'Dine-In' | 'Takeout' | 'Delivery' | 'QR';
export type OrderStatus = 'OPEN' | 'BILLED' | 'PAID' | 'CANCELLED' | 'PENDING_APPROVAL';
export type KotStatus = 'NEW' | 'PREPARING' | 'READY' | 'SERVED';
export type KitchenStation = 'Main Kitchen' | 'Bar' | 'Desserts';

export interface OrderItem {
  uniqueId: string; // To differentiate same items with different mods
  itemId: string;
  name: string;
  category?: string; // Menu item category for reporting
  quantity: number;
  price: number; // Price at time of order
  variant?: Variant;
  selectedModifiers?: ModifierOption[];
  notes?: string;
  kotStatus: KotStatus;
  station: KitchenStation;
  seatNumber?: number;
}

export interface Payment {
  method: 'Cash' | 'Card' | 'UPI' | 'Other';
  amount: number;
  timestamp: number;
}

export interface DeliveryDetails {
    customerName: string;
    customerPhone: string;
    address: string;
    instructions?: string;
}

// ========= CUSTOMER MANAGEMENT =========
export interface CustomerAddress {
  id: string;
  label: string; // e.g., "Home", "Office"
  address: string;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  tenantId: string;
  phone: string; // Primary identifier (unique per tenant)
  name: string;
  email?: string;
  addresses: CustomerAddress[];
  notes?: string;
  tags?: string[]; // e.g., "VIP", "Regular", "Allergies"
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Order {
  id: string;
  tenantId: string;
  outletId: string;
  orderNumber: number;
  type: OrderType;
  status: OrderStatus;
  table?: string;
  customer?: { name: string; phone: string };
  customerId?: string; // Link to Customer entity for history tracking
  deliveryDetails?: DeliveryDetails;
  items: OrderItem[];
  subtotal: number;
  totalTax: number;
  serviceCharge: number;
  discount: {
    amount: number;
    reason: string;
    appliedBy: string; // userId
  };
  totalAmount: number;
  payments: Payment[];
  createdAt: number;
  createdBy: string; // userId
  closedAt?: number;
  closedBy?: string; // userId
  parkedAt?: string; // ISO timestamp when order was parked/held
  needsSync?: boolean; // True if created/modified offline
}


// ========= INVENTORY & RECIPES =========
export interface InventoryItem {
  id: string;
  tenantId: string;
  name: string;
  unit: 'kg' | 'g' | 'litre' | 'ml' | 'piece';
  category: string;
  stockByOutlet: Record<string, number>; // outletId -> stock level
  reorderLevelByOutlet: Record<string, number>;
}

export interface RecipeComponent {
  inventoryItemId: string;
  quantity: number;
}

export type StockMovementType = 'PURCHASE' | 'SALE' | 'WASTAGE' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  tenantId: string;
  outletId: string;
  inventoryItemId: string;
  type: StockMovementType;
  quantityChange: number; // Can be negative
  reason?: string;
  relatedOrderId?: string;
  processedBy: string; // userId
  timestamp: number;
}


// ========= SHIFT & CASH MANAGEMENT =========
export interface CashDrawerTransaction {
  type: 'CASH_IN' | 'CASH_OUT';
  amount: number;
  reason: string;
  timestamp: number;
}

export interface Shift {
  id: string;
  tenantId: string;
  outletId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  openingCash: number;
  closingCash?: number;
  cashPayments: number;
  cashRefunds: number;
  transactions: CashDrawerTransaction[];
  expectedCash: number;
  cashVariance?: number;
}