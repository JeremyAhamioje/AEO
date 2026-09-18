"use client";

import { useEffect, useRef, useState } from "react";
import type { AeoReport, Category } from "@/lib/analyze";

// Real brand marks (Iconify's `logos` set), not stock photography --
// Unsplash has no accurate AI-model logos, only unrelated stock photos and,
// worse, AI-generated art mislabeled as e.g. "Claude logo" that isn't the
// real mark. Misrepresenting these brands would undercut the exact point
// (this page ranks across real answer engines) it's trying to make.
const AI_LOGOS = [
  { name: "ChatGPT", slug: "openai-icon" },
  { name: "Claude", slug: "claude" },
  { name: "Gemini", slug: "google-gemini" },
  { name: "Perplexity", slug: "perplexity" },
  { name: "Meta AI", slug: "meta-icon" },
  { name: "Mistral", slug: "mistral-ai-icon" },
  { name: "DeepSeek", slug: "deepseek-icon" },
];
const iconUrl = (slug: string) => `https://api.iconify.design/logos/${slug}.svg`;
const TILE_TILT = ["-rotate-3", "rotate-2", "-rotate-2", "rotate-3", "-rotate-1", "rotate-1", "-rotate-2"];
const TILE_LIFT = ["mt-0", "mt-3", "-mt-1", "mt-4", "mt-1", "-mt-2", "mt-2"];

function scoreColor(pct: number): { text: string; ring: string; bg: string } {
  if (pct >= 80) return { text: "text-emerald-700", ring: "stroke-emerald-500", bg: "bg-emerald-50" };
  if (pct >= 50) return { text: "text-amber-700", ring: "stroke-amber-500", bg: "bg-amber-50" };
  return { text: "text-rose-700", ring: "stroke-rose-500", bg: "bg-rose-50" };
}

function ScoreRing({ score, maxScore }: { score: number; maxScore: number }) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const { text, ring } = scoreColor(pct);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-36 h-36 shrink-0">
      <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className={ring}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${text}`}>{Math.round(pct)}</span>
        <span className="text-xs text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const pct = category.maxScore > 0 ? (category.score / category.maxScore) * 100 : 0;
  const { text, bg } = scoreColor(pct);
  const failCount = category.findings.filter((f) => !f.pass).length;

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-3 ${bg}`}>
        <h3 className="font-semibold text-slate-800">{category.label}</h3>
        <span className={`text-sm font-semibold ${text}`}>
          {category.score}/{category.maxScore}
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {category.findings.map((f, i) => (
          <li key={i} className="px-4 py-3">
            <div className="flex items-start gap-2">
              <span
                className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  f.pass ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                }`}
              >
                {f.pass ? "✓" : "✕"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{f.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{f.detail}</p>
                {!f.pass && f.fix && (
                  <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2 py-1 mt-1.5">
                    Fix: {f.fix}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {failCount === 0 && (
        <div className="px-4 py-2 text-xs text-emerald-700 bg-emerald-50 border-t border-emerald-100">
          All checks passed in this category.
        </div>
      )}
    </div>
  );
}

function reportToMarkdown(report: AeoReport): string {
  const lines: string[] = [];
  lines.push(`# AEO Readiness Report — ${report.url}`);
  lines.push(`Overall score: **${report.overallScore}/100**`);
  lines.push("");
  for (const cat of report.categories) {
    lines.push(`## ${cat.label} (${cat.score}/${cat.maxScore})`);
    for (const f of cat.findings) {
      lines.push(`- [${f.pass ? "x" : " "}] ${f.label} — ${f.detail}${!f.pass && f.fix ? ` _Fix: ${f.fix}_` : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function Hero({
  url,
  setUrl,
  onSubmit,
  loading,
}: {
  url: string;
  setUrl: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-4 pt-16 pb-14 text-center">
        <div className="flex flex-wrap justify-center gap-3 mb-9">
          {AI_LOGOS.map((logo, i) => (
            <div
              key={logo.slug}
              className={`w-14 h-14 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center p-3 ${TILE_TILT[i % TILE_TILT.length]} ${TILE_LIFT[i % TILE_LIFT.length]} transition-transform hover:rotate-0 hover:scale-105`}
              title={logo.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={iconUrl(logo.slug)} alt={logo.name} className="w-full h-full object-contain" />
            </div>
          ))}
        </div>

        <span className="inline-block text-xs font-semibold tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
          AEO · LLM VISIBILITY
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
          Built to be found by AI,
          <br className="hidden sm:block" /> not just search
        </h1>
        <p className="text-slate-500 mt-4 max-w-xl mx-auto text-sm sm:text-base">
          Score any page on how ready it is to be quoted by ChatGPT, Claude, Gemini, and
          every other answer engine — structured data, heading structure, answer
          clarity, and meta completeness.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2 mt-7 max-w-xl mx-auto">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="buffer.com/resources/some-post"
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </form>
      </div>
    </section>
  );
}

const TRACE_STEPS = [
  "Fetching page content",
  "Parsing structure & schema",
  "Checking heading hierarchy",
  "Scoring AEO readiness",
];

function ChatDemo() {
  const [step, setStep] = useState(0);
  // steps: 0 = nothing shown, 1..N = that many trace lines revealed,
  // N+1 = assistant reply shown, N+2 = pause, then loop back to 0.
  const total = TRACE_STEPS.length;

  useEffect(() => {
    const delay = step === 0 ? 500 : step <= total ? 850 : step === total + 1 ? 1600 : 2400;
    const next = step >= total + 2 ? 0 : step + 1;
    const t = setTimeout(() => setStep(next), delay);
    return () => clearTimeout(t);
  }, [step, total]);

  const revealedTrace = Math.min(step, total);
  const showReply = step > total;

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-5 max-w-md mx-auto w-full">
      <div className="flex items-center gap-1.5 mb-4">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
      </div>

      <div className="flex justify-end mb-4">
        <div className="bg-slate-800 text-slate-100 text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%]">
          Will AI assistants be able to quote this page?
        </div>
      </div>

      <div className="space-y-2 mb-4 min-h-[104px]">
        {TRACE_STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex items-center gap-2.5 text-xs transition-all duration-500 ${
              i < revealedTrace ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
            }`}
          >
            <span
              className={`w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center ${
                i < revealedTrace - 1 || step > total
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-indigo-500/20 text-indigo-300"
              }`}
            >
              {i < revealedTrace - 1 || step > total ? "✓" : "◌"}
            </span>
            <span className="text-slate-300">{label}</span>
          </div>
        ))}
      </div>

      <div
        className={`flex justify-start mb-4 transition-all duration-500 ${
          showReply ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none h-0 mb-0"
        }`}
      >
        <div className="bg-indigo-600/15 border border-indigo-500/20 text-slate-100 text-sm rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[90%]">
          This page scores <span className="font-semibold text-indigo-300">72/100</span> for AEO —
          strong heading structure, but missing FAQPage schema an engine could cite directly.
        </div>
      </div>

      <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-full px-3.5 py-2.5">
        <span className="text-xs text-slate-500">Ask about this page…</span>
        <span className="ml-auto w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs">
          ↑
        </span>
      </div>
    </div>
  );
}

function Methodology() {
  return (
    <section className="bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-16 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-block text-xs font-semibold tracking-wide text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1 mb-4">
            METHODOLOGY
          </span>
          <h2 className="text-3xl font-bold tracking-tight mb-5">
            Scored the way an answer engine actually reads a page
          </h2>
          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            <p>
              <span className="font-medium text-slate-100">Schema is scored by type, not just presence.</span>{" "}
              Most checkers give full credit for any JSON-LD block. This one only credits
              FAQPage/Article/HowTo schema — that&apos;s what makes a page directly quotable.
              Organization schema tells an engine who you are, not what this page answers.
            </p>
            <p>
              <span className="font-medium text-slate-100">Question-heading structure is checked explicitly.</span>{" "}
              Whether a heading is phrased as a real question, and whether the next sentence
              gives a short direct answer, is one of the strongest levers for getting quoted —
              and it&apos;s absent from most generic SEO/AEO scorers.
            </p>
            <p>
              <span className="font-medium text-slate-100">General web-quality signals are deliberately excluded.</span>{" "}
              Page speed and image usage are real UX factors, but they don&apos;t affect whether
              a model can extract and cite this page&apos;s text. Including them would inflate the
              score without measuring what AEO actually claims to measure.
            </p>
          </div>
        </div>
        <ChatDemo />
      </div>
    </section>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AeoReport | null>(null);
  const [copied, setCopied] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setReport(null);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setReport(data as AeoReport);
      }
    } catch {
      setError("Network error — could not reach the analyzer.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!report) return;
    await navigator.clipboard.writeText(reportToMarkdown(report));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Hero url={url} setUrl={setUrl} onSubmit={handleSubmit} loading={loading} />
      <Methodology />

      <div ref={resultsRef} className="max-w-3xl mx-auto px-4 py-12 scroll-mt-6">
        {error && (
          <div className="border border-rose-200 bg-rose-50 text-rose-700 text-sm rounded-lg px-4 py-3 mb-8">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-16 text-slate-400 text-sm gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
            Fetching and scoring the page…
          </div>
        )}

        {report && !loading && (
          <div className="space-y-6">
            <div className="border border-slate-200 rounded-lg bg-white p-6 flex items-center gap-6">
              <ScoreRing score={report.overallScore} maxScore={100} />
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">
                  Overall AEO score
                </p>
                <p className="text-sm text-slate-700 mt-1 break-all">{report.url}</p>
                <button
                  onClick={handleCopy}
                  className="mt-3 text-xs border border-slate-300 rounded px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                >
                  {copied ? "Copied!" : "Copy report as Markdown"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {report.categories.map((cat) => (
                <CategoryCard key={cat.key} category={cat} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
