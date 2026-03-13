'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase/provider';
import type { FinancialRecord } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Target, Lightbulb, ShieldAlert, TrendingDown, Wallet } from 'lucide-react';
import { getSavingsAdvice, type SavingsAdvisorOutput } from '@/ai/flows/savings-advisor-flow';
import { formatCurrency } from '@/components/records/columns';
import { Skeleton } from '@/components/ui/skeleton';

export function SavingsPlanClient() {
  const { user } = useUser();
  const db = useFirestore();
  const [allRecords, setAllRecords] = useState<FinancialRecord[]>([]);
  const [advice, setAdvice] = useState<SavingsAdvisorOutput | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!user || !db) return;

    const transactionsRef = collection(db, 'users', user.uid, 'dailyMoneyUseRecords');
    const debtsRef = collection(db, 'users', user.uid, 'moneyOwedRecords');
    const receivablesRef = collection(db, 'users', user.uid, 'moneyRemainingRecords');

    const unsubTransactions = onSnapshot(transactionsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), recordType: 'transaction' })) as any[];
      setAllRecords(prev => [...prev.filter(r => r.recordType !== 'transaction'), ...data]);
      setLoadingRecords(false);
    });

    const unsubDebts = onSnapshot(debtsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), recordType: 'debt' })) as any[];
      setAllRecords(prev => [...prev.filter(r => r.recordType !== 'debt'), ...data]);
    });

    const unsubReceivables = onSnapshot(receivablesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), recordType: 'receivable' })) as any[];
      setAllRecords(prev => [...prev.filter(r => r.recordType !== 'receivable'), ...data]);
    });

    return () => {
      unsubTransactions();
      unsubDebts();
      unsubReceivables();
    };
  }, [user, db]);

  const handleGeneratePlan = async () => {
    if (allRecords.length === 0) return;
    setIsGenerating(true);
    try {
      const cleanRecords = allRecords.map(r => ({
        description: r.description,
        amount: r.amount,
        type: (r as any).type || undefined,
        recordType: r.recordType,
      }));
      
      const result = await getSavingsAdvice({ records: cleanRecords, currency: 'PKR' });
      setAdvice(result);
    } catch (error) {
      console.error('Error generating plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loadingRecords) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-[200px] w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[150px]" />
          <Skeleton className="h-[150px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Financial Intelligence</h2>
        <Button 
          onClick={handleGeneratePlan} 
          disabled={isGenerating || allRecords.length === 0}
          className="gap-2"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {advice ? 'Refresh Strategy' : 'Generate Strategy'}
        </Button>
      </div>

      {!advice && !isGenerating && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wallet className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
            <h3 className="text-lg font-medium">No strategy generated yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Connect your records and click the button above to let AI analyze your data and create a personalized plan.
            </p>
          </CardContent>
        </Card>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-lg font-medium animate-pulse text-primary">AI is processing your records...</p>
        </div>
      )}

      {advice && !isGenerating && (
        <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Monthly Saving Goal
              </CardTitle>
              <CardDescription>Target amount to set aside based on your current cash flow.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                {formatCurrency(advice.recommendedMonthlyGoal)}
                <span className="text-sm font-normal text-muted-foreground ml-2">per month</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <ShieldAlert className="h-5 w-5" />
                  Expense Restrictions
                </CardTitle>
                <CardDescription>Areas where you should cut back to meet your goals.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {advice.tips.filter(tip => tip.toLowerCase().includes('reduce') || tip.toLowerCase().includes('cut') || tip.toLowerCase().includes('stop')).map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <TrendingDown className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      {tip}
                    </li>
                  ))}
                  {advice.tips.filter(tip => !tip.toLowerCase().includes('reduce') && !tip.toLowerCase().includes('cut') && !tip.toLowerCase().includes('stop')).length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Follow the general suggestions below for expense management.</p>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <Lightbulb className="h-5 w-5" />
                  Growth Suggestions
                </CardTitle>
                <CardDescription>Actionable advice to increase your net worth.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {advice.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Strategy Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="leading-relaxed text-muted-foreground whitespace-pre-wrap italic">
                  &quot;{advice.savingsPlan}&quot;
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
