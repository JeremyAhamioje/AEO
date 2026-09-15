import { NextRequest, NextResponse } from "next/server";
import { fetchHtml, analyzeHtml } from "@/lib/analyze";

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "Missing url." }, { status: 400 });
  }

  const url = normalizeUrl(body.url);

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Only http/https URLs are supported." }, { status: 400 });
  }

  try {
    const { html } = await fetchHtml(url);
    const report = analyzeHtml(url, html);
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch or analyze that URL.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
