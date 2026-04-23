"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, Phone, CalendarDays, PieChart, Printer,
  TrendingUp, RefreshCw, ShieldCheck, X, Edit3, ArrowLeft,
  Users
} from "lucide-react";
import { formatCurrency as fmt } from "@/lib/utils";
import { ShareRow, HistoricalForm, thaiMonths } from "../page";
import HistoricalEditModal from "../HistoricalEditModal";
import ShareDetailSkeleton from "./ShareDetailSkeleton";
import { toast } from "react-hot-toast";

const API_URL = "/api/member";

export default function ShareDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const autoEdit = searchParams.get("edit") === "true";

  const [member, setMember] = useState<ShareRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());

  // Historical Edit States
  const [editingHistorical, setEditingHistorical] = useState(false);

  useEffect(() => {
    if (autoEdit) setEditingHistorical(true);
  }, [autoEdit]);
  const [histForm, setHistForm] = useState<HistoricalForm>({});
  const [savingHist, setSavingHist] = useState(false);

  useEffect(() => {
    fetchMemberData();
  }, [id, fiscalYear]);

  const fetchMemberData = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_get_shares_report",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          options: { year: fiscalYear }
        }),
      });
      const result = await res.json();
      if (result.success) {
        const found = (result.data as ShareRow[]).find(m => m.ID_No === id);
        if (found) {
          setMember(found);

          // Prepare historical form
          const yearColumns = Object.keys(found).filter(k => k.startsWith("ปี")).sort();
          // We need the mapping for historical years. 
          // In page.tsx it was dynamicThaiYears. Let's assume the keys are consistent.
          const hist: HistoricalForm = {};
          yearColumns.forEach(y => {
            // Extract the year number from "ปี65" -> "2565"
            const yearNum = "25" + y.slice(-2);
            hist[yearNum] = Number(found[y]) || 0;
          });
          setHistForm(hist);
        } else {
          setMember(null);
        }
      }
    } catch (err) {
      console.error("Fetch Member Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHistorical = async () => {
    if (!member) return;

    setSavingHist(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_update_historical_shares",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          payload: { memberId: member.ID_No, years: histForm }
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("บันทึกข้อมูลเรียบร้อยแล้ว");
        setEditingHistorical(false);
        fetchMemberData();
      } else {
        toast.error(result.msg || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (err) {
      console.error("Save Historical Error:", err);
      toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setSavingHist(false);
    }
  };

  const yearColumns = useMemo(() => {
    if (!member) return [];
    return Object.keys(member).filter(k => k.startsWith("ปี")).sort();
  }, [member]);

  const historicalTotal = useMemo(() => {
    if (!member) return 0;
    return yearColumns.reduce((sum, col) => sum + (Number(member[col]) || 0), 0);
  }, [member, yearColumns]);

  const currentYearTotal = useMemo(() => {
    if (!member) return 0;
    return thaiMonths.reduce((sum, mon) => sum + (Number(member[mon]) || 0), 0);
  }, [member]);

  const currentThaiYearShort = useMemo(() => "ปี" + String(fiscalYear + 543).slice(-2), [fiscalYear]);

  const displayYearColumns = useMemo(() => {
    const years = [...yearColumns];
    if (!years.includes(currentThaiYearShort)) {
      years.push(currentThaiYearShort);
    }
    return years.sort();
  }, [yearColumns, currentThaiYearShort]);

  if (loading && !member) {
    return <ShareDetailSkeleton />;
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
          <Users size={40} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-slate-800">ไม่พบข้อมูลสมาชิก</h2>
          <p className="text-slate-500 mt-1">รหัสสมาชิก {id} อาจไม่มีอยู่ในระบบ</p>
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
        >
          <ArrowLeft size={18} /> กลับไปหน้าหลัก
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">รายละเอียดบัญชีหุ้นสะสม</h1>
            <p className="text-sm text-slate-500 font-medium">จัดการข้อมูลและประวัติการถือหุ้นรายบุคคล</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button onClick={() => setFiscalYear(v => v - 1)} className="p-2.5 hover:bg-slate-50 text-slate-500 border-r border-slate-200"><ChevronLeft size={15} /></button>
            <span className="px-4 text-[13px] font-black text-slate-700">พ.ศ. {fiscalYear + 543}</span>
            <button onClick={() => setFiscalYear(v => v + 1)} className="p-2.5 hover:bg-slate-50 text-slate-500 border-l border-slate-200"><ChevronLeft size={15} /></button>
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[13px] font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
            <Printer size={16} /> พิมพ์รายงาน
          </button>
        </div>
      </div>

      {/* ── Member Profile Card ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 relative overflow-hidden px-8 py-8">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_#3b82f6,_transparent_60%)]" />
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            {member.pictureUrl ? (
              <img src={String(member.pictureUrl)} className="w-24 h-24 rounded-3xl border-4 border-white/10 object-cover shadow-2xl" />
            ) : (
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white font-black text-4xl shadow-2xl">
                {String(member["ชื่อ"] || "").charAt(0)}
              </div>
            )}
            <div className="text-center md:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">รหัสสมาชิก: {member.ID_No}</span>
                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${member.สถานะ === "เป็นสมาชิก" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                  {member.สถานะ || "ไม่ทราบสถานะ"}
                </span>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">{member["ชื่อ"]}</h2>
              <p className="text-blue-300 font-bold mt-1 flex items-center justify-center md:justify-start gap-2">
                <Phone size={14} /> {member.Phone || "ไม่มีข้อมูลเบอร์โทรศัพท์"}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl text-right">
              <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] mb-1">ยอดเงินคงเหลือสุทธิ</p>
              <p className="text-4xl font-black text-white tracking-tighter tabular-nums">฿ {fmt(member.รวมเงินคงเหลือ)}</p>
            </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Monthly Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 font-black text-slate-800">
                <CalendarDays size={18} className="text-blue-600" /> ยอดฝากรายเดือนประจำปี {fiscalYear + 543}
              </h4>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Monthly Statement</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {thaiMonths.map((m) => {
                const val = Number(member[m]) || 0;
                return (
                  <div key={m} className={`p-4 rounded-2xl border transition-all ${val > 0 ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60"}`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{m}</p>
                    <p className={`text-lg font-black tabular-nums ${val > 0 ? "text-slate-900" : "text-slate-300"}`}>
                      {val > 0 ? fmt(val) : "—"}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Total Monthly Summary */}
            <div className="mt-6 p-6 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">รวมเงินฝากปี {fiscalYear + 543}</p>
                <p className="text-3xl font-black text-slate-900 tabular-nums">฿ {fmt(currentYearTotal)}</p>
              </div>
            </div>
          </div>

          {/* Side Info & Historical */}
          <div className="space-y-8">
            {/* Total Summary */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-4">
              <h4 className="flex items-center gap-2 font-black text-slate-800 text-sm">
                <PieChart size={16} className="text-amber-600" /> สรุปยอดสะสม
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-end pb-3 border-b border-slate-200 border-dashed">
                  <p className="text-xs font-bold text-slate-500">ยอดยกมา (ปีก่อนๆ)</p>
                  <p className="font-black text-amber-700">฿ {fmt(historicalTotal)}</p>
                </div>
                <div className="flex justify-between items-end pb-3 border-b border-slate-200 border-dashed">
                  <p className="text-xs font-bold text-slate-500">ยอดฝากปีปัจจุบัน</p>
                  <p className="font-black text-blue-700">฿ {fmt(currentYearTotal)}</p>
                </div>
                {Number(member.ถอนเงิน) > 0 && (
                  <div className="flex justify-between items-end pb-3 border-b border-slate-200 border-dashed">
                    <p className="text-xs font-bold text-slate-500">ยอดถอนเงิน</p>
                    <p className="font-black text-rose-600">- ฿ {fmt(member.ถอนเงิน)}</p>
                  </div>
                )}
                <div className="pt-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ยอดรวมสุทธิทั้งสิ้น</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">฿ {fmt(historicalTotal + currentYearTotal - (Number(member.ถอนเงิน) || 0))}</p>
                </div>
              </div>
            </div>

            {/* Historical Years List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 font-black text-slate-800 text-sm">
                  <TrendingUp size={16} className="text-amber-600" /> ประวัติยอดยกมา
                </h4>
                <button
                  onClick={() => setEditingHistorical(true)}
                  className="flex items-center gap-1 text-[11px] font-black text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg transition-all"
                >
                  <Edit3 size={12} /> แก้ไข
                </button>
              </div>
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-2 px-4 text-[10px] font-black text-slate-400 uppercase">ปีงบประมาณ</th>
                      <th className="text-right py-2 px-4 text-[10px] font-black text-slate-400 uppercase">สะสม (฿)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {displayYearColumns.map(y => {
                      const isCurrent = y === currentThaiYearShort;
                      const val = isCurrent ? currentYearTotal : (Number(member[y]) || 0);
                      return (
                        <tr key={y} className={val > 0 ? (isCurrent ? "bg-blue-50/30" : "bg-white") : "bg-slate-50/30 opacity-60"}>
                          <td className="py-2.5 px-4 font-bold text-slate-500 text-xs">
                            {y} {isCurrent && <span className="ml-1 text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full uppercase">Current</span>}
                          </td>
                          <td className={`py-2.5 px-4 text-right font-black tabular-nums ${isCurrent ? "text-blue-700" : "text-amber-700"}`}>
                            {val > 0 ? fmt(val) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingHistorical && (
        <HistoricalEditModal
          member={member}
          histForm={histForm}
          saving={savingHist}
          onSave={handleSaveHistorical}
          onFormChange={setHistForm}
          onClose={() => setEditingHistorical(false)}
        />
      )}

      <style jsx global>{`
        .tabular-nums { font-variant-numeric: tabular-nums; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
