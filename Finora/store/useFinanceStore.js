import { create } from 'zustand';

export const useFinanceStore = create((set) => ({
  dashboardData: {
    total_balance: 0,
    monthly_expenses: 0,
    monthly_income: 0,
    active_goals: 0,
  },
  setDashboardData: (data) => set({ dashboardData: data }),
}));
