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
  {
    name: "list_emails",
    description:
      "List emails in the PrimeChill operations mailbox, filtered by direction and/or status.",
    input_schema: {
      type: "object",
      properties: {
        direction: {
          type: "string",
          enum: ["incoming", "outgoing", "all"],
          description: "Inbox vs outbox vs both. Defaults to 'all'.",
        },
        status: {
          type: "string",
          enum: ["unread", "read", "handled", "draft", "sent", "all"],
          description: "Filter by status. Defaults to 'all'.",
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
        limit: {
          type: "number",
          description: "Max number of rows to return. Defaults to 20.",
        },
      },
    },
  },
  {
    name: "read_email",
    description:
      "Read the full body of an email and any related order/supplier context. Marks unread emails as read.",
    input_schema: {
      type: "object",
      properties: {
        email_id: { type: "string" },
      },
      required: ["email_id"],
    },
  },
  {
    name: "draft_email_reply",
    description:
      "Draft a reply to an incoming email. Saves it to the outbox as a DRAFT for the human to review — does not actually send.",
    input_schema: {
      type: "object",
      properties: {
        reply_to_email_id: {
          type: "string",
          description: "The incoming email being replied to.",
        },
        subject: { type: "string" },
        body: {
          type: "string",
          description:
            "Plain-text reply body. Keep it concise, professional, factual.",
        },
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
      "Send an outgoing email (marked as 'sent'). If email_id is a draft, promotes the draft to sent. Otherwise creates a new sent email.",
    input_schema: {
      type: "object",
      properties: {
        email_id: {
          type: "string",
          description:
            "Optional — if provided and points to a draft, promotes that draft to sent.",
        },
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
        related_order_id: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "mark_email_handled",
    description:
      "Mark an email as handled without drafting a reply — for informational emails that need no response.",
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
      "Persist a daily operations report (the Genspark Daily Briefing) with exec summary, full HTML body, and numeric metrics.",
    input_schema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "Short exec summary paragraph, 2–3 sentences.",
        },
        html: {
          type: "string",
          description:
            "HTML body of the report (no <html>/<head> wrapper). Use semantic tags and inline styles sparingly.",
        },
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
