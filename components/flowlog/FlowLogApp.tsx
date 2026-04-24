"use client";

import styles from "@/app/flowlog.module.css";
import { FlowLogProvider, useFlowLog } from "@/lib/flowlog/state";
import { FloatingAgentChat } from "./FloatingAgentChat";
import { Sidebar } from "./Sidebar";
import { DashboardTab } from "./tabs/DashboardTab";
import { EmailTab } from "./tabs/EmailTab";
import { InventoryTab } from "./tabs/InventoryTab";
import { OrdersTab } from "./tabs/OrdersTab";
function ActiveTab() {
  const { state } = useFlowLog();
  switch (state.activeTab) {
    case "dashboard":
      return <DashboardTab />;
    case "inventory":
      return <InventoryTab />;
    case "orders":
      return <OrdersTab />;
    case "emails":
      return <EmailTab />;
  }
}

export function FlowLogApp() {
  return (
    <FlowLogProvider>
      <div className={styles.app}>
        <Sidebar />
        <main className={styles["main-content"]}>
          <ActiveTab />
        </main>
        <FloatingAgentChat />
      </div>
    </FlowLogProvider>
  );
}
