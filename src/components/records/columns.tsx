'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Transaction, Debt, Receivable, FinancialRecord } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
const formatDate = (timestamp: any) => timestamp?.toDate().toLocaleDateString() ?? '';

const createActions = (
  record: FinancialRecord,
  onEdit: (record: FinancialRecord) => void,
  onDelete: (id: string) => void
) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="h-8 w-8 p-0">
        <span className="sr-only">Open menu</span>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => onEdit(record)}>Edit</DropdownMenuItem>
      <DropdownMenuItem onClick={() => onDelete(record.id)} className="text-destructive">
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const createHeader = (title: string, column: any) => (
  <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
    {title}
    <ArrowUpDown className="ml-2 h-4 w-4" />
  </Button>
);

export const transactionColumns = (
  onEdit: (record: Transaction) => void,
  onDelete: (id: string) => void
): ColumnDef<Transaction>[] => [
  { accessorKey: 'date', header: ({ column }) => createHeader('Date', column), cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'type', header: 'Type', cell: ({ row }) => <Badge variant={row.original.type === 'income' ? 'secondary' : 'outline'}>{row.original.type}</Badge> },
  { accessorKey: 'amount', header: ({ column }) => createHeader('Amount', column), cell: ({ row }) => <span className={row.original.type === 'income' ? 'text-green-600' : 'text-red-600'}>{formatCurrency(row.original.amount)}</span>,
    sortingFn: 'basic'
  },
  { id: 'actions', cell: ({ row }) => createActions(row.original, onEdit, onDelete) },
];

const togglePaidStatus = async (id: string, currentStatus: boolean, field: 'isPaid' | 'isReceived') => {
  const db = getFirestore();
  if (!db) return;
  const recordRef = doc(db, 'records', id);
  await updateDoc(recordRef, { [field]: !currentStatus });
};

export const debtColumns = (
  onEdit: (record: Debt) => void,
  onDelete: (id: string) => void
): ColumnDef<Debt>[] => [
  { id: 'isPaid', header: 'Paid', cell: ({ row }) => <Checkbox checked={row.original.isPaid} onCheckedChange={() => togglePaidStatus(row.original.id, row.original.isPaid, 'isPaid')} /> },
  { accessorKey: 'creditor', header: 'Owed To' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'amount', header: ({ column }) => createHeader('Amount', column), cell: ({ row }) => formatCurrency(row.original.amount), sortingFn: 'basic' },
  { accessorKey: 'dueDate', header: ({ column }) => createHeader('Due Date', column), cell: ({ row }) => formatDate(row.original.dueDate) },
  { id: 'actions', cell: ({ row }) => createActions(row.original, onEdit, onDelete) },
];

export const receivableColumns = (
  onEdit: (record: Receivable) => void,
  onDelete: (id: string) => void
): ColumnDef<Receivable>[] => [
  { id: 'isReceived', header: 'Received', cell: ({ row }) => <Checkbox checked={row.original.isReceived} onCheckedChange={() => togglePaidStatus(row.original.id, row.original.isReceived, 'isReceived')} /> },
  { accessorKey: 'debtor', header: 'Owed By' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'amount', header: ({ column }) => createHeader('Amount', column), cell: ({ row }) => formatCurrency(row.original.amount), sortingFn: 'basic' },
  { accessorKey: 'dueDate', header: ({ column }) => createHeader('Due Date', column), cell: ({ row }) => formatDate(row.original.dueDate) },
  { id: 'actions', cell: ({ row }) => createActions(row.original, onEdit, onDelete) },
];
