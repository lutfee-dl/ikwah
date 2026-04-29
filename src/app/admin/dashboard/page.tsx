"use client";

import {
  Users,
  TrendingUp,
  RefreshCw,
  Zap,
  PieChart as PieChartIcon,
  ShieldCheck,
  Wallet,
  HandCoins,
  Activity,
  History,
  Building2,
  Settings2,
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
} from "recharts";

type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  totalSharesBalance: number;
  totalLoanOutstanding: number;
  totalFundBalance: number;
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

const COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6", "#f43f5e"];

const DashboardSkeleton = () => (
  <div className="space-y-8 animate-pulse p-6">
    <div className="h-20 bg-slate-100 rounded-3xl w-full" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-slate-100 rounded-[2rem]" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="h-96 bg-slate-100 rounded-[2.5rem] lg:col-span-2" />
      <div className="h-96 bg-slate-100 rounded-[2.5rem]" />
    </div>
  </div>
);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);

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


  const handleCloseYear = async () => {
    const { isConfirmed } = await Swal.fire({
      title: '🚨 ปิดงบปีการเงิน?',
      text: "ระบบจะสรุปยอด ม.ค.-ธ.ค. ไปไว้ที่ปียกมา และล้างข้อมูลรายเดือนเพื่อเริ่มปีใหม่ คุณแน่ใจหรือไม่?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'ยืนยันปิดงบปี',
      cancelButtonText: 'ยกเลิก'
    });

    if (isConfirmed) {
      toast.loading("กำลังดำเนินการปิดงบปี...", { id: "closeYear" });
      try {
        const res = await gasApi.call("admin_close_financial_year", {});
        if (res.success) {
          Swal.fire('✅ สำเร็จ!', res.msg, 'success');
          fetchStats(); // รีเฟรชข้อมูล
        } else {
          Swal.fire('❌ ผิดพลาด', res.msg, 'error');
        }
      } catch (error) {
        toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      } finally {
        toast.dismiss("closeYear");
      }
    }
  };

  const handleRunAudit = async () => {
    setIsAuditing(true);
    toast.loading("กำลังตรวจสอบความถูกต้อง...", { id: "audit" });
    try {
      const res = await gasApi.call("admin_run_integrity_check", {});
      if (res.success) {
        if (res.isHealthy) {
          Swal.fire({
            title: '✅ ข้อมูลถูกต้อง 100%',
            html: `<div class="text-left text-sm space-y-2">
              <p>ยอดหุ้นสะสม: ตรงกัน</p>
              <p>ยอดหนี้สินเชื่อ: ตรงกัน</p>
              <p class="text-emerald-600 font-bold">ระบบมีความแม่นยำสูง</p>
            </div>`,
            icon: 'success'
          });
        } else {
          Swal.fire({
            title: '⚠️ พบตัวเลขไม่ตรงกัน',
            text: "แนะนำให้กดปุ่ม SYNC BALANCES เพื่อล้างยอดใหม่ครับ",
            icon: 'warning'
          });
        }
      }
    } finally {
      setIsAuditing(false);
      toast.dismiss("audit");
    }
  };

  if (isLoading) return <DashboardSkeleton />;
  if (!stats) return null;

  const pieData = Object.entries(stats.loanTypeBreakdown).map(([name, value]) => ({
    name,
    value,
  }));

  const totalCapital = stats.totalSharesBalance + stats.totalFundBalance;

	return (
		<div className="space-y-8 animate-[fadeIn_0.5s] pb-20 px-4 md:px-0 flex flex-col">
			{/* --- Premium Bank Header --- */}
			<div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden order-1">
				<div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-20 -mt-20"></div>
				<div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full -ml-20 -mb-20"></div>

				<div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
					<div className="space-y-2">
						<div className="flex items-center gap-3">
							<div className="bg-emerald-500/20 p-2 rounded-xl backdrop-blur-md border border-emerald-500/20">
								<Building2 size={20} className="text-emerald-400" />
							</div>
							<span className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em]">Co-operative Intelligence</span>
						</div>
						<h1 className="text-3xl md:text-4xl font-black tracking-tighter">IKWAH FUND <span className="text-emerald-400">MANAGEMENT</span></h1>
						<p className="text-slate-400 font-medium text-sm">ระบบบริหารจัดการกองทุนอิควะห์และสินเชื่ออิสลาม</p>
					</div>

					<div className="flex flex-col items-end gap-1">
						<span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Fund Capital</span>
						<div className="flex items-baseline gap-2">
							<span className="text-emerald-400 text-sm font-bold">฿</span>
							<span className="text-4xl font-black tracking-tighter">{(totalCapital).toLocaleString()}</span>
						</div>
						<div className="flex gap-2 mt-4">
							<button onClick={handleRunAudit} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black transition-all flex items-center gap-2">
								<ShieldCheck size={14} className="text-emerald-400" /> AUDIT SYSTEM
							</button>
							<button onClick={handleCloseYear} className="px-5 py-2.5 bg-white/5 hover:bg-emerald-500/20 border border-white/10 rounded-2xl text-[10px] font-black transition-all flex items-center gap-2 text-emerald-400">
								<History size={14} /> CLOSE FINANCIAL YEAR
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* --- Mobile Task Management (Top on Mobile only) --- */}
			<div className="md:hidden order-2">
				<TaskManagementBlock stats={stats} />
			</div>

			{/* --- Main Dashboard Stats Grid --- */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 order-3">
				<BankStatCard
					label="สมาชิกกองทุน"
					value={stats.activeMembers}
					sub={`สมาชิกทั้งหมด ${stats.totalMembers} คน`}
					icon={<Users size={24} />}
					color="emerald"
				/>
				<BankStatCard
					label="ยอดหุ้นสะสมรวม"
					value={`฿${stats.totalSharesBalance.toLocaleString()}`}
					sub="เงินฝากของสมาชิกทั้งหมด"
					icon={<Wallet size={24} />}
					color="blue"
				/>
				<BankStatCard
					label="ลูกหนี้เงินกู้คงเหลือ"
					value={`฿${stats.totalLoanOutstanding.toLocaleString()}`}
					sub="ยอดหนี้ที่ยังเรียกเก็บได้"
					icon={<HandCoins size={24} />}
					color="amber"
				/>
			</div>

			{/* --- Charts Section --- */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 order-4">
				<div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
					<div className="flex items-center justify-between mb-10">
						<div className="flex items-center gap-4">
							<div className="bg-slate-100 p-3 rounded-2xl text-slate-600">
								<TrendingUp size={20} />
							</div>
							<div>
								<h2 className="text-lg font-black text-slate-800">Co-op Performance</h2>
								<p className="text-xs text-slate-400 font-bold">สถิติการรับเงินและชำระหนี้ 6 เดือนย้อนหลัง</p>
							</div>
						</div>
					</div>

					<div className="h-[350px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={stats.monthlyData}>
								<defs>
									<linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
										<stop offset="95%" stopColor="#10b981" stopOpacity={0} />
									</linearGradient>
									<linearGradient id="colorLoans" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1} />
										<stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
								<XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} dy={15} />
								<YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} tickFormatter={(v) => `฿${v / 1000}k`} />
								<Tooltip
									contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
								/>
								<Area type="monotone" dataKey="shares" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorShares)" name="รับหุ้นสะสม" />
								<Area type="monotone" dataKey="loans" stroke="#0ea5e9" strokeWidth={4} fillOpacity={1} fill="url(#colorLoans)" name="ชำระหนี้สินเชื่อ" />
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>

				<div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col">
					<div className="flex items-center gap-4 mb-10">
						<div className="bg-slate-100 p-3 rounded-2xl text-slate-600">
							<PieChartIcon size={20} />
						</div>
						<div>
							<h2 className="text-lg font-black text-slate-800">Portfolio Mix</h2>
							<p className="text-xs text-slate-400 font-bold">สัดส่วนประเภทสินเชื่อที่อนุมัติ</p>
						</div>
					</div>

					<div className="flex-1 min-h-[250px] flex items-center justify-center">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={pieData}
									cx="50%"
									cy="50%"
									innerRadius={70}
									outerRadius={100}
									paddingAngle={8}
									dataKey="value"
								>
									{pieData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
									))}
								</Pie>
								<Tooltip />
								<Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }} />
							</PieChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>

			{/* --- Tasks & Activity Section --- */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 order-5">
				<div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
					<div className="flex items-center justify-between mb-8">
						<h2 className="text-lg font-black text-slate-800 flex items-center gap-3">
							<History size={20} className="text-emerald-500" /> รายการล่าสุด
						</h2>
						<Link href="/admin/loans" className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-all">ดูทั้งหมด</Link>
					</div>

					<div className="space-y-4">
						{stats.recentRequests.length === 0 ? (
							<div className="text-center py-10 text-slate-400 font-medium">ไม่พบรายการล่าสุด</div>
						) : (
							stats.recentRequests.map((req) => (
								<div key={req.id} className="flex items-center justify-between p-4 rounded-[1.5rem] bg-slate-50 hover:bg-slate-100 transition-all group">
									<div className="flex items-center gap-4">
										<div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm font-black text-slate-400 text-xs group-hover:scale-110 transition-transform">
											{req.name.charAt(0)}
										</div>
										<div>
											<p className="font-black text-slate-800 text-sm">{req.name}</p>
											<p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{req.type} • {formatDateTime(req.date)}</p>
										</div>
									</div>
									<div className="text-right">
										<p className="font-black text-slate-800 text-sm">฿{req.amount.toLocaleString()}</p>
										<span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${req.status === 'อนุมัติแล้ว' ? 'text-emerald-600 bg-emerald-100' :
											req.status === 'รอตรวจสอบ' ? 'text-amber-600 bg-amber-100' : 'text-slate-400 bg-slate-200'
											}`}>
											{req.status}
										</span>
									</div>
								</div>
							))
						)}
					</div>
				</div>

				<div className="hidden md:block">
					<TaskManagementBlock stats={stats} />
				</div>
			</div>
		</div>
	);
}

function TaskManagementBlock({ stats }: { stats: DashboardStats }) {
	return (
		<div className="bg-slate-900 rounded-[2.5rem] p-8 text-white h-full">
			<h2 className="text-lg font-black mb-8 flex items-center gap-3">
				<Zap size={20} className="text-amber-400" /> Task Management
			</h2>

			<div className="space-y-6">
				<QuickTask label="คำขอกู้รออนุมัติ" count={stats.pendingLoans} href="/admin/loans" color="bg-amber-400" />
				<QuickTask label="สลิปผ่อนหนี้รอตรวจ" count={stats.pendingRepayments} href="/admin/repayments" color="bg-emerald-400" />
				<QuickTask label="สลิปฝากหุ้นรอตรวจ" count={stats.pendingDeposits} href="/admin/deposits" color="bg-sky-400" />
			</div>

			<div className="mt-12 pt-8 border-t border-white/5 space-y-4">
				<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Quick Navigation</p>
				<div className="grid grid-cols-2 gap-3">
					<NavButton label="Members" icon={<Users size={16} />} href="/admin/members" />
					<NavButton label="Shares" icon={<Wallet size={16} />} href="/admin/shares" />
					<NavButton label="Accounting" icon={<HandCoins size={16} />} href="/admin/fund-accounting" />
					<NavButton label="Settings" icon={<Settings2 size={16} />} href="/admin/settings" />
				</div>
			</div>
		</div>
	);
}

function BankStatCard({ label, value, sub, icon, color }: any) {
	const colorStyles: any = {
		emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
		blue: "bg-blue-50 text-blue-600 border-blue-100",
		amber: "bg-amber-50 text-amber-600 border-amber-100",
		indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
	};

	return (
		<div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
			<div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border ${colorStyles[color]} group-hover:scale-110 transition-transform duration-500`}>
				{icon}
			</div>
			<div>
				<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
				<p className="text-2xl font-black text-slate-800 tracking-tighter">{value}</p>
				<p className="text-[10px] font-bold text-slate-400 mt-1">{sub}</p>
			</div>
		</div>
	);
}

function QuickTask({ label, count, href, color }: any) {
	return (
		<Link href={href} className="block group">
			<div className="flex justify-between items-center mb-2">
				<span className="text-[11px] font-black uppercase tracking-wider text-slate-400 group-hover:text-white transition-colors">{label}</span>
				<span className="text-xs font-black">{count} รายการ</span>
			</div>
			<div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
				<div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${Math.min((count / 10) * 100, 100)}%` }}></div>
			</div>
		</Link>
	);
}

function NavButton({ label, icon, href }: any) {
	return (
		<Link href={href} className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex flex-col items-center gap-2 transition-all">
			<div className="text-slate-400">{icon}</div>
			<span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
		</Link>
	);
}
