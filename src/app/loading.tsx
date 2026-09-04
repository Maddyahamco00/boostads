export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium text-slate-600">Loading Boost Market...</p>
    </div>
  );
}
