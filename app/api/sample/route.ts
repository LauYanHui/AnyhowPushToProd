import { SAMPLE_DATA } from "@/lib/flowlog/sampleData";

export async function GET() {
  return Response.json(SAMPLE_DATA);
}
