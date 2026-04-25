"use client";

import { X, CheckCircle2, Circle, Clock, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

interface LoanScheduleModalProps {
  loan: {
    contractId: string;
    approvedDate: string;
    loanType: string;
    amount: number;
    totalPayable: number;
    duration: number;
    paidAmount: number;
    remainingBalance: number;
    installmentAmount: number;
    itemName: string;
  };
  onClose: () => void;
}

export default function LoanScheduleModal({ loan, onClose }: LoanScheduleModalProps) {
  const router = useRouter();

  // Logic คำนวณวันครบกำหนดของแต่ละงวด
  const generateSchedule = () => {
    const schedule = [];
    const startDate = new Date(loan.approvedDate);
    const totalInstallments = loan.duration;

    // คำนวณว่าจ่ายไปแล้วกี่งวด (ปัดเศษเผื่อกรณีจ่ายขาดนิดหน่อย)
    const paidCount = Math.floor(loan.paidAmount / loan.installmentAmount);

    for (let i = 1; i <= totalInstallments; i++) {
      const dueDate = new Date(startDate);
      // ตั้งค่าเป็นวันที่ 5 ของเดือนถัดๆ ไป
      dueDate.setMonth(startDate.getMonth() + i);
      dueDate.setDate(5);

      const isPaid = i <= paidCount;
      const isCurrent = i === paidCount + 1 && loan.remainingBalance > 0;

      schedule.push({
        no: i,
        dueDate,
        amount: loan.installmentAmount,
        isPaid,
        isCurrent
      });
    }
    return schedule;
  };

  const schedule = generateSchedule();
  const nextPayment = schedule.find(s => !s.isPaid);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500">

        {/* Header - Glassmorphism style */}
        <div className="relative bg-slate-900 pt-10 pb-6 px-8 text-white shrink-0">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full sm:hidden" />
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          <div className="space-y-1">
            <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em]">Loan Amortization</p>
            <h2 className="text-2xl font-black tracking-tight">ตารางผ่อนชำระ</h2>
            <div className="flex flex-wrap items-center gap-2 text-slate-400 text-xs font-bold mt-2">
              <span className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/5">ID: {loan.contractId}</span>
              <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
              <span className="text-sky-400">{loan.itemName || "ชำระทั่วไป"}</span>
              <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
              <span>{loan.loanType}</span>
            </div>
          </div>

          {/* Quick Summary Card */}
          {nextPayment && (
            <div className="mt-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">งวดถัดไปที่ต้องชำระ</p>
                <p className="text-lg font-black text-white">฿{loan.installmentAmount.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ครบกำหนด</p>
                <p className="text-sm font-black text-sky-400">
                  {nextPayment.dueDate.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Schedule List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-slate-50/50">
          <div className="relative space-y-4">
            {/* Vertical Line */}
            <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-200" />

            {schedule.map((item) => (
              <div
                key={item.no}
                className={`relative flex items-center gap-6 pl-12 transition-all duration-300 ${item.isPaid ? 'opacity-60' : 'opacity-100'}`}
              >
                {/* Status Icon Marker */}
                <div className={`absolute left-3 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all 
                  ${item.isPaid ? 'bg-emerald-500 shadow-lg shadow-emerald-200 scale-110'
                    : item.isCurrent ? 'bg-blue-600 ring-4 ring-blue-100 scale-125'
                      : 'bg-white border-2 border-slate-300'}`}>
                  {item.isPaid ? (
                    <CheckCircle2 size={14} className="text-white" />
                  ) : item.isCurrent ? (
                    <Clock size={14} className="text-white animate-pulse" />
                  ) : (
                    <Circle size={8} className="text-slate-300 fill-slate-300" />
                  )}
                </div>

                {/* Card */}
                <div className={`flex-1 p-4 rounded-2xl border transition-all 
                  ${item.isCurrent ? 'bg-white border-blue-200 shadow-xl shadow-blue-900/5 -translate-y-1'
                    : item.isPaid ? 'bg-slate-50 border-slate-100'
                      : 'bg-white border-slate-100'}`}>

                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 
                        ${item.isCurrent ? 'text-blue-600' : 'text-slate-400'}`}>
                        งวดที่ {item.no}
                      </p>
                      <p className={`text-sm font-black ${item.isPaid ? 'text-slate-500' : 'text-slate-800'}`}>
                        ฿{item.amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 mb-1">
                        {item.isPaid ? 'ชำระแล้ว' : 'กำหนดชำระ'}
                      </p>
                      <p className={`text-[11px] font-bold ${item.isCurrent ? 'text-blue-600' : 'text-slate-500'}`}>
                        {item.dueDate.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {item.isCurrent && (
                    <button
                      onClick={() => router.push(`/dashboard/upload?category=${encodeURIComponent('ชำระยอดสินเชื่อ')}&contractId=${loan.contractId}`)}
                      className="mt-3 w-full py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Wallet size={12} /> ชำระค่างวดนี้
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 italic">
            * ระบบคำนวณวันครบกำหนดอัตโนมัติอ้างอิงจากวันที่เริ่มสัญญา
          </p>
        </div>
      </div>
    </div>
  );
}
