'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, addDoc, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase/provider';
import type { Transaction, Debt, Receivable, SavingsPlan } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Lightbulb, ShieldAlert, TrendingDown, Wallet, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { getSavingsAdvice } from '@/ai/flows/savings-advisor-flow';
import { formatCurrency } from '@/components/records/columns';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export function SavingsPlanClient() {
  const { user } = useUser();
  const db = useFirestore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [activePlan, setActivePlan] = useState<SavingsPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Combine all records for analysis
  const allRecords = useMemo(() => {
    return [
      ...transactions.map(t => ({ ...t, recordType: 'transaction' as const })),
      ...debts.map(d => ({ ...d, recordType: 'debt' as const })),
      ...receivables.map(r => ({ ...r, recordType: 'receivable' as const })),
    ];
  }, [transactions, debts, receivables]);

  // Fetch records and the latest saved plan
  useEffect(() => {
    if (!user || !db) return;

    const transactionsRef = collection(db, 'users', user.uid, 'dailyMoneyUseRecords');
    const debtsRef = collection(db, 'users', user.uid, 'moneyOwedRecords');
    const receivablesRef = collection(db, 'users', user.uid, 'moneyRemainingRecords');
    const plansRef = collection(db, 'users', user.uid, 'savingsPlans');

    const unsubTransactions = onSnapshot(transactionsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
      setTransactions(data);
    });

    const unsubDebts = onSnapshot(debtsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Debt[];
      setDebts(data);
    });

    const unsubReceivables = onSnapshot(receivablesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Receivable[];
      setReceivables(data);
    });

    const qPlans = query(plansRef, orderBy('createdAt', 'desc'), limit(1));
    const unsubPlans = onSnapshot(qPlans, (snapshot) => {
      if (!snapshot.empty) {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SavingsPlan;
        setActivePlan(data);
      }
      setLoading(false);
    });

    return () => {
      unsubTransactions();
      unsubDebts();
      unsubReceivables();
      unsubPlans();
    };
  }, [user, db]);

  // Compliance Tracking Logic
  const monthPerformance = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTransactions = transactions.filter(t => {
      const date = t.date.toDate();
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

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
  }, [transactions, activePlan]);

  // Parse strategy into todo items
  const strategyTasks = useMemo(() => {
    if (!activePlan?.savingsPlan) return [];
    
    return activePlan.savingsPlan
      .split(/(?=\d+\.)|\n/)
      .map(item => item.trim())
      .filter(item => item.length > 5)
      .map(item => item.replace(/^\d+\.\s*/, ''));
  }, [activePlan]);

  const handleGeneratePlan = async () => {
    if (allRecords.length === 0 || !user || !db) return;
    setIsGenerating(true);
    try {
      const cleanRecords = allRecords.map(r => {
        let isCompleted = false;
        if (r.recordType === 'debt') isCompleted = (r as Debt).isPaid;
        if (r.recordType === 'receivable') isCompleted = (r as Receivable).isReceived;
        if (r.recordType === 'transaction') isCompleted = true;

        return {
          description: r.description,
          amount: r.amount,
          type: (r as any).type || undefined,
          recordType: r.recordType,
          isCompleted,
        };
      });
      
      const result = await getSavingsAdvice({ records: cleanRecords, currency: 'PKR' });
      
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-lg md:text-xl font-semibold text-center sm:text-left">Intelligence & Tracking</h2>
        <Button 
          onClick={handleGeneratePlan} 
          disabled={isGenerating}
          className="gap-2 w-full sm:w-auto"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {activePlan ? 'New Strategy' : 'Initial Strategy'}
        </Button>
      </div>

      {!activePlan && !isGenerating && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wallet className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
            <h3 className="text-lg font-medium">No strategy generated yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm px-4">
              Connect your records and let AI create a tracked savings plan.
            </p>
          </CardContent>
        </Card>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 px-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-base md:text-lg font-medium animate-pulse text-primary">Analyzing your patterns...</p>
        </div>
      )}

      {activePlan && !isGenerating && (
        <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Compliance Tracker */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Monthly Compliance
                </CardTitle>
                <Badge variant={isOnTrack ? "secondary" : "outline"} className={cn(
                  "px-2 py-0.5 text-xs",
                  isOnTrack ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"
                )}>
                  {isOnTrack ? (
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> On Track</span>
                  ) : (
                    <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Needs Attention</span>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Actual Savings</p>
                  <p className="text-2xl md:text-3xl font-bold">{formatCurrency(monthPerformance.savings)}</p>
                </div>
                <div className="sm:text-right space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Target Goal</p>
                  <p className="text-lg md:text-xl font-semibold text-muted-foreground">{formatCurrency(activePlan.recommendedMonthlyGoal)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Goal Progress</span>
                  <span>{Math.max(0, Math.round(monthPerformance.progress))}%</span>
                </div>
                <Progress value={Math.min(100, Math.max(0, monthPerformance.progress))} className="h-2" />
              </div>
              {!isOnTrack && monthPerformance.savings < 0 && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-xs text-red-600 font-medium flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" />
                    Alert: Monthly spending exceeds income.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-red-600 text-sm md:text-base">
                  <ShieldAlert className="h-4 w-4" />
                  Restrictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {activePlan.tips.filter(tip => /reduce|cut|stop|limit|avoid/i.test(tip)).map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs md:text-sm">
                      <TrendingDown className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{tip}</span>
                    </li>
                  ))}
                  {activePlan.tips.filter(tip => /reduce|cut|stop|limit|avoid/i.test(tip)).length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No specific restrictions identified.</p>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-amber-600 text-sm md:text-base">
                  <Lightbulb className="h-4 w-4" />
                  Growth Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {activePlan.tips.filter(tip => !/reduce|cut|stop|limit|avoid/i.test(tip)).map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs md:text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm md:text-base">Strategic Roadmap</CardTitle>
              <CardDescription className="text-xs">Generated on {activePlan.createdAt.toDate().toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {strategyTasks.length > 0 ? strategyTasks.map((task, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 md:p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors shadow-sm">
                    <Checkbox id={`task-${idx}`} className="mt-1" />
                    <label 
                      htmlFor={`task-${idx}`} 
                      className="text-xs md:text-sm leading-relaxed cursor-pointer select-none font-medium text-foreground/90"
                    >
                      {task}
                    </label>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground italic border-l-4 pl-4 py-1">
                    {activePlan.savingsPlan}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
