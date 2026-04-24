export interface PlanLineItem {
  name: string;
  qty: number;
  unit: string;
}

export interface PlanOrder {
  orderId: string;
  customer: string;
  zone: string;
  deliveryTime: string;
  priority: "critical" | "high" | "medium" | "low" | string;
  items: PlanLineItem[];
}

export interface PlanInventory {
  item: string;
  available: number;
  unit: string;
  expiryDate: string | null;
}

export interface PlanDriver {
  driverId: string;
  name: string;
  available: boolean;
  startTime: string;
  zone: string;
}

export interface PlanInput {
  orders: PlanOrder[];
  inventory: PlanInventory[];
  drivers: PlanDriver[];
}

export interface FulfillmentItemResult {
  name: string;
  needed: number;
  available: number;
  canFulfil: boolean;
  shortfall: number;
}

export interface FulfillmentOrderResult {
  orderId: string;
  customer: string;
  items: FulfillmentItemResult[];
}

export interface ExpiryCheckResult {
  item: string;
  available: number;
  unit: string;
  expiryDate: string;
  daysLeft: number;
}

export interface DeliveryRisk {
  orderId: string;
  customer: string;
  issue: string;
}

// Plan output schema — matches the JSON contract from the original app.js /api/plan
export interface PlanFulfillmentStatus {
  orderId: string;
  customer: string;
  status: "FULL" | "PARTIAL" | "CANNOT_FULFIL" | string;
  notes: string;
}

export interface PlanShortageAlert {
  item: string;
  shortfall: number;
  unit: string;
  affectedOrders: string[];
  recommendation: string;
}

export interface PlanExpiringStock {
  item: string;
  daysLeft: number;
  qty: number;
  unit: string;
  action: string;
}

export interface PlanDeliveryPlanEntry {
  timeSlot: string;
  orderId: string;
  customer: string;
  driver: string;
  items: string;
  priority: string;
  notes: string;
}

export interface PlanEscalation {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | string;
  title: string;
  detail: string;
  orderIds: string[];
}

export interface PlanAction {
  priority: number;
  action: string;
}

export interface PlanOwnerSummary {
  totalOrders: number;
  canFulfil: number;
  atRisk: number;
  /** @deprecated kept for backwards compat with older cached plans */
  urgent?: string;
  /** @deprecated kept for backwards compat with older cached plans */
  recommendation?: string;
  escalations?: PlanEscalation[];
  actions?: PlanAction[];
}

export interface PlanResult {
  fulfillmentStatus: PlanFulfillmentStatus[];
  shortageAlerts: PlanShortageAlert[];
  expiringStock: PlanExpiringStock[];
  deliveryPlan: PlanDeliveryPlanEntry[];
  ownerSummary: PlanOwnerSummary;
}
