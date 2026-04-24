import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/flowlog/systemPrompt";
import { TOOLS } from "@/lib/flowlog/tools";

const MODEL = "claude-sonnet-4-6";

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error: {
          type: "configuration_error",
          message:
            "Server is missing ANTHROPIC_API_KEY. Add it to .env.local and restart the dev server.",
        },
      },
      { status: 500 },
    );
  }

  let body: { messages?: unknown };
  try {
    body = (await req.json()) as { messages?: unknown };
  } catch {
    return Response.json(
      { error: { type: "invalid_request", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.messages)) {
    return Response.json(
      { error: { type: "invalid_request", message: "`messages` array is required" } },
      { status: 400 },
    );
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: buildSystemPrompt(),
      tools: TOOLS as Anthropic.Tool[],
      messages: body.messages as Anthropic.MessageParam[],
    });
    return Response.json(response);
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      return Response.json(
        { error: { type: e.name, message: e.message } },
        { status: e.status ?? 502 },
      );
    }
    return Response.json(
      {
        error: {
          type: "internal_error",
          message: e instanceof Error ? e.message : String(e),
        },
      },
      { status: 500 },
    );
  }
}
