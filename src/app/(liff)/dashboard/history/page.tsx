"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { gasApi } from "@/services/gasApi";
import { getLiffIdToken } from "@/services/liff";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  ChevronDown,
  SearchX,
  CalendarDays
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

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
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            {displayedData.map((item, idx) => (
              <div
                key={idx}
                className="group relative border-b border-slate-50 last:border-0 active:bg-slate-50 transition-colors"
              >
                <div className="p-4 flex gap-4">
                  {/* Icon Wrapper */}
                  <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${item.type === "deposit" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                    }`}>
                    {item.type === "deposit" ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                  </div>

                  {/* Info Area */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-slate-800 text-[14px] truncate pr-2">
                        {item.type === "deposit" 
                          ? (item.typeName || "ฝากหุ้นสะสม") 
                          : (item.itemName ? `ชำระ: ${item.itemName}` : "ชำระสินเชื่อ/งวด")}
                      </h3>
                      <p className={`font-black text-[15px] ${item.type === "deposit" ? "text-emerald-600" : "text-blue-700"
                        }`}>
                        {item.type === "deposit" ? "+" : ""}{(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <CalendarDays size={12} />
                        {formatDate(item.date)}
                      </div>
                      <div className="text-[11px] text-slate-300 font-medium">•</div>
                      <div className="text-[11px] text-slate-400 font-medium truncate max-w-[120px]">
                        ID: {item.id}
                      </div>
                      {item.contractId && (
                        <>
                          <div className="text-[11px] text-slate-300 font-medium">•</div>
                          <div className="text-[11px] text-blue-500 font-bold">
                            {item.contractId}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Status and Actions */}
                    <div className="flex items-center justify-between">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusStyle(item.status)}`}>
                        {item.status === "อนุมัติแล้ว" || item.status === "ยืนยันแล้ว" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        {item.status}
                      </div>

                      {item.slipUrl && (
                        <button
                          onClick={() => { setSelectedSlip(item.slipUrl!); setIsModalOpen(true); }}
                          className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                        >
                          <Eye size={12} />
                          ดูหลักฐาน
                        </button>
                      )}
                    </div>

                    {/* Note section */}
                    {item.note && (
                      <div className="mt-2 pt-2 border-t border-slate-50">
                        <p className="text-[10px] text-slate-400 leading-relaxed italic">
                          หมายเหตุ: {item.note}
                        </p>
                      </div>
                    )}
                  </div>
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

      {/* Slip Modal */}
      {isModalOpen && selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="relative bg-white p-1.5 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-3 -right-3 bg-white text-slate-900 w-8 h-8 rounded-full shadow-lg flex items-center justify-center z-10"
            >
              <X size={18} />
            </button>
            <div className="overflow-hidden rounded-xl bg-slate-50">
              <Image
                src={getDriveImageUrl(selectedSlip)}
                alt="slip"
                width={400}
                height={600}
                className="w-full h-auto object-contain max-h-[75vh]"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
