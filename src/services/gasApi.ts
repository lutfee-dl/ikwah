import { ApiResponse, LoanSubmission, DashboardData } from "@/types";

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
};
