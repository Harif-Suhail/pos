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

export type UserRole = 'BrandAdmin' | 'OutletManager' | 'Cashier' | 'KitchenStaff' | 'Accountant';

export interface User {
  id: string;
  tenantId: string;
  name: string;
  pin: string; // 4-digit PIN for login
  role: UserRole;
  assignedOutletIds: string[];
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

export interface Order {
  id: string;
  tenantId: string;
  outletId: string;
  orderNumber: number;
  type: OrderType;
  status: OrderStatus;
  table?: string;
  customer?: { name: string; phone: string };
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