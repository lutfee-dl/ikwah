import { ApiResponse, LoanSubmission, DashboardData } from "@/types";

export const gasApi = {
  // ใช้ Generic Type <T> เพื่อระบุว่า Data ที่ส่งกลับมาจะเป็น Type อะไร
  call: async <T>(payload: object): Promise<ApiResponse<T>> => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (_error) {
      return { success: false, msg: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },

  checkStatus: (idToken: string) =>
    gasApi.call<{ verified: boolean; name?: string }>({
      action: "check_status",
      idToken,
    }),

  getDashboardData: (userId: string) =>
    gasApi.call<DashboardData>({ action: "get_dashboard_data", userId }),

  submitLoan: (loanData: LoanSubmission) =>
    gasApi.call({ action: "submit_loan", ...loanData }),

  verifyName: (fullName: string, idToken: string) =>
    gasApi.call<{ success: boolean; msg?: string }>({
      action: "verify",
      fullName,
      idToken,
    }),

  register: (payload: {
    idToken: string;
    fullName: string;
    idCard: string;
    phone: string;
    pictureUrl: string;
    lineName: string;
  }) =>
    gasApi.call<{ success: boolean; msg?: string }>({
      action: "register",
      ...payload,
    }),
};
