import { SavingsPlanClient } from "@/components/savings/SavingsPlanClient";

export default function SavingsPlanPage() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Savings Plan</h1>
        <p className="text-muted-foreground">Your AI-powered strategy for financial growth and stability.</p>
      </header>
      <SavingsPlanClient />
    </div>
  );
}
