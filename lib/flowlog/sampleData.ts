import type { PlanInput } from "./planTypes";

export const SAMPLE_DATA: PlanInput = {
  orders: [
    {
      orderId: "ORD001",
      customer: "Sunrise Café",
      zone: "North",
      deliveryTime: "09:00",
      priority: "high",
      items: [
        { name: "Chicken Breast", qty: 20, unit: "kg" },
        { name: "Mixed Salad", qty: 5, unit: "kg" },
      ],
    },
    {
      orderId: "ORD002",
      customer: "Green Bowl Restaurant",
      zone: "Central",
      deliveryTime: "10:30",
      priority: "medium",
      items: [
        { name: "Salmon Fillet", qty: 15, unit: "kg" },
        { name: "Broccoli", qty: 8, unit: "kg" },
      ],
    },
    {
      orderId: "ORD003",
      customer: "City Hospital Canteen",
      zone: "East",
      deliveryTime: "08:00",
      priority: "critical",
      items: [
        { name: "Chicken Breast", qty: 30, unit: "kg" },
        { name: "Brown Rice", qty: 20, unit: "kg" },
        { name: "Carrot", qty: 10, unit: "kg" },
      ],
    },
    {
      orderId: "ORD004",
      customer: "The Lunch Box",
      zone: "South",
      deliveryTime: "11:00",
      priority: "low",
      items: [
        { name: "Mixed Salad", qty: 3, unit: "kg" },
        { name: "Broccoli", qty: 5, unit: "kg" },
      ],
    },
  ],
  inventory: [
    { item: "Chicken Breast", available: 45, unit: "kg", expiryDate: "2026-04-25" },
    { item: "Salmon Fillet", available: 10, unit: "kg", expiryDate: "2026-04-24" },
    { item: "Mixed Salad", available: 12, unit: "kg", expiryDate: "2026-04-26" },
    { item: "Broccoli", available: 20, unit: "kg", expiryDate: "2026-04-30" },
    { item: "Brown Rice", available: 50, unit: "kg", expiryDate: "2026-06-01" },
    { item: "Carrot", available: 15, unit: "kg", expiryDate: "2026-04-28" },
  ],
  drivers: [
    { driverId: "D01", name: "Ahmad", available: true, startTime: "07:00", zone: "North" },
    { driverId: "D02", name: "Ravi", available: true, startTime: "08:30", zone: "Central" },
    { driverId: "D03", name: "Mei", available: false, startTime: "09:00", zone: "East" },
    { driverId: "D04", name: "Jason", available: true, startTime: "07:30", zone: "South" },
  ],
};
