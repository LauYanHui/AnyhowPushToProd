import Anthropic from "@anthropic-ai/sdk";
import {
  checkDeliveryRisk,
  checkExpiry,
  checkFulfillment,
} from "@/lib/flowlog/planChecks";
import type {
  DeliveryRisk,
  ExpiryCheckResult,
  FulfillmentOrderResult,
  PlanDriver,
  PlanInput,
  PlanOrder,
} from "@/lib/flowlog/planTypes";

const MODEL = "claude-sonnet-4-6";

function buildPrompt(
  orders: PlanOrder[],
  drivers: PlanDriver[],
  fulfillment: FulfillmentOrderResult[],
  expiring: ExpiryCheckResult[],
  deliveryRisks: DeliveryRisk[],
): string {
  // Strip items from orders — item details are already in the fulfillment block.
  const ordersMeta = orders.map(({ orderId, customer, zone, deliveryTime, priority }) => ({
    orderId, customer, zone, deliveryTime, priority,
  }));

  // Only send available drivers; unavailable ones can't be assigned anyway.
  const availableDrivers = drivers
    .filter((d) => d.available)
    .map(({ driverId, name, startTime, zone }) => ({ driverId, name, startTime, zone }));

  return `You are a logistics operations AI for a food distribution company. Analyse the data below and produce a structured daily plan.

## INPUT DATA

### Orders (${orders.length} total)
${JSON.stringify(ordersMeta)}

### Available drivers (${availableDrivers.length} of ${drivers.length})
${JSON.stringify(availableDrivers)}

## PRE-COMPUTED CHECKS

### Fulfilment status (includes per-order item details)
${JSON.stringify(fulfillment)}

### Expiring stock (within 3 days)
${JSON.stringify(expiring)}

### Delivery timing risks
${JSON.stringify(deliveryRisks)}

## YOUR TASK

Return a JSON object with exactly these keys:

{
  "fulfillmentStatus": [
    { "orderId": string, "customer": string, "status": "FULL" | "PARTIAL" | "CANNOT_FULFIL", "notes": string }
  ],
  "shortageAlerts": [
    { "item": string, "shortfall": number, "unit": string, "affectedOrders": string[], "recommendation": string }
  ],
  "expiringStock": [
    { "item": string, "daysLeft": number, "qty": number, "unit": string, "action": string }
  ],
  "deliveryPlan": [
    { "timeSlot": string, "orderId": string, "customer": string, "driver": string, "items": string, "priority": string, "notes": string }
  ],
  "ownerSummary": {
    "totalOrders": number,
    "canFulfil": number,
    "atRisk": number,
    "escalations": [
      { "severity": "CRITICAL" | "HIGH" | "MEDIUM", "title": string, "detail": string, "orderIds": string[] }
    ],
    "actions": [
      { "priority": number, "action": string }
    ]
  }
}

Return only the JSON — no markdown fences, no extra text.`;
}

export async function POST(req: Request) {
  const apiKey =
    req.headers.get("x-flowlog-api-key") || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error: {
          type: "configuration_error",
          message:
            "No API key configured. Enter your Anthropic API key in the sidebar.",
        },
      },
      { status: 500 },
    );
  }

  let body: Partial<PlanInput>;
  try {
    body = (await req.json()) as Partial<PlanInput>;
  } catch {
    return Response.json(
      { error: { type: "invalid_request", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const { orders, inventory, drivers } = body;
  if (!orders || !inventory || !drivers) {
    return Response.json(
      {
        error: {
          type: "invalid_request",
          message: "`orders`, `inventory`, and `drivers` are required",
        },
      },
      { status: 400 },
    );
  }

  const fulfillment = checkFulfillment(orders, inventory);
  const expiring = checkExpiry(inventory);
  const deliveryRisks = checkDeliveryRisk(orders, drivers);

  const client = new Anthropic({ apiKey });
  let raw: string;
  let stopReason: string | null = null;
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: "You are a precise logistics AI. Always respond with valid JSON only.",
      messages: [
        {
          role: "user",
          content: buildPrompt(
            orders,
            drivers,
            fulfillment,
            expiring,
            deliveryRisks,
          ),
        },
      ],
    });
    stopReason = message.stop_reason;
    const textBlocks = message.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    if (textBlocks.length === 0) {
      return Response.json(
        {
          error: {
            type: "upstream_error",
            message: `Model returned no text block (stop_reason: ${stopReason})`,
          },
        },
        { status: 502 },
      );
    }
    raw = textBlocks.map((b) => b.text).join("").trim();
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      return Response.json(
        { error: { type: e.name, message: e.message } },
        { status: e.status ?? 502 },
      );
    }
    return Response.json(
      {
        error: {
          type: "internal_error",
          message: e instanceof Error ? e.message : String(e),
        },
      },
      { status: 500 },
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const truncated = stopReason === "max_tokens";
    return Response.json(
      {
        error: {
          type: truncated ? "max_tokens_truncation" : "parse_error",
          message: truncated
            ? "Model hit max_tokens cap; output was truncated before valid JSON could be produced. Increase max_tokens or reduce input."
            : "Claude returned invalid JSON",
          stop_reason: stopReason,
          raw: raw.slice(0, 500),
        },
      },
      { status: 502 },
    );
  }

  const fulfillmentStatus = (
    Array.isArray(parsed.fulfillmentStatus) ? parsed.fulfillmentStatus : []
  ) as Array<{ status: string }>;

  // Derive KPIs from the fulfillment array so they are guaranteed to tally,
  // rather than relying on Claude's independently-generated summary numbers.
  const canFulfil = fulfillmentStatus.filter((f) => f.status === "FULL").length;
  const atRisk = fulfillmentStatus.filter((f) => f.status !== "FULL").length;
  const ownerSummary = {
    ...((parsed.ownerSummary as Record<string, unknown>) ?? {}),
    totalOrders: fulfillmentStatus.length,
    canFulfil,
    atRisk,
  };

  return Response.json({
    fulfillmentStatus,
    shortageAlerts: parsed.shortageAlerts ?? [],
    expiringStock: parsed.expiringStock ?? [],
    deliveryPlan: parsed.deliveryPlan ?? [],
    ownerSummary,
  });
}
