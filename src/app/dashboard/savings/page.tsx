import { SavingsPlanClient } from "@/components/savings/SavingsPlanClient";

export default function SavingsPlanPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <header className="space-y-2 border-b pb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary text-center sm:text-left">Savings Plan</h1>
        <p className="text-sm md:text-base text-muted-foreground text-center sm:text-left">Your AI-powered strategy for financial growth and stability.</p>
      </header>
      <SavingsPlanClient />
    </div>
  );
}
