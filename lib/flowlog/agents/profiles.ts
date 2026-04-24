import { TOOLS } from "../tools";
import type { AgentProfileId } from "../types";

export interface AgentProfile {
  id: AgentProfileId;
  label: string;
  tagline: string;
  toolNames: string[];
  suggestedPrompts: string[];
  buildSystemPrompt: (ctx: { todayStr: string }) => string;
}

const OPS_EMAIL = "tansq05@gmail.com";

const CONTEXT = (todayStr: string) =>
  `FlowLog AI, ops brain of PrimeChill (Singapore food logistics). Today: ${todayStr}. USD. Ops inbox: ${OPS_EMAIL}.`;

export const PROFILES: Record<AgentProfileId, AgentProfile> = {
  general: {
    id: "general",
    label: "General",
    tagline: "Full-access FlowLog agent.",
    toolNames: TOOLS.map((t) => t.name),
    suggestedPrompts: [
      "What's low on stock?",
      "Dispatch all pending orders.",
      "Daily summary.",
    ],
    buildSystemPrompt: ({ todayStr }) =>
      `${CONTEXT(todayStr)} Query tools before answering. Concise bullets. Verify driver/vehicle availability before assigning.`,
  },

  inbox: {
    id: "inbox",
    label: "Inbox Agent",
    tagline: "Triages incoming email and drafts replies.",
    toolNames: [
      "list_emails",
      "read_email",
      "get_orders",
      "get_fleet_status",
      "draft_email_reply",
      "mark_email_handled",
    ],
    suggestedPrompts: [
      "Triage all unread.",
      "Draft reply to the latest complaint.",
    ],
    buildSystemPrompt: ({ todayStr }) =>
      `${CONTEXT(todayStr)} INBOX AGENT. For each email: read_email, pull relevant order/fleet context, then draft_email_reply (never send directly) or mark_email_handled. Reply style: short, factual, sign "PrimeChill Ops".`,
  },

  outbox: {
    id: "outbox",
    label: "Outbox Agent",
    tagline: "Proactive customer comms — delivery ETAs, delay notices, confirmations.",
    toolNames: [
      "list_emails",
      "get_orders",
      "get_fleet_status",
      "draft_email",
      "send_email",
    ],
    suggestedPrompts: [
      "Send ETAs for today's orders.",
      "Notify the customer on ORD-2026-010.",
    ],
    buildSystemPrompt: ({ todayStr }) =>
      `${CONTEXT(todayStr)} OUTBOX AGENT. Pull order+fleet context first, then send_email per recipient. Include order id, driver, plate, window. Sign "PrimeChill Ops".`,
  },

  dispatch: {
    id: "dispatch",
    label: "Dispatch Agent",
    tagline: "Matches pending orders to drivers+vans.",
    toolNames: [
      "get_orders",
      "get_fleet_status",
      "assign_delivery",
      "update_order_status",
    ],
    suggestedPrompts: [
      "Assign all pending orders.",
      "Dispatch ORD-2026-012.",
    ],
    buildSystemPrompt: ({ todayStr }) =>
      `${CONTEXT(todayStr)} DISPATCH AGENT. get_orders(pending) → get_fleet_status → assign_delivery for each (urgent first, check capacity). assign_delivery validates and will reject bad pairings.`,
  },

  reports: {
    id: "reports",
    label: "Reports Agent",
    tagline: "Compiles the Genspark Daily Briefing.",
    toolNames: ["get_analytics", "generate_daily_report"],
    suggestedPrompts: ["Generate today's briefing."],
    buildSystemPrompt: ({ todayStr }) =>
      `${CONTEXT(todayStr)} REPORTS AGENT. 1) get_analytics(daily_summary) once. 2) generate_daily_report exactly once with: summary (2-3 sentences), html (semantic tags, no <html> wrapper, sections: Overview / KPIs / Delivery / Inventory / Fleet / Alerts), metrics object. Keep html under 3KB.`,
  },
};

export function getToolsFor(
  profileId: AgentProfileId,
): Array<(typeof TOOLS)[number]> {
  const profile = PROFILES[profileId];
  const whitelist = new Set(profile.toolNames);
  return TOOLS.filter((t) => whitelist.has(t.name));
}

export function getProfile(id: AgentProfileId): AgentProfile {
  return PROFILES[id];
}
