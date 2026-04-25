"use client";

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  ListFilter,
  FileDown,
  Printer,
  RotateCcw,
  Activity,
  Layers,
  Wallet,
  ArrowRightLeft,
  Info,
  Calendar,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BookOpen,
  PlusCircle,
  History,
  Tag,
  Clock
} from "lucide-react";
import FundTransactionModal from "./FundTransactionModal";
import { formatDate } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Line, ComposedChart, Legend, Cell
} from 'recharts';

type FundFlowRow = {
  month: string;
  monthIdx: number;
  savings: number;
  debtRepayment: number;
  totalIncome: number;
  expenses: number;
  balance: number;
  carryForward: number;
};

export default function FundAccountingPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<FundFlowRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  useEffect(() => {
    fetchFundFlow();
    fetchTransactions();
  }, [selectedYear]);

  const fetchTransactions = async () => {
    setIsLoadingTx(true);
    try {
      const response = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_get_fund_transactions",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          year: selectedYear.toString()
        }),
      });
      const result = await response.json();
      if (result.success) {
        setTransactions(result.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTx(false);
    }
  };

  const fetchFundFlow = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_get_fund_flow",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          year: selectedYear.toString()
        }),
      });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.msg || "โหลดข้อมูลไม่สำเร็จ");
      }
    } catch (e) {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (monthIdx: number, field: string, value: number) => {
    const newData = [...data];
    const row = newData[monthIdx];
    (row as any)[field] = value;
    
    row.totalIncome = row.savings + row.debtRepayment;
    row.balance = row.totalIncome - row.expenses;
    
    setData(newData);

    try {
      const response = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_update_fund_flow",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          year: selectedYear.toString(),
          monthIdx,
          field,
          value
        }),
      });
      const result = await response.json();
      if (!result.success) {
        toast.error("บันทึกไม่สำเร็จ");
      }
    } catch (e) {
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  const stats = useMemo(() => {
    const totalSavings = data.reduce((sum, d) => sum + d.savings, 0);
    const totalRepayment = data.reduce((sum, d) => sum + d.debtRepayment, 0);
    const totalIncome = data.reduce((sum, d) => sum + d.totalIncome, 0);
    const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);
    const netBalance = totalIncome - totalExpenses;

    const carryForward = selectedYear === 2023 ? 260497 : 0;
    const totalBalance = netBalance + carryForward;

    return {
      totalSavings,
      totalRepayment,
      totalIncome,
      totalExpenses,
      netBalance,
      carryForward,
      totalBalance
    };
  }, [data, selectedYear]);

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
            <button 
              onClick={() => setIsAddingTransaction(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-black shadow-lg shadow-blue-200 transition-all"
            >
              <PlusCircle size={16} /> บันทึกรายการละเอียด
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
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" name="รายรับ" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20} />
                  <Line type="monotone" dataKey="expense" name="รายจ่าย" stroke="#e11d48" strokeWidth={2} dot={{r: 3, fill: '#e11d48'}} />
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
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
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
                <th className="py-4 px-6 text-left border-r border-slate-700 print:border-black">เดือน (Month)</th>
                <th className="py-4 px-4 text-right border-r border-slate-700 print:border-black">หุ้นสะสม (+)</th>
                <th className="py-4 px-4 text-right border-r border-slate-700 print:border-black">รับชำระหนี้ (+)</th>
                <th className="py-4 px-4 text-right bg-slate-800 border-r border-slate-700 print:bg-white print:border-black">รวมรับ</th>
                <th className="py-4 px-4 text-right border-r border-slate-700 print:border-black">รายจ่าย (-)</th>
                <th className="py-4 px-6 text-right">คงเหลือสุทธิ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-black">
              {isLoading ? (
                <tr><td colSpan={6}><TableSkeleton rows={12} cols={6} hasHeader={false} /></td></tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40 even:bg-slate-50/30 transition-colors group">
                    <td className="py-4 px-6 font-bold text-slate-700 border-r border-slate-50 print:border-black">{row.month}</td>
                    <td className="py-4 px-4 text-right border-r border-slate-50 print:border-black">
                      <EditableValue value={row.savings} onChange={(v) => handleUpdate(idx, "savings", v)} />
                    </td>
                    <td className="py-4 px-4 text-right border-r border-slate-50 print:border-black">
                      <EditableValue value={row.debtRepayment} onChange={(v) => handleUpdate(idx, "debtRepayment", v)} />
                    </td>
                    <td className="py-4 px-4 text-right font-black text-blue-700 bg-blue-50/30 border-r border-slate-50 print:bg-white print:text-black print:border-black">
                      {row.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-right border-r border-slate-50 print:border-black">
                      <EditableValue value={row.expenses} onChange={(v) => handleUpdate(idx, "expenses", v)} color="text-rose-500" />
                    </td>
                    <td className={`py-4 px-6 text-right font-black tabular-nums ${row.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {row.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200 print:border-black print:bg-white">
              <tr className="font-black text-slate-800 text-[12px] uppercase">
                <td className="py-5 px-6 border-r border-slate-100 print:border-black">รวมประจำปี {selectedYear + 543}</td>
                <td className="py-5 px-4 text-right border-r border-slate-100 print:border-black">{stats.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-5 px-4 text-right border-r border-slate-100 print:border-black">{stats.totalRepayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-5 px-4 text-right bg-blue-50/50 text-blue-700 border-r border-slate-100 print:bg-white print:border-black">{stats.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-5 px-4 text-right text-rose-600 border-r border-slate-100 print:border-black">{stats.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="py-5 px-6 text-right text-base text-blue-800">{stats.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              {stats.carryForward > 0 && (
                <tr className="bg-amber-50/50 text-amber-800 font-bold italic">
                  <td colSpan={5} className="py-4 px-6 text-right border-r border-amber-100 text-[11px] uppercase tracking-widest print:border-black">ยอดยกมาจากปี {selectedYear + 542} (Carry Forward)</td>
                  <td className="py-4 px-6 text-right text-lg border-l-2 border-amber-200">{stats.carryForward.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              )}
              <tr className="bg-blue-600 text-white font-black print:bg-white print:text-black print:border-t-2 print:border-black">
                <td colSpan={5} className="py-6 px-6 text-right border-r border-blue-500 text-[11px] uppercase tracking-[0.2em] print:border-black">ยอดคงเหลือสุทธิ (Final Balance)</td>
                <td className="py-6 px-6 text-right text-2xl tracking-tighter">฿ {stats.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Signature Section for Print */}
      <div className="hidden print:grid grid-cols-2 gap-20 mt-32 text-center text-black">
        <div className="space-y-8">
          <div className="border-b-2 border-black w-80 mx-auto" />
          <p className="font-black text-sm">ลงชื่อ...................................................... เหรัญญิก</p>
        </div>
        <div className="space-y-8">
          <div className="border-b-2 border-black w-80 mx-auto" />
          <p className="font-black text-sm">ลงชื่อ...................................................... ประธานกองทุน</p>
        </div>
      </div>

      {/* ── Detailed Transactions Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-800 text-white rounded-xl">
               <History size={18} />
             </div>
             <h3 className="font-black text-slate-800 tracking-tight">สมุดรายวันรับ-จ่าย (ละเอียด)</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
             ปี พ.ศ. {selectedYear + 543}
          </span>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
             <thead>
               <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <th className="py-4 px-6">วันที่ / เวลา</th>
                 <th className="py-4 px-6">ประเภท / หมวดหมู่</th>
                 <th className="py-4 px-6">รายการ</th>
                 <th className="py-4 px-6 text-right">จำนวนเงิน</th>
                 <th className="py-4 px-6 text-center">ผู้บันทึก</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
               {isLoadingTx ? (
                 <tr><td colSpan={5} className="py-8 text-center"><RefreshCw className="animate-spin mx-auto text-slate-300" /></td></tr>
               ) : transactions.length === 0 ? (
                 <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-medium">ยังไม่มีรายการบันทึกแบบละเอียด</td></tr>
               ) : (
                 transactions.map((tx, i) => (
                   <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                     <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white transition-colors">
                            <Clock size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-700">{formatDate(tx.date)}</p>
                            <p className="text-[10px] text-slate-400 font-medium">บันทึกเมื่อ {new Date(tx.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</p>
                          </div>
                        </div>
                     </td>
                     <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <span className={`w-max px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${tx.type === "รายรับ" ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600"}`}>
                            {tx.type}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                            <Tag size={10} /> {tx.category}
                          </div>
                        </div>
                     </td>
                     <td className="py-4 px-6">
                        <p className="font-bold text-slate-800 text-sm">{tx.item}</p>
                        {tx.note && <p className="text-[10px] text-slate-400 font-medium italic mt-0.5">{tx.note}</p>}
                     </td>
                     <td className={`py-4 px-6 text-right font-black text-base tabular-nums ${tx.type === "รายรับ" ? "text-blue-600" : "text-rose-600"}`}>
                        {tx.type === "รายรับ" ? "+" : "-"}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                     </td>
                     <td className="py-4 px-6 text-center">
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                          {tx.recorder || "Admin"}
                        </span>
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>
        </div>
      </div>

      {isAddingTransaction && (
        <FundTransactionModal
          onClose={(wasAdded) => {
            setIsAddingTransaction(false);
            if (wasAdded) {
              fetchTransactions();
              fetchFundFlow(); // Refresh totals too
            }
          }}
        />
      )}

      <style jsx global>{`
        .tabular-nums { font-variant-numeric: tabular-nums; }
      `}</style>
    </div>
  );
}

function EditableValue({ value, onChange, color = "text-slate-900" }: { value: number; onChange: (val: number) => void; color?: string }) {
  const [isEdit, setIsEdit] = useState(false);
  const [temp, setTemp] = useState(value.toString());
  const handleBlur = () => { setIsEdit(false); const num = Number(temp.replace(/,/g, '')); if (!isNaN(num)) onChange(num); else setTemp(value.toString()); };
  if (isEdit) return <input autoFocus className="w-full bg-blue-50 border-2 border-blue-400 rounded-lg px-2 py-1 font-black outline-none shadow-sm text-right" value={temp} onChange={(e) => setTemp(e.target.value)} onBlur={handleBlur} onKeyDown={(e) => e.key === 'Enter' && handleBlur()} />;
  return <div onClick={() => { setTemp(value.toString()); setIsEdit(true); }} className={`cursor-pointer font-bold ${color} px-2 py-1 rounded hover:bg-blue-50 transition-all w-full text-right print:p-0`}>{value === 0 ? <span className="opacity-20">—</span> : value.toLocaleString()}</div>;
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) return (
    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between items-center gap-6">
          <span className="text-[10px] font-bold text-slate-300">{p.name}:</span>
          <span className="text-xs font-black tabular-nums" style={{color: p.color}}>฿ {p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
  return null;
}