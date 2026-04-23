"use client";

import {
  CreditCard,
  Users,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useEffect } from "react";

export default function AdminDashboardPage() {
  useEffect(() => {
    const success = sessionStorage.getItem("login_success");
    if (success) {
      toast.success("เข้าสู่ระบบสำเร็จ");
      sessionStorage.removeItem("login_success");
    }
  }, []);
  return (
    <div className="space-y-6 animate-[fadeIn_0.5s]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">แดชบอร์ดภาพรวม</h1>
          <p className="mt-1 text-sm text-slate-500">
            สรุปข้อมูลสถิติของระบบ Ikuwah App ประจำวันนี้
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            ดาวน์โหลดรายงาน
          </button>
          <button className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 transition-colors shadow-sm shadow-sky-500/20">
            อนุมัติรอดำเนินการ (8)
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat 1 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 group hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-sky-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
          <div className="relative z-10 flex justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-500">
                สมาชิกทั้งหมด
              </p>
              <div>
                <p className="text-3xl font-bold text-slate-800">124</p>
                <p className="text-xs font-medium text-emerald-500 flex items-center mt-1">
                  <TrendingUp size={12} className="mr-1" /> +12 คน ในเดือนนี้
                </p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600 shadow-inner">
              <Users size={24} />
            </div>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 group hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 mx-auto rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
          <div className="relative z-10 flex justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-500">
                รออนุมัติสินเชื่อ
              </p>
              <div>
                <p className="text-3xl font-bold text-amber-500">8</p>
                <p className="text-xs font-medium text-slate-400 mt-1">
                  ต้องตรวจสอบด่วน: 3 รายการ
                </p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100/50 flex items-center justify-center text-amber-500 shadow-inner">
              <Clock size={24} />
            </div>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 group hover:shadow-md transition-shadow relative overflow-hidden lg:col-span-2">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-50 rounded-full group-hover:scale-125 transition-transform duration-500 ease-out"></div>
          <div className="relative z-10 flex justify-between h-full items-center">
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              <p className="text-sm font-medium text-slate-500">
                ยอดเงินอนุมัติแล้ว (สะสม)
              </p>
              <div>
                <p className="text-3xl font-bold text-emerald-600">฿45,000</p>
                <div className="flex gap-4 mt-2">
                  <p className="text-xs font-medium text-slate-500 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 line-clamp-1"></span>{" "}
                    สินเชื่อฉุกเฉิน: 15,000
                  </p>
                  <p className="text-xs font-medium text-slate-500 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-sky-400 mr-1.5 line-clamp-1"></span>{" "}
                    ก้อดฮาซัน: 30,000
                  </p>
                </div>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/50 flex items-center justify-center text-emerald-600 shadow-inner -mt-4">
              <CreditCard size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Recent Transactions List */}
        <div className="bg-white shadow-sm rounded-2xl border border-slate-100 lg:col-span-2 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-50/80 flex justify-between items-center bg-white/50">
            <h2 className="text-base font-bold text-slate-800">
              รายการขอสินเชื่อล่าสุด
            </h2>
            <button className="text-sm font-semibold text-sky-600 hover:text-sky-700 transition">
              ดูทั้งหมด
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-4 font-semibold">ประเภทสินเชื่อ</th>
                  <th className="px-6 py-4 font-semibold">จำนวนเงิน</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {/* Mock Row 1 */}
                <tr className="hover:bg-slate-50/50 even:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">
                        สมชาย ใจดี
                      </span>
                      <span className="text-slate-400 text-xs">
                        วันนี้, 10:24
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold border border-amber-100">
                      ฉุกเฉิน
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                    ฿8,000
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                      <Clock size={14} />
                      <span className="text-xs">รอตรวจสอบ</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-sky-600 hover:text-sky-700 font-semibold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      ตรวจสอบ
                    </button>
                  </td>
                </tr>

                {/* Mock Row 2 */}
                <tr className="hover:bg-slate-50/50 even:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">
                        มานี มีสุข
                      </span>
                      <span className="text-slate-400 text-xs">
                        เมื่อวาน, 15:30
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-semibold border border-sky-100">
                      ก้อดฮาซัน
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                    ฿150,000
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                      <CheckCircle size={14} />
                      <span className="text-xs">อนุมัติแล้ว</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-slate-400 hover:text-slate-600 font-semibold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      รายละเอียด
                    </button>
                  </td>
                </tr>

                {/* Mock Row 3 */}
                <tr className="hover:bg-slate-50/50 even:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">
                        เอกชัย สายลม
                      </span>
                      <span className="text-slate-400 text-xs">
                        เมื่อวาน, 09:15
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-xs font-semibold border border-violet-100">
                      ซื้อขาย
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                    ฿45,000
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-rose-500 font-medium">
                      <AlertTriangle size={14} />
                      <span className="text-xs">ปฏิเสธ</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-slate-400 hover:text-slate-600 font-semibold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      รายละเอียด
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Small Analytics Widget */}
        <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg border border-slate-700 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-sky-500/20 blur-3xl rounded-full"></div>
          <div className="absolute left-0 bottom-0 w-24 h-24 bg-sky-400/20 blur-2xl rounded-full"></div>

          <h2 className="text-lg font-semibold mb-6 flex items-center relative z-10">
            <span className="bg-sky-500/20 p-2 rounded-xl mr-3 text-sky-400">
              <FileText size={18} />
            </span>
            ภาพรวมรายเดือน
          </h2>

          <div className="space-y-5 relative z-10">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-300">ความสำเร็จในการอนุมัติ</span>
                <span className="font-semibold text-sky-400">85%</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden shadow-inner">
                <div
                  className="bg-sky-500 h-2 rounded-full"
                  style={{ width: "85%" }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-300">สัดส่วนสินเชื่อฉุกเฉิน</span>
                <span className="font-semibold text-amber-400">60%</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden shadow-inner">
                <div
                  className="bg-amber-400 h-2 rounded-full"
                  style={{ width: "60%" }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-300">สัดส่วนก้อดฮาซัน</span>
                <span className="font-semibold text-emerald-400">30%</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden shadow-inner">
                <div
                  className="bg-emerald-400 h-2 rounded-full"
                  style={{ width: "30%" }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700/50 relative z-10">
            <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              ดูรายงานฉบับเต็ม <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
