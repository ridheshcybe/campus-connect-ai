// apps/web-admin/src/components/PlaceholderPage.tsx
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-slate-500">This screen is planned for a later milestone.</p>
        <p className="mt-1 text-sm text-slate-400">
          The app shell, routing and data layer are in place — features slot in here.
        </p>
      </div>
    </div>
  );
}
