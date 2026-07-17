// apps/web-admin/src/components/States.tsx
export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center p-10 text-sm text-slate-500">
      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
      {label}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="p-8 text-center">
      <p className="text-sm font-semibold text-red-700">Couldn’t load data</p>
      <p className="mt-1 text-xs text-red-500">{message ?? "Something went wrong."}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
