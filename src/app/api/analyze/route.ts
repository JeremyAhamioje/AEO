import { NextRequest, NextResponse } from "next/server";
import { analyzeUrl, AeoAnalyzeError } from "@/lib/analyze";

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const report = await analyzeUrl(body.url ?? "");
    return NextResponse.json(report);
  } catch (err) {
    if (err instanceof AeoAnalyzeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
