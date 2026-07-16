// apps/web-admin/src/components/StatsCard.tsx

export interface StatsCardProps {
  title: string;
  value: string | number;
  variant?: "default" | "warning" | "danger";
}

export function StatsCard({ title, value, variant = "default" }: StatsCardProps) {
  const colorClass =
    variant === "warning"
      ? "stats-card--warning"
      : variant === "danger"
      ? "stats-card--danger"
      : "stats-card--default";

  return (
    <div className={`stats-card ${colorClass}`}>
      <span className="stats-card__title">{title}</span>
      <span className="stats-card__value">{value}</span>
    </div>
  );
}
