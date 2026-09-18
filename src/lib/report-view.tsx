"use client";

import { useState } from "react";
import type { AeoReport, Category } from "@/lib/analyze";

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

export function reportToMarkdown(report: AeoReport): string {
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

export function ReportView({ report }: { report: AeoReport }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(reportToMarkdown(report));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
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
  );
}
