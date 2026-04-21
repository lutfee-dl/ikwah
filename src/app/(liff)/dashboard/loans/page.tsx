"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Banknote, Calendar, ChevronRight, Loader2, Wallet, History } from "lucide-react";
import { getLiffIdToken } from "@/services/liff";
import { gasApi } from "@/services/gasApi";
import { MemberLoan } from "@/types";
import toast from "react-hot-toast";

export default function MemberLoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<MemberLoan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const token = await getLiffIdToken();
        if (!token) {
          toast.error("ไม่พบข้อมูลผู้ใช้งาน");
          return;
        }
        const res = await gasApi.getMemberLoans(token);
        if (res.success) {
          setLoans(res.data);
        }
      } catch (err) {
        console.error("Fetch loans error", err);
        toast.error("ดึงข้อมูลสินเชื่อไม่สำเร็จ");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLoans();
  }, []);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button 
          onClick={() => router.back()} 
          className="p-2 bg-white rounded-full shadow-sm border border-slate-100 text-slate-600 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 -tracking-wide">ตรวจสอบสินเชื่อ</h1>
          <p className="text-slate-500 text-sm font-medium">รายการสัญญาเงินกู้ของคุณ</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-sky-500 w-10 h-10" />
          <p className="text-slate-400 font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
        </div>
      ) : loans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center">
            <Banknote size={40} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">ไม่พบสัญญาเงินกู้</h3>
            <p className="text-sm text-slate-500 mt-1">คุณยังไม่มีสัญญาเงินกู้ที่กำลังผ่อนชำระในขณะนี้</p>
          </div>
          <button
            onClick={() => router.push("/dashboard/loan")}
            className="bg-slate-900 text-white font-bold px-8 py-3 rounded-full hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
          >
            ยื่นขอสินเชื่อใหม่
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const progress = loan.totalPayable > 0 ? (loan.paidAmount / loan.totalPayable) * 100 : 0;
            return (
              <div 
                key={loan.contractId}
                className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300"
              >
                {/* Card Top: Status & ID */}
                <div className="p-5 pb-0 flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase text-sky-500 bg-sky-50 px-2 py-0.5 rounded-full">
                         {loan.loanType}
                       </span>
                       <span className="text-xs font-bold text-slate-400">
                         #{loan.contractId}
                       </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar size={14} />
                      <span className="text-xs font-medium">อนุมัติเมื่อ {loan.approvedDate}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">ยอดกู้ทั้งหมด</p>
                    <p className="text-lg font-black text-slate-800">฿{loan.amount.toLocaleString()}</p>
                  </div>
                </div>

                {/* Card Middle: Progress */}
                <div className="p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-400 uppercase">ผ่อนชำระแล้ว</span>
                      <span className="text-emerald-500">฿{loan.paidAmount.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <div 
                        className="h-full bg-gradient-to-r from-sky-400 to-emerald-500 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>{progress.toFixed(1)}% Completed</span>
                      <span>คงเหลือ ฿{loan.remainingBalance.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">ระยะเวลา</p>
                       <p className="text-sm font-black text-slate-700">{loan.duration} งวด</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">สถานะ</p>
                       <p className="text-sm font-black text-emerald-600">{loan.status}</p>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Action */}
                <div className="p-4 bg-slate-900 flex items-center justify-between hover:bg-black transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/upload?category=${encodeURIComponent('ชำระยอดสินเชื่อ')}&contractId=${loan.contractId}`)}
                >
                  <span className="text-white font-bold text-sm ml-2">ไปที่หน้าชำระเงิน</span>
                  <div className="bg-white/10 p-2 rounded-xl text-white group-hover:translate-x-1 transition-transform">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
        <History className="text-amber-500 shrink-0" size={20} />
        <div>
          <p className="text-xs font-bold text-amber-800">หมายเหตุ</p>
          <p className="text-[10px] text-amber-700 font-medium leading-relaxed mt-0.5">
            ยอดที่แสดงเป็นยอดโดยประมาณ ระบบจะปรับปรุงข้อมูลจริงหลังจากแอดมินอนุมัติสลิปชำระเงินเรียบร้อยแล้ว หากมีข้อสงสัยโปรดติดต่อฝ่ายบัญชี
          </p>
        </div>
      </div>
    </div>
  );
}
