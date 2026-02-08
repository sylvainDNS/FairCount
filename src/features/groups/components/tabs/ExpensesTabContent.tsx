import { ExpenseList } from '@/features/expenses';

interface ExpensesTabContentProps {
  readonly groupId: string;
  readonly currency: string;
}

export const ExpensesTabContent = ({ groupId, currency }: ExpensesTabContentProps) => {
  return <ExpenseList groupId={groupId} currency={currency} />;
};
