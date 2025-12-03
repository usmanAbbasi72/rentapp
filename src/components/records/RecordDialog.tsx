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
import { useState, useEffect } from 'react';
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

type FormValues = z.infer<typeof transactionSchema> | z.infer<typeof debtReceivableSchema>;

export function RecordDialog({ isOpen, onClose, onSave, record }: RecordDialogProps) {
  const [activeTab, setActiveTab] = useState<RecordType>(record?.recordType || 'transaction');
  const { user } = useUser();

  const getSchema = (tab: RecordType) => {
    return tab === 'transaction' ? transactionSchema : debtReceivableSchema;
  };
  
  const form = useForm<any>({
    resolver: zodResolver(getSchema(activeTab)),
    defaultValues: {},
  });
  
  useEffect(() => {
    form.reset();
    const defaultValues: any = {
      description: '',
      amount: 0,
      ...(activeTab === 'transaction'
        ? { type: 'expense', category: '', date: new Date() }
        : { person: '', dueDate: new Date() }),
    };

    if (record && record.recordType === activeTab) {
        defaultValues.description = record.description;
        defaultValues.amount = record.amount;
        if(record.recordType === 'transaction') {
            defaultValues.type = record.type;
            defaultValues.category = record.category;
            defaultValues.date = record.date.toDate();
        } else if (record.recordType === 'debt') {
            defaultValues.person = record.creditor;
            defaultValues.dueDate = record.dueDate.toDate();
        } else if (record.recordType === 'receivable') {
            defaultValues.person = record.debtor;
            defaultValues.dueDate = record.dueDate.toDate();
        }
    }
    
    form.reset(defaultValues, { keepDefaultValues: true });
  }, [isOpen, record, activeTab, form]);


  const onSubmit = (values: FormValues) => {
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
            dataToSave.debtor = user.displayName || user.email; // The user is the debtor
        } else { // receivable
            dataToSave.debtor = dataToSave.person;
            dataToSave.creditor = user.displayName || user.email; // The user is the creditor
        }
        delete dataToSave.person;
    }

    if (activeTab === 'debt') {
        dataToSave.isPaid = record ? (record as any).isPaid : false;
    }
    if (activeTab === 'receivable') {
        dataToSave.isReceived = record ? (record as any).isReceived : false;
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
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
