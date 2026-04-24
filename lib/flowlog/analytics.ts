import type { FlowLogData } from "./types";

type Metric =
  | "inventory_value"
  | "delivery_performance"
  | "expiry_risk"
  | "reorder_summary"
  | "fleet_utilization"
  | "daily_summary";

export function computeAnalytics(
  data: FlowLogData,
  metric: Metric,
): Record<string, unknown> {
  const today = new Date();
  const in7 = new Date(today);
  in7.setDate(today.getDate() + 7);

  const invValue = data.inventory.reduce(
    (s, i) => s + i.currentStock * i.costPerUnit,
    0,
  );
  const delivered = data.orders.filter((o) => o.status === "delivered");
  const onTime = delivered.filter((o) => {
    if (!o.actualDeliveredAt || !o.deliveryWindow?.latest) return false;
    return new Date(o.actualDeliveredAt) <= new Date(o.deliveryWindow.latest);
  });
  const nearExpiry = data.inventory.flatMap((i) =>
    i.expiryDates
      .filter(
        (e) =>
          new Date(e.expiresOn) <= in7 && new Date(e.expiresOn) >= today,
      )
      .map((e) => ({
        id: i.id,
        name: i.name,
        qty: e.qty,
        expiresOn: e.expiresOn,
        riskValue: Math.round(e.qty * i.costPerUnit),
      })),
  );
  const lowStock = data.inventory.filter(
    (i) => i.currentStock <= i.reorderPoint,
  );
  const activeVeh = data.vehicles.filter(
    (v) => v.status !== "offline" && v.status !== "maintenance",
  );
  const totalCap = activeVeh.reduce((s, v) => s + v.capacityKg, 0);
  const usedCap = activeVeh.reduce((s, v) => s + v.currentLoadKg, 0);

  const all = {
    inventory_value: {
      total: Math.round(invValue),
      currency: "USD",
      item_count: data.inventory.length,
    },
    delivery_performance: {
      total_delivered: delivered.length,
      on_time: onTime.length,
      on_time_rate_pct: delivered.length
        ? Math.round((onTime.length / delivered.length) * 100)
        : null,
      pending: data.orders.filter((o) => o.status === "pending").length,
      in_transit: data.orders.filter((o) => o.status === "in_transit").length,
      failed: data.orders.filter((o) => o.status === "failed").length,
    },
    expiry_risk: {
      items_at_risk: nearExpiry.length,
      total_risk_value: nearExpiry.reduce((s, e) => s + e.riskValue, 0),
      details: nearExpiry.sort(
        (a, b) =>
          new Date(a.expiresOn).getTime() - new Date(b.expiresOn).getTime(),
      ),
    },
    reorder_summary: {
      items_below_reorder_point: lowStock.length,
      items: lowStock.map((i) => ({
        id: i.id,
        name: i.name,
        current: i.currentStock,
        reorderPoint: i.reorderPoint,
        reorderQty: i.reorderQty,
        unitCost: i.costPerUnit,
        estimatedCost: Math.round(i.reorderQty * i.costPerUnit),
      })),
      estimated_total_reorder_cost: Math.round(
        lowStock.reduce((s, i) => s + i.reorderQty * i.costPerUnit, 0),
      ),
    },
    fleet_utilization: {
      active_vehicles: activeVeh.length,
      total_vehicles: data.vehicles.length,
      capacity_used_kg: usedCap,
      capacity_total_kg: totalCap,
      utilization_pct: totalCap ? Math.round((usedCap / totalCap) * 100) : 0,
    },
  };

  if (metric === "daily_summary") return all;
  return { [metric]: all[metric] };
}
