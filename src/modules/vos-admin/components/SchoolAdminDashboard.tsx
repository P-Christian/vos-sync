import React from 'react';

export function SchoolAdminDashboard() {
  return (
    <div className="p-6">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">VOS Admin Portal</h1>
        <p className="text-muted-foreground mt-2">
          Manage post-graduate tasks and school administration.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder cards for dashboard */}
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Post-Graduates</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">---</div>
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Pending Tasks</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold">---</div>
          </div>
        </div>
      </div>
    </div>
  );
}
