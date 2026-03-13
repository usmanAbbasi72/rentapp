import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <header className="space-y-2 border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Financial Overview</h1>
        <p className="text-muted-foreground">Welcome back! Here's a comprehensive summary of your financial health and recent activity.</p>
      </header>
      <DashboardClient />
    </div>
  );
}
