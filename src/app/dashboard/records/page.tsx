import { RecordsClient } from "@/components/records/RecordsClient";

export default function RecordsPage() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Manage Records</h1>
        <p className="text-muted-foreground">View, add, edit, and delete all your financial records.</p>
      </header>
      <RecordsClient />
    </div>
  );
}
