"use client";

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Building2,
  CheckCircle2,
  RefreshCw,
  Edit,
  X,
  Wallet,
  ArrowRightLeft,
  Printer
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { gasApi } from "@/services/gasApi";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Bar, Line, ComposedChart, Legend, Cell
} from 'recharts';

type FundFlowRow = {
  month: string;
  monthIdx: number;
  savings: number;
  debtRepayment: number;
  otherIncome: number;
  totalIncome: number;
  expenses: number;
  balance: number;
  carryForward: number;
};

export default function FundAccountingPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<FundFlowRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRow, setEditingRow] = useState<FundFlowRow | null>(null);
  const [adminName, setAdminName] = useState<string>("ADMIN");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Try getting name from Firestore first
        try {
          const adminDoc = await getDoc(doc(db, "system_admins", user.uid));
          if (adminDoc.exists() && adminDoc.data().displayName) {
            setAdminName(adminDoc.data().displayName);
          } else {
            setAdminName(user.displayName || user.email?.split('@')[0] || "ADMIN");
          }
        } catch (e) {
          setAdminName(user.displayName || user.email?.split('@')[0] || "ADMIN");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchFundFlow();
  }, [selectedYear]);

  const fetchFundFlow = async () => {
    setIsLoading(true);
    try {
      const result = await gasApi.getFundFlow(selectedYear.toString());
      if (result.success) {
        setData(result.data || []);
      } else {
        toast.error(result.msg || "โหลดข้อมูลไม่สำเร็จ");
      }
    } catch (e) {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowUpdate = async (updatedRow: FundFlowRow) => {
    const confirmResult = await Swal.fire({
      title: 'ยืนยันการบันทึก?',
      text: `คุณต้องการบันทึกข้อมูลเดือน ${updatedRow.month} ใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ใช่, บันทึกเลย',
      cancelButtonText: 'ยกเลิก'
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const result = await gasApi.updateFundRow({
        year: selectedYear.toString(),
        monthIdx: updatedRow.monthIdx,
        savings: updatedRow.savings,
        debtRepayment: updatedRow.debtRepayment,
        otherIncome: updatedRow.otherIncome,
        expenses: updatedRow.expenses,
        carryForward: updatedRow.carryForward,
        adminName: adminName
      });

      if (result.success) {
        toast.success(`อัปเดตข้อมูลเดือน ${updatedRow.month} สำเร็จ`);
        await fetchFundFlow();
      } else {
        toast.error(result.msg || "บันทึกไม่สำเร็จ");
      }
    } catch (e) {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const stats = useMemo(() => {
    const totalSavings = data.reduce((sum, d) => sum + (Number(d.savings) || 0), 0);
    const totalRepayment = data.reduce((sum, d) => sum + (Number(d.debtRepayment) || 0), 0);
    const totalOther = data.reduce((sum, d) => sum + (Number(d.otherIncome) || 0), 0);
    const totalIncome = data.reduce((sum, d) => sum + (Number(d.totalIncome) || 0), 0);
    const totalExpenses = data.reduce((sum, d) => sum + (Number(d.expenses) || 0), 0);
    const netBalance = totalIncome - totalExpenses;

    // ยอดยกมาของปีนั้นๆ (อิงจากแถวมกราคม)
    const carryForward = Number(data[0]?.carryForward) || 0;
    const totalBalance = netBalance + carryForward;

    return {
      totalSavings,
      totalRepayment,
      totalOther,
      totalIncome,
      totalExpenses,
      netBalance,
      carryForward,
      totalBalance
    };
  }, [data]);

  const chartData = useMemo(() => {
    let runningBalance = stats.carryForward;
    return data.map(d => {
      runningBalance += d.balance;
      return {
        name: d.month,
        income: d.totalIncome,
        expense: d.expenses,
        balance: d.balance,
        cumulative: runningBalance
      };
    });
  }, [data, stats.carryForward]);

  const years = useMemo(() => {
    const startYear = 2022; // 2565
    const currentYear = new Date().getFullYear();
    const count = Math.max(currentYear - startYear + 2, 4);
    return Array.from({ length: count }, (_, i) => startYear + i);
  }, []);

  return (
    <div className="space-y-6 font-sans pb-10 animate-in fade-in duration-500">

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "เงินค่าหุ้น/สะสม", value: `฿ ${stats.totalSavings.toLocaleString()}`, sub: "Total Shares", icon: Wallet, accent: "blue" },
          { label: "รับชำระคืนเงินกู้", value: `฿ ${stats.totalRepayment.toLocaleString()}`, sub: "Loan Repayment", icon: ArrowRightLeft, accent: "emerald" },
          { label: "จ่ายเงินกู้/รายจ่าย", value: `฿ ${stats.totalExpenses.toLocaleString()}`, sub: "Expenses", icon: TrendingDown, accent: "rose" },
          { label: "ยอดคงเหลือสุทธิ", value: `฿ ${stats.totalBalance.toLocaleString()}`, sub: "Available Fund", icon: DollarSign, accent: "amber" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 
              ${kpi.accent === "blue" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : kpi.accent === "emerald" ? "bg-emerald-50 text-emerald-600"
                  : kpi.accent === "rose" ? "bg-rose-50 text-rose-600"
                    : "bg-amber-50 text-amber-600"}`}>
              <kpi.icon size={21} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
              <p className="text-xl font-black text-slate-900 tracking-tight mt-1">{kpi.value}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Content Container ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* ── Toolbar ── */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col xl:flex-row items-start xl:items-center gap-4 justify-between bg-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <Building2 size={20} />
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">บัญชีรับ-จ่าย กองทุนหมู่บ้าน</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 group">
              <Calendar className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent font-black text-slate-700 outline-none px-3 py-2.5 cursor-pointer text-sm"
              >
                {years.map(y => (
                  <option key={y} value={y}>ปี พ.ศ. {y + 543}</option>
                ))}
              </select>
            </div>

            <button onClick={fetchFundFlow} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-blue-600 shadow-sm transition-all">
              <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-blue-200 text-[11px] font-black shadow-sm transition-all">
              <Printer size={14} /> พิมพ์รายงาน
            </button>
          </div>
        </div>

        {/* ── Charts Section ── */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Financial In/Out Trend</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" name="รายรับ" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20} />
                  <Line type="monotone" dataKey="expense" name="รายจ่าย" stroke="#e11d48" strokeWidth={2} dot={{ r: 3, fill: '#e11d48' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Cumulative Fund Balance</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="cumulative" name="เงินกองทุน" stroke="#2563eb" strokeWidth={3} fill="url(#colorBal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Table Area ── */}
        <div className="overflow-x-auto relative">
          <table className="w-full text-sm border-collapse table-auto whitespace-nowrap">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest print:bg-white print:text-black print:border-b-2 print:border-black">
                <th className="py-4 px-6 text-left border-r border-slate-700 print:border-black">เดือน</th>
                <th className="py-4 px-4 text-right border-r border-slate-700 print:border-black">รายรับเงินสะสม</th>
                <th className="py-4 px-4 text-right border-r border-slate-700 print:border-black">รับจากชำระหนี้</th>
                <th className="py-4 px-4 text-right border-r border-slate-700 print:border-black opacity-30">รายรับอื่นๆ</th>
                <th className="py-4 px-4 text-right bg-blue-900 border-r border-slate-700 print:bg-white print:border-black text-blue-300">รวมรับ</th>
                <th className="py-4 px-4 text-right border-r border-slate-700 print:border-black text-rose-300">รายจ่าย</th>
                <th className="py-4 px-4 text-right border-r border-slate-700 print:border-black">คงเหลือ</th>
                <th className="py-4 px-4 text-center print:hidden w-16">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-black">
              {isLoading ? (
                <tr><td colSpan={7}><TableSkeleton rows={12} cols={7} hasHeader={false} /></td></tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40 even:bg-slate-50/30 transition-colors group">
                    <td className="py-4 px-6 font-bold text-slate-700 border-r border-slate-50 print:border-black">{row.month}</td>
                    <td className="py-4 px-4 text-right border-r border-slate-50 font-medium text-slate-600 print:border-black">
                      {(row.savings || 0) === 0 ? "—" : row.savings.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right border-r border-slate-50 font-medium text-slate-600 print:border-black">
                      {(row.debtRepayment || 0) === 0 ? "—" : row.debtRepayment.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right border-r border-slate-50 font-medium text-slate-600 print:border-black">
                      {(row.otherIncome || 0) === 0 ? "—" : row.otherIncome.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right font-black text-blue-700 bg-blue-50/30 border-r border-slate-50 print:bg-white print:text-black print:border-black">
                      {(row.totalIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-right border-r border-slate-50 font-medium text-rose-500 print:border-black">
                      {(row.expenses || 0) === 0 ? "—" : row.expenses.toLocaleString()}
                    </td>
                    <td className={`py-4 px-4 text-right font-black tabular-nums border-r border-slate-50 ${(row.balance || 0) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {(row.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-center print:hidden">
                      <button
                        onClick={() => setEditingRow(row)}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm group/btn"
                      >
                        <Edit size={14} className="group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200 print:border-black print:bg-white">
              <tr className="font-black text-slate-800 text-sm uppercase">
                <td className="py-5 px-6 border-r border-slate-100 print:border-black">รวมประจำปี {selectedYear + 543}</td>
                <td className="py-5 px-4 text-right border-r border-slate-100 print:border-black">{stats.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-5 px-4 text-right border-r border-slate-100 print:border-black">{stats.totalRepayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-5 px-4 text-right border-r border-slate-100 print:border-black opacity-30 font-medium">{stats.totalOther.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-5 px-4 text-right bg-blue-50/50 text-blue-700 border-r border-slate-100 print:bg-white print:border-black">{stats.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-5 px-4 text-right text-rose-600 border-r border-slate-100 print:border-black">{stats.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td colSpan={2} className={`py-5 px-4 text-right text-base border-r border-slate-100 ${stats.netBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {stats.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="bg-amber-50/40 text-amber-800 font-bold italic">
                <td colSpan={6} className="py-4 px-6 text-right border-r border-amber-100 text-xs uppercase tracking-widest print:border-black">
                  ยอดยกมาจากปี {selectedYear + 542}
                </td>
                <td colSpan={2} className="py-4 px-4 text-right text-lg border-r border-amber-200 text-amber-700 font-black tabular-nums">
                  {stats.carryForward.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="bg-blue-600 text-white font-black print:bg-white print:text-black print:border-t-2 print:border-black">
                <td colSpan={6} className="py-6 px-6 text-right border-r border-blue-500/30 uppercase tracking-[0.2em] text-sm print:border-black">รวมยอดคงเหลือ</td>
                <td colSpan={2} className="py-6 px-4 text-right text-3xl tracking-tighter border-r border-blue-500 shadow-inner">
                  <span className="text-blue-200 mr-2 text-xl font-medium">฿</span>
                  {stats.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {editingRow && (
        <MonthlyEditModal
          row={editingRow}
          year={selectedYear}
          onClose={(updated) => {
            if (updated) handleRowUpdate(updated);
            setEditingRow(null);
          }}
        />
      )}


      <style jsx global>{`
        .tabular-nums { font-variant-numeric: tabular-nums; }
      `}</style>
    </div>
  );
}

function MonthlyEditModal({ row, year, onClose }: { row: FundFlowRow; year: number; onClose: (updated?: FundFlowRow) => void }) {
  const [formData, setFormData] = useState({ ...row });
  const [isSaving, setIsSaving] = useState(false);

  const totalIn = (Number(formData.savings) || 0) + (Number(formData.debtRepayment) || 0) + (Number(formData.otherIncome) || 0);
  const bal = totalIn - (Number(formData.expenses) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // ส่งข้อมูลที่อัปเดตแล้วกลับไป
    await onClose({ ...formData, totalIncome: totalIn, balance: bal });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-7 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">จัดการบัญชีเดือน {row.month}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase mt-0.5 tracking-widest">ปี พ.ศ. {year + 543}</p>
            </div>
          </div>
          <button onClick={() => onClose()} className="cursor-pointer p-2 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-5">
            {[
              { label: "ยอดหุ้นสะสม (+)", field: "savings", color: "blue", icon: Wallet },
              { label: "รับชำระหนี้ (+)", field: "debtRepayment", color: "emerald", icon: ArrowRightLeft },
              { label: "รายรับอื่นๆ (+)", field: "otherIncome", color: "blue", icon: TrendingUp },
              { label: "รายจ่ายเดือนนี้ (-)", field: "expenses", color: "rose", icon: TrendingDown },
            ].map((input) => (
              <div key={input.field} className="col-span-2 md:col-span-1">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-widest mb-2.5 flex items-center gap-2">
                  <input.icon size={12} /> {input.label}
                </label>
                <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl focus-within:border-blue-400 transition-all overflow-hidden">
                  <span className="pl-4 text-slate-400 font-bold text-sm">฿</span>
                  <input
                    type="number"
                    step="any"
                    className="w-full bg-transparent px-3 py-4 outline-none font-black text-slate-700 text-sm tabular-nums"
                    value={(formData as any)[input.field] || ""}
                    onChange={(e) => setFormData({ ...formData, [input.field]: Number(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-slate-500 tracking-tight">สรุปยอดที่บันทึก</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${bal < 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {bal < 0 ? 'Monthly Deficit' : 'Monthly Surplus'}
              </span>
            </div>

            {/* Income & Expense Grid */}
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">รวมรายรับ</p>
                <p className="text-xl font-semibold text-slate-800">฿{totalIn.toLocaleString()}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">รวมรายจ่าย</p>
                <p className="text-xl font-semibold text-red-500">฿{formData.expenses?.toLocaleString()}</p>
              </div>
            </div>

            {/* Total Balance Section */}
            <div className="pt-5 border-t border-slate-100 flex justify-between items-end">
              <p className="text-sm text-slate-500 pb-1">ยอดคงเหลือเดือนนี้</p>
              <p className={`text-3xl font-bold tracking-tight ${bal < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                ฿{bal.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => onClose()}
              className="cursor-pointer flex-[1] py-4 rounded-2xl border border-slate-200 text-slate-500 font-black text-sm hover:bg-slate-50 transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="cursor-pointer flex-[2] py-4 rounded-2xl bg-blue-600 text-white font-black text-sm shadow-xl hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {isSaving ? "บันทึก..." : "ยืนยันและบันทึกข้อมูล"}
            </button>
          </div>
        </form>
      </div>
    </div>

  );
}

function EditableValue({ value, onChange, color = "text-slate-900" }: { value: number; onChange: (val: number) => void; color?: string }) {
  const [isEdit, setIsEdit] = useState(false);
  const safeValue = value ?? 0; // ป้องกัน Undefined/Null
  const [temp, setTemp] = useState(safeValue.toString());

  const handleBlur = () => {
    setIsEdit(false);
    const num = Number(temp.replace(/,/g, ''));
    if (!isNaN(num)) onChange(num);
    else setTemp(safeValue.toString());
  };

  if (isEdit) return (
    <input
      autoFocus
      className="w-full bg-blue-50 border-2 border-blue-400 rounded-lg px-2 py-1 font-black outline-none shadow-sm text-right"
      value={temp}
      onChange={(e) => setTemp(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
    />
  );

  return (
    <div
      onClick={() => { setTemp(safeValue.toString()); setIsEdit(true); }}
      className={`cursor-pointer font-bold ${color} px-2 py-1 rounded hover:bg-blue-50 transition-all w-full text-right print:p-0`}
    >
      {safeValue === 0 ? <span className="opacity-20">—</span> : safeValue.toLocaleString()}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) return (
    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between items-center gap-6">
          <span className="text-[10px] font-bold text-slate-300">{p.name}:</span>
          <span className="text-xs font-black tabular-nums" style={{ color: p.color }}>฿ {(Number(p.value) || 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
  return null;
}