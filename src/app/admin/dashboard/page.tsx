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
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useEffect, useState } from "react";
import { gasApi } from "@/services/gasApi";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

type DashboardStats = {
  totalMembers: number;
  newMembersThisMonth: number;
  activeMembers: number;
  pendingLoans: number;
  totalApprovedLoanAmount: number;
  loanTypeBreakdown: Record<string, number>;
  pendingRepayments: number;
  pendingDeposits: number;
  recentRequests: Array<{
    id: string;
    date: string;
    name: string;
    type: string;
    amount: number;
    status: string;
  }>;
};

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="mt-4 sm:mt-0 flex gap-3">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-48 rounded-xl" />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl lg:col-span-2" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
      <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  </div>
);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncAll = async () => {
    if (!confirm("คุณต้องการเริ่มการซิงค์และล้างสูตรในชีทที่เพี้ยนใหม่ทั้งหมดใช่หรือไม่? (อาจใช้เวลา 10-20 วินาที)")) return;
    
    setIsSyncing(true);
    const tid = toast.loading("กำลังเริ่มต้นกระบวนการซิงค์...");
    try {
      // 1. Sync Balances (Member Table)
      toast.loading("กำลังอัปเดตยอดเงินสมาชิก (1/2)...", { id: tid });
      const resSync = await gasApi.syncAllBalances();
      if (!resSync.success) throw new Error(resSync.msg);

      // 2. Rebuild Summary Sheet (Matrix Table)
      toast.loading("กำลัง Rebuild ชีทสรุปหุ้นใหม่ (2/2)...", { id: tid });
      const resRebuild = await gasApi.rebuildShareSummary();
      if (!resRebuild.success) throw new Error(resRebuild.msg);

      toast.success("ซิงค์และปรับปรุงข้อมูลในชีททั้งหมดเรียบร้อยแล้ว!", { id: tid });
      await fetchStats();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "เกิดข้อผิดพลาดในการซิงค์", { id: tid });
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await gasApi.getAdminDashboardStats();
      if (res.success) {
        setStats(res.data);
      } else {
        toast.error(res.msg || "ดึงข้อมูลสถิติไม่สำเร็จ");
      }
    } catch (error) {
      console.error(error);
      toast.error("ติดต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const success = sessionStorage.getItem("login_success");
    if (success) {
      toast.success("เข้าสู่ระบบสำเร็จ");
      sessionStorage.removeItem("login_success");
    }
    fetchStats();
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!stats) return null;

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
          <Link
            href="/admin/members"
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            รายชื่อสมาชิก
          </Link>
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
            ซิงค์ยอดเงินทั้งหมด
          </button>
          <Link
            href="/admin/loans"
            className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-bold hover:bg-sky-600 transition-all shadow-sm shadow-sky-500/20 flex items-center gap-2"
          >
            คำขอกู้เงินรอดำเนินการ ({stats.pendingLoans})
          </Link>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat 1: Total Members */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 group hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-sky-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
          <div className="relative z-10 flex justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-500">สมาชิกทั้งหมด</p>
              <div>
                <p className="text-3xl font-bold text-slate-800">{stats.totalMembers}</p>
                <p className="text-xs font-medium text-emerald-500 flex items-center mt-1">
                  <TrendingUp size={12} className="mr-1" /> ปกติ {stats.activeMembers} คน
                </p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600 shadow-inner">
              <Users size={24} />
            </div>
          </div>
        </div>

        {/* Stat 2: Pending Loans */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 group hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 mx-auto rounded-full group-hover:scale-150 transition-transform duration-500 ease-out"></div>
          <div className="relative z-10 flex justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-500">รออนุมัติสินเชื่อ</p>
              <div>
                <p className={`text-3xl font-bold ${stats.pendingLoans > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                  {stats.pendingLoans}
                </p>
                <p className="text-xs font-medium text-slate-400 mt-1">
                  รายการคำขอกู้ที่ยังไม่ได้ตรวจสอบ
                </p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100/50 flex items-center justify-center text-amber-500 shadow-inner">
              <Clock size={24} />
            </div>
          </div>
        </div>

        {/* Stat 3: Total Loan Amount */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 group hover:shadow-md transition-shadow relative overflow-hidden lg:col-span-2">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-50 rounded-full group-hover:scale-125 transition-transform duration-500 ease-out"></div>
          <div className="relative z-10 flex justify-between h-full items-center">
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              <p className="text-sm font-medium text-slate-500">ยอดเงินกู้ที่อนุมัติแล้ว (สะสม)</p>
              <div>
                <p className="text-3xl font-bold text-emerald-600">฿{stats.totalApprovedLoanAmount.toLocaleString()}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {Object.entries(stats.loanTypeBreakdown).map(([type, amount], idx) => (
                    <p key={type} className="text-[10px] font-bold text-slate-500 flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-1.5 ${idx % 2 === 0 ? 'bg-emerald-400' : 'bg-sky-400'}`}></span>
                      {type}: {amount.toLocaleString()}
                    </p>
                  ))}
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
            <h2 className="text-base font-bold text-slate-800">รายการขอสินเชื่อล่าสุด</h2>
            <Link href="/admin/loans" className="text-sm font-semibold text-sky-600 hover:text-sky-700 transition">
              ดูทั้งหมด
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-4 font-semibold">ประเภท</th>
                  <th className="px-6 py-4 font-semibold">จำนวนเงิน</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {stats.recentRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">ไม่พบรายการขอสินเชื่อในระบบ</td>
                  </tr>
                ) : (
                  stats.recentRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 even:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">{req.name}</span>
                          <span className="text-slate-400 text-[10px]">{formatDateTime(req.date)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${req.type === 'ฉุกเฉิน' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            req.type === 'ก้อดฮาซัน' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                              'bg-slate-50 text-slate-700 border-slate-100'
                          }`}>
                          {req.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">฿{req.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-1.5 font-bold ${req.status === 'อนุมัติแล้ว' ? 'text-emerald-600' :
                            req.status === 'ปฏิเสธ' ? 'text-rose-500' : 'text-amber-600'
                          }`}>
                          {req.status === 'อนุมัติแล้ว' ? <CheckCircle size={14} /> :
                            req.status === 'ปฏิเสธ' ? <AlertTriangle size={14} /> : <Clock size={14} />}
                          <span className="text-xs">{req.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Link href="/admin/loans" className="text-sky-600 hover:text-sky-700 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          รายละเอียด
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Small Analytics Widget */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg border border-slate-800 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-sky-500/10 blur-3xl rounded-full"></div>

          <h2 className="text-lg font-bold mb-6 flex items-center relative z-10">
            <span className="bg-sky-500/20 p-2 rounded-xl mr-3 text-sky-400">
              <FileText size={18} />
            </span>
            ภาพรวมงานที่ค้าง
          </h2>

          <div className="space-y-6 relative z-10">
            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
                <span className="text-slate-400">รอตรวจสลิปค่างวด</span>
                <span className={stats.pendingRepayments > 0 ? "text-amber-400" : "text-slate-500"}>
                  {stats.pendingRepayments} รายการ
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-400 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(stats.pendingRepayments * 10, 100)}%` }}
                ></div>
              </div>
              <Link href="/admin/repayments" className="text-[10px] text-slate-500 hover:text-sky-400 mt-2 block text-right">ไปที่หน้าตรวจสอบ →</Link>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
                <span className="text-slate-400">รอตรวจสลิปหุ้น</span>
                <span className={stats.pendingDeposits > 0 ? "text-sky-400" : "text-slate-500"}>
                  {stats.pendingDeposits} รายการ
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-sky-400 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(stats.pendingDeposits * 10, 100)}%` }}
                ></div>
              </div>
              <Link href="/admin/deposits" className="text-[10px] text-slate-500 hover:text-sky-400 mt-2 block text-right">ไปที่หน้าตรวจสอบ →</Link>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-800 relative z-10">
            <Link
              href="/admin/fund-accounting"
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-white/5"
            >
              ดูบัญชีกองทุน <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
