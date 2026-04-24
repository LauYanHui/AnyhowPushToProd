"use client";

import styles from "@/app/flowlog.module.css";
import { FlowLogProvider, useFlowLog } from "@/lib/flowlog/state";
import { Sidebar } from "./Sidebar";
import { AgentTab } from "./tabs/AgentTab";
import { DashboardTab } from "./tabs/DashboardTab";
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
    case "agent":
      return <AgentTab />;
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
      </div>
    </FlowLogProvider>
  );
}
