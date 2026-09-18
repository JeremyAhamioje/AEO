"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

function Hero({
  url,
  setUrl,
  onSubmit,
  submitting,
}: {
  url: string;
  setUrl: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
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
            disabled={submitting}
            className="bg-indigo-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {submitting ? "Analyzing…" : "Analyze"}
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
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || submitting) return;
    setSubmitting(true);
    router.push(`/report?url=${encodeURIComponent(url.trim())}`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Hero url={url} setUrl={setUrl} onSubmit={handleSubmit} submitting={submitting} />
      <Methodology />
    </div>
  );
}
