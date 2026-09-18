export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <span className="text-sm text-slate-300 mb-6 inline-block">← Analyze another page</span>
        <div className="flex flex-col items-center py-24 text-slate-400 text-sm gap-3">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
          Fetching and scoring the page…
        </div>
      </div>
    </div>
  );
}
