'use client';
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp, limit } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase/provider';
import { useSettings } from '@/context/settings-context';
import type { Transaction, Debt, Receivable } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ArrowUpRight, ArrowDownLeft, AlertTriangle, TrendingUp, TrendingDown, ReceiptText, Wallet, Settings } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function DashboardClient() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { analysisStartDate } = useSettings();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !db) return;
    
    setLoading(true);
    setError(null);

    const startTimestamp = Timestamp.fromDate(analysisStartDate);

    const transactionsRef = collection(db, 'users', user.uid, 'dailyMoneyUseRecords');
    const debtsRef = collection(db, 'users', user.uid, 'moneyOwedRecords');
    const receivablesRef = collection(db, 'users', user.uid, 'moneyRemainingRecords');

    const qTransactions = query(
      transactionsRef,
      where('date', '>=', startTimestamp),
      orderBy('date', 'desc')
    );
    
    const qRecentTransactions = query(
        transactionsRef,
        orderBy('date', 'desc'),
        limit(5)
    );

    const qDebts = query(debtsRef, orderBy('dueDate', 'asc'));
    const qReceivables = query(receivablesRef, orderBy('dueDate', 'asc'));

    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), recordType: 'transaction' })) as Transaction[];
      setTransactions(data);
      setLoading(false);
    }, (err) => {
        console.error("Error fetching transactions:", err);
        setError("Failed to load transaction data.");
        setLoading(false);
    });

    const unsubRecentTransactions = onSnapshot(qRecentTransactions, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), recordType: 'transaction' })) as Transaction[];
        setRecentTransactions(data);
    }, (error) => {
        console.error("Error fetching recent transactions:", error);
    });

    const unsubDebts = onSnapshot(qDebts, (snapshot) => {
      const allDebts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), recordType: 'debt' })) as Debt[];
      setDebts(allDebts.filter(d => !d.isPaid));
    }, (err) => {
        console.error("Error fetching debts:", err);
    });

    const unsubReceivables = onSnapshot(qReceivables, (snapshot) => {
        const allReceivables = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), recordType: 'receivable' })) as Receivable[];
        setReceivables(allReceivables.filter(r => !r.isReceived));
    }, (err) => {
        console.error("Error fetching receivables:", err);
    });

    return () => {
      unsubTransactions();
      unsubRecentTransactions();
      unsubDebts();
      unsubReceivables();
    };
  }, [user, db, analysisStartDate]);

  const summary = useMemo(() => {
    const totalDebt = debts.reduce((acc, debt) => acc + debt.amount, 0);
    const totalReceivable = receivables.reduce((acc, rec) => acc + rec.amount, 0);
    const periodIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const periodExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    
    return { totalDebt, totalReceivable, periodIncome, periodExpense };
  }, [transactions, debts, receivables]);

  const expenseChartData = useMemo(() => {
    const expensesByCategory = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        const category = t.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
      }, {} as { [key: string]: number });

    return Object.entries(expensesByCategory)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount);
  }

  if (loading && transactions.length === 0) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
            <div className="lg:col-span-4"><Skeleton className="h-96 rounded-xl" /></div>
            <div className="lg:col-span-2"><Skeleton className="h-80 rounded-xl" /></div>
            <div className="lg:col-span-2"><Skeleton className="h-80 rounded-xl" /></div>
        </div>
    );
  }

  if (error) {
    return <div className="flex items-center justify-center p-12 text-destructive font-medium border rounded-xl bg-destructive/5">{error}</div>;
  }

  const StatCard = ({ title, amount, subtitle, icon: Icon, trendColor, className }: any) => (
    <Card className={cn("overflow-hidden border-none shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("p-2 rounded-lg bg-background/80 shadow-sm", trendColor)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{formatCurrencyLocal(amount)}</div>
        <p className="text-xs text-muted-foreground mt-1 font-medium">{subtitle}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/50 shadow-sm border-primary/10">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Active Analysis Period
            </h2>
            <p className="text-xs text-muted-foreground">Showing data since {format(analysisStartDate, "PPP")}.</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 border-primary/20 hover:border-primary/50"
            onClick={() => router.push('/dashboard/settings')}
          >
            <Settings className="h-4 w-4" />
            Adjust in Settings
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title="Period Income" 
              amount={summary.periodIncome} 
              subtitle={`From ${transactions.filter(t => t.type === 'income').length} income records`} 
              icon={TrendingUp} 
              trendColor="text-emerald-500"
              className="bg-emerald-50/50 dark:bg-emerald-950/10"
            />
             <StatCard 
              title="Period Expenses" 
              amount={summary.periodExpense} 
              subtitle={`From ${transactions.filter(t => t.type === 'expense').length} expense records`} 
              icon={TrendingDown} 
              trendColor="text-rose-500"
              className="bg-rose-50/50 dark:bg-rose-950/10"
            />
            <StatCard 
              title="Receivables" 
              amount={summary.totalReceivable} 
              subtitle={`${receivables.length} pending items`} 
              icon={ArrowUpRight} 
              trendColor="text-blue-500"
              className="bg-blue-50/50 dark:bg-blue-950/10"
            />
            <StatCard 
              title="Total Debts" 
              amount={summary.totalDebt} 
              subtitle={`${debts.length} outstanding`} 
              icon={ArrowDownLeft} 
              trendColor="text-amber-500"
              className="bg-amber-50/50 dark:bg-amber-950/10"
            />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">Spending Overview</CardTitle>
                    <CardDescription>Visual breakdown of expenses for this period</CardDescription>
                  </div>
                  <ReceiptText className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  {expenseChartData.length > 0 ? (
                  <div className="h-[350px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={expenseChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <XAxis 
                            dataKey="name" 
                            stroke="#888888" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                          />
                          <YAxis 
                            stroke="#888888" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => `Rs ${value}`} 
                          />
                          <Tooltip 
                            cursor={{fill: 'hsl(var(--muted))', opacity: 0.4}} 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={40}>
                            {expenseChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${1 - (index * 0.15)})`} />
                            ))}
                          </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                      <Wallet className="h-10 w-10 mb-2 opacity-20" />
                      <p className="text-sm">No expenses recorded for this period</p>
                    </div>
                  )}
              </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Upcoming Due</CardTitle>
              </div>
              <CardDescription>Track your pending debt payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {debts.length > 0 ? debts.slice(0, 5).map(d => (
                    <div key={d.id} className="flex items-center justify-between group p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="space-y-1">
                            <p className="text-sm font-semibold group-hover:text-primary transition-colors">Pay {d.creditor}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              {format(d.dueDate.toDate(), 'MMM dd, yyyy')}
                            </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatCurrencyLocal(d.amount)}</p>
                        </div>
                    </div>
                )) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">All debts are settled!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg">Recent Financial Activity</CardTitle>
                <CardDescription>Your most recent income and expense records</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableBody>
                        {recentTransactions.length > 0 ? recentTransactions.map(t => (
                            <TableRow key={t.id} className="hover:bg-muted/50 transition-colors">
                                <TableCell className="py-4">
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "p-2 rounded-full",
                                        t.type === 'income' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                      )}>
                                        {t.type === 'income' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                      </div>
                                      <div>
                                        <div className="font-semibold">{t.description}</div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                          {format(t.date.toDate(), 'MMM dd')} • {t.category}
                                        </div>
                                      </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right py-4">
                                    <div className={cn(
                                      "font-bold text-base",
                                      t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                        {t.type === 'income' ? '+' : '-'}{formatCurrencyLocal(t.amount)}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center py-12 text-muted-foreground">
                              No financial activity recorded yet
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
