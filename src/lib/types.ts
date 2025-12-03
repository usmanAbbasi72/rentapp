import { Timestamp } from 'firebase/firestore';

export type RecordType = 'transaction' | 'debt' | 'receivable';

export interface BaseRecord {
  id: string;
  userId: string;
  amount: number;
  description: string;
  createdAt: Timestamp;
}

export interface Transaction extends BaseRecord {
  type: 'income' | 'expense';
  date: Timestamp;
  category: string;
}

export interface Debt extends BaseRecord {
  debtor: string; // The person who owes money (the user)
  creditor: string; // The person/entity the user owes money to
  dueDate: Timestamp;
  isPaid: boolean;
}

export interface Receivable extends BaseRecord {
  debtor: string; // The person who owes money to the user
  creditor: string; // The user
  dueDate: Timestamp;
  isReceived: boolean;
}

export type FinancialRecord = Transaction | Debt | Receivable;
