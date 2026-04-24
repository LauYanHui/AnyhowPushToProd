import { fmtTime, getItem, nearestExpiry } from "./helpers";
import type { PlanInput } from "./planTypes";
import type { FlowLogData } from "./types";

const PRIORITY_MAP: Record<string, string> = {
  urgent: "critical",
  high: "high",
  normal: "medium",
  low: "low",
};

function hhmm(iso: string): string {
  // fmtTime produces localized "HH:MM" in en-SG; normalise to HH:MM (no seconds/AM-PM for app.js-style string compare).
  const formatted = fmtTime(iso);
  return formatted.replace(/\s?(am|pm)$/i, "");
}

export function toPlanInput(data: FlowLogData): PlanInput {
  return {
    orders: data.orders.map((o) => ({
      orderId: o.id,
      customer: o.customerName,
      zone: o.customerAddress,
      deliveryTime: hhmm(o.deliveryWindow.earliest),
      priority: PRIORITY_MAP[o.priority] ?? o.priority,
      items: o.items.map((it) => {
        const inv = getItem(data, it.inventoryId);
        return {
          name: inv?.name ?? it.inventoryId,
          qty: it.qty,
          unit: inv?.unit ?? "unit",
        };
      }),
    })),
    inventory: data.inventory.map((i) => {
      const ne = nearestExpiry(i);
      return {
        item: i.name,
        available: i.currentStock,
        unit: i.unit,
        expiryDate: ne?.expiresOn ?? null,
      };
    }),
    drivers: data.drivers.map((d) => ({
      driverId: d.id,
      name: d.name,
      available: d.status === "available",
      // FlowLog has no shift start time; 07:00 is a conservative default so the
      // delivery-risk check still fires meaningfully.
      startTime: "07:00",
      // FlowLog doesn't track driver zone; leave blank so the zone match is permissive.
      zone: "",
    })),
  };
}
