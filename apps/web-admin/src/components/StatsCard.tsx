// apps/web-admin/src/components/StatsCard.tsx
import type { ReactNode } from "react";

type Tone = "default" | "warning" | "danger" | "success";

const VALUE_TONE: Record<Tone, string> = {
  default: "text-slate-900",
  warning: "text-amber-600",
  danger: "text-red-600",
  success: "text-emerald-600",
};

export interface StatsCardProps {
  title: string;
  value: ReactNode;
  tone?: Tone;
  hint?: string;
}

export function StatsCard({ title, value, tone = "default", hint }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${VALUE_TONE[tone]}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
