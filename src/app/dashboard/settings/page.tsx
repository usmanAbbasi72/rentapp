import { SettingsClient } from "@/components/settings/SettingsClient";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <header className="space-y-2 border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences and analysis configurations.</p>
      </header>
      <SettingsClient />
    </div>
  );
}
