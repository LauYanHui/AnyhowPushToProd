"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { seedData } from "./seed";
import type { PlanResult } from "./planTypes";
import type {
  AgentProfileId,
  AnthropicMessage,
  ChatDisplayMessage,
  DailyReport,
  Driver,
  Email,
  FlowLogData,
  InvFilter,
  Order,
  OrdFilter,
  Reorder,
  TabId,
  Vehicle,
} from "./types";

export interface FlowLogState {
  data: FlowLogData;
  activeTab: TabId;
  invFilter: InvFilter;
  invSearch: string;
  ordFilter: OrdFilter;
  chat: ChatDisplayMessage[];
  anthropicMessages: AnthropicMessage[];
  agentRunning: boolean;
  activeAgentProfile: AgentProfileId;
  agentPrefill: string | null;
  selectedEmailId: string | null;
  selectedReportId: string | null;
  plan: PlanResult | null;
  planLoading: boolean;
  planError: string | null;
  chatOpen: boolean;
}

export type Action =
  | { type: "SET_ACTIVE_TAB"; tab: TabId }
  | { type: "SET_INV_FILTER"; filter: InvFilter }
  | { type: "SET_INV_SEARCH"; search: string }
  | { type: "SET_ORD_FILTER"; filter: OrdFilter }
  | { type: "SET_DATA"; data: FlowLogData }
  | { type: "APPEND_CHAT"; message: ChatDisplayMessage }
  | { type: "REMOVE_CHAT_BY_ID"; id: string }
  | { type: "APPEND_ANTHROPIC"; message: AnthropicMessage }
  | { type: "CLEAR_CHAT"; profileId?: AgentProfileId }
  | { type: "SET_RUNNING"; running: boolean }
  | { type: "SET_ACTIVE_PROFILE"; profile: AgentProfileId }
  | { type: "APPEND_EMAIL"; email: Email }
  | { type: "UPDATE_EMAIL"; id: string; patch: Partial<Email> }
  | { type: "DELETE_EMAIL"; id: string }
  | { type: "APPEND_REPORT"; report: DailyReport }
  | { type: "SET_SELECTED_EMAIL"; id: string | null }
  | { type: "SET_SELECTED_REPORT"; id: string | null }
  | { type: "SET_PLAN"; plan: PlanResult | null }
  | { type: "SET_PLAN_LOADING"; loading: boolean }
  | { type: "SET_PLAN_ERROR"; error: string | null }
  | { type: "SET_AGENT_PREFILL"; text: string | null }
  | { type: "SET_CHAT_OPEN"; open: boolean }
  | { type: "UPDATE_ORDER"; id: string; patch: Partial<Order> }
  | { type: "UPDATE_DRIVER"; id: string; patch: Partial<Driver> }
  | { type: "UPDATE_VEHICLE"; id: string; patch: Partial<Vehicle> }
  | { type: "APPEND_REORDER"; reorder: Reorder };

function reducer(state: FlowLogState, action: Action): FlowLogState {
  switch (action.type) {
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.tab };
    case "SET_INV_FILTER":
      return { ...state, invFilter: action.filter };
    case "SET_INV_SEARCH":
      return { ...state, invSearch: action.search };
    case "SET_ORD_FILTER":
      return { ...state, ordFilter: action.filter };
    case "SET_DATA":
      return { ...state, data: action.data };
    case "APPEND_CHAT":
      return { ...state, chat: [...state.chat, action.message] };
    case "REMOVE_CHAT_BY_ID":
      return {
        ...state,
        chat: state.chat.filter((m) => m.id !== action.id),
      };
    case "APPEND_ANTHROPIC":
      return {
        ...state,
        anthropicMessages: [...state.anthropicMessages, action.message],
      };
    case "CLEAR_CHAT":
      return {
        ...state,
        chat: action.profileId
          ? state.chat.filter((m) => m.profileId !== action.profileId)
          : [],
        anthropicMessages: [],
      };
    case "SET_RUNNING":
      return { ...state, agentRunning: action.running };
    case "SET_ACTIVE_PROFILE":
      return { ...state, activeAgentProfile: action.profile };
    case "APPEND_EMAIL":
      return {
        ...state,
        data: { ...state.data, emails: [...state.data.emails, action.email] },
      };
    case "UPDATE_EMAIL":
      return {
        ...state,
        data: {
          ...state.data,
          emails: state.data.emails.map((e) =>
            e.id === action.id ? { ...e, ...action.patch } : e,
          ),
        },
      };
    case "DELETE_EMAIL":
      return {
        ...state,
        data: {
          ...state.data,
          emails: state.data.emails.filter((e) => e.id !== action.id),
        },
        selectedEmailId:
          state.selectedEmailId === action.id ? null : state.selectedEmailId,
      };
    case "APPEND_REPORT":
      return {
        ...state,
        data: {
          ...state.data,
          reports: [...state.data.reports, action.report],
        },
      };
    case "SET_SELECTED_EMAIL":
      return { ...state, selectedEmailId: action.id };
    case "SET_SELECTED_REPORT":
      return { ...state, selectedReportId: action.id };
    case "SET_PLAN":
      return { ...state, plan: action.plan };
    case "SET_PLAN_LOADING":
      return { ...state, planLoading: action.loading };
    case "SET_PLAN_ERROR":
      return { ...state, planError: action.error };
    case "SET_AGENT_PREFILL":
      return { ...state, agentPrefill: action.text };
    case "SET_CHAT_OPEN":
      return { ...state, chatOpen: action.open };
    case "UPDATE_ORDER":
      return {
        ...state,
        data: {
          ...state.data,
          orders: state.data.orders.map((o) =>
            o.id === action.id ? { ...o, ...action.patch } : o,
          ),
        },
      };
    case "UPDATE_DRIVER":
      return {
        ...state,
        data: {
          ...state.data,
          drivers: state.data.drivers.map((d) =>
            d.id === action.id ? { ...d, ...action.patch } : d,
          ),
        },
      };
    case "UPDATE_VEHICLE":
      return {
        ...state,
        data: {
          ...state.data,
          vehicles: state.data.vehicles.map((v) =>
            v.id === action.id ? { ...v, ...action.patch } : v,
          ),
        },
      };
    case "APPEND_REORDER":
      return {
        ...state,
        data: {
          ...state.data,
          reorders: [...state.data.reorders, action.reorder],
        },
      };
  }
}

function initialState(): FlowLogState {
  return {
    data: seedData(),
    activeTab: "dashboard",
    invFilter: "all",
    invSearch: "",
    ordFilter: "all",
    chat: [],
    anthropicMessages: [],
    agentRunning: false,
    activeAgentProfile: "general",
    agentPrefill: null,
    selectedEmailId: null,
    selectedReportId: null,
    plan: null,
    planLoading: false,
    planError: null,
    chatOpen: false,
  };
}

export interface FlowLogContextValue {
  state: FlowLogState;
  dispatch: React.Dispatch<Action>;
  stateRef: React.RefObject<FlowLogState>;
}

const FlowLogContext = createContext<FlowLogContextValue | null>(null);

export function FlowLogProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const stateRef = useRef(state);

  // Keep stateRef in sync after every render (for external reads)
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Wrap dispatch so stateRef is updated synchronously.
  // This prevents the race where agent.ts reads stateRef before React re-renders.
  const syncDispatch = useMemo(() => {
    const fn: typeof dispatch = (action) => {
      stateRef.current = reducer(stateRef.current, action);
      dispatch(action);
    };
    return fn;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ state, dispatch: syncDispatch, stateRef }),
    [state, syncDispatch],
  );

  return (
    <FlowLogContext.Provider value={value}>{children}</FlowLogContext.Provider>
  );
}

export function useFlowLog(): FlowLogContextValue {
  const ctx = useContext(FlowLogContext);
  if (!ctx) throw new Error("useFlowLog must be used inside FlowLogProvider");
  return ctx;
}
