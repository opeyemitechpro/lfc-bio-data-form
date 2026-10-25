export default function DashboardLoading() {
  return (
    <div aria-label="Loading dashboard page" aria-busy="true" className="space-y-6">
      <div className="h-9 w-56 animate-pulse rounded bg-muted" />
      <div className="h-5 w-80 max-w-full animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-lg border bg-card" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-lg border bg-card" />
    </div>
  );
}