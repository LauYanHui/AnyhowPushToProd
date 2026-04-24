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
import type {
  AgentProfileId,
  AnthropicMessage,
  ChatDisplayMessage,
  DailyReport,
  Email,
  FlowLogData,
  InvFilter,
  OrdFilter,
  TabId,
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
  selectedEmailId: string | null;
  selectedReportId: string | null;
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
  | { type: "CLEAR_CHAT" }
  | { type: "SET_RUNNING"; running: boolean }
  | { type: "SET_ACTIVE_PROFILE"; profile: AgentProfileId }
  | { type: "APPEND_EMAIL"; email: Email }
  | { type: "UPDATE_EMAIL"; id: string; patch: Partial<Email> }
  | { type: "DELETE_EMAIL"; id: string }
  | { type: "APPEND_REPORT"; report: DailyReport }
  | { type: "SET_SELECTED_EMAIL"; id: string | null }
  | { type: "SET_SELECTED_REPORT"; id: string | null };

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
      return { ...state, chat: [], anthropicMessages: [] };
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
    selectedEmailId: null,
    selectedReportId: null,
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
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const value = useMemo(
    () => ({ state, dispatch, stateRef }),
    [state],
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
