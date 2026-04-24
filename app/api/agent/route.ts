const MODEL = "claude-sonnet-4-20250514";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { type: "invalid_request", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const upstream = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  });

  const data = await upstream.json();
  return Response.json(data, { status: upstream.status });
}
