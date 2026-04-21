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

export interface ProfileData {
  memberId?: string;
  prefix?: string;
  fullName?: string;
  idCard?: string;
  phone?: string;
  accumulatedShares?: number;
  totalLoanDebt?: number;
  pictureUrl?: string;
  lineName?: string;
}

export type LoanSchedule = {
	period: number;
	month: string;
	amount: number;
	status: string;
	payDate: string;
};

export type Member = {
	memberId: string;
	lineUserId: string;
	lineName: string;
	prefix: string;
	fullName: string;
	accountName: string;
	idCard: string;
	phone: string;
	accumulatedShares: number;
	totalLoanDebt: number;
	pictureUrl: string;
	status: string;
	hasActiveLoan: boolean;
	loanData: {
		id: string;
		type: string;
		totalAmount: number;
		paidAmount: number;
		remainingAmount: number;
		duration: number;
		schedule: LoanSchedule[];
	} | null;
};