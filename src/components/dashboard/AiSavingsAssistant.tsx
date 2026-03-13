'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Target, Lightbulb, Wallet } from 'lucide-react';
import { getSavingsAdvice, type SavingsAdvisorOutput } from '@/ai/flows/savings-advisor-flow';
import type { FinancialRecord } from '@/lib/types';
import { formatCurrency } from '@/components/records/columns';

interface AiSavingsAssistantProps {
  records: FinancialRecord[];
}

export function AiSavingsAssistant({ records }: AiSavingsAssistantProps) {
  const [advice, setAdvice] = useState<SavingsAdvisorOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGetAdvice = async () => {
    if (records.length === 0) return;
    setIsLoading(true);
    try {
      const cleanRecords = records.map(r => ({
        description: r.description,
        amount: r.amount,
        type: (r as any).type || undefined,
        recordType: r.recordType,
      }));
      
      const result = await getSavingsAdvice({ records: cleanRecords, currency: 'PKR' });
      setAdvice(result);
    } catch (error) {
      console.error('Error getting AI advice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Savings Assistant
            </CardTitle>
            <CardDescription>
              Get personalized saving plans and insights based on your records.
            </CardDescription>
          </div>
          <Button 
            onClick={handleGetAdvice} 
            disabled={isLoading || records.length === 0}
            size="sm"
            className="gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {advice ? 'Refresh Plan' : 'Generate Plan'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!advice && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Wallet className="mb-2 h-10 w-10 opacity-20" />
            <p>I can help you save more. Click the button to analyze your finances.</p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium animate-pulse text-primary">Analyzing your financial records...</p>
          </div>
        )}

        {advice && !isLoading && (
          <div className="grid gap-6 animate-in fade-in duration-500">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Financial Health</h4>
              <p className="text-sm leading-relaxed">{advice.summary}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border bg-background p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Target className="h-4 w-4 text-primary" />
                  Saving Goal
                </div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(advice.recommendedMonthlyGoal)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">/ month</span>
                </div>
              </div>

              <div className="rounded-lg border bg-background p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 font-semibold text-primary">
                  <Lightbulb className="h-4 w-4" />
                  Key Tips
                </div>
                <ul className="space-y-1">
                  {advice.tips.map((tip, i) => (
                    <li key={i} className="text-xs flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Strategy</h4>
              <div className="rounded-lg bg-background p-4 text-sm leading-relaxed border italic">
                {advice.savingsPlan}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
