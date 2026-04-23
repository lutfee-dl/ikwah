"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Banknote, Calendar, ChevronRight, Loader2, Wallet, History, Info } from "lucide-react";
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

  const activeLoans = loans.filter(l => l.status === "กำลังผ่อน");
  const closedLoans = loans.filter(l => l.status === "ปิดยอดแล้ว");

  const LoanCard = ({ loan }: { loan: MemberLoan }) => {
    const progress = loan.totalPayable > 0 ? (loan.paidAmount / loan.totalPayable) * 100 : 0;
    const isClosed = loan.status === "ปิดยอดแล้ว";

    return (
      <div
        key={loan.contractId}
        className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 ${isClosed ? 'opacity-80' : ''}`}
      >
        {/* Card Top: Status & ID */}
        <div className="p-5 pb-0 flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isClosed ? 'bg-slate-100 text-slate-500' : 'text-sky-500 bg-sky-50'}`}>
                {loan.loanType}
              </span>
              <span className="text-xs font-bold text-slate-400">
                #{loan.contractId}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Calendar size={14} />
              <span className="text-xs font-medium">{isClosed ? 'ปิดยอดเมื่อ' : 'อนุมัติเมื่อ'} {loan.approvedDate}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">ยอดเงินต้น</p>
            <p className="text-lg font-black text-slate-800">฿{loan.amount.toLocaleString()}</p>
          </div>
        </div>

        {/* Card Middle: Installment & Progress */}
        <div className="p-5 space-y-5">
          {/* Installment Info */}
          {!isClosed && (
            <div className="flex items-center gap-4 bg-sky-50/50 p-4 rounded-2xl border border-sky-100/50">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sky-500 shadow-sm">
                <Banknote size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-sky-600/70 uppercase">ยอดชำระต่องวด</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-800">฿{(loan.installmentAmount || 0).toLocaleString()}</span>
                  <span className="text-xs font-bold text-slate-400">/ งวด</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">ระยะเวลา</p>
                <p className="text-sm font-black text-slate-700">{loan.duration} งวด</p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-400 uppercase">{isClosed ? 'ชำระครบแล้ว' : 'ผ่อนชำระแล้ว'}</span>
              <span className={isClosed ? 'text-emerald-600' : 'text-emerald-500'}>
                ฿{loan.paidAmount.toLocaleString()}
                <span className="text-slate-300 font-medium ml-1">/ ฿{loan.totalPayable.toLocaleString()}</span>
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${isClosed ? 'bg-emerald-500' : 'bg-gradient-to-r from-sky-400 to-emerald-500'}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            {!isClosed && (
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>{progress.toFixed(1)}% Completed</span>
                <span className="text-rose-500">คงเหลือ ฿{loan.remainingBalance.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card Bottom: Action */}
        {!isClosed ? (
          <div className="p-4 bg-slate-900 flex items-center justify-between hover:bg-black transition-colors cursor-pointer"
            onClick={() => router.push(`/dashboard/upload?category=${encodeURIComponent('ชำระยอดสินเชื่อ')}&contractId=${loan.contractId}`)}
          >
            <div className="flex items-center gap-2 ml-2">
              <Wallet size={16} className="text-sky-400" />
              <span className="text-white font-bold text-sm">ไปที่หน้าชำระเงิน</span>
            </div>
            <div className="bg-white/10 p-2 rounded-xl text-white group-hover:translate-x-1 transition-transform">
              <ChevronRight size={18} />
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 flex items-center justify-center border-t border-slate-100">
            <span className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" /> ปิดยอดสัญญาเรียบร้อยแล้ว
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => router.push("/dashboard/home")}
          className="p-2 bg-white rounded-full shadow-sm border border-slate-100 text-slate-600 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 -tracking-wide">ตรวจสอบสินเชื่อ</h1>
          <p className="text-slate-500 text-sm font-medium">จัดการรายการเงินกู้ของคุณ</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-sky-500 w-10 h-10" />
          <p className="text-slate-400 font-medium animate-pulse">กำลังโหลดข้อมูลสัญญา...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Active Loans */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="font-black text-slate-800 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-sky-500 rounded-full" />
                สัญญาปัจจุบัน
              </h2>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                {activeLoans.length} รายการ
              </span>
            </div>

            {activeLoans.length === 0 ? (
              <div className="bg-slate-50 rounded-[2.5rem] p-10 text-center border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm">
                  <Banknote size={32} />
                </div>
                <p className="text-slate-500 font-bold">ไม่มีสัญญาที่กำลังผ่อนชำระ</p>
                <button
                  onClick={() => router.push("/dashboard/loan")}
                  className="mt-4 text-sky-600 font-black text-sm hover:underline"
                >
                  ต้องการยื่นกู้ใหม่?
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeLoans.map(loan => <LoanCard key={loan.contractId} loan={loan} />)}
              </div>
            )}
          </section>

          {/* Loan History */}
          {closedLoans.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="font-black text-slate-800 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-slate-300 rounded-full" />
                  ประวัติสัญญาเก่า
                </h2>
                <span className="text-xs font-bold text-slate-400">
                  {closedLoans.length} รายการ
                </span>
              </div>
              <div className="space-y-4">
                {closedLoans.map(loan => <LoanCard key={loan.contractId} loan={loan} />)}
              </div>
            </section>
          )}

          {/* Summary Info */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <History size={80} />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Info size={20} className="text-sky-400" />
                </div>
                <h3 className="font-bold text-lg">คำแนะนำการชำระ</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                การชำระเงินกู้จะปรับยอดทันทีหลังจากแอดมินยืนยันสลิป โปรดเก็บหลักฐานการโอนเงินไว้จนกว่ายอดจะอัปเดตในระบบ หากยอดไม่ตรงสามารถติดต่อแอดมินได้ตลอด 24 ชม.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper icons needed for the redesign
import { CheckCircle2 } from "lucide-react";
