export type Category =
  | "frozen_meat"
  | "fresh_produce"
  | "dry_goods"
  | "dairy"
  | "beverages"
  | "packaging";

export type OrderStatus =
  | "pending"
  | "assigned"
  | "in_transit"
  | "delivered"
  | "failed"
  | "cancelled";

export type Priority = "urgent" | "high" | "normal" | "low";

export type DriverStatus = "available" | "on_duty" | "off_duty" | "on_leave";

export type VehicleStatus =
  | "available"
  | "on_route"
  | "maintenance"
  | "offline";

export type ReorderStatus = "pending" | "sent" | "received" | "cancelled";

export interface ExpiryBatch {
  qty: number;
  expiresOn: string;
}

export interface Inventory {
  id: string;
  sku: string;
  name: string;
  category: Category;
  unit: string;
  currentStock: number;
  reorderPoint: number;
  reorderQty: number;
  maxCapacity: number;
  costPerUnit: number;
  weightPerUnitKg: number;
  sellPrice: number;
  supplierId: string;
  warehouseZone: string;
  expiryDates: ExpiryBatch[];
  lastRestocked: string;
  notes: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactEmail: string;
  leadTimeDays: number;
  minimumOrderValue: number;
  reliabilityScore: number;
  categories: Category[];
  paymentTerms: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  type: string;
  capacityKg: number;
  capacityPallets: number;
  currentLoadKg: number;
  status: VehicleStatus;
  currentDriverId: string | null;
  lastServiceDate: string;
  nextServiceDue: string;
  fuelLevelPct: number;
  currentLocation: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: DriverStatus;
  currentVehicleId: string | null;
  currentOrderId: string | null;
  hoursWorkedToday: number;
  deliveriesCompletedToday: number;
  licenseExpiry: string;
}

export interface OrderItem {
  inventoryId: string;
  qty: number;
  unitCost: number;
}

export interface DeliveryWindow {
  earliest: string;
  latest: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  priority: Priority;
  customerName: string;
  customerAddress: string;
  deliveryWindow: DeliveryWindow;
  assignedVehicleId: string | null;
  assignedDriverId: string | null;
  items: OrderItem[];
  totalValue: number;
  actualDeliveredAt: string | null;
  notes: string;
}

export interface Reorder {
  id: string;
  inventoryId: string;
  supplierId: string;
  qtyOrdered: number;
  unitCost: number;
  totalCost: number;
  status: ReorderStatus;
  createdAt: string;
  expectedDelivery: string;
  urgency: "standard" | "express";
  createdBy: "agent" | "user";
  notes: string;
}

export type EmailDirection = "incoming" | "outgoing";

export type EmailStatus = "unread" | "read" | "handled" | "draft" | "sent";

export type EmailCategory =
  | "customer_order"
  | "customer_complaint"
  | "customer_inquiry"
  | "supplier_update"
  | "delivery_notification"
  | "internal"
  | "other";

export interface Email {
  id: string;
  direction: EmailDirection;
  from: string;
  to: string;
  subject: string;
  body: string;
  receivedAt: string;
  status: EmailStatus;
  category: EmailCategory;
  relatedOrderId: string | null;
  relatedSupplierId: string | null;
  draftedBy: "agent" | "user" | null;
  agentNotes: string;
  replyToEmailId: string | null;
}

export interface DailyReportMetrics {
  ordersDelivered: number;
  ordersPending: number;
  ordersFailed: number;
  inventoryValue: number;
  lowStockCount: number;
  expiryRiskValue: number;
  fleetUtilizationPct: number;
}

export interface DailyReport {
  id: string;
  generatedAt: string;
  dateCovered: string;
  title: string;
  summary: string;
  html: string;
  metrics: DailyReportMetrics;
}

export type AgentProfileId =
  | "general"
  | "inbox"
  | "outbox"
  | "dispatch"
  | "reports";

export interface FlowLogData {
  inventory: Inventory[];
  orders: Order[];
  vehicles: Vehicle[];
  drivers: Driver[];
  suppliers: Supplier[];
  reorders: Reorder[];
  emails: Email[];
  reports: DailyReport[];
}

export type TabId =
  | "dashboard"
  | "inventory"
  | "orders"
  | "agent"
  | "emails"
  | "reports";

export type InvFilter = "all" | "low_stock" | "near_expiry" | "out_of_stock";

export type OrdFilter = "all" | OrderStatus;

// Anthropic message shapes (subset)
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | {
      type: "tool_result";
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    };

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

// Chat display messages — separate from API messages so we can model thinking/error states
export type ChatDisplayMessage =
  | { kind: "user"; id: string; text: string; profileId?: AgentProfileId }
  | { kind: "ai"; id: string; text: string; profileId?: AgentProfileId }
  | {
      kind: "tool_call";
      id: string;
      toolName: string;
      input: Record<string, unknown>;
      profileId?: AgentProfileId;
    }
  | {
      kind: "tool_result";
      id: string;
      toolName: string;
      result: unknown;
      profileId?: AgentProfileId;
    }
  | { kind: "thinking"; id: string; profileId?: AgentProfileId }
  | { kind: "error"; id: string; text: string; profileId?: AgentProfileId };
