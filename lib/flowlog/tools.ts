import "server-only";

export const TOOLS = [
  {
    name: "get_inventory",
    description:
      "Query the current inventory. Returns items filtered by stock status and/or category.",
    input_schema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          enum: ["all", "low_stock", "near_expiry", "out_of_stock"],
          description:
            "'low_stock' = at or below reorder point. 'near_expiry' = expiring within 7 days.",
        },
        category: {
          type: "string",
          enum: [
            "frozen_meat",
            "fresh_produce",
            "dry_goods",
            "dairy",
            "beverages",
            "packaging",
          ],
          description: "Optional: filter by product category.",
        },
      },
      required: ["filter"],
    },
  },
  {
    name: "get_orders",
    description: "Query delivery orders filtered by status.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: [
            "all",
            "pending",
            "assigned",
            "in_transit",
            "delivered",
            "failed",
            "cancelled",
          ],
        },
        date: {
          type: "string",
          description: "Optional YYYY-MM-DD to filter by delivery date.",
        },
      },
      required: ["status"],
    },
  },
  {
    name: "get_fleet_status",
    description: "Returns current status of all vehicles and drivers.",
    input_schema: {
      type: "object",
      properties: {
        include_offline: {
          type: "boolean",
          description: "Include maintenance/offline vehicles. Default false.",
        },
      },
    },
  },
  {
    name: "get_analytics",
    description: "Compute KPI metrics and analytics from current data.",
    input_schema: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: [
            "inventory_value",
            "delivery_performance",
            "expiry_risk",
            "reorder_summary",
            "fleet_utilization",
            "daily_summary",
          ],
        },
      },
      required: ["metric"],
    },
  },
  {
    name: "update_stock_level",
    description:
      "Adjust stock level for an inventory item (shipment received, waste, correction).",
    input_schema: {
      type: "object",
      properties: {
        inventory_id: { type: "string" },
        adjustment: {
          type: "number",
          description: "Positive to add, negative to subtract.",
        },
        reason: {
          type: "string",
          enum: [
            "received_shipment",
            "waste",
            "damage",
            "manual_correction",
            "sale",
            "sample",
          ],
        },
        notes: { type: "string" },
      },
      required: ["inventory_id", "adjustment", "reason"],
    },
  },
  {
    name: "create_reorder",
    description: "Create a purchase reorder request for an inventory item.",
    input_schema: {
      type: "object",
      properties: {
        inventory_id: { type: "string" },
        quantity: {
          type: "number",
          description: "Defaults to item reorderQty if omitted.",
        },
        urgency: { type: "string", enum: ["standard", "express"] },
        notes: { type: "string" },
      },
      required: ["inventory_id", "urgency"],
    },
  },
  {
    name: "update_order_status",
    description: "Update the status of a delivery order.",
    input_schema: {
      type: "object",
      properties: {
        order_id: { type: "string" },
        new_status: {
          type: "string",
          enum: [
            "assigned",
            "in_transit",
            "delivered",
            "failed",
            "cancelled",
          ],
        },
        driver_id: {
          type: "string",
          description: "Optional: assign/reassign driver.",
        },
        vehicle_id: {
          type: "string",
          description: "Optional: assign/reassign vehicle.",
        },
        notes: { type: "string" },
      },
      required: ["order_id", "new_status"],
    },
  },
  {
    name: "assign_delivery",
    description:
      "Assign a pending delivery order to a driver and vehicle. Validates availability and capacity.",
    input_schema: {
      type: "object",
      properties: {
        order_id: { type: "string" },
        driver_id: { type: "string" },
        vehicle_id: { type: "string" },
      },
      required: ["order_id", "driver_id", "vehicle_id"],
    },
  },
];
