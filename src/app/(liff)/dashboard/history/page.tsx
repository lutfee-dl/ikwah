"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { gasApi } from "@/services/gasApi";
import { getLiffIdToken } from "@/services/liff";
import { formatDateTime } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  Eye,
  X,
  ChevronDown,
  SearchX,
  Calendar
} from "lucide-react";

type Transaction = {
  type: "deposit" | "repayment";
  typeName: string;
  id: string;
  contractId?: string;
  date: string;
  amount: number;
  status: string;
  itemName?: string; // เพิ่มฟิลด์ชื่อรายการ
  slipUrl?: string;
  note?: string;
};

const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export default function HistoryPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSlip, setSelectedSlip] = useState<string | null>(null);
  const [selectedSlipDate, setSelectedSlipDate] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- Filter States ---
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<"all" | "deposit" | "repayment">("all");
  const [visibleCount, setVisibleCount] = useState(10);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const token = await getLiffIdToken();
      if (!token) {
        setError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
        return;
      }
      const res = await gasApi.getHistory(token);
      if (res.success) {
        setTransactions(res.data || []);
      } else {
        setError(res.msg || "ไม่สามารถดึงข้อมูลได้");
      }
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // --- Filter Logic ---
  const filteredData = useMemo(() => {
    return transactions.filter((item) => {
      const d = new Date(item.date);
      const matchDate = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      const matchType = activeTab === "all" || item.type === activeTab;
      return matchDate && matchType;
    });
  }, [transactions, selectedMonth, selectedYear, activeTab]);

  // Reset visibleCount when filters change
  useEffect(() => {
    setVisibleCount(10);
  }, [selectedMonth, selectedYear, activeTab]);

  const displayedData = useMemo(() => {
    return filteredData.slice(0, visibleCount);
  }, [filteredData, visibleCount]);

  const getStatusStyle = (status: string) => {
    if (status === "อนุมัติแล้ว" || status === "ยืนยันแล้ว") return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (status === "ปฏิเสธ" || status === "ไม่ผ่าน") return "bg-rose-50 text-rose-600 border-rose-100";
    return "bg-slate-100 text-slate-500 border-slate-200";
  };

  const getDriveImageUrl = (url: string) => {
    if (!url) return "";
    const matches = url.match(/[-\w]{25,}/g);
    const fileId = matches ? matches.find(m => !['drive', 'google', 'file', 'view'].includes(m.toLowerCase())) : null;
    return fileId ? `https://docs.google.com/thumbnail?id=${fileId}&sz=w1200` : url;
  };

  return (
    <div className="max-w-md mx-auto animate-[fadeIn_0.3s] pb-24">
      {/* Sticky Header & Filters */}
      <div className="backdrop-blur-md sticky top-0 z-30 mb-4 bg-slate-50/80 -mx-5 px-5 py-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">ประวัติการทำรายการ</h1>
          </div>

          {/* Filters Grid */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full bg-slate-100 border-none rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full bg-slate-100 border-none rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                >
                  {[0, 1, 2, 3].map((i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year}>{year + 543}</option>;
                  })}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
              {[
                { id: "all", label: "ทั้งหมด" },
                { id: "deposit", label: "ฝากหุ้น" },
                { id: "repayment", label: "ชำระเงิน" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === tab.id
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List Area */}
      <div className="mt-2">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm font-bold">กำลังโหลดข้อมูล...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-100">
            <SearchX size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm font-bold">ไม่พบประวัติในเดือนนี้</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedData.map((item, idx) => (
              <div
                key={idx}
                className="w-full bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom duration-300"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="p-4">
                  {/* Top Section: Icon and Title */}
                  <div className="flex gap-3 items-start">
                    <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border transition-colors 
                      ${item.type === "deposit" ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" : "bg-blue-50 text-blue-600 border-blue-100/50"}`}>
                      {item.type === "deposit" ? <ArrowUpRight size={20} strokeWidth={2.5} /> : <ArrowDownLeft size={20} strokeWidth={2.5} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <h3 className="text-[14px] font-extrabold text-slate-800 truncate leading-tight">
                            {item.type === "deposit" ? "ฝากหุ้นสะสม" : "ชำระสินเชื่อ"}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            {item.type === "deposit" && item.typeName && (
                              <p className="text-[10px] text-slate-500 font-bold">{item.typeName}</p>
                            )}
                            {item.type === "repayment" && (
                              <p className="text-[10px] text-slate-500 font-bold truncate max-w-[120px]">
                                {item.itemName || "ชำระทั่วไป"}
                              </p>
                            )}
                            {item.contractId && (
                              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">{item.contractId}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[16px] font-black block leading-none ${item.type === "deposit" ? "text-emerald-600" : "text-blue-700"}`}>
                            {item.type === "deposit" ? "+" : ""}{(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold mt-1.5 block">ID: {item.id}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Section: Status and Date */}
                  <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex h-1.5 w-1.5">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 
                            ${item.status === "อนุมัติแล้ว" || item.status === "ยืนยันแล้ว" ? "bg-emerald-400" : "bg-amber-400"}`}></span>
                          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 
                            ${item.status === "อนุมัติแล้ว" || item.status === "ยืนยันแล้ว" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 leading-none">
                          {item.status === "อนุมัติแล้ว" || item.status === "ยืนยันแล้ว" ? "ทำรายการสำเร็จ" : item.status}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium mt-1.5">
                        {formatDateTime(item.date)}
                      </span>
                    </div>

                    {item.slipUrl && (
                      <button
                        onClick={() => { setSelectedSlip(item.slipUrl!); setSelectedSlipDate(item.date); setIsModalOpen(true); }}
                        className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors border border-blue-100/30 active:scale-95"
                      >
                        <Eye size={12} strokeWidth={2.5} />
                        ดูหลักฐาน
                      </button>
                    )}
                  </div>

                  {/* Bottom Section: Note */}
                  {item.note && (
                    <div className="mt-2.5 bg-slate-50/50 rounded-lg p-2 border border-slate-100/30">
                      <p className="text-[10px] text-slate-500 leading-tight">
                        <span className="text-slate-400 font-bold uppercase text-[9px]">Note:</span>
                        {" "}{item.note}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredData.length > visibleCount && (
              <button
                onClick={() => setVisibleCount(prev => prev + 10)}
                className="w-full py-4 text-[13px] font-bold text-blue-600 bg-slate-50/30 hover:bg-slate-50 border-t border-slate-50 flex items-center justify-center gap-2 transition-all active:bg-slate-100"
              >
                ดูเพิ่มเติม ({filteredData.length - visibleCount} รายการ)
                <ChevronDown size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Slip Modal - Full Screen Mobile Ready */}
      {isModalOpen && selectedSlip && (
        <div className="fixed inset-0 z-[999] flex flex-col bg-black/95 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-black/20 backdrop-blur-md border-b border-white/10">
            <div>
              <h3 className="text-white font-black text-sm uppercase tracking-widest">หลักฐานการชำระเงิน</h3>
              <p className="text-white/40 text-[10px] font-medium tracking-tight">ยืนยันรายการเมื่อ {formatDateTime(selectedSlipDate)}</p>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors active:scale-90"
            >
              <X size={24} />
            </button>
          </div>

          {/* Image Container */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden" onClick={() => setIsModalOpen(false)}>
            <div className="relative w-full h-full max-w-lg max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
              <Image
                src={getDriveImageUrl(selectedSlip)}
                alt="slip"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Footer Info */}
          <div className="px-8 py-6 bg-gradient-to-t from-black/50 to-transparent text-center">
            <p className="text-white/30 text-[10px] font-bold italic">
              * แตะที่รูปภาพเพื่อบันทึก หรือกดกากบาทเพื่อปิด
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
