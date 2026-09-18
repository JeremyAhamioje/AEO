import Link from "next/link";
import { analyzeUrl, AeoAnalyzeError } from "@/lib/analyze";
import { ReportView } from "@/lib/report-view";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;

  let report = null;
  let error: string | null = null;

  if (!url) {
    error = "No URL provided.";
  } else {
    try {
      report = await analyzeUrl(url);
    } catch (err) {
      error = err instanceof AeoAnalyzeError ? err.message : "Something went wrong.";
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline mb-6 inline-flex items-center gap-1"
        >
          ← Analyze another page
        </Link>

        {error && (
          <div className="border border-rose-200 bg-rose-50 text-rose-700 text-sm rounded-lg px-4 py-3 mt-4">
            {error}
          </div>
        )}

        {report && (
          <div className="mt-4">
            <ReportView report={report} />
          </div>
        )}
      </div>
    </div>
  );
}
