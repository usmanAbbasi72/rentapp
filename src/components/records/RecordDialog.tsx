'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { FinancialRecord, RecordType } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { useUser } from '@/firebase';

interface RecordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: any, recordType: string) => void;
  record: FinancialRecord | null;
}

const baseSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    amount: z.coerce.number().positive('Amount must be positive'),
});
  
const transactionSchema = baseSchema.extend({
    type: z.enum(['income', 'expense']),
    category: z.string().min(1, 'Category is required'),
    date: z.date(),
});

const debtReceivableSchema = baseSchema.extend({
    person: z.string().min(1, 'Person is required'),
    dueDate: z.date(),
});

const getInitialValues = (record: FinancialRecord | null, activeTab: RecordType) => {
    const transactionDefaults = {
        description: '',
        amount: '' as any,
        type: 'expense' as 'income' | 'expense',
        category: '',
        date: new Date(),
        person: '', // Ensure person is defined for all types
        dueDate: new Date(), // Ensure dueDate is defined for all types
    };

    const debtReceivableDefaults = {
        description: '',
        amount: '' as any,
        person: '',
        dueDate: new Date(),
        type: 'expense' as 'income' | 'expense', // Ensure type is defined
        category: '', // Ensure category is defined
        date: new Date(), // Ensure date is defined
    };
    
    if (!record) {
        return activeTab === 'transaction' ? transactionDefaults : debtReceivableDefaults;
    }

    if (record.recordType === 'transaction') {
        return {
            ...transactionDefaults,
            description: record.description || '',
            amount: record.amount || '',
            type: record.type || 'expense',
            category: record.category || '',
            date: record.date ? record.date.toDate() : new Date(),
        };
    } 
    
    if (record.recordType === 'debt') {
        return {
            ...debtReceivableDefaults,
            description: record.description || '',
            amount: record.amount || '',
            person: record.creditor || '',
            dueDate: record.dueDate ? record.dueDate.toDate() : new Date(),
        };
    } 
    
    if (record.recordType === 'receivable') {
        return {
            ...debtReceivableDefaults,
            description: record.description || '',
            amount: record.amount || '',
            person: record.debtor || '',
            dueDate: record.dueDate ? record.dueDate.toDate() : new Date(),
        };
    }

    // Fallback to defaults based on tab if record type doesn't match
    return activeTab === 'transaction' ? transactionDefaults : debtReceivableDefaults;
};

export function RecordDialog({ isOpen, onClose, onSave, record }: RecordDialogProps) {
  const [activeTab, setActiveTab] = useState<RecordType>(record?.recordType || 'transaction');
  const { user } = useUser();
  const formKey = useMemo(() => `${activeTab}-${record?.id || 'new'}`, [activeTab, record]);

  const getSchema = (tab: RecordType) => {
    return tab === 'transaction' ? transactionSchema : debtReceivableSchema;
  };
  
  const form = useForm<any>({
    resolver: zodResolver(getSchema(activeTab)),
    defaultValues: getInitialValues(record, activeTab),
  });
  
  useEffect(() => {
    // When the dialog opens or the record changes, reset the active tab and the form.
    if (isOpen) {
      const newActiveTab = record?.recordType || 'transaction';
      setActiveTab(newActiveTab);
      form.reset(getInitialValues(record, newActiveTab));
    }
  }, [isOpen, record, form]);

  useEffect(() => {
    // When the tab changes, reset the form with the correct defaults for that tab.
    form.reset(getInitialValues(record, activeTab));
  }, [activeTab, form, record]);

  const onSubmit = (values: any) => {
    if (!user) return;
    const dataToSave: any = { ...values };
    
    if ('date' in dataToSave && dataToSave.date) {
        dataToSave.date = Timestamp.fromDate(dataToSave.date);
    }
    if ('dueDate' in dataToSave && dataToSave.dueDate) {
        dataToSave.dueDate = Timestamp.fromDate(dataToSave.dueDate);
    }
    if ('person' in dataToSave) {
        if(activeTab === 'debt') {
            dataToSave.creditor = dataToSave.person;
            dataToSave.debtor = user.displayName || user.email;
        } else if (activeTab === 'receivable') {
            dataToSave.debtor = dataToSave.person;
            dataToSave.creditor = user.displayName || user.email;
        }
        delete dataToSave.person;
    }

    if (activeTab === 'debt') {
        dataToSave.isPaid = record ? (record as any).isPaid : false;
        delete dataToSave.type;
        delete dataToSave.category;
        delete dataToSave.date;
    } else if (activeTab === 'receivable') {
        dataToSave.isReceived = record ? (record as any).isReceived : false;
        delete dataToSave.type;
        delete dataToSave.category;
        delete dataToSave.date;
    } else if (activeTab === 'transaction') {
        delete dataToSave.dueDate;
        delete dataToSave.person;
    }
    
    onSave(dataToSave, activeTab);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{record ? 'Edit' : 'Add'} Record</DialogTitle>
          <DialogDescription>
            {record ? 'Edit the' : 'Add a new'} financial record. Select a tab to change the record type.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as RecordType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transaction" disabled={!!record && record.recordType !== 'transaction'}>Transaction</TabsTrigger>
            <TabsTrigger value="debt" disabled={!!record && record.recordType !== 'debt'}>Debt</TabsTrigger>
            <TabsTrigger value="receivable" disabled={!!record && record.recordType !== 'receivable'}>Receivable</TabsTrigger>
          </TabsList>
          <Form {...form}>
            <form key={formKey} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <TabsContent value="transaction" forceMount className={activeTab === 'transaction' ? '' : 'hidden'}>
                {TransactionFormFields(form.control)}
              </TabsContent>
              <TabsContent value="debt" forceMount className={activeTab === 'debt' ? '' : 'hidden'}>
                {DebtReceivableFormFields(form.control, 'To Whom You Owe')}
              </TabsContent>
              <TabsContent value="receivable" forceMount className={activeTab === 'receivable' ? '' : 'hidden'}>
                {DebtReceivableFormFields(form.control, 'Who Owes You')}
              </TabsContent>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

const commonFields = (control: any) => (
    <>
        <FormField control={control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={control} name="amount" render={({ field }) => (
            <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
    </>
);

const TransactionFormFields = (control: any) => (
    <div className="space-y-4">
      <FormField control={control} name="type" render={({ field }) => (
        <FormItem><FormLabel>Type</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
            <SelectContent><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
          </Select><FormMessage /></FormItem>
      )} />
      {commonFields(control)}
      <FormField control={control} name="category" render={({ field }) => (
        <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={control} name="date" render={({ field }) => (
        <FormItem className="flex flex-col"><FormLabel>Date</FormLabel>
            <Popover><PopoverTrigger asChild><FormControl>
                <Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
            </Popover><FormMessage /></FormItem>
      )} />
    </div>
);
  
const DebtReceivableFormFields = (control: any, personLabel: string) => (
    <div className="space-y-4">
      <FormField control={control} name="person" render={({ field }) => (
        <FormItem><FormLabel>{personLabel}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      {commonFields(control)}
      <FormField control={control} name="dueDate" render={({ field }) => (
        <FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel>
            <Popover><PopoverTrigger asChild><FormControl>
                <Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
            </Popover><FormMessage /></FormItem>
      )} />
    </div>
);
