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
  RefreshCw,
  Zap,
  PieChart as PieChartIcon,
  TrendingDown,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { useEffect, useState } from "react";
import { gasApi } from "@/services/gasApi";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

// Import Recharts
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

type DashboardStats = {
  totalMembers: number;
  newMembersThisMonth: number;
  activeMembers: number;
  pendingLoans: number;
  totalApprovedLoanAmount: number;
  loanTypeBreakdown: Record<string, number>;
  pendingRepayments: number;
  pendingDeposits: number;
  monthlyData: Array<{
    month: string;
    shares: number;
    loans: number;
  }>;
  recentRequests: Array<{
    id: string;
    date: string;
    name: string;
    type: string;
    amount: number;
    status: string;
  }>;
};

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"];

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
  const [isInitializing, setIsInitializing] = useState(false);

  const handleSyncAll = async () => {
    const result = await Swal.fire({
      title: 'เริ่มการซิงค์ข้อมูล?',
      text: "ระบบจะคำนวณยอดเงินคงเหลือของทุกคนใหม่เพื่อให้ตรงกับสลิปจริง (ใช้เวลาประมาณ 10-20 วินาที)",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'เริ่มซิงค์เลย',
      cancelButtonText: 'ยกเลิก'
    });

    if (!result.isConfirmed) return;

    setIsSyncing(true);
    toast.loading("กำลังอัปเดตข้อมูล (1/2)...", { id: "sync-stats" });
    try {
      const resSync = await gasApi.call("admin_sync_all_balances", {});
      if (!resSync.success) throw new Error(resSync.msg);

      toast.loading("กำลังจัดระเบียบชีทสรุป (2/2)...", { id: "sync-stats" });
      const resRebuild = await gasApi.call("admin_rebuild_summary", {});
      if (!resRebuild.success) throw new Error(resRebuild.msg);

      toast.success("ซิงค์ข้อมูลทั้งระบบสำเร็จ!", { id: "sync-stats" });
      await fetchStats();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "เกิดข้อผิดพลาดในการซิงค์", { id: "sync-stats" });
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await gasApi.call("admin_get_dashboard_stats", {});
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
    fetchStats();
  }, []);

  if (isLoading) return <DashboardSkeleton />;
  if (!stats) return null;

  const handleInitSystem = async () => {
    const result = await Swal.fire({
      title: '⚠️ ตั้งค่าโครงสร้างชีท?',
      text: "ระบบจะปรับปรุงหัวตารางให้เป็นเวอร์ชันล่าสุด แนะนำให้สำรองข้อมูลก่อนเริ่ม",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'เริ่มปรับปรุง',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    setIsInitializing(true);
    toast.loading("กำลังปรับปรุงโครงสร้างชีท...", { id: "init-system" });
    try {
      const res = await gasApi.call("admin_init_system", {});
      if (res.success) {
        toast.success("ปรับปรุงสำเร็จ!", { id: "init-system" });
        fetchStats();
      } else {
        toast.error(res.msg || "เกิดข้อผิดพลาด", { id: "init-system" });
      }
    } catch (error) {
      toast.error("ติดต่อเซิร์ฟเวอร์ไม่ได้", { id: "init-system" });
    } finally {
      setIsInitializing(false);
    }
  };

  // Prepare Pie Chart Data
  const pieData = Object.entries(stats.loanTypeBreakdown).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s] pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Analytics Dashboard</h1>
          <p className="mt-1 text-slate-500 font-medium">
            ภาพรวมสถานะการเงินและกิจกรรมของกองทุน Ikuwah
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleInitSystem}
            disabled={isInitializing}
            className="px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl text-xs font-black hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isInitializing ? "animate-spin" : ""} /> 
            {isInitializing ? "INITIALIZING..." : "SYSTEM INIT"}
          </button>
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50"
          >
            {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            SYNC BALANCES
          </button>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="สมาชิกทั้งหมด"
          value={stats.totalMembers}
          sub={`ปกติ ${stats.activeMembers} คน`}
          icon={<Users size={24} />}
          color="blue"
        />
        <StatCard
          label="รอดำเนินการ"
          value={stats.pendingLoans + stats.pendingRepayments + stats.pendingDeposits}
          sub={`${stats.pendingLoans} คำขอกู้ / ${stats.pendingRepayments + stats.pendingDeposits} สลิป`}
          icon={<Clock size={24} />}
          color="amber"
          trend={stats.pendingLoans > 5 ? "up" : "down"}
        />
        <StatCard
          label="ยอดหนี้ที่ปล่อยกู้"
          value={`฿${stats.totalApprovedLoanAmount.toLocaleString()}`}
          sub="ยอดรวมสัญญาที่ยังไม่ปิด"
          icon={<CreditCard size={24} />}
          color="emerald"
          isCurrency
          className="lg:col-span-2"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Growth Chart (Area Chart) */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-600">
                <TrendingUp size={20} />
              </div>
              <h2 className="text-lg font-black text-slate-800">กราฟการเติบโตรายเดือน</h2>
            </div>
            <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> หุ้นสะสม</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> ส่งงวดหนี้</div>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLoans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                  tickFormatter={(val) => `฿${val >= 1000 ? (val / 1000) + 'k' : val}`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  formatter={(value: any) => [`฿${(Number(value) || 0).toLocaleString()}`, ""]}
                />
                <Area type="monotone" dataKey="shares" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorShares)" />
                <Area type="monotone" dataKey="loans" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorLoans)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loan Distribution (Pie Chart) */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-amber-50 p-2.5 rounded-2xl text-amber-600">
              <PieChartIcon size={20} />
            </div>
            <h2 className="text-lg font-black text-slate-800">สัดส่วนประเภทสินเชื่อ</h2>
          </div>

          <div className="h-[280px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  formatter={(value: any) => [`฿${(Number(value) || 0).toLocaleString()}`, ""]}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-50">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-400">
              <span>ยอดเงินกู้รวม</span>
              <span className="text-slate-800">฿{stats.totalApprovedLoanAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions List */}
        <div className="bg-white shadow-sm rounded-[2.5rem] border border-slate-100 lg:col-span-2 overflow-hidden flex flex-col p-2">
          <div className="px-6 py-6 flex justify-between items-center">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-indigo-500" />
              รายการขอสินเชื่อล่าสุด
            </h2>
            <Link href="/admin/loans" className="text-xs font-black text-indigo-600 hover:text-indigo-700 transition uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-xl">
              ดูทั้งหมด
            </Link>
          </div>

          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left border-separate border-spacing-y-2 px-4">
              <thead>
                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-4 py-2 font-black">ชื่อ-นามสกุล</th>
                  <th className="px-4 py-2 font-black">ประเภท</th>
                  <th className="px-4 py-2 font-black">จำนวนเงิน</th>
                  <th className="px-4 py-2 font-black">สถานะ</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {stats.recentRequests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400 italic font-medium">ไม่พบรายการขอสินเชื่อในระบบ</td>
                  </tr>
                ) : (
                  stats.recentRequests.map((req) => (
                    <tr key={req.id} className="bg-slate-50/50 hover:bg-slate-100/50 transition-all rounded-2xl">
                      <td className="px-4 py-4 rounded-l-2xl">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{req.name}</span>
                          <span className="text-slate-400 text-[10px] font-medium">{formatDateTime(req.date)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border ${req.type === 'ฉุกเฉิน' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            req.type === 'ก้อดฮาซัน' ? 'bg-sky-100 text-sky-700 border-sky-200' :
                              'bg-indigo-100 text-indigo-700 border-indigo-200'
                          }`}>
                          {req.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-black text-slate-700">฿{req.amount.toLocaleString()}</td>
                      <td className="px-4 py-4 rounded-r-2xl">
                        <div className={`flex items-center gap-1.5 font-black ${req.status === 'อนุมัติแล้ว' ? 'text-emerald-600' :
                            req.status === 'ปฏิเสธ' ? 'text-rose-500' : 'text-amber-600'
                          }`}>
                          <span className={`w-2 h-2 rounded-full ${req.status === 'อนุมัติแล้ว' ? 'bg-emerald-500' :
                              req.status === 'ปฏิเสธ' ? 'bg-rose-500' : 'bg-amber-500'
                            }`}></span>
                          <span className="text-[11px] uppercase tracking-wider">{req.status}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Small Progress Widget */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 border border-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-black mb-8 flex items-center">
              <span className="bg-indigo-500/20 p-2.5 rounded-2xl mr-4 text-indigo-400 border border-indigo-500/20">
                <PieChartIcon size={20} />
              </span>
              Pending Tasks
            </h2>

            <div className="space-y-8">
              <ProgressItem
                label="คำขอกู้เงินรอดำเนินการ"
                value={stats.pendingLoans}
                max={10}
                color="bg-amber-400"
                href="/admin/loans"
              />
              <ProgressItem
                label="สลิปผ่อนหนี้รอตรวจ"
                value={stats.pendingRepayments}
                max={20}
                color="bg-emerald-400"
                href="/admin/repayments"
              />
              <ProgressItem
                label="สลิปฝากหุ้นรอตรวจ"
                value={stats.pendingDeposits}
                max={20}
                color="bg-sky-400"
                href="/admin/deposits"
              />
            </div>
          </div>

          <div className="mt-12">
            <Link
              href="/admin/fund-accounting"
              className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-3 border border-white/10 group"
            >
              ดูบัญชีกองทุน <ArrowUpRight size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components for cleaner code ---

function StatCard({ label, value, sub, icon, color, trend, className = "", isCurrency = false }: any) {
  const colorMap: any = {
    blue: "bg-blue-100 text-blue-600 bg-opacity-50",
    amber: "bg-amber-100 text-amber-600 bg-opacity-50",
    emerald: "bg-emerald-100 text-emerald-600 bg-opacity-50",
  };

  return (
    <div className={`bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-slate-200/50 transition-all relative overflow-hidden ${className}`}>
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-6">
          <div className={`w-14 h-14 rounded-2xl ${colorMap[color]} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 font-black text-[10px] px-2 py-1 rounded-lg ${trend === 'up' ? 'text-rose-500 bg-rose-50' : 'text-emerald-500 bg-emerald-50'}`}>
              {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trend === 'up' ? 'HIGH' : 'LOW'}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-800 tracking-tighter">
              {value}
            </p>
          </div>
          <p className="text-xs font-bold text-slate-400 mt-1">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function ProgressItem({ label, value, max, color, href }: any) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.15em] mb-3">
        <span className="text-slate-400">{label}</span>
        <span className={value > 0 ? "text-white" : "text-slate-600"}>
          {value} <span className="opacity-40">/ {max}</span>
        </span>
      </div>
      <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
        <div
          className={`${color} h-2 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <Link href={href} className="text-[9px] font-black text-slate-500 hover:text-sky-400 mt-2 block text-right tracking-widest uppercase transition-colors">GO TO VIEW →</Link>
    </div>
  );
}
