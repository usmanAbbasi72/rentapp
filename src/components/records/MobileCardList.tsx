
'use client';
import { FinancialRecord, Transaction, Debt, Receivable } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '../ui/skeleton';
import { formatCurrency, formatDate, ToggleStatusCheckbox } from './columns';

interface MobileCardListProps {
  data: FinancialRecord[];
  loading: boolean;
  onEdit: (record: FinancialRecord) => void;
  onDelete: (record: FinancialRecord) => void;
}

const MobileCard = ({ record, onEdit, onDelete }: { record: FinancialRecord, onEdit: (record: FinancialRecord) => void, onDelete: (record: FinancialRecord) => void }) => {
    
    const renderCardContent = () => {
        switch (record.recordType) {
            case 'transaction':
                const t = record as Transaction;
                return (
                    <>
                        <p className="text-sm text-muted-foreground">{t.category}</p>
                        <div className="flex items-center justify-between">
                            <Badge variant={t.type === 'income' ? 'secondary' : 'outline'} className={t.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                                {t.type}
                            </Badge>
                            <span className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</span>
                        </div>
                    </>
                );
            case 'debt':
                const d = record as Debt;
                return (
                    <>
                        <p className="text-sm text-muted-foreground">Owed to: {d.creditor}</p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ToggleStatusCheckbox record={d} field="isPaid" />
                                <span className="text-sm">Paid</span>
                            </div>
                            <span className="font-semibold">{formatCurrency(d.amount)}</span>
                        </div>
                    </>
                );
            case 'receivable':
                 const r = record as Receivable;
                 return (
                     <>
                         <p className="text-sm text-muted-foreground">Owed by: {r.debtor}</p>
                         <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                 <ToggleStatusCheckbox record={r} field="isReceived" />
                                 <span className="text-sm">Received</span>
                             </div>
                             <span className="font-semibold">{formatCurrency(r.amount)}</span>
                         </div>
                     </>
                 );
            default:
                return null;
        }
    }

    const getDate = () => {
        if ('date' in record) return formatDate((record as Transaction).date);
        if ('dueDate' in record) return `Due: ${formatDate((record as Debt | Receivable).dueDate)}`;
        return '';
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
                <CardTitle className="text-base font-medium">{record.description}</CardTitle>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(record)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(record)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-2 pb-4">
                {renderCardContent()}
            </CardContent>
            <CardFooter>
                 <p className="text-xs text-muted-foreground">{getDate()}</p>
            </CardFooter>
        </Card>
    )
}

export function MobileCardList({ data, loading, onEdit, onDelete }: MobileCardListProps) {
  if (loading) {
    return (
      <div className="space-y-4 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        No records found.
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {data.map(record => (
        <MobileCard key={record.id} record={record} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
