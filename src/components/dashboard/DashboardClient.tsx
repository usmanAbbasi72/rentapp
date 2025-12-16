'use client';
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp, limit } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase/provider';
import type { Transaction, Debt, Receivable } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ArrowUpRight, ArrowDownLeft, AlertTriangle } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { subDays } from 'date-fns';

export function DashboardClient() {
  const { user } = useUser();
  const db = useFirestore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !db) {
      if (!user && !loading) {
         setError("User not authenticated.");
      }
      return;
    };
    
    setLoading(true);
    setError(null);

    const thirtyDaysAgo = Timestamp.fromDate(subDays(new Date(), 30));

    const transactionsRef = collection(db, 'users', user.uid, 'dailyMoneyUseRecords');
    const debtsRef = collection(db, 'users', user.uid, 'moneyOwedRecords');
    const receivablesRef = collection(db, 'users', user.uid, 'moneyRemainingRecords');

    const qTransactions = query(
      transactionsRef,
      where('date', '>=', thirtyDaysAgo),
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
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Transaction[];
      setTransactions(data);
      setLoading(false);
    }, (err) => {
        console.error("Error fetching transactions:", err);
        setError("Failed to load transaction data.");
        setLoading(false);
    });

    const unsubRecentTransactions = onSnapshot(qRecentTransactions, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Transaction[];
        setRecentTransactions(data);
    }, (error) => {
        console.error("Error fetching recent transactions:", error);
    });

    const unsubDebts = onSnapshot(qDebts, (snapshot) => {
      const allDebts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Debt[];
      const outstandingDebts = allDebts.filter(d => !d.isPaid)
      setDebts(outstandingDebts);
    }, (err) => {
        console.error("Error fetching debts:", err);
        setError("Failed to load debt data.");
    });

    const unsubReceivables = onSnapshot(qReceivables, (snapshot) => {
        const allReceivables = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Receivable[];
        const outstandingReceivables = allReceivables.filter(r => !r.isReceived);
        setReceivables(outstandingReceivables);
    }, (err) => {
        console.error("Error fetching receivables:", err);
        setError("Failed to load receivable data.");
    });

    return () => {
      unsubTransactions();
      unsubRecentTransactions();
      unsubDebts();
      unsubReceivables();
    };
  }, [user, db, loading]);

  const summary = useMemo(() => {
    const totalDebt = debts.reduce((acc, debt) => acc + debt.amount, 0);
    const totalReceivable = receivables.reduce((acc, rec) => acc + rec.amount, 0);
    const monthlyIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const monthlyExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    
    return { totalDebt, totalReceivable, monthlyIncome, monthlyExpense };
  }, [transactions, debts, receivables]);

  const expenseChartData = useMemo(() => {
    const expensesByCategory = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        const category = t.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
      }, {} as { [key: string]: number });

    return Object.entries(expensesByCategory).map(([name, total]) => ({ name, total }));
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(amount);
  }

  if (loading) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32"/>
            <Skeleton className="h-32"/>
            <Skeleton className="h-32"/>
            <Skeleton className="h-32"/>
            <div className="lg:col-span-4"><Skeleton className="h-80"/></div>
            <div className="lg:col-span-2"><Skeleton className="h-64"/></div>
            <div className="lg:col-span-2"><Skeleton className="h-64"/></div>
        </div>
    );
  }

  if (error) {
    return <div className="text-center text-destructive p-8">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="grid gap-6 md:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Income (Last 30 Days)</CardTitle>
                    <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.monthlyIncome)}</div>
                    <p className="text-xs text-muted-foreground">from {transactions.filter(t => t.type === 'income').length} transaction(s)</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Expenses (Last 30 Days)</CardTitle>
                    <DollarSign className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.monthlyExpense)}</div>
                    <p className="text-xs text-muted-foreground">from {transactions.filter(t => t.type === 'expense').length} transaction(s)</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Money Owed To You</CardTitle>
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.totalReceivable)}</div>
                    <p className="text-xs text-muted-foreground">{receivables.length} outstanding receivable(s)</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Money You Owe</CardTitle>
                    <ArrowDownLeft className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.totalDebt)}</div>
                    <p className="text-xs text-muted-foreground">{debts.length} outstanding debt(s)</p>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-4">
            <Card>
                <CardHeader>
                    <CardTitle>Expense Analysis (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    {expenseChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={expenseChartData}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rs ${value}`} />
                        <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    ) : <p className="text-center text-muted-foreground py-10">No expense data for chart.</p>}
                </CardContent>
            </Card>
        </div>
        
        <div className="lg:col-span-4 grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            {recentTransactions.length > 0 ? recentTransactions.map(t => (
                                <TableRow key={t.id}>
                                    <TableCell>
                                        <div className="font-medium">{t.description}</div>
                                        <div className="text-sm text-muted-foreground">{t.date.toDate().toLocaleDateString()}</div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={t.type === 'income' ? 'secondary' : 'outline'} className={t.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={2} className="text-center">No recent transactions</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Upcoming Payments
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            {debts.length > 0 ? debts.slice(0, 5).map(d => (
                                <TableRow key={d.id}>
                                    <TableCell>
                                        <div className="font-medium">Pay {d.creditor}</div>
                                        <div className="text-sm text-muted-foreground">Due: {d.dueDate.toDate().toLocaleDateString()}</div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(d.amount)}</TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={2} className="text-center">No upcoming payments</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

    