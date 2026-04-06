export interface ApiResponse<T> {
  success: boolean;
  msg?: string;
  data?: T;
}
export interface LoanSubmission {
  userId: string;
  fullName: string;
  loanType: 'ฉุกเฉิน' | 'สามัญ';
  amount: number | string;
  reason: string;
}

export interface DashboardData {
  fullName: string;
  totalSaving: number;
  totalDebt: number;
  updatedAt: string;
}