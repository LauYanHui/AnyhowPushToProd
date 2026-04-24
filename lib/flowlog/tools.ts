export const TOOLS = [
  {
    name: "get_inventory",
    description: "Query inventory filtered by stock status and/or category.",
    input_schema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          enum: ["all", "low_stock", "near_expiry", "out_of_stock"],
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
        },
      },
      required: ["filter"],
    },
  },
  {
    name: "get_orders",
    description: "Query delivery orders by status.",
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
        date: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["status"],
    },
  },
  {
    name: "get_fleet_status",
    description: "Current status of all vehicles and drivers.",
    input_schema: {
      type: "object",
      properties: {
        include_offline: { type: "boolean" },
      },
    },
  },
  {
    name: "get_analytics",
    description: "Compute KPI metrics.",
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
    description: "Adjust stock for an inventory item.",
    input_schema: {
      type: "object",
      properties: {
        inventory_id: { type: "string" },
        adjustment: { type: "number" },
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
    description: "Create a reorder request for an item.",
    input_schema: {
      type: "object",
      properties: {
        inventory_id: { type: "string" },
        quantity: { type: "number" },
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
        driver_id: { type: "string" },
        vehicle_id: { type: "string" },
        notes: { type: "string" },
      },
      required: ["order_id", "new_status"],
    },
  },
  {
    name: "assign_delivery",
    description:
      "Assign pending order to driver+vehicle. Validates availability & capacity.",
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
  {
    name: "list_emails",
    description: "List ops mailbox emails.",
    input_schema: {
      type: "object",
      properties: {
        direction: {
          type: "string",
          enum: ["incoming", "outgoing", "all"],
        },
        status: {
          type: "string",
          enum: ["unread", "read", "handled", "draft", "sent", "all"],
        },
        category: {
          type: "string",
          enum: [
            "customer_order",
            "customer_complaint",
            "customer_inquiry",
            "supplier_update",
            "delivery_notification",
            "internal",
            "other",
          ],
        },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "read_email",
    description: "Read full body + related context. Marks unread→read.",
    input_schema: {
      type: "object",
      properties: { email_id: { type: "string" } },
      required: ["email_id"],
    },
  },
  {
    name: "draft_email_reply",
    description: "Draft a reply to an incoming email (saved as draft).",
    input_schema: {
      type: "object",
      properties: {
        reply_to_email_id: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
        related_order_id: { type: "string" },
      },
      required: ["reply_to_email_id", "subject", "body"],
    },
  },
  {
    name: "draft_email",
    description:
      "Save a new outgoing email as a draft for user review and approval before sending. Use this for new compositions from the compose bar.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address." },
        subject: { type: "string" },
        body: { type: "string", description: "Plain-text email body." },
        related_order_id: { type: "string" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "send_email",
    description:
      "Send outgoing email. Two modes: (1) Promote a draft — provide email_id only. (2) Compose and send new — provide to, subject, and body (email_id must be omitted).",
    input_schema: {
      type: "object",
      properties: {
        email_id: { type: "string", description: "ID of an existing draft to promote to sent. Use this OR the compose fields — not both." },
        to: { type: "string", description: "Recipient address. Required when composing a new email (no email_id)." },
        subject: { type: "string", description: "Email subject. Required when composing a new email (no email_id)." },
        body: { type: "string", description: "Plain-text email body. Required when composing a new email (no email_id)." },
        related_order_id: { type: "string", description: "Optional order ID to associate with this email." },
      },
      required: [],
    },
  },
  {
    name: "mark_email_handled",
    description: "Mark an email handled without replying.",
    input_schema: {
      type: "object",
      properties: {
        email_id: { type: "string" },
        notes: { type: "string" },
      },
      required: ["email_id", "notes"],
    },
  },
  {
    name: "generate_daily_report",
    description:
      "Persist the Genspark Daily Briefing with summary, HTML body, and metrics.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        html: { type: "string" },
        metrics: {
          type: "object",
          properties: {
            ordersDelivered: { type: "number" },
            ordersPending: { type: "number" },
            ordersFailed: { type: "number" },
            inventoryValue: { type: "number" },
            lowStockCount: { type: "number" },
            expiryRiskValue: { type: "number" },
            fleetUtilizationPct: { type: "number" },
          },
          required: [
            "ordersDelivered",
            "ordersPending",
            "ordersFailed",
            "inventoryValue",
            "lowStockCount",
            "expiryRiskValue",
            "fleetUtilizationPct",
          ],
        },
      },
      required: ["summary", "html", "metrics"],
    },
  },
];
