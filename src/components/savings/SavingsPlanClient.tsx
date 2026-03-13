
'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, addDoc, orderBy, limit, Timestamp, where } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase/provider';
import type { FinancialRecord, Transaction, SavingsPlan } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Target, Lightbulb, ShieldAlert, TrendingDown, Wallet, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { getSavingsAdvice, type SavingsAdvisorOutput } from '@/ai/flows/savings-advisor-flow';
import { formatCurrency } from '@/components/records/columns';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { startOfMonth, endOfMonth } from 'date-fns';

export function SavingsPlanClient() {
  const { user } = useUser();
  const db = useFirestore();
  const [allRecords, setAllRecords] = useState<FinancialRecord[]>([]);
  const [activePlan, setActivePlan] = useState<SavingsPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch records and the latest saved plan
  useEffect(() => {
    if (!user || !db) return;

    const currentMonthStart = Timestamp.fromDate(startOfMonth(new Date()));
    const currentMonthEnd = Timestamp.fromDate(endOfMonth(new Date()));

    const transactionsRef = collection(db, 'users', user.uid, 'dailyMoneyUseRecords');
    const plansRef = collection(db, 'users', user.uid, 'savingsPlans');

    const unsubTransactions = onSnapshot(transactionsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), recordType: 'transaction' })) as Transaction[];
      setAllRecords(data);
      setLoading(false);
    });

    const qPlans = query(plansRef, orderBy('createdAt', 'desc'), limit(1));
    const unsubPlans = onSnapshot(qPlans, (snapshot) => {
      if (!snapshot.empty) {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SavingsPlan;
        setActivePlan(data);
      }
    });

    return () => {
      unsubTransactions();
      unsubPlans();
    };
  }, [user, db]);

  // Compliance Tracking Logic
  const monthPerformance = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTransactions = allRecords.filter(r => {
      if (r.recordType !== 'transaction') return false;
      const date = (r as Transaction).date.toDate();
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }) as Transaction[];

    const totalIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const actualSavings = totalIncome - totalExpense;
    
    return {
      income: totalIncome,
      expenses: totalExpense,
      savings: actualSavings,
      progress: activePlan ? (actualSavings / activePlan.recommendedMonthlyGoal) * 100 : 0
    };
  }, [allRecords, activePlan]);

  const handleGeneratePlan = async () => {
    if (allRecords.length === 0 || !user || !db) return;
    setIsGenerating(true);
    try {
      const cleanRecords = allRecords.map(r => ({
        description: r.description,
        amount: r.amount,
        type: (r as any).type || undefined,
        recordType: r.recordType,
      }));
      
      const result = await getSavingsAdvice({ records: cleanRecords, currency: 'PKR' });
      
      // Store the new plan in Firestore
      const now = new Date();
      const planData = {
        userId: user.uid,
        createdAt: Timestamp.now(),
        summary: result.summary,
        savingsPlan: result.savingsPlan,
        recommendedMonthlyGoal: result.recommendedMonthlyGoal,
        tips: result.tips,
        month: now.getMonth(),
        year: now.getFullYear()
      };

      await addDoc(collection(db, 'users', user.uid, 'savingsPlans'), planData);
      
    } catch (error) {
      console.error('Error generating plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
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

  const isOnTrack = activePlan ? monthPerformance.savings >= activePlan.recommendedMonthlyGoal : false;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Financial Intelligence & Tracking</h2>
        <Button 
          onClick={handleGeneratePlan} 
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {activePlan ? 'Generate New Strategy' : 'Generate Initial Strategy'}
        </Button>
      </div>

      {!activePlan && !isGenerating && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wallet className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
            <h3 className="text-lg font-medium">No strategy generated yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Connect your records and click the button above to let AI analyze your data and create a tracked savings plan.
            </p>
          </CardContent>
        </Card>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-lg font-medium animate-pulse text-primary">AI is analyzing your spending patterns...</p>
        </div>
      )}

      {activePlan && !isGenerating && (
        <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Compliance Tracker */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Current Month Compliance
                </CardTitle>
                <Badge variant={isOnTrack ? "secondary" : "outline"} className={isOnTrack ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"}>
                  {isOnTrack ? (
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> On Track</span>
                  ) : (
                    <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Needs Attention</span>
                  )}
                </Badge>
              </div>
              <CardDescription>Tracking your real-time savings against the plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Actual Savings</p>
                  <p className="text-3xl font-bold">{formatCurrency(monthPerformance.savings)}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Target Goal</p>
                  <p className="text-xl font-semibold text-muted-foreground">{formatCurrency(activePlan.recommendedMonthlyGoal)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Progress to goal</span>
                  <span>{Math.max(0, Math.round(monthPerformance.progress))}%</span>
                </div>
                <Progress value={Math.min(100, Math.max(0, monthPerformance.progress))} className="h-2" />
              </div>
              {!isOnTrack && monthPerformance.savings < 0 && (
                <p className="text-xs text-red-500 font-medium">Warning: You are currently spending more than you earn this month.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600 text-base">
                  <ShieldAlert className="h-4 w-4" />
                  Expense Restrictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {activePlan.tips.filter(tip => /reduce|cut|stop|limit|avoid/i.test(tip)).map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <TrendingDown className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      {tip}
                    </li>
                  ))}
                  {activePlan.tips.filter(tip => /reduce|cut|stop|limit|avoid/i.test(tip)).length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Follow the growth suggestions to optimize your cash flow.</p>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600 text-base">
                  <Lightbulb className="h-4 w-4" />
                  Growth Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {activePlan.tips.filter(tip => !/reduce|cut|stop|limit|avoid/i.test(tip)).map((tip, i) => (
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
              <CardTitle className="text-base">Detailed Strategy Plan</CardTitle>
              <CardDescription>Generated on {activePlan.createdAt.toDate().toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="leading-relaxed text-muted-foreground whitespace-pre-wrap italic border-l-4 pl-4 py-1">
                  &quot;{activePlan.savingsPlan}&quot;
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
