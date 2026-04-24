const MODEL = "claude-sonnet-4-6";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// Mark the system prompt and tools schema with ephemeral cache_control so
// subsequent turns within 5 minutes reuse cached tokens at ~10% of input cost.
// Stable prefix (system + tools) is re-sent on every agent turn, so this is
// the single biggest lever against the org's input-tokens-per-minute cap.
function withPromptCaching(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body };

  const sys = body.system;
  if (typeof sys === "string" && sys.length > 0) {
    out.system = [
      {
        type: "text",
        text: sys,
        cache_control: { type: "ephemeral" },
      },
    ];
  } else if (Array.isArray(sys) && sys.length > 0) {
    const last = sys[sys.length - 1];
    if (last && typeof last === "object") {
      out.system = [
        ...sys.slice(0, -1),
        { ...(last as Record<string, unknown>), cache_control: { type: "ephemeral" } },
      ];
    }
  }

  const tools = body.tools;
  if (Array.isArray(tools) && tools.length > 0) {
    const last = tools[tools.length - 1];
    if (last && typeof last === "object") {
      out.tools = [
        ...tools.slice(0, -1),
        { ...(last as Record<string, unknown>), cache_control: { type: "ephemeral" } },
      ];
    }
  }

  return out;
}

export async function POST(req: Request) {
  const key =
    req.headers.get("x-flowlog-api-key") || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json(
      {
        error: {
          type: "configuration_error",
          message:
            "No API key configured. Enter your Anthropic API key in the sidebar.",
        },
      },
      { status: 500 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { type: "invalid_request", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const cachedBody = withPromptCaching(body);

  const upstream = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, ...cachedBody }),
  });

  const data = await upstream.json();
  const headers = new Headers();
  const retryAfter = upstream.headers.get("retry-after");
  if (retryAfter) headers.set("retry-after", retryAfter);
  const tokenReset = upstream.headers.get(
    "anthropic-ratelimit-input-tokens-reset",
  );
  if (tokenReset)
    headers.set("anthropic-ratelimit-input-tokens-reset", tokenReset);
  return Response.json(data, { status: upstream.status, headers });
}
