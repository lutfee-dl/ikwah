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
  updateAdminMember: async (memberId: string, updateData: Record<string, any>) => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_update_member",
          ADMIN_SECRET,
          memberId,
          updateData
        }),
      });
      return await res.json();
    } catch (error) {
      console.error("Admin update member error", error);
      return { success: false, msg: "บันทึกข้อมูลไม่สำเร็จ" };
    }
  },
  // 7. ดึงประวัติธุรกรรมของสมาชิก
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
};
