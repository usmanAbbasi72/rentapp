'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase/client-provider';
import type { Transaction, Debt, Receivable, FinancialRecord } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from './data-table';
import { transactionColumns, debtColumns, receivableColumns } from './columns';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';
import { RecordDialog } from './RecordDialog';
import { useToast } from '@/hooks/use-toast';

export function RecordsClient() {
  const { user } = useAuth();
  const { db } = useFirestore();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);

  useEffect(() => {
    if (!user || !db) return;
    setLoading(true);

    const recordsRef = collection(db, 'records');
    
    const createSubscription = (recordType: string, setData: Function) => {
        const q = query(
            recordsRef,
            where('userId', '==', user.uid),
            where('recordType', '==', recordType),
            orderBy('createdAt', 'desc')
        );
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setData(data);
            setLoading(false);
        });
    };
    
    const unsubTransactions = createSubscription('transaction', setTransactions);
    const unsubDebts = createSubscription('debt', setDebts);
    const unsubReceivables = createSubscription('receivable', setReceivables);

    return () => {
        unsubTransactions();
        unsubDebts();
        unsubReceivables();
    };
  }, [user, db]);

  const handleOpenDialog = (record: FinancialRecord | null = null) => {
    setEditingRecord(record);
    setIsDialogOpen(true);
  };

  const handleSaveRecord = async (values: any, recordType: string) => {
    if (!user || !db) return;
    
    const data = {
        ...values,
        userId: user.uid,
        recordType,
        createdAt: editingRecord ? editingRecord.createdAt : Timestamp.now(),
    };

    try {
        if (editingRecord) {
            await updateDoc(doc(db, 'records', editingRecord.id), data);
            toast({ title: 'Success', description: 'Record updated successfully.' });
        } else {
            await addDoc(collection(db, 'records'), data);
            toast({ title: 'Success', description: 'Record added successfully.' });
        }
        setIsDialogOpen(false);
        setEditingRecord(null);
    } catch (error) {
        console.error("Error saving record:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save record.' });
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!user || !db) return;
    try {
      await deleteDoc(doc(db, 'records', id));
      toast({ title: 'Success', description: 'Record deleted successfully.' });
    } catch (error) {
      console.error("Error deleting record:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete record.' });
    }
  };

  return (
    <Tabs defaultValue="transactions" className="w-full">
        <div className="flex items-center justify-between">
            <TabsList>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="debts">Debts</TabsTrigger>
                <TabsTrigger value="receivables">Receivables</TabsTrigger>
            </TabsList>
            <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Add Record</Button>
        </div>
      <TabsContent value="transactions">
        <DataTable columns={transactionColumns(handleOpenDialog, handleDeleteRecord)} data={transactions} loading={loading} />
      </TabsContent>
      <TabsContent value="debts">
        <DataTable columns={debtColumns(handleOpenDialog, handleDeleteRecord)} data={debts} loading={loading} />
      </TabsContent>
      <TabsContent value="receivables">
        <DataTable columns={receivableColumns(handleOpenDialog, handleDeleteRecord)} data={receivables} loading={loading} />
      </TabsContent>
      {isDialogOpen && (
        <RecordDialog
            isOpen={isDialogOpen}
            onClose={() => { setIsDialogOpen(false); setEditingRecord(null); }}
            onSave={handleSaveRecord}
            record={editingRecord}
        />
      )}
    </Tabs>
  );
}
