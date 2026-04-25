import { LoanSubmission } from "@/types";

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || "";

export const fetchGasData = async <T,>(action: string, data: Record<string, unknown> = {}): Promise<T> => {
  if (!GAS_URL) {
    throw new Error("GAS_URL is not defined in environment variables.");
  }

  const response = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, data }),
  });

  const result = await response.json();
  if (!result.success) throw new Error(result.msg || "Error from GAS");
  return result.data;
};

export const gasApi = {
  // 1. เช็คสถานะผู้ใช้ (รับ idToken แทน userId ธรรมดาเพื่อความปลอดภัย)
  checkStatus: async (idToken: string) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_status", idToken }),
      });
      return await res.json();
    } catch (error) {
      console.error("Check status error", error);
      return { success: false, verified: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },

  // 2. ตรวจสอบชื่อนามสกุล ว่ามีในฐานข้อมูลหรือไม่
  verifyName: async (fullName: string, idToken: string) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", fullName, idToken }),
      });
      return await res.json();
    } catch (error) {
      console.error("Verify name error", error);
      return { success: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },

  // 3. สมัครสมาชิก
  register: async (payload: {
    idToken: string;
    fullName: string;
    idCard: string;
    phone: string;
    pictureUrl: string;
    lineName: string;
  }) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", ...payload }),
      });
      return await res.json();
    } catch (error) {
      console.error("Register error", error);
      return { success: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },

  // 4. ส่งข้อมูลกู้เงิน
  submitLoan: async (loanData: LoanSubmission) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_loan", ...loanData }),
      });
      return await res.json();
    } catch (error) {
      console.error("Submit loan error", error);
      return { success: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },

  // 5. ดึงข้อมูล Dashboard
  getDashboardData: async (userId: string) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_dashboard_data", userId }),
      });
      return await res.json();
    } catch (error) {
      console.error("Get dashboard data error", error);
      return { success: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },

  // 6. ดึงข้อมูลสมาชิกทั้งหมด (Admin)
  getAdminMembers: async () => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_get_members", ADMIN_SECRET }),
      });
      return await res.json();
    } catch (error) {
      console.error("Admin Members fetch error", error);
      return { success: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },

  // ++ 5. แอดมินแก้ไขข้อมูลสมาชิก
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateAdminMember: async (memberId: string, updateData: Record<string, any>, adminName: string) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_update_member",
          ADMIN_SECRET,
          memberId,
          updateData,
          adminName
        }),
      });
      return await res.json();
    } catch (error) {
      console.error("Admin update member error", error);
      return { success: false, msg: "บันทึกข้อมูลไม่สำเร็จ" };
    }
  },
  // 8. ดึงข้อมูลสัญญา/สินเชื่อที่กำลังผ่อน
  getMemberLoans: async (idToken: string) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_member_loans", idToken }),
      });
      return await res.json();
    } catch (error) {
      console.error("Get member loans error", error);
      return { success: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },
  // 9. ดึงประวัติธุรกรรมสมาชิก
  getHistory: async (idToken: string) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_member_history", idToken }),
      });
      return await res.json();
    } catch (error) {
      console.error("Get history error", error);
      return { success: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },

  // 10. ดึงรายงานหุ้นสะสม (Admin)
  getAdminSharesReport: async (options: { year?: number } = {}) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_get_shares_report", ADMIN_SECRET, options }),
      });
      return await res.json();
    } catch (error) {
      console.error("Admin Shares Report fetch error", error);
      return { success: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },
  // --- ระบบแอดมิน (Admin Actions) ---
  async initSystem() {
    return this.call("admin_init_system");
  },

  // 11. ดึงสถิติหน้า Dashboard (Admin)
  getAdminDashboardStats: async () => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_get_dashboard_stats", ADMIN_SECRET }),
      });
      return await res.json();
    } catch (error) {
      console.error("Admin Dashboard Stats fetch error", error);
      return { success: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },
  // 12. ซิงค์ยอดเงินทั้งหมด (Admin)
  syncAllBalances: async () => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_sync_all_balances", ADMIN_SECRET }),
      });
      return await res.json();
    } catch (error) {
      console.error("Sync All Balances error", error);
      return { success: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },
  // 13. Rebuild ชีทสรุปหุ้นใหม่ทั้งหมด (Admin)
  rebuildShareSummary: async () => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_rebuild_summary", ADMIN_SECRET }),
      });
      return await res.json();
    } catch (error) {
      console.error("Rebuild Share Summary error", error);
      return { success: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },
  // 14. เพิ่มสมาชิกใหม่โดยแอดมิน
  adminAddMember: async (payload: any, adminName: string) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_add_member", payload: { ...payload, adminName }, ADMIN_SECRET }),
      });
      return await res.json();
    } catch (error) {
      console.error("Admin Add Member error", error);
      return { success: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },

  // 15. ดึงจำนวนรายการค้างตรวจสอบ (Badges)
  getPendingCounts: async () => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_get_pending_counts", ADMIN_SECRET }),
      });
      return await res.json();
    } catch (error) {
      console.error("Get pending counts error", error);
      return { success: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },

  // 16. ดึงข้อมูลบัญชีรับ-จ่าย กองทุนหมู่บ้าน (สรุปรายเดือน)
  getFundFlow: async (year: string) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_get_fund_flow", ADMIN_SECRET, year }),
      });
      return await res.json();
    } catch (error) {
      console.error("Get fund flow error", error);
      return { success: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },

  // 17. อัปเดตข้อมูลสรุปรายเดือน (Inline Edit)
  updateFundFlow: async (payload: { year: string; monthIdx: number; field: string; value: number; adminName: string }) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_update_fund_flow", ADMIN_SECRET, ...payload }),
      });
      return await res.json();
    } catch (error) {
      console.error("Update fund flow error", error);
      return { success: false, msg: "บันทึกข้อมูลไม่สำเร็จ" };
    }
  },

  // 18. อัปเดตข้อมูลสรุปรายเดือนแบบยกแถว (Batch Update)
  updateFundRow: async (payload: { 
    year: string; 
    monthIdx: number; 
    savings: number; 
    debtRepayment: number; 
    otherIncome: number; 
    expenses: number; 
    carryForward: number;
    adminName: string;
  }) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_update_fund_row", ADMIN_SECRET, ...payload }),
      });
      return await res.json();
    } catch (error) {
      console.error("Update fund row error", error);
      return { success: false, msg: "บันทึกข้อมูลไม่สำเร็จ" };
    }
  },

  // 19. อัปเดตสถานะสลิปฝากหุ้น (Admin)
  updateAdminDeposit: async (depositId: string, status: string, amount: number, adminName: string, note?: string) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_update_deposit", ADMIN_SECRET, depositId, status, amount, adminName, note }),
      });
      return await res.json();
    } catch (error) {
      console.error("Update Admin Deposit error", error);
      return { success: false, msg: "บันทึกไม่สำเร็จ" };
    }
  },

  // 20. อัปเดตสถานะสลิปชำระหนี้ (Admin)
  updateAdminLoanRepayment: async (depositId: string, status: string, amount: number, adminName: string, note?: string) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_update_loan_repayment", ADMIN_SECRET, depositId, status, amount, adminName, note }),
      });
      return await res.json();
    } catch (error) {
      console.error("Update Admin Loan Repayment error", error);
      return { success: false, msg: "บันทึกไม่สำเร็จ" };
    }
  },

  // 21. อัปเดตสถานะคำขอกู้เงิน (Admin)
  updateAdminLoanStatus: async (loanId: string, status: string, adminName: string) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_update_loan", ADMIN_SECRET, loanId, status, adminName }),
      });
      return await res.json();
    } catch (error) {
      console.error("Update Admin Loan Status error", error);
      return { success: false, msg: "บันทึกไม่สำเร็จ" };
    }
  },

  // Generic call function (เพื่อให้เรียก gasApi.call("action", payload) ได้)
  call: async (action: string, payload: any = {}) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ADMIN_SECRET, ...payload }),
      });
      return await res.json();
    } catch (error) {
      console.error(`Error calling action ${action}`, error);
      return { success: false, msg: "ติดต่อเซิร์ฟเวอร์ไม่ได้" };
    }
  },
};
