import type {
  DeliveryRisk,
  ExpiryCheckResult,
  FulfillmentOrderResult,
  PlanDriver,
  PlanInventory,
  PlanOrder,
} from "./planTypes";

export function checkFulfillment(
  orders: PlanOrder[],
  inventory: PlanInventory[],
): FulfillmentOrderResult[] {
  const stock: Record<string, number> = {};
  for (const item of inventory) {
    stock[item.item.toLowerCase()] = item.available;
  }

  const results: FulfillmentOrderResult[] = [];
  for (const order of orders) {
    const itemResults = order.items.map((lineItem) => {
      const key = lineItem.name.toLowerCase();
      const avail = stock[key] ?? 0;
      const canFulfil = avail >= lineItem.qty;
      if (canFulfil) stock[key] = avail - lineItem.qty;
      return {
        name: lineItem.name,
        needed: lineItem.qty,
        available: avail,
        canFulfil,
        shortfall: canFulfil ? 0 : lineItem.qty - avail,
      };
    });
    results.push({
      orderId: order.orderId,
      customer: order.customer,
      items: itemResults,
    });
  }
  return results;
}

export function checkExpiry(
  inventory: PlanInventory[],
  warningDays = 3,
): ExpiryCheckResult[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inventory
    .filter((item) => item.expiryDate)
    .map((item) => {
      const exp = new Date(item.expiryDate as string);
      const daysLeft = Math.ceil(
        (exp.getTime() - today.getTime()) / 86400000,
      );
      return {
        item: item.item,
        available: item.available,
        unit: item.unit,
        expiryDate: item.expiryDate as string,
        daysLeft,
      };
    })
    .filter((item) => item.daysLeft <= warningDays)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

function parseTimeMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function checkDeliveryRisk(
  orders: PlanOrder[],
  drivers: PlanDriver[],
): DeliveryRisk[] {
  const availableDrivers = drivers.filter((d) => d.available);
  const risks: DeliveryRisk[] = [];

  for (const order of orders) {
    const suitableDriver = availableDrivers.find(
      (d) => !d.zone || d.zone === order.zone || !order.zone,
    );
    if (!suitableDriver) {
      risks.push({
        orderId: order.orderId,
        customer: order.customer,
        issue: "No available driver for this zone",
      });
    } else if (
      order.deliveryTime &&
      parseTimeMinutes(suitableDriver.startTime) > parseTimeMinutes(order.deliveryTime)
    ) {
      risks.push({
        orderId: order.orderId,
        customer: order.customer,
        issue: `Driver ${suitableDriver.name} starts at ${suitableDriver.startTime}, delivery due ${order.deliveryTime}`,
      });
    }
  }
  return risks;
}
