import { create } from 'zustand';

export const useTransactionStore = create((set) => ({
  transactions: [],
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (transaction) => set((state) => ({ 
    transactions: [transaction, ...state.transactions] 
  })),
  updateTransaction: (updatedTransaction) => set((state) => ({
    transactions: state.transactions.map((t) => 
      t.id === updatedTransaction.id ? updatedTransaction : t
    )
  })),
  removeTransaction: (id) => set((state) => ({
    transactions: state.transactions.filter((t) => t.id !== id)
  })),
}));
