"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  History,
  PlusCircle,
  Receipt,
  User,
  CheckCircle2,
  Calendar,
  Wallet,
  ArrowRight,
  LayoutGrid,
  ChevronLeft,
  RefreshCw
} from "lucide-react";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import Link from "next/link";
import { NumericFormat } from "react-number-format";
import { formatDate, formatDateTime, formatTime } from "@/lib/utils";

interface Contract {
  contractId: string;
  requestId: string;
  approvedDate: string;
  lineId: string;
  fullName: string;
  loanType: string;
  principalAmount: number;
  profitAmount: number;
  totalPayable: number;
  installmentPerMonth: number;
  totalInstallments: number;
  totalPaidAmount: number;
  remainingBalance: number;
  status: string;
  items: string;
}

interface Repayment {
  receiptId: string;
  date: string;
  installmentNo: string;
  amount: number;
  status: string;
  approver: string;
}

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.contractId as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoadingContract, setIsLoadingContract] = useState(true);

  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAddingRepayment, setIsAddingRepayment] = useState(false);

  // Form states
  const [amountPaid, setAmountPaid] = useState<number | undefined>(undefined);
  const [installmentNo, setInstallmentNo] = useState("");

  const fetchContract = useCallback(async () => {
    setIsLoadingContract(true);
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_get_contracts" }),
      });
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const found = result.data.find((item: any) => String(item.contractId || "") === contractId);
        if (found) {
          const totalPaidAmount = Number(found.paidAmount || 0);
          const totalPayable = Number(found.totalPayable || 0);
          const totalInstallments = Number(found.duration || 0);
          const installmentPerMonth = totalInstallments > 0 ? totalPayable / totalInstallments : 0;
          const approvedDateStr = String(found.approvedDate || "");
          let status = String(found.status || "กำลังผ่อน");

          // --- AUTO-TRACKING LOGIC ---
          if (status !== "ปิดยอดแล้ว" && approvedDateStr) {
            const appDate = new Date(approvedDateStr);
            if (!isNaN(appDate.getTime())) {
              const today = new Date();
              let monthsPassed = (today.getFullYear() - appDate.getFullYear()) * 12 + (today.getMonth() - appDate.getMonth());
              if (today.getDate() < appDate.getDate()) {
                monthsPassed--;
              }
              monthsPassed = Math.max(0, monthsPassed);
              monthsPassed = Math.min(monthsPassed, totalInstallments);
              const expectedPaid = monthsPassed * installmentPerMonth;
              if (totalPaidAmount < expectedPaid) {
                status = "ค้างชำระ";
              } else {
                status = "กำลังผ่อน";
              }
            }
          }
          if (status !== "ปิดยอดแล้ว" && totalPaidAmount >= totalPayable && totalPayable > 0) {
            status = "ปิดยอดแล้ว";
          }

          const parsedContract: Contract = {
            contractId: String(found.contractId || ""),
            requestId: String(found.requestId || ""),
            approvedDate: approvedDateStr,
            lineId: String(found.lineId || ""),
            fullName: String(found.memberName || ""),
            loanType: String(found.loanType || ""),
            principalAmount: Number(found.amount || 0),
            profitAmount: Number(found.interest || 0),
            totalPayable,
            installmentPerMonth,
            totalInstallments,
            totalPaidAmount,
            remainingBalance: Number(found.remainingBalance || 0),
            status,
            items: String(found.items || "ทั่วไป"),
          };

          setContract(parsedContract);
          setAmountPaid(parsedContract.installmentPerMonth);
          
          // คำนวณงวดถัดไปที่ต้องจ่าย
          const paidCount = Math.floor(totalPaidAmount / installmentPerMonth);
          const nextInstallment = paidCount + 1;
          if (nextInstallment <= totalInstallments) {
            setInstallmentNo(`งวดที่ ${nextInstallment}`);
          } else {
            setInstallmentNo("ปิดยอดสัญญา");
          }
        } else {
          toast.error("ไม่พบข้อมูลสัญญา");
        }
      }
    } catch (error) {
      toast.error("ดึงข้อมูลสัญญาไม่สำเร็จ");
    } finally {
      setIsLoadingContract(false);
    }
  }, [contractId]);

  const fetchRepayments = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_get_repayments",
          contractId,
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET
        }),
      });
      const result = await res.json();
      if (result.success) {
        const mapped = result.data.map((item: any) => ({
          receiptId: String(item.receiptId || ""),
          date: String(item.date || ""),
          installmentNo: String(item.installmentNo || ""),
          amount: Number(item.amount || 0),
          status: String(item.status || ""),
          approver: item.approver,
        }));
        setRepayments(mapped);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchContract();
    fetchRepayments();
  }, [fetchContract, fetchRepayments]);
  const handleAddRepayment = async () => {
    if (!contract) return;
    if (!amountPaid || amountPaid <= 0) return toast.error("กรุณาระบุยอดเงินให้ถูกต้อง");

    const confirmResult = await Swal.fire({
      title: 'ยืนยันการรับชำระเงิน?',
      html: `
        <div class="text-left space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
          <p class="text-sm font-bold text-slate-600">ผู้ชำระ: <span class="text-blue-600">${contract.fullName}</span></p>
          <p class="text-sm font-bold text-slate-600">รายการ: <span class="text-slate-800">${installmentNo || 'ชำระค่างวดปกติ'}</span></p>
          <p class="text-2xl font-black text-emerald-600 text-center mt-4">ยอดเงิน: ${amountPaid.toLocaleString()} ฿</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ยืนยันบันทึกข้อมูล',
      cancelButtonText: 'ตรวจสอบอีกครั้ง'
    });

    if (!confirmResult.isConfirmed) return;

    setIsAddingRepayment(true);
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_add_repayment",
          contractId: contract.contractId,
          lineId: contract.lineId,
          amountPaid,
          installmentNo: installmentNo || `ชำระค่างวด`,
          status: "ยืนยันแล้ว",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("บันทึกรับเงินเรียบร้อย");
        setInstallmentNo("");
        fetchContract();    // Refresh overall balance
        fetchRepayments();  // Refresh timeline
      } else {
        toast.error(result.msg || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("เซิร์ฟเวอร์ขัดข้อง");
    } finally {
      setIsAddingRepayment(false);
    }
  };

  if (isLoadingContract) {
    return (
      <div className="min-h-screen p-4 lg:p-6 bg-slate-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin"></div>
          <p className="font-medium animate-pulse">กำลังโหลดข้อมูลสัญญา...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen p-4 lg:p-6 bg-slate-50/50 flex flex-col items-center justify-center text-center">
        <Receipt size={48} className="text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">ไม่พบสัญญา</h3>
        <p className="text-slate-500 mb-6">ไม่พบข้อมูลสัญญาที่คุณกำลังค้นหา อาจถูกลบไปแล้ว</p>
        <Link href="/admin/contracts" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm">
          กลับไปหน้ารวมสัญญา
        </Link>
      </div>
    );
  }

  const paidPercent = Math.min((contract.totalPaidAmount / contract.totalPayable) * 100, 100);

  return (
    <div className="min-h-screen p-4 lg:p-6 font-sans text-slate-900 bg-slate-50/50 pb-20">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* --- Header --- */}
        <div className="flex items-center gap-4 mb-4">
          <Link href="/admin/contracts" className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800">รายละเอียดสัญญา</h1>
            <p className="text-slate-500 text-sm mt-0.5">บริหารจัดการยอดชำระของ {contract.contractId}</p>
          </div>
        </div>

        {/* --- Body content --- */}
        {/* User Details & Initial Info Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-tr from-blue-100 to-indigo-50 rounded-full flex items-center justify-center text-blue-600 border border-white shadow-inner shrink-0">
              <User size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-black text-slate-800">{contract.fullName}</h4>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-black border uppercase align-middle ${contract.loanType === 'ฉุกเฉิน' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                  contract.loanType === 'ก้อดฮาซัน' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    'bg-blue-50 text-blue-600 border-blue-100'
                  }`}>
                  {contract.loanType}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1">
                <span className="flex items-center gap-1 font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600 font-bold uppercase">{contract.contractId}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="flex items-center gap-1"><Calendar size={12} className="text-slate-400" /> อนุมัติ: {formatDate(contract.approvedDate)}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 md:text-right flex items-center justify-between md:block">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">ยอดจัดสรรทั้งหมด</p>
            <p className="text-xl font-black text-slate-700">{contract.totalPayable.toLocaleString()} <span className="text-sm">฿</span></p>
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 relative overflow-hidden group shadow-sm transition-shadow hover:shadow-md">
            <div className="absolute right-0 top-0 -mr-4 -mt-4 opacity-10 text-emerald-600 group-hover:scale-110 transition-transform duration-500">
              <CheckCircle2 size={120} />
            </div>
            <div className="relative z-10">
              <p className="text-emerald-600 hover:text-emerald-700 text-xs font-black uppercase mb-2 tracking-wide flex items-center gap-1.5"><Wallet size={14} /> ชำระแล้ว</p>
              <p className="text-3xl font-black text-emerald-700">
                {contract.totalPaidAmount.toLocaleString()} <span className="text-base font-bold text-emerald-500">฿</span>
              </p>
              <div className="flex items-center gap-3 mt-4">
                <div className="flex-1 bg-emerald-200/50 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${paidPercent}%` }} />
                </div>
                <span className="text-xs font-black text-emerald-600">{Math.round(paidPercent)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-100 rounded-3xl p-5 relative overflow-hidden group shadow-sm transition-shadow hover:shadow-md">
            <div className="absolute right-0 top-0 -mr-4 -mt-4 opacity-5 text-rose-600 group-hover:scale-110 transition-transform duration-500">
              <Wallet size={120} />
            </div>
            <div className="relative z-10">
              <p className="text-rose-600 text-xs font-black uppercase mb-2 tracking-wide flex items-center gap-1.5"><History size={14} /> ยอดหนี้คงเหลือ</p>
              <p className="text-3xl font-black text-rose-700">
                {contract.remainingBalance.toLocaleString()} <span className="text-base font-bold text-rose-400">฿</span>
              </p>
              <p className="text-xs text-rose-500 font-bold mt-2.5 bg-rose-100/50 inline-block px-2 py-1 rounded-md uppercase">
                เหลืออีก {Math.max(0, contract.totalInstallments - Math.round(contract.totalPaidAmount / contract.installmentPerMonth))} งวด
              </p>
            </div>
          </div>
        </div>

        {/* Installment Graphical Tracker */}
        {contract.totalInstallments > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm relative">
            <h4 className="font-black text-slate-800 text-base mb-4 flex items-center gap-2">
              <LayoutGrid className="text-sky-500" size={18} /> สรุปงวดที่ชำระแล้ว ({Math.floor(contract.totalPaidAmount / contract.installmentPerMonth)}/{contract.totalInstallments})
            </h4>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 sm:gap-2">
              {Array.from({ length: contract.totalInstallments }).map((_, idx) => {
                const isPaid = idx < Math.floor(contract.totalPaidAmount / contract.installmentPerMonth);
                return (
                  <div
                    key={idx}
                    className={`aspect-square w-full rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${isPaid ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-300'}`}
                    title={isPaid ? `งวดที่ ${idx + 1}: ชำระแล้ว` : `งวดที่ ${idx + 1}: รอชำระ`}
                  >
                    <span className="text-base sm:text-base font-black">{idx + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Repayment Form */}
        {contract.remainingBalance > 0 && (
          <div className="bg-white border-2 border-blue-100 rounded-[2rem] p-6 shadow-xl shadow-blue-900/5 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />

            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-black text-slate-800 text-lg flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <PlusCircle className="text-white" size={18} />
                  </div>
                  บันทึกรับชำระเงิน
                </h4>
                <div className="hidden sm:block px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                  สัญญาปกติ
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">

                {/* Installment No. Input */}
                <div className="lg:col-span-3 space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">
                    งวดที่ / รายละเอียด
                  </label>
                  <div className="relative group">
                    <input
                      list="installment-options"
                      type="text"
                      placeholder="ระบุงวด หรือพิมพ์เอง..."
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 group-focus-within:bg-white group-focus-within:border-blue-500 group-focus-within:ring-4 group-focus-within:ring-blue-50 outline-none transition-all"
                      value={installmentNo}
                      onChange={(e) => setInstallmentNo(e.target.value)}
                    />
                    <datalist id="installment-options">
                      {Array.from({ length: contract.totalInstallments }).map((_, i) => {
                        const num = i + 1;
                        const isPaid = i < Math.floor(contract.totalPaidAmount / contract.installmentPerMonth);
                        return (
                          <option 
                            key={num} 
                            value={`งวดที่ ${num}`}
                          >
                            {isPaid ? 'ชำระแล้ว' : 'รอชำระ'}
                          </option>
                        );
                      })}
                      <option value="ปิดยอดสัญญา" />
                      <option value="ค่าปรับ/ค่าธรรมเนียม" />
                    </datalist>
                  </div>
                </div>

                {/* Amount Input & Quick Actions */}
                <div className="lg:col-span-6 space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">
                    จำนวนเงินชำระ (บาท)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1 group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 font-black text-lg">฿</span>
                      <NumericFormat
                        thousandSeparator={true}
                        inputMode="decimal"
                        value={amountPaid}
                        onValueChange={(values) => setAmountPaid(values.floatValue)}
                        className="w-full pl-10 pr-4 py-3.5 bg-blue-50/30 border border-blue-100 rounded-2xl text-2xl font-black text-blue-700 group-focus-within:bg-white group-focus-within:border-blue-500 group-focus-within:ring-4 group-focus-within:ring-blue-50 outline-none transition-all text-right tabular-nums"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAmountPaid(contract.installmentPerMonth)}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-2xl text-[11px] font-black transition-all border-2 flex flex-col items-center justify-center min-w-[80px] ${amountPaid === contract.installmentPerMonth
                          ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200"
                          : "bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:text-blue-600"
                          }`}
                      >
                        <span>ค่างวด</span>
                        <span className={amountPaid === contract.installmentPerMonth ? "text-blue-100" : "text-blue-600"}>
                          {contract.installmentPerMonth.toLocaleString()}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAmountPaid(contract.remainingBalance)}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-2xl text-[11px] font-black transition-all border-2 flex flex-col items-center justify-center min-w-[80px] ${amountPaid === contract.remainingBalance
                          ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-200"
                          : "bg-white border-slate-100 text-slate-600 hover:border-rose-200 hover:text-rose-600"
                          }`}
                      >
                        <span>ปิดยอด</span>
                        <span className={amountPaid === contract.remainingBalance ? "text-rose-100" : "text-rose-600"}>
                          {contract.remainingBalance.toLocaleString()}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="lg:col-span-3">
                  <button
                    disabled={isAddingRepayment || !amountPaid || amountPaid <= 0}
                    onClick={handleAddRepayment}
                    className="w-full h-[3.75rem] bg-slate-900 hover:bg-blue-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-slate-200 hover:shadow-blue-200 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center gap-3 group"
                  >
                    {isAddingRepayment ? (
                      <RefreshCw className="animate-spin" size={20} />
                    ) : (
                      <>
                        ยืนยันชำระเงิน
                        <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:translate-x-1 transition-transform">
                          <ArrowRight size={14} />
                        </div>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Repayment History */}
        <div>
          <h4 className="font-black text-slate-800 flex items-center gap-2 text-base mb-4 px-2">
            <History size={18} className="text-slate-400" /> ประวัติการรับชำระ
          </h4>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-slate-400 text-xs font-black uppercase tracking-widest">
                  <th className="py-4 px-4 sm:px-6">วันที่</th>
                  <th className="py-4 px-4 sm:px-6 hidden sm:table-cell">อ้างอิง/งวด</th>
                  <th className="py-4 px-4 sm:px-6 text-right">ยอดรับ (฿)</th>
                  <th className="py-4 px-4 sm:px-6 text-center w-24">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoadingHistory ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded-md w-24"></div></td>
                      <td className="py-4 px-6 hidden sm:table-cell"><div className="h-4 bg-slate-100 rounded-md w-16"></div></td>
                      <td className="py-4 px-6 text-right"><div className="h-4 bg-slate-200 rounded-md w-20 ml-auto"></div></td>
                      <td className="py-4 px-6 text-center"><div className="h-6 bg-slate-100 rounded-full w-16 mx-auto"></div></td>
                    </tr>
                  ))
                ) : repayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Receipt className="text-slate-300" size={24} />
                      </div>
                      <p className="text-slate-500 font-bold text-sm">ยังไม่มีประวัติการชำระเงิน</p>
                    </td>
                  </tr>
                ) : (
                  repayments.map((rp, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 even:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-bold text-slate-700 text-base">
                          {formatDate(rp.date)}
                        </div>
                        <div className="text-[12px] text-slate-400 font-medium">
                          เวลา {formatTime(rp.date)} น.
                        </div>
                      </td>
                      <td className="py-4 px-6 hidden sm:table-cell">
                        <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200/50">
                          {rp.installmentNo || "-"}
                        </div>
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right font-black text-emerald-600 text-base sm:text-lg">
                        +{rp.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-center">
                        <span className="inline-flex w-full items-center justify-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-black text-xs uppercase border border-emerald-200/50">
                          <CheckCircle2 size={10} /> สำเร็จ
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
