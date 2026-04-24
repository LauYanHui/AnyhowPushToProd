import type {
  Driver,
  ExpiryBatch,
  FlowLogData,
  Inventory,
  Order,
  Vehicle,
} from "./types";

export function fmtCurrency(n: number): string {
  return (
    "$" +
    Number(n).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
  });
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export function stockStatus(item: Inventory): "out" | "low" | "warn" | "ok" {
  if (item.currentStock === 0) return "out";
  if (item.currentStock <= item.reorderPoint) return "low";
  if (item.currentStock <= item.reorderPoint * 1.5) return "warn";
  return "ok";
}

export function nearestExpiry(item: Inventory): ExpiryBatch | null {
  if (!item.expiryDates.length) return null;
  return item.expiryDates
    .slice()
    .sort(
      (a, b) =>
        new Date(a.expiresOn).getTime() - new Date(b.expiresOn).getTime(),
    )[0];
}

export function getDriver(
  data: Pick<FlowLogData, "drivers">,
  id: string | null | undefined,
): Driver | undefined {
  if (!id) return undefined;
  return data.drivers.find((d) => d.id === id);
}

export function getVehicle(
  data: Pick<FlowLogData, "vehicles">,
  id: string | null | undefined,
): Vehicle | undefined {
  if (!id) return undefined;
  return data.vehicles.find((v) => v.id === id);
}

export function getItem(
  data: Pick<FlowLogData, "inventory">,
  id: string | null | undefined,
): Inventory | undefined {
  if (!id) return undefined;
  return data.inventory.find((i) => i.id === id);
}

export function withinNextDays(iso: string, today: Date, days: number): boolean {
  const target = new Date(today);
  target.setDate(today.getDate() + days);
  const exp = new Date(iso);
  return exp <= target && exp >= today;
}

export function orderIsUpcomingWithinMinutes(
  order: Order,
  now: Date,
  maxMinutes: number,
  minMinutes: number,
): boolean {
  const win = new Date(order.deliveryWindow.earliest);
  const mins = (win.getTime() - now.getTime()) / 60000;
  return mins < maxMinutes && mins > minMinutes;
}
