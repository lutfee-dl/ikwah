"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { gasApi } from "@/services/gasApi";
import { getLiffIdToken } from "@/services/liff";
import { 
  ArrowLeft, 
  History as HistoryIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Eye,
  Wallet
} from "lucide-react";

type Transaction = {
  type: "deposit" | "repayment";
  id: string;
  contractId?: string;
  date: string;
  amount: number;
  status: string;
  slipUrl?: string;
};

export default function HistoryPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
    if (status.includes("ซ้ำ")) return "bg-amber-50 text-amber-600 border-amber-100";
    return "bg-slate-100 text-slate-500 border-slate-200";
  };

  const getStatusIcon = (status: string) => {
    if (status === "อนุมัติแล้ว" || status === "ยืนยันแล้ว") return <CheckCircle2 size={14} />;
    if (status === "ปฏิเสธ" || status === "ไม่ผ่าน") return <XCircle size={14} />;
    return <Clock size={14} />;
  };

  return (
    <div className="max-w-md mx-auto pb-20 animate-[fadeIn_0.3s]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition active:scale-90"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-800">ประวัติธุรกรรม</h1>
      </div>

      {/* Summary Box */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium tracking-wide">ธุรกรรมทั้งหมด</p>
            <h2 className="text-2xl font-bold text-slate-800">{transactions.length} รายการ</h2>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-medium">กำลังโหลดข้อมูล...</p>
          </div>
        ) : error ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-rose-100">
            <XCircle className="w-12 h-12 text-rose-300 mx-auto mb-3" />
            <p className="text-rose-500 font-medium">{error}</p>
            <button 
              onClick={fetchHistory}
              className="mt-4 text-blue-500 font-bold"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <HistoryIcon size={32} />
            </div>
            <p className="text-slate-500 font-medium">ไม่พบประวัติธุรกรรมของคุณ</p>
          </div>
        ) : (
          transactions.map((item, index) => (
            <div 
              key={index}
              className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 group active:scale-[0.98] transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    item.type === "deposit" ? "bg-emerald-50 text-emerald-500" : "bg-blue-50 text-blue-500"
                  }`}>
                    {item.type === "deposit" ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 leading-tight">
                      {item.type === "deposit" ? "ฝากหุ้นสมาชิก" : "ชำระงวดสัญญา"}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {item.id} {item.contractId && `• ${item.contractId}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900">
                    ฿{item.amount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">{formatDate(item.date)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1">
                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${getStatusStyle(item.status)}`}>
                  {getStatusIcon(item.status)}
                  {item.status}
                </div>
                
                {item.slipUrl && (
                  <button 
                    onClick={() => window.open(item.slipUrl, "_blank")}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-blue-500 hover:text-blue-600"
                  >
                    <Eye size={14} /> ดูสลิป
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
