import { createContext, useContext } from 'react';
import { useTransactions as useTransactionsHook } from '@/hooks/useTransactions';

const TransactionsContext = createContext(null);

export function TransactionsProvider({ children }) {
  const transactions = useTransactionsHook();
  return <TransactionsContext.Provider value={transactions}>{children}</TransactionsContext.Provider>;
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider');
  return ctx;
}
