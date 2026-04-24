import { getProfile, getToolsFor } from "./agents/profiles";
import { executeTool } from "./toolHandlers";
import type { Action, FlowLogState } from "./state";
import type {
  AgentProfileId,
  AnthropicMessage,
  ChatDisplayMessage,
  ContentBlock,
} from "./types";

interface AgentApi {
  getState: () => FlowLogState;
  dispatch: React.Dispatch<Action>;
}

interface AnthropicResponse {
  content: ContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
  error?: { message?: string; type?: string };
}

export type AgentRunMode = "persistent" | "ephemeral";

export interface AgentRunOptions {
  mode?: AgentRunMode;
}

// Tuning knobs. The tight numbers here target the free-tier 10K input-tokens/min
// rate limit — every field that goes over the wire is a budget line item.
const MAX_TOOL_INPUT_FIELD = 600;
const MAX_TOOL_RESULT_JSON = 2000;
const RECENT_TURNS_KEPT_VERBATIM = 2;
const PERSISTENT_TRIM_THRESHOLD = 30;
const PERSISTENT_TRIM_KEEP_TAIL = 20;
const RATE_LIMIT_MAX_RETRIES = 1;
const RATE_LIMIT_DEFAULT_WAIT_S = 30;
const RATE_LIMIT_MAX_WAIT_S = 75;

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function appendChat(api: AgentApi, message: ChatDisplayMessage) {
  api.dispatch({ type: "APPEND_CHAT", message });
}

function buildSystemPromptForProfile(profileId: AgentProfileId): string {
  const todayStr = new Date().toLocaleDateString("en-SG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return getProfile(profileId).buildSystemPrompt({ todayStr });
}

function truncateString(s: string, max: number, tag: string): string {
  if (s.length <= max) return s;
  return (
    s.slice(0, max) +
    `\n… [${tag}: truncated ${s.length - max} of ${s.length} chars]`
  );
}

function redactTooLongInput(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "string" && v.length > MAX_TOOL_INPUT_FIELD) {
      out[k] = `[redacted: ${v.length} chars — executed earlier]`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function redactOldBlocks(content: ContentBlock[]): ContentBlock[] {
  return content.map((block) => {
    if (block.type === "tool_use") {
      return { ...block, input: redactTooLongInput(block.input) };
    }
    if (block.type === "tool_result") {
      if (block.content.length > MAX_TOOL_RESULT_JSON) {
        return {
          ...block,
          content: truncateString(
            block.content,
            MAX_TOOL_RESULT_JSON,
            "older tool_result",
          ),
        };
      }
      return block;
    }
    return block;
  });
}

/**
 * Drop oldest messages when the history gets too long, while preserving the
 * Anthropic API contract: every `tool_use` must be followed by a matching
 * `tool_result` and vice-versa. We keep the first message as an anchor and
 * the last N messages verbatim, advancing the cut until pairing invariants hold.
 */
function trimPersistent(msgs: AnthropicMessage[]): {
  trimmed: AnthropicMessage[];
  didTrim: boolean;
} {
  if (msgs.length <= PERSISTENT_TRIM_THRESHOLD) {
    return { trimmed: msgs, didTrim: false };
  }

  const tailStart = Math.max(1, msgs.length - PERSISTENT_TRIM_KEEP_TAIL);
  let cut = tailStart;

  const firstToolUseIds = new Set<string>();
  const firstToolResultIds = new Set<string>();

  const collect = (slice: AnthropicMessage[]) => {
    firstToolUseIds.clear();
    firstToolResultIds.clear();
    for (const m of slice) {
      if (typeof m.content === "string") continue;
      for (const b of m.content) {
        if (b.type === "tool_use") firstToolUseIds.add(b.id);
        else if (b.type === "tool_result")
          firstToolResultIds.add(b.tool_use_id);
      }
    }
  };

  // Advance the cut until the kept tail does not contain a dangling tool_result
  // whose matching tool_use got dropped, and does not start with a message
  // containing a tool_use whose tool_result lives earlier (that can't happen
  // given API ordering, but the forward scan handles it safely).
  for (let i = 0; i < msgs.length; i++) {
    const tail = msgs.slice(cut);
    collect(tail);
    const missingPair = [...firstToolResultIds].some(
      (id) => !firstToolUseIds.has(id),
    );
    if (!missingPair) break;
    cut++;
    if (cut >= msgs.length - 1) break;
  }

  const trimmed = [msgs[0], ...msgs.slice(cut)];
  return { trimmed, didTrim: trimmed.length < msgs.length };
}

function prepareMessagesForApi(
  msgs: AnthropicMessage[],
  mode: AgentRunMode,
): { messages: AnthropicMessage[]; didTrim: boolean } {
  let working = msgs;
  let didTrim = false;

  if (mode === "persistent") {
    const r = trimPersistent(working);
    working = r.trimmed;
    didTrim = r.didTrim;
  }

  const cutoff = Math.max(0, working.length - RECENT_TURNS_KEPT_VERBATIM);
  const messages = working.map((m, idx) => {
    if (idx >= cutoff) return m;
    if (typeof m.content === "string") return m;
    return { ...m, content: redactOldBlocks(m.content) };
  });

  return { messages, didTrim };
}

function looksLikeContextLengthError(msg: string): boolean {
  const s = msg.toLowerCase();
  return (
    s.includes("prompt is too long") ||
    s.includes("context length") ||
    s.includes("context window") ||
    s.includes("maximum context")
  );
}

function looksLikeRateLimitError(
  status: number,
  errType: string | undefined,
  msg: string,
): boolean {
  if (status === 429) return true;
  if (errType === "rate_limit_error") return true;
  const s = msg.toLowerCase();
  return (
    s.includes("rate limit") ||
    s.includes("tokens per minute") ||
    s.includes("exceed your organization")
  );
}

function parseRetryAfter(res: Response): number {
  const raw = res.headers.get("retry-after");
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      return Math.min(RATE_LIMIT_MAX_WAIT_S, Math.ceil(n));
    }
    const dateMs = Date.parse(raw);
    if (Number.isFinite(dateMs)) {
      const secs = Math.ceil((dateMs - Date.now()) / 1000);
      if (secs > 0) return Math.min(RATE_LIMIT_MAX_WAIT_S, secs);
    }
  }
  const reset = res.headers.get("anthropic-ratelimit-input-tokens-reset");
  if (reset) {
    const dateMs = Date.parse(reset);
    if (Number.isFinite(dateMs)) {
      const secs = Math.ceil((dateMs - Date.now()) / 1000);
      if (secs > 0) return Math.min(RATE_LIMIT_MAX_WAIT_S, secs);
    }
  }
  return RATE_LIMIT_DEFAULT_WAIT_S;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ToolAction {
  name: string;
  ok: boolean;
  summary: string;
}

function summarizeToolCall(
  name: string,
  input: Record<string, unknown>,
  result: unknown,
): ToolAction {
  const r = (result ?? {}) as Record<string, unknown>;
  const err = typeof r.error === "string" ? r.error : undefined;
  if (err) return { name, ok: false, summary: err };

  switch (name) {
    case "assign_delivery":
      return {
        name,
        ok: true,
        summary: `Assigned ${r.order_id ?? input.order_id} → ${r.assigned_driver ?? input.driver_id} (${r.assigned_vehicle ?? input.vehicle_id})`,
      };
    case "update_order_status":
      return {
        name,
        ok: true,
        summary: `${r.order_id ?? input.order_id}: ${r.old_status ?? "?"} → ${r.new_status ?? input.new_status}`,
      };
    case "create_reorder":
      return {
        name,
        ok: true,
        summary: `Reorder ${r.reorder_id}: ${r.qty_ordered}× ${r.item_name} ($${r.total_cost})`,
      };
    case "update_stock_level":
      return {
        name,
        ok: true,
        summary: `Stock ${r.item_id ?? input.inventory_id}: ${r.before} → ${r.after}`,
      };
    case "draft_email_reply":
      return {
        name,
        ok: true,
        summary: `Drafted reply to ${r.to} (${r.draft_id})`,
      };
    case "send_email":
      return {
        name,
        ok: true,
        summary: `Sent to ${r.to}: ${r.subject}`,
      };
    case "mark_email_handled":
      return {
        name,
        ok: true,
        summary: `Marked ${r.email_id ?? input.email_id} handled`,
      };
    case "generate_daily_report":
      return {
        name,
        ok: true,
        summary: `Generated ${r.title ?? "daily report"}`,
      };
    default:
      return { name, ok: true, summary: `${name} ok` };
  }
}

function buildFallbackSummary(actions: ToolAction[]): string {
  if (actions.length === 0) return "Done.";
  const lines = actions.map((a) => (a.ok ? `• ${a.summary}` : `✗ ${a.name}: ${a.summary}`));
  return `Completed ${actions.length} action${actions.length > 1 ? "s" : ""}:\n${lines.join("\n")}`;
}

export async function runAgentLoop(
  userText: string,
  api: AgentApi,
  profileId: AgentProfileId = "general",
  opts: AgentRunOptions = {},
): Promise<boolean> {
  const mode: AgentRunMode = opts.mode ?? "persistent";

  api.dispatch({ type: "SET_RUNNING", running: true });
  appendChat(api, { kind: "user", id: nextId("u"), text: userText, profileId });

  // Single run-scoped thinking indicator. We don't flicker it per turn — the
  // user sees one "working…" pill for the whole run, then a final summary.
  const thinkingId = nextId("thinking");
  appendChat(api, { kind: "thinking", id: thinkingId, profileId });

  // `localMessages` is the authoritative Anthropic-side history for this run.
  // In persistent mode we sync it with state.anthropicMessages via APPEND_ANTHROPIC.
  // In ephemeral mode it lives only in this closure and is discarded on return.
  let localMessages: AnthropicMessage[];
  if (mode === "persistent") {
    api.dispatch({
      type: "APPEND_ANTHROPIC",
      message: { role: "user", content: userText },
    });
    localMessages = api.getState().anthropicMessages;
  } else {
    localMessages = [{ role: "user", content: userText }];
  }

  const tools = getToolsFor(profileId);
  const system = buildSystemPromptForProfile(profileId);
  let trimNoticeShown = false;
  let finalText = "";
  const toolActions: ToolAction[] = [];
  let erroredOut = false;

  try {
    let turns = 0;
    while (turns++ < 12) {
      const { messages: outgoing, didTrim } = prepareMessagesForApi(
        mode === "persistent" ? api.getState().anthropicMessages : localMessages,
        mode,
      );
      if (didTrim && !trimNoticeShown) {
        trimNoticeShown = true;
        // Keep this quiet in summary mode — it's diagnostic noise. The user
        // will still see it via the final summary if it mattered.
      }

      let response: Response | null = null;
      let data: AnthropicResponse | null = null;
      let rateLimitAttempts = 0;

      while (true) {
        const apiKey = api.getState().apiKey;
        response = await fetch("/api/agent", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(apiKey ? { "x-flowlog-api-key": apiKey } : {}),
          },
          body: JSON.stringify({
            max_tokens: 2048,
            system,
            tools,
            messages: outgoing,
          }),
        });
        data = (await response.json()) as AnthropicResponse;

        const rawMsg =
          data.error?.message ||
          (data as unknown as { error?: string }).error ||
          "";
        const msgText =
          typeof rawMsg === "string" ? rawMsg : JSON.stringify(rawMsg);
        const isRateLimited =
          !response.ok &&
          looksLikeRateLimitError(response.status, data.error?.type, msgText);

        if (!isRateLimited) break;
        if (rateLimitAttempts >= RATE_LIMIT_MAX_RETRIES) break;

        rateLimitAttempts++;
        const waitS = parseRetryAfter(response);
        // Rate-limit wait is the only intra-run message we surface —
        // the user needs to understand why there's a pause.
        appendChat(api, {
          kind: "ai",
          id: nextId("ai"),
          text: `Rate limit hit. Waiting ${waitS}s before retrying…`,
          profileId,
        });
        await sleep(waitS * 1000);
      }

      if (!response.ok || data.error) {
        const rawMsg =
          data.error?.message ||
          (data as unknown as { error?: string }).error ||
          `HTTP ${response.status}`;
        const msgText =
          typeof rawMsg === "string" ? rawMsg : JSON.stringify(rawMsg);
        let friendly = msgText;
        if (looksLikeContextLengthError(msgText)) {
          friendly =
            "Conversation is too long for this model. Click Clear in the chat to start fresh.";
        } else if (
          looksLikeRateLimitError(response.status, data.error?.type, msgText)
        ) {
          friendly =
            "Rate limit still exceeded after retry. Free tier = 10K input tokens/min. Wait ~60s and try again, or upgrade.";
        }
        api.dispatch({ type: "REMOVE_CHAT_BY_ID", id: thinkingId });
        appendChat(api, {
          kind: "error",
          id: nextId("err"),
          text: friendly,
          profileId,
        });
        erroredOut = true;
        break;
      }

      const assistantMsg: AnthropicMessage = {
        role: "assistant",
        content: data.content,
      };
      localMessages = [...localMessages, assistantMsg];
      if (mode === "persistent") {
        api.dispatch({ type: "APPEND_ANTHROPIC", message: assistantMsg });
      }

      const textBlocks = data.content.filter(
        (b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text",
      );
      const text = textBlocks.map((b) => b.text).join("\n").trim();
      if (text) finalText = text;

      if (data.stop_reason === "end_turn") break;

      if (data.stop_reason === "tool_use") {
        const toolUses = data.content.filter(
          (b): b is Extract<ContentBlock, { type: "tool_use" }> =>
            b.type === "tool_use",
        );
        const toolResults: ContentBlock[] = [];

        for (const block of toolUses) {
          const { result, nextData } = executeTool(
            block.name,
            block.input,
            api.getState().data,
          );
          if (nextData) {
            api.dispatch({ type: "SET_DATA", data: nextData });
          }
          toolActions.push(summarizeToolCall(block.name, block.input, result));
          const rawJson = JSON.stringify(result);
          const cappedJson = truncateString(
            rawJson,
            MAX_TOOL_RESULT_JSON,
            "tool_result",
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: cappedJson,
          });
        }

        const toolResultMsg: AnthropicMessage = {
          role: "user",
          content: toolResults,
        };
        localMessages = [...localMessages, toolResultMsg];
        if (mode === "persistent") {
          api.dispatch({ type: "APPEND_ANTHROPIC", message: toolResultMsg });
        }
        continue;
      }

      break;
    }
  } catch (e) {
    api.dispatch({ type: "REMOVE_CHAT_BY_ID", id: thinkingId });
    appendChat(api, {
      kind: "error",
      id: nextId("err"),
      text: e instanceof Error ? e.message : String(e),
      profileId,
    });
    erroredOut = true;
  } finally {
    api.dispatch({ type: "SET_RUNNING", running: false });
  }

  if (!erroredOut) {
    api.dispatch({ type: "REMOVE_CHAT_BY_ID", id: thinkingId });
    const summaryText = finalText || buildFallbackSummary(toolActions);
    appendChat(api, {
      kind: "ai",
      id: nextId("ai"),
      text: summaryText,
      profileId,
    });
  }
  return !erroredOut;
}
