import { buildSystemPrompt } from "./systemPrompt";
import { executeTool } from "./toolHandlers";
import { TOOLS } from "./tools";
import type {
  AnthropicMessage,
  ChatDisplayMessage,
  ContentBlock,
} from "./types";
import type { Action, FlowLogState } from "./state";

interface AgentApi {
  getState: () => FlowLogState;
  dispatch: React.Dispatch<Action>;
}

interface AnthropicResponse {
  content: ContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
  error?: { message?: string; type?: string };
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function appendChat(api: AgentApi, message: ChatDisplayMessage) {
  api.dispatch({ type: "APPEND_CHAT", message });
}

function appendAnthropic(api: AgentApi, message: AnthropicMessage) {
  api.dispatch({ type: "APPEND_ANTHROPIC", message });
}

export async function runAgentLoop(
  userText: string,
  api: AgentApi,
): Promise<void> {
  api.dispatch({ type: "SET_RUNNING", running: true });
  appendChat(api, { kind: "user", id: nextId("u"), text: userText });
  appendAnthropic(api, { role: "user", content: userText });

  let turns = 0;
  try {
    while (turns++ < 10) {
      const thinkingId = nextId("thinking");
      appendChat(api, { kind: "thinking", id: thinkingId });

      const messages = api.getState().anthropicMessages;
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          max_tokens: 4096,
          system: buildSystemPrompt(),
          tools: TOOLS,
          messages,
        }),
      });

      api.dispatch({ type: "REMOVE_CHAT_BY_ID", id: thinkingId });

      const data = (await response.json()) as AnthropicResponse;
      if (!response.ok || data.error) {
        const msg =
          data.error?.message ||
          (data as unknown as { error?: string }).error ||
          `HTTP ${response.status}`;
        appendChat(api, {
          kind: "error",
          id: nextId("err"),
          text: typeof msg === "string" ? msg : JSON.stringify(msg),
        });
        break;
      }

      appendAnthropic(api, { role: "assistant", content: data.content });

      const textBlocks = data.content.filter(
        (b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text",
      );
      const text = textBlocks.map((b) => b.text).join("\n").trim();
      if (text) {
        appendChat(api, { kind: "ai", id: nextId("ai"), text });
      }

      if (data.stop_reason === "end_turn") break;

      if (data.stop_reason === "tool_use") {
        const toolUses = data.content.filter(
          (b): b is Extract<ContentBlock, { type: "tool_use" }> =>
            b.type === "tool_use",
        );
        const toolResults: ContentBlock[] = [];

        for (const block of toolUses) {
          appendChat(api, {
            kind: "tool_call",
            id: nextId("tc"),
            toolName: block.name,
            input: block.input,
          });
          const { result, nextData } = executeTool(
            block.name,
            block.input,
            api.getState().data,
          );
          if (nextData) {
            api.dispatch({ type: "SET_DATA", data: nextData });
          }
          appendChat(api, {
            kind: "tool_result",
            id: nextId("tr"),
            toolName: block.name,
            result,
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }

        appendAnthropic(api, { role: "user", content: toolResults });
        continue;
      }

      break;
    }
  } catch (e) {
    appendChat(api, {
      kind: "error",
      id: nextId("err"),
      text: e instanceof Error ? e.message : String(e),
    });
  } finally {
    api.dispatch({ type: "SET_RUNNING", running: false });
  }
}
